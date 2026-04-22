import { ResolvedMap, addVersion } from './types';

interface BunLockFile {
  lockfileVersion?: number;
  workspaces?: Record<string, unknown>;
  packages?: Record<string, unknown>;
}

export function parseBunLock(raw: string): ResolvedMap {
  const out: ResolvedMap = new Map();
  const data = JSON.parse(stripJsoncComments(raw)) as BunLockFile;
  if (!data?.packages) return out;

  for (const [name, entry] of Object.entries(data.packages)) {
    const version = extractVersion(entry);
    if (version) addVersion(out, name, { version });
  }
  return out;
}

function extractVersion(entry: unknown): string | null {
  if (Array.isArray(entry) && typeof entry[0] === 'string') {
    const at = entry[0].lastIndexOf('@');
    if (at > 0) return entry[0].slice(at + 1);
  }
  if (entry && typeof entry === 'object' && 'version' in entry) {
    const v = (entry as { version?: unknown }).version;
    if (typeof v === 'string') return v;
  }
  return null;
}

function stripJsoncComments(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'])\/\/.*$/gm, '$1')
    .replace(/,(\s*[}\]])/g, '$1');
}
