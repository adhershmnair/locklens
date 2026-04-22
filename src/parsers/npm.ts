import { ResolvedMap, addVersion } from './types';

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
      const parsed = parsePackagePath(key);
      if (!parsed) continue;
      addVersion(out, parsed.name, { version: pkg.version, parent: parsed.parent });
    }
  }

  if (data.dependencies) {
    walkV1(data.dependencies, undefined, out);
  }

  return out;
}

function parsePackagePath(key: string): { name: string; parent?: string } | null {
  const segments = key.split('node_modules/').filter(Boolean);
  if (segments.length === 0) return null;
  const name = segments[segments.length - 1].replace(/\/$/, '');
  if (!name) return null;
  const parent = segments.length > 1 ? segments[segments.length - 2].replace(/\/$/, '') : undefined;
  return { name, parent };
}

function walkV1(deps: Record<string, NpmLockV1Dep>, parent: string | undefined, out: ResolvedMap): void {
  for (const [name, dep] of Object.entries(deps)) {
    if (dep?.version) addVersion(out, name, { version: dep.version, parent });
    if (dep?.dependencies) walkV1(dep.dependencies, name, out);
  }
}
