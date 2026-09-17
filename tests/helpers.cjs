const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function loader(mocks = {}, globals = {}) {
  const cache = new Map();
  function load(filename) {
    const absolute = path.resolve(filename);
    if (cache.has(absolute)) return cache.get(absolute);
    const exports = {};
    cache.set(absolute, exports);
    const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(source, {
      exports, console, Buffer, URL, Request, Response, AbortSignal, setTimeout, clearTimeout,
      process: { env: {} }, ...globals,
      require(id) {
        if (id in mocks) return mocks[id];
        if (id.startsWith('@/') || id.startsWith('.')) {
          const base = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(absolute), id);
          const file = [base, `${base}.ts`, `${base}.tsx`].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
          return load(file);
        }
        return require(id);
      },
    }, { filename: absolute });
    return exports;
  }
  return load;
}
function browser() {
  const store = new Map();
  const events = [];
  return { store, events, window: { localStorage: {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  }, dispatchEvent: e => events.push(e) }, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } } };
}
module.exports = { loader, browser };
