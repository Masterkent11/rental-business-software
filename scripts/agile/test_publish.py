import importlib.util
import json
import unittest
from unittest.mock import patch
from pathlib import Path

SPEC=importlib.util.spec_from_file_location('agile_publish',Path(__file__).with_name('publish.py'))
MODULE=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
ROOT=Path(__file__).resolve().parents[2]

class PublisherTests(unittest.TestCase):
    def setUp(self):
        self.manifest=json.loads((ROOT/'docs/agile/issues.json').read_text())
        self.record=self.manifest['issues'][-1]

    def test_real_manifest_has_complete_quality_and_hierarchy(self):
        records=MODULE.validate(self.manifest)
        self.assertEqual(len(records),92)
        self.assertEqual(sum(r['parent'] is not None for r in records.values()),91)

    def test_rejects_an_alternative_project_before_any_api_call(self):
        self.manifest['project_number']=4
        with self.assertRaises(ValueError):
            MODULE.validate(self.manifest)

    def test_rejects_duplicate_manifest_titles(self):
        self.manifest['issues'][1]['title']=self.manifest['issues'][0]['title']
        with self.assertRaises(ValueError):
            MODULE.validate(self.manifest)

    def test_rejects_cycles_in_native_parent_plan(self):
        self.manifest['issues'][0]['parent']=self.record['key']
        with self.assertRaises(ValueError):
            MODULE.validate(self.manifest)

    def test_rejects_secrets_before_publication(self):
        self.record['body']+='\n'+('sb_secret_'+'x'*25)
        with self.assertRaises(ValueError):
            MODULE.validate(self.manifest)

    def test_rejects_done_status_for_unimplemented_plans(self):
        record=next(r for r in self.manifest['issues'] if r['classification']=='Planned Feature')
        record['status']='Done'
        with self.assertRaises(ValueError):
            MODULE.validate(self.manifest)

    def test_child_records_do_not_inherit_parent_reuse_mapping(self):
        children=[r for r in self.manifest['issues'] if r['parent']=='WSP.STORY.SEARCH']
        self.assertEqual(len(children),3)
        self.assertTrue(all('reuse_number' not in r and 'existing_titles' not in r for r in children))

    def test_existing_stable_marker_survives_human_title_edits(self):
        issue={'title':'Human refined title','body':'Tracking key: '+self.record['key'],'number':41}
        self.assertIs(MODULE.match_issue(self.record,[issue]),issue)
        self.assertIs(MODULE.match_issue(self.record,[issue]),issue)

    def test_existing_title_is_reused_without_a_duplicate_issue(self):
        issue={'title':self.record['title'],'body':'Existing manually authored ticket','number':42}
        self.assertIs(MODULE.match_issue(self.record,[issue]),issue)

    def test_ambiguous_matches_stop_publication(self):
        issue={'title':self.record['title'],'body':'','number':1}
        with self.assertRaises(ValueError):
            MODULE.match_issue(self.record,[issue,{**issue,'number':2}])

    def test_marker_does_not_match_another_ticket_prefix(self):
        issue={'title':'Other','body':'Tracking key: '+self.record['key']+'.EXTRA'}
        self.assertIsNone(MODULE.match_issue(self.record,[issue]))

    def test_identical_project_fields_produce_no_mutations(self):
        class NoWrites:
            def graphql(self,*args):
                raise AssertionError('Unexpected mutation during reconciliation')
        values={'Status':self.record['status'],**{name:self.record[key] for name,key in MODULE.FIELD_MAP.items()},'Historical Period':self.record['period']}
        item={'id':'ITEM','fieldValues':{'nodes':[{'field':{'name':name},'name':value} for name,value in values.items()]}}
        MODULE.set_fields(NoWrites(),'PROJECT',item,self.record,{})

    def test_status_case_changes_preserve_existing_option_identity(self):
        existing=[{'id':'PROGRESS','name':'In progress','color':'BLUE','description':'Existing'}]
        options=MODULE.merge_options(existing,['Backlog','In Progress','Done'])
        progress=next(o for o in options if o['name']=='In Progress')
        self.assertEqual(progress['id'],'PROGRESS')
        self.assertEqual(sum(o['name'].casefold()=='in progress' for o in options),1)

    def test_reviewed_discovery_issue_is_reused_by_its_existing_title(self):
        record=next(r for r in self.manifest['issues'] if r['key']=='WSP.STORY.SEARCH')
        issue={'number':11,'title':'[STORY][CUSTOMER] Property Discovery and Listings','body':'Original requirement'}
        self.assertIs(MODULE.match_issue(record,[issue]),issue)
        with self.assertRaises(ValueError):
            MODULE.match_issue(record,[])

    def test_auto_add_race_reuses_the_existing_project_item(self):
        class Race:
            def graphql(self,*args):
                raise MODULE.GitHubError('Content already exists in this project')
        item={'id':'ITEM','content':{'id':'ISSUE'}}
        cache={}
        with patch.object(MODULE,'project_items',return_value=[item]):
            self.assertIs(MODULE.ensure_project_item(Race(),'PROJECT','ISSUE',cache),item)
        self.assertIs(MODULE.ensure_project_item(Race(),'PROJECT','ISSUE',cache),item)

    def test_unrelated_project_errors_are_not_hidden_as_duplicate_success(self):
        class Denied:
            def graphql(self,*args):
                raise MODULE.GitHubError('Permission denied')
        with self.assertRaises(MODULE.GitHubError):
            MODULE.ensure_project_item(Denied(),'PROJECT','ISSUE',{})

    def test_owned_delivery_status_sync_preserves_parent_and_original_requirements(self):
        record={**self.record,'status':'Done','completion':'Verified now'}
        text='Tracking key: '+record['key']+'\n\n- Delivery Status: In Progress\n\n## Completion Status\n\nPending\n\n## Original Requirement Record\n\nHuman requirements\n\n## Parent Issue\n\nhttps://github.com/owner/repo/issues/1\n'
        updated=MODULE.reconcile_body(record,text)
        self.assertIn('- Delivery Status: Done',updated)
        self.assertIn('Human requirements',updated)
        self.assertIn('https://github.com/owner/repo/issues/1',updated)
        self.assertEqual(MODULE.reconcile_body(record,updated),updated)

    def test_unowned_issue_text_is_never_overwritten_by_metadata_sync(self):
        original='Manually authored requirements without a tracking key'
        self.assertEqual(MODULE.reconcile_body(self.record,original),original)

    def test_native_parent_snapshot_paginates_open_and_closed_issues(self):
        class Pages:
            def __init__(self):
                self.calls=0
            def graphql(self,query,variables):
                self.calls+=1
                if self.calls==1:
                    return {'repository':{'issues':{'nodes':[{'number':1,'parent':None}],'pageInfo':{'hasNextPage':True,'endCursor':'NEXT'}}}}
                if variables['cursor']!='NEXT':
                    raise AssertionError('Pagination cursor was lost')
                return {'repository':{'issues':{'nodes':[{'number':2,'parent':{'number':1}}],'pageInfo':{'hasNextPage':False,'endCursor':None}}}}
        api=Pages()
        self.assertEqual(MODULE.native_parents(api,'owner/repo'),{1:None,2:1})
        self.assertEqual(api.calls,2)

    def test_historical_view_does_not_disguise_completed_work_as_active_sprint(self):
        views=MODULE.desired_views()
        self.assertIn('iteration:@current',views['Active Sprint'][1])
        self.assertIn('status:Done',views['Historical Completed Work'][1])
        self.assertNotIn('is:open',views['Historical Completed Work'][1])

if __name__=='__main__':
    unittest.main()
