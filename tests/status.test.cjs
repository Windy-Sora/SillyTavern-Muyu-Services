const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { checkStorage, registerServiceStatus } = require('../service-status.cjs');
test('storage self-test accepts host relative roots, preserves real records and cleans its temporary file', async t => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'muyu-service-status-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    const history = path.join(root, '.group-director', 'muyu', 'history'); await fs.mkdir(history, { recursive: true });
    await fs.writeFile(path.join(history, 'keep.json'), 'KEEP');
    const result = await checkStorage({ user: { directories: { root: path.relative(process.cwd(), root) } }, body: { root: 'IGNORED' } });
    assert.deepEqual(result, { version: 1, status: 'ok', stage: 'complete', cleanup: 'complete' });
    assert.equal(await fs.readFile(path.join(history, 'keep.json'), 'utf8'), 'KEEP');
    assert.deepEqual(await fs.readdir(path.join(history, '.service-probes')), []);
});
test('status and storage checks require trusted identity and explicit confirmation', async () => {
    const routes = new Map(); registerServiceStatus({ get: (p, h) => routes.set(p, h), post: (p, h) => routes.set(p, h) }, { records: 64 });
    const invoke = (route, req) => new Promise(resolve => { const res = { code: 200, status(code) { this.code = code; return this; }, json(value) { resolve({ code: this.code, value }); } }; routes.get(route)(req, res); });
    assert.equal((await invoke('/service/status', { query: { root: process.cwd() } })).value.error, 'HISTORY_IDENTITY_UNAVAILABLE');
    const valid = await invoke('/service/status', { user: { directories: { root: process.cwd() } } }); assert.equal(valid.value.serviceVersion, '0.6.0'); assert.equal(valid.value.capabilities.storageCheck, 1); assert.equal(valid.value.capabilities.diagnostics, 1);
    assert.deepEqual(valid.value.toolProtocols, { documentSearch: 1, webFetch: 1, workspaceWrite: 1, jsonValidate: 1 }); // Never advertise not-yet-implemented routes.
    for (const body of [undefined, {}, { confirm: false }, { confirm: true, root: process.cwd() }]) assert.equal((await invoke('/service/storage-check', { body })).code, 400);
    assert.equal((await invoke('/service/storage-check', { body: { confirm: true } })).value.error, 'HISTORY_IDENTITY_UNAVAILABLE');
});
test('permission errors and cleanup failures cannot become successful self-tests', async () => {
    const req = { user: { directories: { root: process.cwd() } } };
    const denied = await checkStorage(req, { mkdir: async () => { throw Object.assign(Error('PRIVATE'), { code: 'EACCES' }); } });
    assert.equal(denied.error, 'SERVICE_STORAGE_PERMISSION'); assert.ok(!JSON.stringify(denied).includes('PRIVATE'));
    let text;
    const cleanup = await checkStorage(req, { mkdir: async () => {}, mkdtemp: async p => p + 'isolated', writeFile: async (_p, value) => { text = value; }, readFile: async () => text, rm: async () => { throw Object.assign(Error('PRIVATE'), { code: 'EPERM' }); } });
    assert.equal(cleanup.status, 'failed'); assert.equal(cleanup.stage, 'cleanup'); assert.equal(cleanup.cleanup, 'failed');
});
