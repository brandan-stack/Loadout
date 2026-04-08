const DEFAULT_TTL_MS = 45_000;

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<unknown>>();

export const TAB_DATA_CACHE_KEYS = {
  items: "tab:items",
  jobs: "tab:jobs",
  locations: "tab:locations",
  locationsFull: "tab:locations-full",
  reorder: "tab:reorder",
  settings: "tab:settings",
  suppliers: "tab:suppliers",
  tools: "tab:tools",
} as const;

export function primeCachedData<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function peekCachedData<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }

  return entry.value as T;
}

export async function getCachedData<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const snapshot = peekCachedData<T>(key);
  if (snapshot !== undefined) {
    return snapshot;
  }

  const existing = pending.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const request = loader()
    .then((value) => {
      cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, request as Promise<unknown>);
  return request;
}

export async function fetchJsonWithCache<T>(
  key: string,
  url: string,
  ttlMs = DEFAULT_TTL_MS,
  init?: RequestInit
): Promise<T> {
  return getCachedData<T>(
    key,
    async () => {
      const res = await fetch(url, {
        ...init,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Request failed for ${url} (${res.status})`);
      }

      return res.json() as Promise<T>;
    },
    ttlMs
  );
}

export function warmJsonCache<T>(
  key: string,
  url: string,
  ttlMs = DEFAULT_TTL_MS,
  init?: RequestInit
) {
  void fetchJsonWithCache<T>(key, url, ttlMs, init).catch(() => undefined);
}

export function invalidateCachedData(keys: string | string[]) {
  for (const key of Array.isArray(keys) ? keys : [keys]) {
    cache.delete(key);
    pending.delete(key);
  }
}