const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDiagnostics, registerDiagnostics, diagnostics } = require('../diagnostics.cjs');
const { registerWebSearch } = require('../web-search.cjs');
const req = root => ({ user: { directories: { root } } });
const event = { operation: 'history.write', stage: 'request', code: 'HISTORY_CONFLICT', durationMs: 1, key: 'SECRET', prompt: 'SECRET', error: Error('SECRET') };
test('bounded service errors are account isolated, ephemeral and exclude arbitrary fields', () => {
    let time = 1000; const store = createDiagnostics({ now: () => time });
    for (let n = 0; n < 250; n++) store.record(req('A'), event);
    store.record(req('B'), { ...event, code: 'WEB_TIMEOUT' });
    assert.equal(store.read(req('A')).records.length, 200); assert.equal(store.read(req('B')).records[0].code, 'WEB_TIMEOUT');
    assert.ok(!JSON.stringify(store.read(req('A'))).includes('SECRET'));
    store.clear(req('A')); assert.equal(store.read(req('A')).records.length, 0); assert.equal(store.read(req('B')).records.length, 1);
    time += 1800000; assert.equal(store.read(req('B')).records.length, 0); assert.throws(() => store.read({}), /IDENTITY/);
});
test('diagnostic routes require identity and explicit clear; request root never selects account', async () => {
    const store = createDiagnostics(); store.record(req('A'), event); store.record(req('B'), event);
    const routes = new Map(); registerDiagnostics({ get: (p, h) => routes.set(p, h), post: (p, h) => routes.set(p, h) }, store);
    const invoke = (route, request) => new Promise(resolve => { const res = { code: 200, status(code) { this.code = code; return this; }, json(value) { resolve({ code: this.code, value }); } }; routes.get(route)(request, res); });
    assert.equal((await invoke('/service/diagnostics', { query: { root: 'A' } })).code, 500);
    assert.equal((await invoke('/service/diagnostics/clear', { ...req('A'), body: { confirm: true, root: 'B' } })).code, 400);
    await invoke('/service/diagnostics/clear', { ...req('A'), body: { confirm: true } });
    assert.equal(store.read(req('A')).records.length, 0); assert.equal(store.read(req('B')).records.length, 1);
});
test('search route records only normalized failure classes, never query or key', async () => {
    const request = { ...req('search-diagnostic-account'), body: { query: 'PRIVATE_QUERY', apiKey: 'PRIVATE_KEY' } }; diagnostics.clear(request);
    const routes = new Map(); registerWebSearch({ get: (p, h) => routes.set(p, h), post: (p, h) => routes.set(p, h) }, { search: async () => ({ status: 'auth_error', query: 'PRIVATE_QUERY', results: [] }) });
    await new Promise(resolve => routes.get('/web/search')(request, { json: resolve }));
    const value = diagnostics.read(request); assert.equal(value.records[0].code, 'WEB_AUTH_ERROR');
    assert.ok(!JSON.stringify(value).includes('PRIVATE_')); diagnostics.clear(request);
});
