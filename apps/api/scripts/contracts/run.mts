import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { expect } from 'chai';
const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const ajv = new Ajv({allErrors:true,strict:false,validateFormats:false});
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const collection = JSON.parse(await readFile(path.join(root,'docs/postman/WeStayPlace_API_Complete.postman_collection.json'),'utf8'));
const envPath = process.env.POSTMAN_ENVIRONMENT;
const environment = JSON.parse(await readFile(envPath ?? path.join(root,'docs/postman/WeStayPlace_Development.postman_environment.json'),'utf8'));
const values = new Map([...collection.variable,...environment.values.filter((v:any)=>v.enabled)].map((v:any)=>[v.key,v.value]));
const args = new Set(process.argv.slice(2));
const base = new URL(String(values.get('base_url')));
if (values.get('environment') === 'production') throw Error('This runner never executes against production');
if (!['localhost','127.0.0.1','[::1]'].includes(base.hostname) && !args.has('--allow-remote-staging')) throw Error('Remote staging requires --allow-remote-staging and a disposable test tenant');
if (args.has('--mutations') && values.get('allow_mutations') !== 'true') throw Error('Set allow_mutations=true in a disposable fixture environment');
const interpolate = (s:string) => s.replace(/\{\{([^}]+)\}\}/g,(_,key)=>{
  const value = values.get(key);
  if (value) return String(value);
  if (args.has('--unauthorized') && /_id$/.test(key)) return '00000000-0000-4000-8000-000000000001';
  throw Error(`Missing fixture variable: ${key}`);
});
const reports:any[] = [];
for (const folder of collection.item) for (const item of folder.item) {
  const request = item.request;
  const isRead = request.method === 'GET';
  const authenticated = request.auth.type === 'bearer';
  const selected = args.has('--unauthorized') ? isRead && authenticated : args.has('--mutations') ? !isRead : args.has('--all-reads') ? isRead : item.name.endsWith('GET /health');
  if (!selected) continue;
  const report:any = {name:item.name,assertions:[],passed:false};
  reports.push(report);
  try {
    if (args.has('--unauthorized')) values.set('expected_status','401');
    const headers = Object.fromEntries(request.header.map((h:any)=>[h.key,interpolate(h.value)]));
    if (authenticated && !args.has('--unauthorized')) headers.Authorization = `Bearer ${interpolate('{{access_token}}')}`;
    let skipped = false;
    const variables = {get:(key:string)=>values.get(key)};
    const pm:any = {variables,request:{method:request.method},execution:{skipRequest:()=>{skipped=true;}}};
    vm.runInNewContext(collection.event[0].script.exec.join('\n'),{pm},{timeout:1000});
    if (skipped) throw Error('Collection safety guard skipped request');
    const query = request.url.query.filter((q:any)=>!q.disabled).map((q:any)=>[q.key,interpolate(q.value)]);
    const url = new URL(interpolate(request.url.raw).split('?')[0]);
    for (const [key,value] of query) url.searchParams.set(key,value);
    const response = await fetch(url,{method:request.method,headers,...request.body?{body:interpolate(request.body.raw)}:{},signal:AbortSignal.timeout(20000)});
    const body = await response.text();
    pm.response = {code:response.status,json:()=>JSON.parse(body),to:{have:{
      status:(status:number)=>expect(response.status).to.equal(status),
      jsonSchema:(schema:any)=>{expect(ajv.validate(schema,JSON.parse(body)),JSON.stringify(ajv.errors)).to.equal(true);},
    }}};
    pm.expect = expect;
    pm.test = (name:string, test:()=>void)=>{test();report.assertions.push(name);};
    for (const event of item.event) if(event.listen==='test') vm.runInNewContext(event.script.exec.join('\n'),{pm},{timeout:1000});
    report.status=response.status;report.passed=true;
  } catch(error) {report.error=error instanceof Error?error.message:'Request failed';}
}
const output = {mode:args.has('--unauthorized')?'unauthorized':args.has('--mutations')?'mutations':args.has('--all-reads')?'reads':'health',executed:reports.length,passed:reports.filter(r=>r.passed).length,results:reports};
await writeFile(process.env.POSTMAN_REPORT ?? '/tmp/westayplace-api-report.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({executed:output.executed,passed:output.passed}));
if(output.passed!==output.executed || !output.executed) process.exitCode=1;
