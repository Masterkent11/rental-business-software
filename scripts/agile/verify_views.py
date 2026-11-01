import json
import subprocess
import sys
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
DOCS=ROOT/'docs/agile'
manifest=json.loads((DOCS/'issues.json').read_text())
state=json.loads((DOCS/'publication.json').read_text())
records=manifest['issues']
expected={
    'Product Roadmap':sum(r['work_type'] in {'Initiative','Epic','Story'} for r in records),
    'Product Backlog':sum(r['status']!='Done' for r in records),
    'Active Sprint':0,
    'Customer Flutter':sum(r['surface'] in {'Customer Flutter','All Surfaces'} for r in records),
    'Owner Web':sum(r['surface'] in {'Owner Web','All Surfaces'} for r in records),
    'Backend API':sum(r['surface'] in {'Backend API','All Surfaces','Database'} for r in records),
    'QA and Bugs':sum(r['surface']=='QA' or r['layer']=='Quality' for r in records),
    'Historical Completed Work':sum(r['status']=='Done' and r['classification']=='Historical Implementation' for r in records),
    'Release Readiness':sum(r['release']=='Production Readiness' for r in records),
    'Technical Debt':sum(r['domain']=='Delivery' and r['status']!='Done' for r in records),
}
views=[v for v in state['configured_views'] if v['name'] in expected]
if set(v['name'] for v in views)!=set(expected):
    raise ValueError('A required saved view is missing')

def verify(view):
    endpoint='users/Masterkent11/projectsV2/3/items?'+urllib.parse.urlencode({'q':view['filter'] or '', 'per_page':100})
    pages=json.loads(subprocess.check_output(['gh','api',endpoint,'--paginate','--slurp'],text=True))
    actual=sum(len(page) for page in pages)
    return {'name':view['name'],'url':view['url'],'filter':view['filter'],'expected':expected[view['name']],'actual':actual,'pass':actual==expected[view['name']]}

with ThreadPoolExecutor(max_workers=4) as executor:
    results=list(executor.map(verify,views))
report={'verified_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'views':results,'pass':all(r['pass'] for r in results)}
(DOCS/'view-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
sys.exit(0 if report['pass'] else 1)
