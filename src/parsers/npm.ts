import { ResolvedMap } from './types';

interface NpmLockPackage {
  version?: string;
}

interface NpmLockV1Dep {
  version?: string;
  dependencies?: Record<string, NpmLockV1Dep>;
}

interface NpmLockFile {
  lockfileVersion?: number;
  packages?: Record<string, NpmLockPackage>;
  dependencies?: Record<string, NpmLockV1Dep>;
}

export function parseNpmLock(raw: string): ResolvedMap {
  const out: ResolvedMap = new Map();
  const data = JSON.parse(raw) as NpmLockFile;

  if (data.packages) {
    for (const [key, pkg] of Object.entries(data.packages)) {
      if (!key || !pkg?.version) continue;
      const name = extractNameFromPath(key);
      if (name && !out.has(name)) out.set(name, pkg.version);
    }
  }

  if (data.dependencies) {
    walkV1(data.dependencies, out);
  }

  return out;
}

function extractNameFromPath(key: string): string | null {
  const idx = key.lastIndexOf('node_modules/');
  if (idx === -1) return null;
  return key.slice(idx + 'node_modules/'.length);
}

function walkV1(deps: Record<string, NpmLockV1Dep>, out: ResolvedMap): void {
  for (const [name, dep] of Object.entries(deps)) {
    if (dep?.version && !out.has(name)) out.set(name, dep.version);
    if (dep?.dependencies) walkV1(dep.dependencies, out);
  }
}
