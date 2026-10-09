const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { info, init, createFileStore } = require('../index.cjs');
const { createWebSearchService } = require('../web-search.cjs');

async function fixture(t) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'muyu-services-test-'));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    return { dir, store: createFileStore(dir) };
}
function record() {
    return { version: 7, id: randomUUID(), revision: 0, scope: 'chat:test', title: 'Test',
        messages: [{ role: 'user', content: 'hello', runId: 'run:1', origin: 'question' }],
        required: [], status: 'idle' };
}
const input = { provider: 'brave', apiKey: 'test-key', query: 'SillyTavern help', maxResults: 3 };

test('registers stable plugin ID and routes', () => {
    const routes = [];
    const router = Object.fromEntries(['get', 'put', 'delete', 'post'].map(method => [method, route => routes.push(`${method} ${route}`)]));
    init(router);
    assert.equal(info.id, 'gd-muyu-history');
    assert.deepEqual(routes.sort(), ['delete /records/:id', 'get /health', 'get /records', 'get /records/:id', 'get /web/health', 'post /web/search', 'post /web/page', 'put /records/:id', 'get /service/status', 'post /service/storage-check', 'get /service/diagnostics', 'post /service/diagnostics/clear', ...['roots', 'list', 'search', 'read'].map(operation => 'post /documents/' + operation), ...['preview', 'apply', 'validate'].map(operation => 'post /workspace/' + operation)].sort());
});
test('persists v7 messages and enforces revision checks', async t => {
    const { dir, store } = await fixture(t);
    const original = record();
    const saved = await store.create(original);
    assert.equal(saved.revision, 1);
    assert.deepEqual(await createFileStore(dir).read(saved.id), saved);
    const next = await store.update({ ...saved, title: 'Updated' }, 1);
    assert.equal(next.revision, 2);
    await assert.rejects(store.update(saved, 1), /HISTORY_CONFLICT/);
    assert.equal((await store.list())[0].count, 1);
});
test('deletion removes content and prevents backup resurrection', async t => {
    const { dir, store } = await fixture(t);
    const saved = await store.create(record());
    await store.remove(saved.id, saved.revision);
    assert.equal(await store.read(saved.id), null);
    assert.deepEqual(await store.list(), []);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir, `${saved.id}.json`), 'utf8')), { id: saved.id, deleted: true });
    await assert.rejects(store.create(saved), /HISTORY_DELETED/);
});
test('rejects unsafe IDs and malformed history', async t => {
    const { store } = await fixture(t);
    await assert.rejects(store.read('../escape'), /HISTORY_INVALID/);
    await assert.rejects(store.create({ ...record(), version: 99 }), /HISTORY_INVALID/);
    await assert.rejects(store.create({ ...record(), secret: 'not-allowed' }), /HISTORY_INVALID/);
});
test('concurrent creates have one winner without overwriting', async t => {
    const { store } = await fixture(t);
    const original = record();
    const outcomes = await Promise.allSettled([store.create(original), store.create({ ...original, title: 'Other' })]);
    assert.equal(outcomes.filter(row => row.status === 'fulfilled').length, 1);
    assert.equal(outcomes.find(row => row.status === 'rejected').reason.message, 'HISTORY_CONFLICT');
});
test('search uses fixed upstream and excludes unsafe or duplicate URLs', async () => {
    let called = false;
    const service = createWebSearchService({ fetcher: async (url, options) => {
        called = true;
        assert.equal(new URL(url).origin, 'https://api.search.brave.com');
        assert.equal(options.headers['X-Subscription-Token'], 'test-key');
        assert.equal(options.redirect, 'error');
        return Response.json({ web: { results: [
            { url: 'javascript:alert(1)', title: 'Bad' },
            { url: 'https://user:pass@example.com/', title: 'Bad' },
            { url: 'https://example.com/', title: '<b>Good</b>', description: '<i>Snippet</i>' },
            { url: 'https://example.com/', title: 'Duplicate' },
        ] } });
    } });
    const answer = await service.search(input, { account: 'test-account' });
    assert.ok(called);
    assert.equal(answer.status, 'ok');
    assert.deepEqual(answer.results, [{ title: 'Good', url: 'https://example.com/', snippet: 'Snippet' }]);
    assert.ok(!JSON.stringify(answer).includes('test-key'));
});
test('search normalizes authentication failure', async () => {
    const service = createWebSearchService({ fetcher: async () => new Response('', { status: 401 }) });
    assert.equal((await service.search(input, { account: 'test-account' })).status, 'auth_error');
});
test('pre-cancelled search does not reach upstream', async () => {
    const service = createWebSearchService({ fetcher: async () => { throw Error('must not call'); } });
    const answer = await service.search(input, { account: 'test-account', signal: AbortSignal.abort() });
    assert.equal(answer.status, 'network_error');
});
test('rejects invalid requests before reaching upstream', async () => {
    const service = createWebSearchService({ fetcher: async () => { throw Error('must not call'); } });
    await assert.rejects(service.search({ ...input, maxResults: 11 }, { account: 'test-account' }), /WEB_REQUEST_INVALID/);
    await assert.rejects(service.search(input), /WEB_IDENTITY_UNAVAILABLE/);
});
