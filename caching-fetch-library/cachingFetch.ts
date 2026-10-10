import { useEffect, useState } from 'react';

type UseCachingFetch = (url: string) => {
  isLoading: boolean;
  data: unknown;
  error: Error | null;
};

type FetchState = {
  isLoading: boolean;
  data: unknown;
  error: Error | null;
};

type CacheEntry =
  | { ok: true; data: unknown }
  | { ok: false; error: Error };

class FetchCache {
  private entries = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<void>>();

  getState(url: string): FetchState | null {
    const entry = this.entries.get(url);
    if (!entry) return null;
    if (entry.ok) {
      return { data: entry.data, isLoading: false, error: null };
    }
    return { data: null, isLoading: false, error: entry.error };
  }

  async preload(url: string) {
    // only successful responses count as cached
    const entry = this.entries.get(url);
    if (entry?.ok) return;
    await this.load(url);
  }

  load(url: string) {
    const entry = this.entries.get(url);
    if (entry?.ok) return Promise.resolve();

    const existing = this.inflight.get(url);
    if (existing) return existing;

    const request = fetch(url)
      .then(async (res) => {
        this.entries.set(url, { ok: true, data: await readJson(res) });
      })
      .catch((err) => {
        this.entries.set(url, {
          ok: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      })
      .finally(() => {
        this.inflight.delete(url);
      });

    this.inflight.set(url, request);
    return request;
  }

  serialize() {
    const data: Record<string, unknown> = {};
    for (const [url, entry] of this.entries) {
      if (entry.ok) data[url] = entry.data;
    }
    return JSON.stringify(data);
  }

  hydrate(serialized: string) {
    const data = JSON.parse(serialized) as Record<string, unknown>;
    for (const url of Object.keys(data)) {
      this.entries.set(url, { ok: true, data: data[url] });
    }
  }

  clear() {
    this.entries.clear();
    this.inflight.clear();
  }
}

async function readJson(res: Response) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const cache = new FetchCache();

/**
 * 1. Implement a caching fetch hook. The hook should return an object with the following properties:
 * - isLoading: a boolean that is true when the fetch is in progress and false otherwise
 * - data: the data returned from the fetch, or null if the fetch has not completed
 * - error: an error object if the fetch fails, or null if the fetch is successful
 *
 * This hook is called three times on the client:
 *  - 1 in App.tsx
 *  - 2 in Person.tsx
 *  - 3 in Name.tsx
 *
 * Acceptance Criteria:
 * 1. The application at /appWithoutSSRData should properly render, with JavaScript enabled, you should see a list of people.
 * 2. You should only see 1 network request in the browser's network tab when visiting the /appWithoutSSRData route.
 * 3. You have not changed any code outside of this file to achieve this.
 * 4. This file passes a type-check.
 *
 */
export const useCachingFetch: UseCachingFetch = (url) => {
  const [state, setState] = useState<FetchState>(() => {
    const cached = cache.getState(url);
    // reuse only successful cache hits (failed ones can be retried)
    if (cached && cached.error === null) return cached;
    return { data: null, isLoading: true, error: null };
  });

  useEffect(() => {
    const cached = cache.getState(url);
    if (cached && cached.error === null) {
      setState(cached);
      return;
    }

    let cancelled = false;
    setState({ data: null, isLoading: true, error: null });

    cache.load(url).then(() => {
      if (!cancelled) {
        setState(
          cache.getState(url) ?? {
            data: null,
            isLoading: false,
            error: new Error('fetch failed'),
          },
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
};

/**
 * 2. Implement a preloading caching fetch function. The function should fetch the data.
 *
 * This function will be called once on the server before any rendering occurs.
 *
 * Any subsequent call to useCachingFetch should result in the returned data being available immediately.
 * Meaning that the page should be completely serverside rendered on /appWithSSRData
 *
 * Acceptance Criteria:
 * 1. The application at /appWithSSRData should properly render, with JavaScript disabled, you should see a list of people.
 * 2. You have not changed any code outside of this file to achieve this.
 * 3. This file passes a type-check.
 *
 */
export const preloadCachingFetch = (url: string): Promise<void> =>
  cache.preload(url);

/**
 * 3.1 Implement a serializeCache function that serializes the cache to a string.
 * 3.2 Implement an initializeCache function that initializes the cache from a serialized cache string.
 *
 * Together, these two functions will help the framework transfer your cache to the browser.
 *
 * The framework will call `serializeCache` on the server to serialize the cache to a string and inject it into the dom.
 * The framework will then call `initializeCache` on the browser with the serialized cache string to initialize the cache.
 *
 * Acceptance Criteria:
 * 1. The application at /appWithSSRData should properly render, with JavaScript enabled, you should see a list of people.
 * 2. You should not see any network calls to the people API when visiting the /appWithSSRData route.
 * 3. You have not changed any code outside of this file to achieve this.
 * 4. This file passes a type-check.
 *
 */
export const serializeCache = (): string => cache.serialize();

export const initializeCache = (serializedCache: string): void => {
  cache.hydrate(serializedCache);
};

export const wipeCache = (): void => {
  cache.clear();
};
