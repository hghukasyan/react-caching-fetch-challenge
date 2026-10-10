import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import {
  initializeCache,
  preloadCachingFetch,
  serializeCache,
  wipeCache,
} from './cachingFetch';

const url = 'https://example.com/people';
const people = [{ first: 'Arturo', last: 'Harber' }];

afterEach(() => {
  wipeCache();
  mock.restoreAll();
});

describe('cachingFetch', () => {
  it('stores data and can hydrate from serializeCache', async () => {
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => people,
    }));

    await preloadCachingFetch(url);
    const saved = serializeCache();

    wipeCache();
    initializeCache(saved);

    let calls = 0;
    mock.method(globalThis, 'fetch', async () => {
      calls += 1;
      return { ok: true, json: async () => people };
    });

    await preloadCachingFetch(url);
    assert.equal(calls, 0);
  });

  it('only fetches once for the same url', async () => {
    let calls = 0;
    mock.method(globalThis, 'fetch', async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 10));
      return { ok: true, json: async () => people };
    });

    await Promise.all([preloadCachingFetch(url), preloadCachingFetch(url)]);
    assert.equal(calls, 1);
  });

  it('retries after a failed request', async () => {
    mock.method(globalThis, 'fetch', async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));
    await preloadCachingFetch(url);

    let calls = 0;
    mock.method(globalThis, 'fetch', async () => {
      calls += 1;
      return { ok: true, json: async () => people };
    });

    await preloadCachingFetch(url);
    assert.equal(calls, 1);
  });
});
