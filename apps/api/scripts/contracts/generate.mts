import ts from 'typescript';
import { z } from 'zod';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const api = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.resolve(api, '../..');
const config = ts.readConfigFile(path.join(api, 'tsconfig.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, api);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const decorators = (node: ts.Node) => ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
function dec(node: ts.Node, name: string) {
  return decorators(node).map(d => d.expression).find(e => ts.isCallExpression(e) && e.expression.getText() === name) as ts.CallExpression | undefined;
}
function declaration(node: ts.Node) {
  let symbol = checker.getSymbolAtLocation(node);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return symbol?.valueDeclaration ?? symbol?.declarations?.[0];
}
const controllers = new Set<ts.ClassDeclaration>();
const modules = new Set<ts.ClassDeclaration>();
function register(module: ts.ClassDeclaration) {
  if (modules.has(module)) return;
  modules.add(module);
  const metadata = dec(module, 'Module')?.arguments[0];
  if (!metadata || !ts.isObjectLiteralExpression(metadata)) throw Error('Unsupported module metadata');
  for (const property of metadata.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = property.name.getText();
    if (!['imports', 'controllers'].includes(key)) continue;
    if (!ts.isArrayLiteralExpression(property.initializer)) throw Error(`Unsupported registration: ${key}`);
    for (const item of property.initializer.elements) {
      const target = declaration(item);
      if (!target || !ts.isClassDeclaration(target)) throw Error(`Unresolved registration: ${item.getText()}`);
      if (key === 'imports') register(target); else controllers.add(target);
    }
  }
}
const appFile = program.getSourceFile(path.join(api, 'src/app.module.ts'))!;
register(appFile.statements.find(s => ts.isClassDeclaration(s) && s.name?.text === 'AppModule') as ts.ClassDeclaration);
const main = await readFile(path.join(api, 'src/main.ts'), 'utf8');
if (/setGlobalPrefix|enableVersioning|RouterModule/.test(main)) throw Error('Update generator for global routing configuration');
type Schema = Record<string, any>;
function schema(type: ts.Type, depth = 0, ancestors = new Set<ts.Type>()): Schema {
  if (depth > 20 || ancestors.has(type)) return { 'x-unresolved': 'recursive/deep type' };
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return { 'x-unresolved': checker.typeToString(type) };
  if (type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void | ts.TypeFlags.Null)) return { type: 'null' };
  if (type.isIntersection()) {
    const primitive=type.types.find(t=>t.flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.StringLike));
    if(primitive) return primitive.flags & ts.TypeFlags.NumberLike ? {type:type.aliasSymbol?.name==='Centavos'?'integer':'number'} : {type:'string'};
  }
  if (type.isStringLiteral()) return { type: 'string', const: type.value };
  if (type.isNumberLiteral()) return { type: 'number', const: type.value };
  if (type.flags & ts.TypeFlags.BooleanLiteral) return { type: 'boolean', const: checker.typeToString(type) === 'true' };
  if (type.isUnion()) {
    const types = type.types.filter(t => !(t.flags & ts.TypeFlags.Undefined));
    return types.length === 1 ? schema(types[0]!, depth + 1, ancestors) : { anyOf: types.map(t => schema(t, depth + 1, ancestors)) };
  }
  if (type.flags & ts.TypeFlags.StringLike) return { type: 'string' };
  if (type.flags & ts.TypeFlags.NumberLike) return { type: 'number' };
  if (type.flags & ts.TypeFlags.BooleanLike) return { type: 'boolean' };
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    return { type: 'array', items: schema(checker.getTypeArguments(type as ts.TypeReference)[0]!, depth + 1, ancestors) };
  }
  if (type.getSymbol()?.name === 'Date') return { type: 'string', format: 'date-time' };
  const seen = new Set(ancestors).add(type);
  const properties: Schema = {}, required: string[] = [];
  for (const prop of type.getProperties()) {
    const at = prop.valueDeclaration ?? prop.declarations?.[0];
    if (!at) continue;
    properties[prop.name] = schema(checker.getTypeOfSymbolAtLocation(prop, at), depth + 1, seen);
    if (!(prop.flags & ts.SymbolFlags.Optional)) required.push(prop.name);
  }
  const index = type.getStringIndexType();
  return { type: 'object', properties, ...(required.length ? { required } : {}),
    ...(index ? { additionalProperties: schema(index, depth + 1, seen) } : {}) };
}
function authorizationEvidence(method: ts.MethodDeclaration, controller: ts.ClassDeclaration) {
  const visited = new Set<ts.Node>();
  const sources = new Set<string>();
  const rules = new Set<string>();
  function inspect(node: ts.Node, depth: number) {
    if (depth > 10 || visited.has(node)) return;
    visited.add(node);
    const file = node.getSourceFile();
    if (file.fileName.includes('/application/') || file.fileName.includes('/domain/')) {
      sources.add(path.relative(root,file.fileName));
    }
    function visit(child: ts.Node) {
      if (ts.isCallExpression(child)) {
        const text = child.expression.getText();
        if (/assertMay|assertCan|hasCapability|assert.*Owner|assert.*Participant/.test(text)) rules.add(text);
        let target = declaration(ts.isPropertyAccessExpression(child.expression) ? child.expression.name : child.expression);
        if (target && ts.isParameter(target) && target.type && ts.isTypeReferenceNode(target.type)) {
          const query = target.type.typeArguments?.[0];
          if (query && ts.isTypeQueryNode(query)) target = declaration(query.exprName);
        }
        if (target && (target.getSourceFile().fileName.includes('/application/') || target.getSourceFile().fileName.includes('/domain/'))) inspect(target, depth + 1);
      }
      ts.forEachChild(child,visit);
    }
    visit(node);
  }
  inspect(method,0);
  return { rules:[...rules].sort(),sources:[...sources].sort(),review:'Call-graph evidence only; port implementations, RLS, and dynamic checks require behavioral verification' };
}
const schemaCache = new Map<string, Schema>();
async function zodSchema(node: ts.Node): Promise<Schema | undefined> {
  const target = declaration(node);
  if (!target || !ts.isVariableDeclaration(target)) return;
  const source = target.getSourceFile();
  if (!source.fileName.includes('/dto/')) return;
  const key = source.fileName + ':' + target.name.getText();
  if (schemaCache.has(key)) return schemaCache.get(key);
  const exports = await import(pathToFileURL(source.fileName).href);
  const value = exports[target.name.getText()];
  if (!value?._zod) return;
  const result = z.toJSONSchema(value, { io: 'input', unrepresentable: 'any' }) as Schema;
  delete result.$schema;
  schemaCache.set(key, result);
  return result;
}
async function inputSchema(method: ts.MethodDeclaration, parameter: ts.ParameterDeclaration) {
  const name = parameter.name.getText();
  const candidates: ts.Node[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      if (ts.isPropertyAccessExpression(node.expression) && ['safeParse', 'parse'].includes(node.expression.name.text) &&
          node.arguments.some(a => new RegExp(`\\b${name}\\b`).test(a.getText()))) candidates.push(node.expression.expression);
      if (ts.isIdentifier(node.expression) && /parse|filters/.test(node.expression.text) &&
          node.arguments.some(a => a.getText() === name) && node.arguments[0]) candidates.push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }
  if (method.body) visit(method.body);
  if (method.getSourceFile().fileName.endsWith('/notifications.controller.ts')) {
    const source = program.getSourceFile(path.join(api, 'src/modules/notifications/dto/notifications.dto.ts'))!;
    for (const statement of source.statements) if (ts.isVariableStatement(statement)) {
      for (const item of statement.declarationList.declarations) if (item.name.getText() === 'markReadSchema') candidates.push(item.name);
    }
  }
  if (method.getSourceFile().fileName.endsWith('/get-me.controller.ts')) {
    return {type:'object', properties:{displayName:{type:'string',maxLength:120}},required:['displayName']};
  }

  for (const node of candidates) {
    const result = await zodSchema(node);
    if (result) return result;
  }
  return { 'x-unresolved': 'Transport schema requires manual review', type: 'object' };
}
function example(s: Schema, name = ''): any {
  if ('const' in s) return s.const;
  if (s.enum) return s.enum[0];
  if ('default' in s) return s.default;
  if (s.anyOf || s.oneOf) return example((s.anyOf ?? s.oneOf).find((x: Schema) => x.type !== 'null') ?? {type:'null'}, name);
  if (s.type === 'null') return null;
  if (s.type === 'object') return Object.fromEntries(Object.entries(s.properties ?? {}).filter(([k]) => (s.required ?? []).includes(k)).map(([k,v]) => [k,example(v as Schema,k)]));
  if (s.type === 'array') return Array.from({length: s.minItems ?? 0}, () => example(s.items ?? {}));
  if (s.type === 'boolean') return false;
  if (s.type === 'number' || s.type === 'integer') return s.minimum ?? (s.exclusiveMinimum !== undefined ? s.exclusiveMinimum + 1 : 1);
  if (s.format === 'uuid' || s.format === 'guid' || /Id$|idempotencyKey/.test(name)) return '00000000-0000-4000-8000-000000000001';
  if (s.format === 'date-time') return '2027-01-01T00:00:00.000Z';
  if (s.format === 'email') return 'synthetic@example.com';
  if (s.format === 'uri' || s.format === 'url') return 'https://example.com';
  if (s.pattern?.includes('\\d{4}') || /^(startsOn|endsOn|from|to|moveInDate|dateOfBirth)$/.test(name)) return /endsOn|to/.test(name) ? '2027-01-03' : '2027-01-01';
  return 'synthetic'.padEnd(s.minLength ?? 0,'x').slice(0,s.maxLength ?? 120);
}
const errorSchema = { type:'object', required:['statusCode','code','title','message'], properties: {
  statusCode:{type:'integer'},code:{type:'string'},title:{type:'string'},message:{type:'string'} } };
const paths: Schema = {}, routes: any[] = [], folders = new Map<string, any[]>();
const variables = new Set(['access_token','refresh_token','user_id','owner_id','organization_id','property_id','listing_id','booking_id','application_id','invoice_id','payment_id','conversation_id']);
const snake = (s: string) => s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
for (const controller of [...controllers].sort((a,b)=>a.getSourceFile().fileName.localeCompare(b.getSourceFile().fileName))) {
  const source = controller.getSourceFile();
  const prefix = (dec(controller,'Controller')?.arguments[0] as ts.StringLiteral | undefined)?.text ?? '';
  const moduleName = source.fileName.match(/modules\/([^/]+)/)?.[1] ?? 'health';
  for (const method of controller.members) {
    if (!ts.isMethodDeclaration(method)) continue;
    const http = ['Get','Post','Put','Patch','Delete','Options','Head','Sse'].find(d=>dec(method,d));
    if (!http) continue;
    if (http === 'Sse') throw Error('Document SSE separately');
    const subpath = (dec(method,http)?.arguments[0] as ts.StringLiteral)?.text ?? '';
    const route = ('/'+prefix+'/'+subpath).replace(/\/{2,}/g,'/').replace(/\/$/,'') || '/';
    const resolved = route.replace(/:([\w]+)/g,'{$1}');
    const code = Number(dec(method,'HttpCode')?.arguments[0]?.getText() ?? (http === 'Post' ? 201 : 200));
    const optionalAuth = ['/discovery/recommendations', '/support/requests'].includes(route);
    const auth = !optionalAuth && method.parameters.some(p=>dec(p,'Headers')?.arguments[0]?.getText().includes('authorization'));
    const signature = checker.getSignatureFromDeclaration(method)!;
    const output = schema(checker.getAwaitedType(checker.getReturnTypeOfSignature(signature))!);
    const parameters: any[] = [];
    let body: Schema | undefined;
    for (const param of method.parameters) {
      const pathDec = dec(param,'Param'), queryDec = dec(param,'Query'), headerDec = dec(param,'Headers');
      if (pathDec) parameters.push({ name:(pathDec.arguments[0] as ts.StringLiteral).text,in:'path',required:true,schema:{type:'string'} });
      if (queryDec) {
        const key = (queryDec.arguments[0] as ts.StringLiteral)?.text;
        const input = await inputSchema(method,param);
        if (key) parameters.push({name:key,in:'query',required:!param.questionToken,schema:schema(checker.getTypeAtLocation(param))});
        else for (const [name,s] of Object.entries(input.properties ?? {})) parameters.push({name,in:'query',required:input.required?.includes(name) ?? false,schema:s});
      }
      if (headerDec) {
        const name = (headerDec.arguments[0] as ts.StringLiteral)?.text;
        if (name && name !== 'authorization') parameters.push({name,in:'header',required:false,schema:{type:'string'}});
      }
      if (dec(param,'Body')) body = await inputSchema(method,param);
    }
    if (route === '/webhooks/payments') body = { type:'object', required:['eventId','providerRef','amountCentavos'], properties:{eventId:{type:'string'},providerRef:{type:'string'},amountCentavos:{type:'integer'},status:{type:'string'},occurredAt:{type:'string',format:'date-time'}} };
    const response = { description:'Successful response (inferred from handler return type)',content:{'application/json':{schema:output,example:example(output)}} };
    const operationId = `${controller.name?.text}_${method.name.getText()}`;
    const responses: Schema = {[code]:response};
    for (const status of [400,...auth?[401,403]:[],404,409,413,422,429,500,503]) responses[status] = {
      description:'Possible global transport/domain error; applicability depends on input and use case',content:{'application/json':{schema:errorSchema}} };
    const classification = [http==='Get'?'read-only':http==='Delete'?'destructive':'mutating',
      .../payments|collection/.test(moduleName)?['payment-related']:[],
      .../verification|messages|applications/.test(route)?['sensitive-data-related']:[]];
    const authorization = authorizationEvidence(method,controller);
    const operation = {operationId,tags:[moduleName],summary:method.name.getText(),security:optionalAuth?[{}, {bearerAuth:[]}]:auth?[{bearerAuth:[]}]:[],parameters,
      ...(body?{requestBody:{required:true,content:{'application/json':{schema:body,example:example(body)}}}}:{}),responses,
      'x-source':path.relative(root,source.fileName)+':'+(source.getLineAndCharacterOfPosition(method.getStart()).line+1),
      'x-authorization-evidence':authorization,
      'x-classification':classification};
    paths[resolved] ??= {};
    if (paths[resolved][http.toLowerCase()]) throw Error(`Duplicate route ${http} ${resolved}`);
    paths[resolved][http.toLowerCase()] = operation;
    const query = parameters.filter(p=>p.in==='query').map(p=>({key:p.name,value:String(example(p.schema,p.name)),disabled:!p.required}));
    const rawPath = route.replace(/:([\w]+)/g,(_,name)=>{const previous=route.slice(0,route.indexOf(':'+name)).split('/').filter(Boolean).at(-1) ?? moduleName;const variable=snake(name==='id'?`${previous.replace(/ies$/,'y').replace(/s$/,'').replace(/-/g,'_')}_id`:name);variables.add(variable);return `{{${variable}}}`;});
    const headers = parameters.filter(p=>p.in==='header').map(p=>({key:p.name,value:p.name==='x-organization-id'?'{{organization_id}}':`{{${snake(p.name.replace(/-/g,'_'))}}}`}));
    for (const header of headers) { const match=header.value.match(/^\{\{(.+)\}\}$/); if(match) variables.add(match[1]); }
    if (body) headers.push({key:'Content-Type',value:'application/json'});
    const request = {method:http.toUpperCase(),header:headers,auth:auth?{type:'bearer',bearer:[{key:'token',value:'{{access_token}}',type:'string'}]}:{type:'noauth'},
      url:{raw:'{{base_url}}'+rawPath+(query.length?'?'+query.filter(q=>!q.disabled).map(q=>q.key+'='+encodeURIComponent(q.value)).join('&'):''),host:['{{base_url}}'],path:rawPath.slice(1).split('/'),query},
      ...(body?{body:{mode:'raw',raw:JSON.stringify(example(body),null,2),options:{raw:{language:'json'}}}}:{}),
      description:`${classification.join(', ')}. Source: ${operation['x-source']}. Backend authorization remains authoritative. Response schema inferred; review x-unresolved markers. Synthetic examples require fixture IDs.`};
    const scripts = [
      `const expected = Number(pm.variables.get('expected_status') || ${code});`,
      "pm.test('Expected HTTP status', () => pm.response.to.have.status(expected));",
      `if (pm.response.code === ${code}) pm.test('Response contract', () => pm.response.to.have.jsonSchema(${JSON.stringify(output)}));`,
      "if (pm.response.code >= 400) pm.test('Error envelope', () => { const b=pm.response.json(); ['statusCode','code','title','message'].forEach(k => pm.expect(b).to.have.property(k)); pm.expect(b.statusCode).to.eql(pm.response.code); });",
    ];
    const item = {name:`[${classification.join(',')}] ${http.toUpperCase()} ${route}`,request,event:[{listen:'test',script:{type:'text/javascript',exec:scripts}}],response:[{name:'Synthetic success shape',originalRequest:request,status:'Success',code,header:[{key:'Content-Type',value:'application/json'}],body:JSON.stringify(example(output),null,2)}]};
    if(!folders.has(moduleName)) folders.set(moduleName,[]);
    folders.get(moduleName)!.push(item);
    routes.push({method:http.toUpperCase(),path:resolved,controller:controller.name?.text,handler:method.name.getText(),auth,code,module:moduleName,source:operation['x-source'],parameters,body,output,classification,authorization});
  }
}
const spec = {openapi:'3.1.0',info:{title:'WeStayPlace API',version:'0.1.0',description:'Source-derived registered route contract. No production Swagger endpoint is exposed. x-unresolved denotes schema review debt; refinements and authorization require behavior tests.'},servers:[{url:'http://localhost:8080'}],paths,components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',bearerFormat:'JWT'}}}};
const guard = [
  "const target = pm.variables.get('base_url');",
  "if (!/^https?:\\/\\//.test(target || '')) { pm.execution.skipRequest(); throw new Error('Set base_url'); }",
  "const mutating = !['GET','HEAD','OPTIONS'].includes(pm.request.method);",
  "if (mutating && (pm.variables.get('environment') === 'production' || pm.variables.get('allow_mutations') !== 'true')) { pm.execution.skipRequest(); throw new Error('Mutations require an explicitly enabled non-production fixture environment'); }",
];
const collection = {info:{name:'WeStayPlace API Complete',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},variable:[{key:'base_url',value:'http://localhost:8080'},... [...variables].sort().map(key=>({key,value:''}))],event:[{listen:'prerequest',script:{type:'text/javascript',exec:guard}}],item:[...folders].map(([name,item])=>({name,item}))};
async function json(relative: string, value: unknown) {await mkdir(path.dirname(path.join(root,relative)),{recursive:true}); await writeFile(path.join(root,relative),JSON.stringify(value,null,2)+'\n');}
await json('docs/api/openapi.json',spec);
await json('docs/postman/WeStayPlace_API_Complete.postman_collection.json',collection);
for (const env of ['Development','Staging','Production']) await json(`docs/postman/WeStayPlace_${env}.postman_environment.json`,{name:`WeStayPlace ${env}`,values:[{key:'base_url',value:env==='Development'?'http://localhost:8080':`https://api.${env.toLowerCase()}.example.com`,enabled:true},{key:'environment',value:env.toLowerCase(),enabled:true},{key:'allow_mutations',value:'false',enabled:true},...[...variables].sort().map(key=>({key,value:'',enabled:true,type:'secret'}))],_postman_variable_scope:'environment'});
await json('docs/api/registered-routes.json',routes);
const inventory = ['# Registered HTTP endpoint inventory','',`Source-derived: ${routes.length} HTTP routes, ${controllers.size} registered controllers, ${modules.size} reachable modules. No global prefix or versioning. Modules are traversed from AppModule; unregistered files are excluded.`, '', 'Schemas, query/body fields, success codes, and examples are in adjacent openapi.json. All uploads use JSON/base64 or signed storage tickets; no Nest multipart handler was found. Auth is Supabase JWT plus server-resolved capabilities, not a local login endpoint. Role/ownership checks are in the linked controller use cases and remain to be individually reconciled. Error tables include possible global filter errors, not proof that each endpoint produces all errors. Environment requirements: API config; authenticated routes require IDP/database; storage/payment/verification have additional provider configuration. Test coverage is not inferred from route presence.', '', '| Method | Path | Controller.handler | Auth | Authorization evidence | Success | Source |','|---|---|---|---|---|---|---|', ...routes.map(r=>`| ${r.method} | ${r.path} | ${r.controller}.${r.handler} | ${r.auth?'Bearer + use-case authorization':'Public/provider signature where applicable'} | ${r.authorization.rules.join(', ') || 'See linked use cases; not individually reconciled'} | ${r.code} | ${r.source} |`)];
await writeFile(path.join(root,'docs/api/endpoint-inventory.md'),inventory.join('\n')+'\n');
console.log(JSON.stringify({registered:routes.length,openapi: Object.values(paths).reduce((n:any,p:any)=>n+Object.keys(p).length,0),postman:routes.length,unresolvedSchemas:JSON.stringify(spec).match(/x-unresolved/g)?.length ?? 0}));
