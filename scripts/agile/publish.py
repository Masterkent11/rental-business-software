import argparse
import json
import re
import subprocess
import sys
import time
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'docs/agile/issues.json'
STATE = ROOT / 'docs/agile/publication.json'
STATUSES = ['Backlog','Ready','In Progress','In Review','Ready for QA','In QA','Ready for Release','Done','Blocked']
FIELD_MAP = {'Priority':'priority','Application Surface':'surface','Technical Layer':'layer','Work Type':'work_type','Product Domain':'domain','Record Classification':'classification','Target Release':'release'}
FIELD_SELECTION = '... on ProjectV2Field {id name dataType} ... on ProjectV2SingleSelectField {id name dataType options{id name color description}} ... on ProjectV2IterationField {id name dataType configuration{duration startDay iterations{id title startDate duration} completedIterations{id title startDate duration}}}'
VALUE_SELECTION = '... on ProjectV2ItemFieldSingleSelectValue {name optionId field{... on ProjectV2SingleSelectField{id name}}} ... on ProjectV2ItemFieldTextValue{text field{... on ProjectV2Field{id name}}} ... on ProjectV2ItemFieldNumberValue{number field{... on ProjectV2Field{id name}}}'

class GitHubError(RuntimeError):
    pass

class GitHub:
    def __init__(self, write_delay=1.0):
        self.last_write=0
        self.write_delay=write_delay
        self.mutations=0

    def api(self, endpoint, method='GET', data=None, paginate=False, allow404=False):
        mutation=method!='GET' and (endpoint!='graphql' or str(data.get('query','')).lstrip().startswith('mutation'))
        if mutation:
            time.sleep(max(0,self.write_delay-(time.monotonic()-self.last_write)))
        command=['gh','api',endpoint,'--method',method,'-H','Accept: application/vnd.github+json']
        if data is not None:
            command+=['--input','-']
        if paginate:
            command+=['--paginate','--slurp']
        for attempt in range(4):
            p=subprocess.run(command,input=json.dumps(data) if data is not None else None,text=True,capture_output=True,cwd=ROOT)
            if p.returncode==0:
                result=json.loads(p.stdout) if p.stdout.strip() else None
                if isinstance(result,dict) and result.get('errors'):
                    raise GitHubError(json.dumps(result['errors']))
                if mutation:
                    self.last_write=time.monotonic()
                    self.mutations+=1
                return result
            if allow404 and 'HTTP 404' in p.stderr:
                return None
            if attempt<3 and any(code in p.stderr for code in ['HTTP 429','HTTP 502','HTTP 503','secondary rate limit']):
                print('GitHub requested a retry; waiting before resuming safely.',flush=True)
                time.sleep(min(60,15*(attempt+1)))
                continue
            raise GitHubError(p.stderr.strip())
        raise GitHubError('GitHub operation exhausted retries')

    def graphql(self,query,variables=None):
        return self.api('graphql','POST',{'query':query,'variables':variables or {}})['data']


def validate(manifest):
    if manifest.get('repository')!='Masterkent11/rental-business-software' or manifest.get('project_owner')!='Masterkent11' or manifest.get('project_number')!=3:
        raise ValueError('Only the explicitly authorized repository and Project 3 may be changed')
    records=manifest['issues']
    keys=[r['key'] for r in records]
    titles=[r['title'].casefold() for r in records]
    if len(set(keys))!=len(keys) or len(set(titles))!=len(titles):
        raise ValueError('Duplicate manifest keys or titles')
    reuse_numbers=[r['reuse_number'] for r in records if r.get('reuse_number')]
    if len(set(reuse_numbers))!=len(reuse_numbers):
        raise ValueError('An existing issue cannot represent multiple manifest records')
    by_key={r['key']:r for r in records}
    required=['## Description','## User Story','## User Walkthrough','## Acceptance Criteria','## Technical Scope','## Definition of Done','## Relevant Evidence','## Testing Requirements','## Completion Status']
    secret=re.compile(r'(?:sb_secret_[A-Za-z0-9_-]{15,}|gh[pousr]_[A-Za-z0-9]{20,}|postgres(?:ql)?://[^\s]+:[^\s]+@)')
    for record in records:
        if record['status'] not in STATUSES:
            raise ValueError('Invalid status for '+record['key'])
        if secret.search(record['body']):
            raise ValueError('Credential pattern in issue '+record['key'])
        if any(section not in record['body'] for section in required):
            raise ValueError('Incomplete issue body '+record['key'])
        if record['key'] not in record['body'] or not re.search(r'- AC-\d+:',record['body']):
            raise ValueError('Missing stable marker or acceptance criteria')
        if record['status']=='Done' and record['classification'] not in {'Historical Implementation','Current Delivery'}:
            raise ValueError('Unverified planned or partial work cannot be Done')
        seen={record['key']}
        parent=record['parent']
        while parent:
            if parent not in by_key or parent in seen:
                raise ValueError('Missing parent or hierarchy cycle')
            seen.add(parent)
            parent=by_key[parent]['parent']
        if record['parent'] and keys.index(record['parent'])>=keys.index(record['key']):
            raise ValueError('Parents must precede children')
    return by_key


def match_issue(record,issues):
    marker='Tracking key: '+record['key']
    marked=[i for i in issues if marker in (i.get('body') or '').splitlines()]
    titles={record['title'].casefold(),*(title.casefold() for title in record.get('existing_titles',[]))}
    exact=[i for i in issues if i['title'].casefold() in titles]
    if record.get('reuse_number'):
        expected=next((i for i in issues if i['number']==record['reuse_number']),None)
        if expected is None or (expected not in marked and expected not in exact):
            raise ValueError('The reviewed reuse issue is absent or no longer matches its audited scope')
        exact=[expected]
    matches=marked or exact
    if len(matches)>1:
        raise ValueError('Ambiguous existing issues for '+record['key'])
    return matches[0] if matches else None


def reconcile_body(record,text):
    if ('Tracking key: '+record['key']) not in text.splitlines():
        return text
    text=re.sub(r'^- Delivery Status:.*$',lambda match:'- Delivery Status: '+record['status'],text,flags=re.MULTILINE)
    pattern=r'(^## Completion Status\n\n)[^\n]*(?=\n|\Z)'
    text=re.sub(pattern,lambda match:match.group(1)+record['completion'],text,flags=re.MULTILINE|re.DOTALL)
    return text.rstrip()+'\n'


def project(api,manifest):
    q='query($owner:String!,$number:Int!){viewer{login} repository(owner:"Masterkent11",name:"rental-business-software"){id nameWithOwner viewerPermission hasIssuesEnabled} user(login:$owner){login projectV2(number:$number){id number title url public closed viewerCanUpdate items{totalCount} fields(first:100){nodes{'+FIELD_SELECTION+'}} views(first:100){nodes{id number name filter layout}}}}}'
    data=api.graphql(q,{'owner':manifest['project_owner'],'number':manifest['project_number']})
    p=data['user']['projectV2']
    if not p or p['url']!=manifest['project_url'] or p['number']!=3:
        raise ValueError('The exact existing Project 3 could not be verified')
    if not p['viewerCanUpdate']:
        raise PermissionError('Missing Project 3 write permission; project OAuth scope or project access required')
    if not data['repository']['hasIssuesEnabled'] or data['repository']['viewerPermission'] not in {'WRITE','MAINTAIN','ADMIN'}:
        raise PermissionError('Missing repository Issues write permission or Issues are disabled')
    return data,p


def repository_issues(api,repo):
    pages=api.api(f'repos/{repo}/issues?state=all&per_page=100',paginate=True)
    return [issue for page in pages for issue in page if 'pull_request' not in issue]


def native_parents(api,repo):
    owner,name=repo.split('/')
    result={}
    cursor=None
    while True:
        q='query($owner:String!,$name:String!,$cursor:String){repository(owner:$owner,name:$name){issues(first:100,after:$cursor,states:[OPEN,CLOSED]){nodes{number parent{number}}pageInfo{hasNextPage endCursor}}}}'
        page=api.graphql(q,{'owner':owner,'name':name,'cursor':cursor})['repository']['issues']
        result.update({issue['number']:issue['parent']['number'] if issue['parent'] else None for issue in page['nodes']})
        if not page['pageInfo']['hasNextPage']:
            return result
        cursor=page['pageInfo']['endCursor']


def project_items(api,pid):
    result=[]
    cursor=None
    while True:
        q='query($id:ID!,$cursor:String){node(id:$id){... on ProjectV2{items(first:100,after:$cursor){nodes{id isArchived content{... on Issue{id databaseId number title state repository{nameWithOwner}} ... on DraftIssue{id title}} fieldValues(first:100){nodes{'+VALUE_SELECTION+'}}}pageInfo{hasNextPage endCursor}}}}}'
        page=api.graphql(q,{'id':pid,'cursor':cursor})['node']['items']
        result+=page['nodes']
        if not page['pageInfo']['hasNextPage']:
            return result
        cursor=page['pageInfo']['endCursor']


def save(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix(path.suffix+'.tmp')
    temporary.write_text(json.dumps(value,indent=2)+'\n')
    temporary.replace(path)


def merge_options(existing,names):
    originals={option['name'].casefold():option for option in existing}
    targets=list(names)+[option['name'] for option in existing if option['name'].casefold() not in {name.casefold() for name in names}]
    selected=[]
    for name in targets:
        old=originals.get(name.casefold())
        option={'name':name,'color':old.get('color','GRAY') if old else 'GREEN' if name=='Done' else 'BLUE','description':old.get('description','') if old else name}
        if old:
            option['id']=old['id']
        selected.append(option)
    return selected


def configure_fields(api,p,records,apply):
    fields={f['name']:f for f in p['fields']['nodes']}
    options={'Status':STATUSES,**{name:sorted({r[key] for r in records}) for name,key in FIELD_MAP.items()}}
    options['Work Type']=list(dict.fromkeys(options['Work Type']+['Bug']))
    for name,names in options.items():
        existing=fields.get(name)
        if existing and 'options' not in existing:
            raise ValueError(f'Existing {name} is not a single select field; preserving it for review')
        selected=merge_options(existing.get('options',[]) if existing else [],names)
        if existing and selected==existing['options']:
            continue
        print(('Configure field: ' if apply else 'Would configure field: ')+name,flush=True)
        if not apply:
            continue
        if existing:
            q='mutation($input:UpdateProjectV2FieldInput!){updateProjectV2Field(input:$input){projectV2Field{... on ProjectV2SingleSelectField{id name dataType options{id name color description}}}}}'
            fields[name]=api.graphql(q,{'input':{'fieldId':existing['id'],'singleSelectOptions':selected}})['updateProjectV2Field']['projectV2Field']
        else:
            q='mutation($input:CreateProjectV2FieldInput!){createProjectV2Field(input:$input){projectV2Field{... on ProjectV2SingleSelectField{id name dataType options{id name color description}}}}}'
            fields[name]=api.graphql(q,{'input':{'projectId':p['id'],'name':name,'dataType':'SINGLE_SELECT','singleSelectOptions':selected}})['createProjectV2Field']['projectV2Field']
    if 'Story Points' not in fields and 'Estimate' in fields and fields['Estimate']['dataType']=='NUMBER':
        print(('Rename Estimate to Story Points' if apply else 'Would rename Estimate to Story Points'),flush=True)
        if apply:
            api.graphql('mutation($input:UpdateProjectV2FieldInput!){updateProjectV2Field(input:$input){projectV2Field{... on ProjectV2Field{id name dataType}}}}',{'input':{'fieldId':fields['Estimate']['id'],'name':'Story Points'}})
        fields['Story Points']={**fields.pop('Estimate'),'name':'Story Points'}
    for name,kind in [('Historical Period','TEXT'),('Story Points','NUMBER'),('Iteration','ITERATION')]:
        if name in fields:
            continue
        print(('Configure field: ' if apply else 'Would configure field: ')+name,flush=True)
        if apply:
            value={'projectId':p['id'],'name':name,'dataType':kind}
            if kind=='ITERATION':
                value['iterationConfiguration']={'duration':14,'startDate':'2026-10-31','iterations':[]}
            q='mutation($input:CreateProjectV2FieldInput!){createProjectV2Field(input:$input){projectV2Field{'+FIELD_SELECTION+'}}}'
            fields[name]=api.graphql(q,{'input':value})['createProjectV2Field']['projectV2Field']
    return fields


def desired_views():
    return {
        'Product Roadmap':('TABLE_LAYOUT','work-type:Initiative,Epic,Story'),
        'Product Backlog':('BOARD_LAYOUT','is:open -status:Done'),
        'Active Sprint':('BOARD_LAYOUT','is:open iteration:@current -status:Done'),
        'Customer Flutter':('TABLE_LAYOUT','application-surface:"Customer Flutter","All Surfaces"'),
        'Owner Web':('TABLE_LAYOUT','application-surface:"Owner Web","All Surfaces"'),
        'Backend API':('TABLE_LAYOUT','application-surface:"Backend API","All Surfaces",Database'),
        'QA and Bugs':('TABLE_LAYOUT','label:qa,bug'),
        'Historical Completed Work':('TABLE_LAYOUT','status:Done record-classification:"Historical Implementation"'),
        'Release Readiness':('BOARD_LAYOUT','target-release:"Production Readiness"'),
        'Technical Debt':('TABLE_LAYOUT','product-domain:Delivery -status:Done'),
    }


def configure_views(api,p,fields,apply):
    existing={v['name']:v for v in p['views']['nodes']}
    visible=[fields[name]['id'] for name in ['Title','Status','Priority','Work Type','Application Surface','Technical Layer','Product Domain','Record Classification','Historical Period','Iteration'] if name in fields]
    aliases={'Product Backlog':'Backlog','Product Roadmap':'Roadmap'}
    for name,(layout,filter_text) in desired_views().items():
        view=existing.get(name)
        if view is None and name in aliases and aliases[name] in existing:
            previous=existing[aliases[name]]
            print(('Reuse existing view: ' if apply else 'Would reuse existing view: ')+previous['name']+' as '+name,flush=True)
            if apply:
                api.graphql('mutation($input:UpdateProjectV2ViewInput!){updateProjectV2View(input:$input){projectV2View{id name}}}',{'input':{'viewId':previous['id'],'name':name}})
            view={**previous,'name':name}
            existing.pop(aliases[name])
            existing[name]=view
        if not view:
            print(('Create view: ' if apply else 'Would create view: ')+name,flush=True)
            if not apply:
                continue
            q='mutation($input:CreateProjectV2ViewInput!){createProjectV2View(input:$input){projectV2View{id number name filter layout}}}'
            view=api.graphql(q,{'input':{'projectId':p['id'],'name':name,'layout':layout,'configuration':{'visibleFieldIds':visible}}})['createProjectV2View']['projectV2View']
            existing[name]=view
        if apply and (view['filter']!=filter_text or view['layout']!=layout):
            q='mutation($input:UpdateProjectV2ViewInput!){updateProjectV2View(input:$input){projectV2View{id number name filter layout}}}'
            existing[name]=api.graphql(q,{'input':{'viewId':view['id'],'filter':filter_text,'layout':layout,'configuration':{'visibleFieldIds':visible}}})['updateProjectV2View']['projectV2View']
    return existing


def ensure_project_item(api,pid,node_id,cached):
    if node_id in cached:
        return cached[node_id]
    q='mutation($project:ID!,$content:ID!){addProjectV2ItemById(input:{projectId:$project,contentId:$content}){item{id}}}'
    try:
        item=api.graphql(q,{'project':pid,'content':node_id})['addProjectV2ItemById']['item']
    except GitHubError as error:
        if 'Content already exists' not in str(error):
            raise
        current=project_items(api,pid)
        matches=[item for item in current if (item.get('content') or {}).get('id')==node_id]
        if len(matches)!=1:
            raise GitHubError('Auto added item could not be uniquely reconciled') from error
        item=matches[0]
    cached[node_id]=item
    return item


def set_fields(api,pid,item,record,fields):
    existing={v['field']['name']:v.get('name',v.get('text')) for v in item.get('fieldValues',{}).get('nodes',[]) if v.get('field')}
    values={'Status':record['status'],**{name:record[key] for name,key in FIELD_MAP.items()},'Historical Period':record['period']}
    updates=[]
    for name,value in values.items():
        if existing.get(name)==value:
            continue
        field=fields[name]
        selected={'singleSelectOptionId':next(o['id'] for o in field['options'] if o['name']==value)} if 'options' in field else {'text':value}
        updates.append({'projectId':pid,'itemId':item['id'],'fieldId':field['id'],'value':selected})
    if not updates:
        return
    declarations=','.join(f'$i{i}:UpdateProjectV2ItemFieldValueInput!' for i in range(len(updates)))
    mutations=' '.join(f'f{i}:updateProjectV2ItemFieldValue(input:$i{i}){{projectV2Item{{id}}}}' for i in range(len(updates)))
    api.graphql('mutation('+declarations+'){'+mutations+'}',{f'i{i}':value for i,value in enumerate(updates)})


def execute(args):
    manifest=json.loads(MANIFEST.read_text())
    validate(manifest)
    records=manifest['issues']
    if args.validate_only:
        print(json.dumps({'valid':True,'issues':len(records),'status_counts':dict(Counter(r['status'] for r in records))}))
        return
    api=GitHub()
    baseline,p=project(api,manifest)
    issues=repository_issues(api,manifest['repository'])
    items=project_items(api,p['id'])
    state=json.loads(STATE.read_text()) if STATE.exists() else {'repository':manifest['repository'],'project_url':p['url'],'records':{},'initial_issues':len(issues),'initial_project_items':len(items)}
    audit={**baseline,'project_items':items,'repository_issues':issues}
    audit['repository_issues']=[{k:i.get(k) for k in ['number','id','node_id','title','html_url','state','labels','created_at','closed_at']} for i in issues]
    save(ROOT/'docs/agile/github-audit.json',audit)
    print(json.dumps({'viewer':baseline['viewer']['login'],'repository_permission':baseline['repository']['viewerPermission'],'project_write':p['viewerCanUpdate'],'existing_issues':len(issues),'project_items':len(items),'project_url':p['url']}),flush=True)
    if args.audit_only:
        return
    fields=configure_fields(api,p,records,args.apply) if args.configure else {f['name']:f for f in p['fields']['nodes']}
    if args.configure:
        configured_views=configure_views(api,p,fields,args.apply)
        if args.apply:
            state['configured_views']=[{**view,'url':p['url']+'/views/'+str(view['number'])} for view in configured_views.values()]
            save(STATE,state)
    if args.configure_only:
        return
    matched={r['key']:match_issue(r,issues) for r in records}
    matched_numbers=[issue['number'] for issue in matched.values() if issue]
    if len(set(matched_numbers))!=len(matched_numbers):
        raise ValueError('Multiple manifest records match the same existing repository issue')
    absent=[r for r in records if matched[r['key']] is None]
    issue_items={item['content']['id']:item for item in items if item.get('content')}
    print(json.dumps({'new_issues_needed':len(absent),'existing_manifest_issues':len(records)-len(absent),'dry_run':not args.apply}),flush=True)
    if not args.apply:
        for r in absent:
            print('Would publish '+r['key']+': '+r['title'],flush=True)
        return
    quality=lambda r:r['surface']=='QA' or r['layer']=='Quality'
    existing_labels=[label for page in api.api(f'repos/{manifest["repository"]}/labels?per_page=100',paginate=True) for label in page]
    if not any(label['name']=='qa' for label in existing_labels):
        api.api(f'repos/{manifest["repository"]}/labels','POST',{'name':'qa','color':'7057ff','description':'Quality assurance and acceptance verification'})
    parent_numbers=native_parents(api,manifest['repository'])
    published={}
    for r in records:
        issue=matched[r['key']]
        created=issue is None
        if issue and r.get('reuse_number') and ('Tracking key: '+r['key']) not in (issue.get('body') or '').splitlines():
            text=r['body']+'\n## Original Requirement Record\n\n'+(issue.get('body') or '')
            if r['parent']:
                text+='\n## Parent Issue\n\n'+published[r['parent']]['html_url']+'\n'
            issue=api.api(f'repos/{manifest["repository"]}/issues/{issue["number"]}','PATCH',{'body':text})
        if not issue:
            text=r['body']
            if r['parent']:
                text+='\n## Parent Issue\n\n'+published[r['parent']]['html_url']+'\n'
            issue=api.api(f'repos/{manifest["repository"]}/issues','POST',{'title':r['title'],'body':text,**({'labels':['qa']} if quality(r) else {})})
            matched[r['key']]=issue
            print('Published '+r['key']+' '+issue['html_url'],flush=True)
        if quality(r) and 'qa' not in {label['name'] for label in issue.get('labels',[])}:
            api.api(f'repos/{manifest["repository"]}/issues/{issue["number"]}/labels','POST',{'labels':['qa']})
        updated_body=reconcile_body(r,issue.get('body') or '')
        if updated_body!=(issue.get('body') or '') and ('Tracking key: '+r['key']) in (issue.get('body') or '').splitlines():
            issue=api.api(f'repos/{manifest["repository"]}/issues/{issue["number"]}','PATCH',{'body':updated_body})
        published[r['key']]=issue
        was_created=state['records'].get(r['key'],{}).get('created_by_publisher',created)
        state['records'][r['key']]={'created_by_publisher':was_created,'number':issue['number'],'url':issue['html_url'],'parent_number':published[r['parent']]['number'] if r['parent'] else None,'classification':r['classification'],'surface':r['surface'],'period':r['period'],'status':r['status']}
        save(STATE,state)
        if r['parent']:
            parent=parent_numbers.get(issue['number'])
            expected=published[r['parent']]
            if parent is not None and parent!=expected['number']:
                raise ValueError('Existing issue has a different native parent; refusing to replace it')
            if parent is None:
                api.api(f'repos/{manifest["repository"]}/issues/{expected["number"]}/sub_issues','POST',{'sub_issue_id':issue['id']})
                parent_numbers[issue['number']]=expected['number']
        if args.auto_add_probe and r['key'] in {'WSP.STORY.STORYBOOK','WSP.STORY.STORYBOOK.TASK1'} and issue['node_id'] not in issue_items:
            observed=False
            for delay in [0,3,7,15,20]:
                time.sleep(delay)
                refreshed=project_items(api,p['id'])
                issue_items.update({i['content']['id']:i for i in refreshed if i.get('content')})
                if issue['node_id'] in issue_items:
                    observed=True
                    break
            state.setdefault('auto_add_probes',{})[r['key']]={'url':issue['html_url'],'native_subissue':bool(r['parent']),'automatically_added':observed}
            save(STATE,state)
            print('Auto add probe '+r['key']+': '+str(observed),flush=True)
        item=ensure_project_item(api,p['id'],issue['node_id'],issue_items)
        if item.get('isArchived'):
            raise ValueError('Expected project item is archived; preserving it for explicit review')
        set_fields(api,p['id'],item,r,fields)
        if r['status']=='Done' and issue['state']=='open':
            api.api(f'repos/{manifest["repository"]}/issues/{issue["number"]}','PATCH',{'state':'closed','state_reason':'completed'})
        state['records'][r['key']]['project_item_id']=item['id']
        save(STATE,state)
    if args.backfill_existing:
        for issue in issues:
            if issue['node_id'] not in issue_items:
                ensure_project_item(api,p['id'],issue['node_id'],issue_items)
                print('Backfilled existing issue '+issue['html_url'],flush=True)
    current=project_items(api,p['id'])
    final_parents=native_parents(api,manifest['repository'])
    counts=Counter(i['content']['id'] for i in current if i.get('content'))
    failures=[]
    current_by_content={i['content']['id']:i for i in current if i.get('content')}
    records_by_key={r['key']:r for r in records}
    for key,issue in published.items():
        if counts[issue['node_id']]!=1:
            failures.append(key+' project membership count != 1')
        remote=current_by_content.get(issue['node_id'])
        if remote:
            actual={v['field']['name']:v.get('name',v.get('text')) for v in remote['fieldValues']['nodes'] if v.get('field')}
            expected_record=records_by_key[key]
            expected_values={'Status':expected_record['status'],**{name:expected_record[field] for name,field in FIELD_MAP.items()},'Historical Period':expected_record['period']}
            for name,value in expected_values.items():
                if actual.get(name)!=value:
                    failures.append(key+' field mismatch: '+name)
        if state['records'][key]['parent_number']:
            if final_parents.get(issue['number'])!=state['records'][key]['parent_number']:
                failures.append(key+' native parent mismatch')
    final_issues=repository_issues(api,manifest['repository'])
    missing=[r['key'] for r in records if match_issue(r,final_issues) is None]
    state['verification']={'project_items':len(current),'expected_issues':len(records),'native_links':sum(r['parent'] is not None for r in records),'missing':missing,'failures':failures,'idempotent_new_issues_needed':len(missing),'verified_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'mutations_this_run':api.mutations}
    save(STATE,state)
    print(json.dumps(state['verification']),flush=True)
    if failures or missing:
        raise ValueError('Remote verification failed')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--apply',action='store_true')
    parser.add_argument('--validate-only',action='store_true')
    parser.add_argument('--audit-only',action='store_true')
    parser.add_argument('--configure',action='store_true')
    parser.add_argument('--configure-only',action='store_true')
    parser.add_argument('--backfill-existing',action='store_true')
    parser.add_argument('--auto-add-probe',action='store_true')
    args=parser.parse_args()
    try:
        execute(args)
    except (GitHubError,ValueError,PermissionError,subprocess.CalledProcessError) as error:
        print(str(error),file=sys.stderr)
        return 1
    return 0

if __name__=='__main__':
    sys.exit(main())
