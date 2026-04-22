import * as https from 'https';

type RegistryKind = 'node' | 'composer';

interface CacheEntry {
  version: string | null;
  expiresAt: number;
}

const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

export function clearRegistryCache(): void {
  cache.clear();
  inflight.clear();
}

export function getCachedLatest(kind: RegistryKind, name: string): string | null | undefined {
  const key = `${kind}:${name}`;
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) return undefined;
  return entry.version;
}

export async function getLatestVersion(kind: RegistryKind, name: string): Promise<string | null> {
  const key = `${kind}:${name}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.version;

  const existing = inflight.get(key);
  if (existing) return existing;

  const fetcher = kind === 'composer' ? fetchPackagist(name) : fetchNpm(name);
  const promise = fetcher
    .catch(() => null)
    .then(version => {
      cache.set(key, { version, expiresAt: Date.now() + TTL_MS });
      inflight.delete(key);
      return version;
    });
  inflight.set(key, promise);
  return promise;
}

function fetchNpm(name: string): Promise<string | null> {
  const url = `https://registry.npmjs.org/${encodeNpmName(name)}/latest`;
  return httpsJson(url).then(data => {
    const version = (data as { version?: unknown })?.version;
    return typeof version === 'string' ? version : null;
  });
}

function fetchPackagist(name: string): Promise<string | null> {
  if (!/^[^\s/]+\/[^\s/]+$/.test(name)) return Promise.resolve(null);
  const url = `https://repo.packagist.org/p2/${name}.json`;
  return httpsJson(url).then(data => {
    const versions = (data as { packages?: Record<string, Array<{ version?: unknown; version_normalized?: unknown }>> })
      ?.packages?.[name];
    if (!Array.isArray(versions)) return null;
    const stable = versions.find(v => typeof v?.version === 'string' && !/(dev|alpha|beta|rc|-a|-b)/i.test(v.version));
    const picked = stable ?? versions.find(v => typeof v?.version === 'string');
    if (!picked || typeof picked.version !== 'string') return null;
    return picked.version.replace(/^v/, '');
  });
}

const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

function httpsJson(url: string, redirectsLeft = MAX_REDIRECTS): Promise<unknown> {
  if (!url.startsWith('https://')) return Promise.reject(new Error('non-https url'));
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'locklens' } }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) { reject(new Error('too many redirects')); return; }
        const next = new URL(res.headers.location, url).toString();
        httpsJson(next, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let body = '';
      let bytes = 0;
      res.setEncoding('utf8');
      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > MAX_BODY_BYTES) { res.destroy(new Error('response too large')); return; }
        body += chunk;
      });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
      res.on('error', reject);
    });
    req.setTimeout(8000, () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
  });
}

function encodeNpmName(name: string): string {
  if (name.startsWith('@')) {
    const [scope, pkg] = name.split('/');
    return `${scope}/${encodeURIComponent(pkg)}`;
  }
  return encodeURIComponent(name);
}
