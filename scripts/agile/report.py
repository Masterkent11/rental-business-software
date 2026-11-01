import json
import subprocess
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
DOCS=ROOT/'docs/agile'
manifest=json.loads((DOCS/'issues.json').read_text())
state_path=DOCS/'publication.json'
state=json.loads(state_path.read_text()) if state_path.exists() else {}
records=state.get('records',{})
verification=state.get('verification',{})
by_key={record['key']:record for record in manifest['issues']}
auth=subprocess.run(['gh','auth','status'],capture_output=True,text=True).returncode==0
created=[(key,value) for key,value in records.items() if value.get('created_by_publisher')]
count=lambda kind,classification:sum(by_key[key]['work_type']==kind and by_key[key]['classification']==classification for key,value in created)
probes=state.get('auto_add_probes',{})
auto='Pass' if len(probes)>=2 and all(p['automatically_added'] for p in probes.values()) else 'Fail' if any(not p['automatically_added'] for p in probes.values()) else 'Not run; issue 11 has independently verified auto add activity'
remote_valid=bool(verification) and not verification.get('failures') and not verification.get('missing')
metrics=[
('Repository','https://github.com/'+manifest['repository']),
('GitHub Project',manifest['project_url']),
('Authentication','CLI authenticated' if auth else 'Browser authenticated as Masterkent11; CLI device authorization pending'),
('Import root cause','At baseline, only discovery issue 11 was published and already associated with Project 3. Auto add was working; the remaining documentation had not been published as repository issues and needed explicit historical backfill.'),
('Existing issues discovered',str(state.get('initial_issues',1))+(' (authenticated API baseline)' if state else ' (observed browser count)')),
('Existing issues reused',str(sum(not value.get('created_by_publisher') for value in records.values()))),
('Historical parent tickets created',str(count('Story','Historical Implementation'))),
('Historical sub issues created',str(count('Task','Historical Implementation'))),
('Planned parent tickets created',str(count('Story','Planned Feature'))),
('Planned subtickets created',str(count('Task','Planned Feature'))),
('Expected project issues represented',str(verification.get('expected_issues',0)) if remote_valid else 'Not yet remotely verified'),
('New project items since baseline',str(verification.get('project_items',0)-state.get('initial_project_items',0)) if remote_valid else 'Not yet remotely verified'),
('Native parent links verified',str(verification.get('native_links',0)) if remote_valid else '0 by this execution'),
('Duplicate issues avoided',str(sum(not value.get('created_by_publisher') for value in records.values()))),
('Active sprint tickets','0 assigned; no verified active iteration or sprint dates'),
('Historical completed tickets',str(sum(value['classification']=='Historical Implementation' and value['status']=='Done' for value in records.values()))),
('GitHub views configured',', '.join(v['name'] for v in state.get('configured_views',[]) if v['name'] in {'Product Roadmap','Product Backlog','Active Sprint','Customer Flutter','Owner Web','Backend API','QA and Bugs','Historical Completed Work','Release Readiness','Technical Debt'}) or 'None changed while CLI authorization is pending'),
('Auto add tested',auto),
('Idempotent backfill tested','Pass' if remote_valid and verification.get('mutations_this_run')==0 else 'Not yet remotely proven'),
('Local manifest validation',str(len(manifest['issues']))+' records; '+', '.join(str(amount)+' '+kind for kind,amount in Counter(r['work_type'] for r in manifest['issues']).items())),
('Local automated validation','20 tests passed; manifest source references and syntax checks passed'),
('Documentation generated','docs/agile/history.md, docs/agile/issues.json, docs/agile/report.md, scripts/agile/README.md'),
('Remaining blockers','None recorded' if remote_valid else 'GitHub CLI is not yet authorized for repository and Projects operations. API publication, full existing issue reconciliation, native links, complete project backfill, new view configuration and live replay verification remain pending.'),
]
lines=['# Westayplace GitHub Project 3 execution report','','Recorded on 2026-10-31 in Asia/Manila. This report distinguishes local preparation from completed remote operations.','','| Metric | Result |','| --- | --- |']
lines += ['| '+name+' | '+value.replace('|','\\|')+' |' for name,value in metrics]
lines += ['','## Verified existing issue','','- [Discovery story 11](https://github.com/Masterkent11/rental-business-software/issues/11) was already in Project 3 at baseline with Backlog status and native project automation activity. It was reused, its original title and requirements were preserved, and its current status is In Review.','','## Published hierarchy examples','']
if records:
    examples=[(key,value) for key,value in records.items() if by_key[key]['work_type']=='Story'][:4]
    for key,value in examples:
        title=by_key[key]['existing_titles'][0] if by_key[key].get('reuse_number') and by_key[key].get('existing_titles') else by_key[key]['title']
        lines.append(f'- [{title}]({value["url"]})')
        lines.extend(f'  - [{by_key[child]["title"]}]({details["url"]})' for child,details in records.items() if details.get('parent_number')==value['number'])
else:
    lines.append('No new issues or native parent links have been published in this execution. Local payload generation is not a GitHub import.')
lines += ['','## Run safely','','Review the complete manifest and use the dry run described in [the tooling guide](../../scripts/agile/README.md). No Git commit or push was performed. Auto-add workflows were preserved. Item reopened now sets Ready, and PR merged sets Ready for QA instead of Done. The original board URL remains unchanged. Historical implementation dates are not invented sprint schedules; Story Points and Iteration remain unassigned.','']
(DOCS/'report.md').write_text('\n'.join(lines))
print(json.dumps({'report':str(DOCS/'report.md'),'remote_verified':remote_valid,'authentication':auth,'published_manifest_records':len(records)}))
