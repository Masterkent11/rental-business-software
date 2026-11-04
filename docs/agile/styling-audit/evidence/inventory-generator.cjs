const fs=require('fs'),path=require('path'),cp=require('child_process'),{createRequire}=require('module');
const req=createRequire(process.cwd()+'/apps/owner-web/package.json'),postcss=req('postcss'),parser=req('postcss-selector-parser');
const files=['app/globals.css','components/agent/dashboard.css','components/auth/auth.css','components/marketing/marketing.css','components/owner/partner-shell.css'].map(x=>'apps/owner-web/'+x);
const sourceFiles=cp.execFileSync('rg',['--files','apps/owner-web','-g','*.tsx','-g','*.ts','-g','!**/__tests__/**']).toString().trim().split('\n');
const sources=sourceFiles.map(file=>({file,text:fs.readFileSync(file,'utf8')}));
const imports=[];for(const s of sources)for(const m of s.text.matchAll(/import\s+["']([^"']+\.css)["']/g))imports.push({file:s.file,line:s.text.slice(0,m.index).split('\n').length,import:m[1]});
const norm=v=>v.replace(/\s+/g,'');
const context=node=>{const chain=[];for(let n=node.parent;n&&n.type!=='root';n=n.parent)if(n.type==='atrule')chain.unshift('@'+n.name+' '+n.params);return chain;};
const key=node=>JSON.stringify([context(node),node.selector??'@'+node.name+' '+node.params]);
const declarations=node=>(node.nodes??[]).filter(x=>x.type==='decl').map(d=>({property:d.prop,value:d.value,important:d.important||false,line:d.source.start.line}));
const signature=decl=>decl.map(d=>d.property+':'+norm(d.value)+(d.important?'!important':'')).join(';');
const hex=v=>{v=v.toLowerCase();if(v==='white')return '#ffffff';if(v==='black')return '#000000';if(/^#[a-f0-9]{3}$/.test(v))return '#'+v.slice(1).split('').map(x=>x+x).join('');return v;};
const tokens=[],roots=files.map(file=>({file,root:postcss.parse(fs.readFileSync(file,'utf8'),{from:file})}));
for(const {file,root} of roots)root.walkDecls(d=>{if(d.prop.startsWith('--'))tokens.push({file,line:d.source.start.line,scope:d.parent.selector??'@'+d.parent.name+' '+d.parent.params,name:d.prop,value:d.value});});
const old=new Map();for(const file of files){try{const head=cp.execFileSync('git',['show','HEAD:'+file],{stdio:['ignore','pipe','ignore']}).toString();const root=postcss.parse(head);const map=new Map();root.walkRules(n=>map.set(key(n),signature(declarations(n))));old.set(file,map);}catch{old.set(file,null);}}
const confirmedUnused=[/agent-workspace-avatar/,/owner-workspace-image/,/\.owner-workspace-selector (?:p|select|label)/,/\.owner-workspace \.fixed\.right-6\.top-4/];
const records=[];const utilityProps=new Set(['display','align-items','justify-content','flex-direction','flex-wrap','flex','flex-shrink','min-width','text-align','cursor','font-size','font-weight','line-height','letter-spacing','padding','padding-left','padding-right','padding-top','padding-bottom','margin','margin-top','margin-bottom','gap','column-gap','row-gap','border-radius','width','height','color','background','border','overflow','overflow-wrap','white-space','text-overflow','position','top','right','left','bottom','z-index','outline','outline-offset','grid-column','grid-row','grid-template-columns','grid-template-rows','list-style','text-decoration','text-underline-offset','max-width','min-height','max-height','opacity']);
for(const {file,root} of roots)root.walk(node=>{
 if(!['rule','atrule'].includes(node.type))return;
 const selector=node.selector??'@'+node.name+' '+node.params,decl=declarations(node),classes=[];
 if(node.type==='rule')try{parser(s=>s.walkClasses(c=>classes.push(c.value))).processSync(node.selector);}catch{}
 const consumers=[...new Set(classes.flatMap(c=>sources.filter(s=>s.text.includes(c)).map(s=>s.file)))];
 const flags=[],base=old.get(file),unchanged=base?.get(key(node))===signature(decl);
 let category;
 if(node.type==='atrule'||decl.some(d=>d.property.startsWith('--'))||/^\.(text-display|text-title|text-amount|label-caps|glass|lift|scrim-|focusable|tabular)/.test(selector))category='Shared design foundation';
 else if(confirmedUnused.some(re=>re.test(selector)))category='Unused or orphaned';
 else if(unchanged)category='Existing and valid';
 else if(file.includes('/auth/')||/gradient|clamp\(|calc\(|blur\(|color-mix\(|:has\(|:target|svg|\.dashboard-header|\.agent-dashboard|\.agent-pipeline|\.agent-response|\.agent-activity|\.owner-profile-portrait|\.partner-verification-seal/.test(selector+' '+decl.map(d=>d.value).join(' ')))category='Component-specific and justified';
 else if(file.endsWith('globals.css'))category='Existing and valid';
 else category='Duplicate of existing Tailwind styling';
 if(/\.agent-workspace \.owner-|\.agent-dashboard \.dashboard-|\.dashboard-header[ .]|\.dashboard-header-integrated/.test(selector))flags.push('Potentially dangerous global override');
 const tokenMatches=decl.filter(d=>!d.property.startsWith('--')&&/^(#[a-f0-9]{3,8}|white|black)$/i.test(d.value)).map(d=>({property:d.property,value:d.value,candidates:tokens.filter(t=>hex(t.value)===hex(d.value)&&!t.name.startsWith('--color-')).map(t=>({name:t.name,scope:t.scope,line:t.line,file:t.file}))})).filter(m=>m.candidates.length);
 if(tokenMatches.length)flags.push('Duplicate of an existing design token');
 const utilityCandidates=decl.filter(d=>utilityProps.has(d.property)&&!/[()]/.test(d.value)).map(d=>d.property);
 if(utilityCandidates.length&&category==='Component-specific and justified')flags.push('Some declarations can use utilities only after cascade review');
 if(classes.length&&!consumers.length)flags.push('No literal source consumer found; dynamic consumers must be reviewed before deletion');
 if(file.endsWith('partner-shell.css')&&selector==='.workspace-choice-single') {category='Duplicate of existing Tailwind styling';flags.push('Confirmed duplicate min-width:0 also declared in globals.css; remove only after approval');}
 records.push({file,line:node.source.start.line,endLine:node.source.end.line,type:node.type,selector,context:context(node),category,flags,provenance:base===null?'Staged addition, absent from HEAD':unchanged?'Semantically unchanged from HEAD':'Existing file, changed or new semantic block',declarations:decl,tokenMatches,utilityCandidates,classes:[...new Set(classes)],consumers,canDeleteWithoutReview:false});
});
const summary={files:files.map(file=>({file,lines:fs.readFileSync(file,'utf8').split('\n').length,bytes:fs.statSync(file).size,rules:records.filter(r=>r.file===file&&r.type==='rule').length,atRules:records.filter(r=>r.file===file&&r.type==='atrule').length,absentFromHead:old.get(file)===null})),counts:{},ruleCounts:{},totalRecords:records.length,totalRules:records.filter(r=>r.type==='rule').length,imports,tokens,notes:['Static classification is a triage map, not permission to delete CSS.','Every rule and at-rule in the five stylesheet files has a record.','Exact token values may be reused only within the same scope; near colors are deliberately not merged.','No literal source match is not proof of absence of dynamic or third party consumers.']};
for(const r of records){summary.counts[r.category]=(summary.counts[r.category]??0)+1;if(r.type==='rule')summary.ruleCounts[r.category]=(summary.ruleCounts[r.category]??0)+1;}
fs.writeFileSync('/tmp/wsp-style-inventory.json',JSON.stringify({summary,rules:records},null,2));
console.log(JSON.stringify({...summary,tokens:summary.tokens.length,imports:summary.imports},null,2));
