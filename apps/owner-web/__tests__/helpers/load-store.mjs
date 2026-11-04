import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '../..');
const require = createRequire(path.join(root, 'package.json'));

export function loadSources(relativePaths, container = {}) {
  const modules = new Map();
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports;
    const loadedModule = {exports: {}};
    modules.set(file,loadedModule);
    const source = ts.transpileModule(readFileSync(file,'utf8'), {
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},fileName:file,
    }).outputText;
    const localRequire = specifier => {
      if (specifier.endsWith('/infrastructure/composition/owner-web-container')) return {container};
      if (specifier.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file),specifier);
        if (existsSync(`${resolved}.ts`)) return load(`${resolved}.ts`);
      }
      return require(specifier);
    };
    new Function('require','module','exports',source)(localRequire,loadedModule,loadedModule.exports);
    return loadedModule.exports;
  }
  return relativePaths.map(relativePath => load(path.join(root,relativePath)));
}

export function loadSource(relativePath, container = {}) {
  return loadSources([relativePath], container)[0];
}

export function loadStore(name, container) {
  return loadSource(`stores/${name}`,container);
}

export function deferred() {
  let resolve,reject;
  const promise = new Promise((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
