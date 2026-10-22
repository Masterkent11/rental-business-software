import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { Ajv } from 'ajv';
import { createRequire } from 'node:module';
const AjvDraft4 = createRequire(import.meta.url)('ajv-draft-04');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const load=async(name:string)=>JSON.parse(await readFile(path.join(root,name),'utf8'));
const routes=await load('docs/api/registered-routes.json');
const spec=await load('docs/api/openapi.json');
const collection=await load('docs/postman/WeStayPlace_API_Complete.postman_collection.json');
const schema=JSON.parse(await readFile(new URL('./postman-v2.1.schema.json',import.meta.url),'utf8'));
const ajv=new Ajv({strict:false,validateFormats:false});
const postmanValidator=new AjvDraft4({strict:false,validateFormats:false});
assert(postmanValidator.validate(schema,collection),JSON.stringify(postmanValidator.errors));
assert(!JSON.stringify(spec).includes('__brand'), 'Domain brands must serialize as primitives');
const keys=routes.map((r:any)=>`${r.method} ${r.path}`).sort();
const openapi=Object.entries(spec.paths).flatMap(([p,ops]:any)=>Object.keys(ops).map(m=>`${m.toUpperCase()} ${p}`)).sort();
const requests=collection.item.flatMap((f:any)=>f.item);
const postman=requests.map((i:any)=>i.name.replace(/^\[[^\]]+\] /,'').replace(/:([\w]+)/g,'{$1}')).sort();
assert.deepEqual(keys,openapi);assert.deepEqual(keys,postman);
assert.equal(new Set(keys).size,keys.length);
for(const env of ['Development','Staging','Production']) {
  const template=await load(`docs/postman/WeStayPlace_${env}.postman_environment.json`);
  assert.equal(template.values.find((v:any)=>v.key==='allow_mutations').value,'false');
  for(const value of template.values) if(/token$/.test(value.key)) assert.equal(value.value,'');
}
let unresolved=0;
function walk(value:any) {
  if(!value || typeof value!=='object')return;
  if(value['x-unresolved'])unresolved++;
  if(value.type || value.anyOf || value.oneOf) assert(ajv.validateSchema(value),JSON.stringify(ajv.errors));
  for(const child of Object.values(value))walk(child);
}
// Validate actual schema roots rather than treating examples as schema declarations.
for(const operations of Object.values(spec.paths) as any[])for(const operation of Object.values(operations) as any[]) {
  for(const parameter of operation.parameters)walk(parameter.schema);
  if(operation.requestBody)walk(operation.requestBody.content['application/json'].schema);
  for(const response of Object.values(operation.responses) as any[])walk(response.content['application/json'].schema);
}
const summary={registered:keys.length,openapi:openapi.length,postman:postman.length,unresolvedSchemaNodes:unresolved};
await writeFile(path.join(root,'docs/api/contract-validation.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
