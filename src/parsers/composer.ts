import { ResolvedMap, addVersion } from './types';

interface ComposerLockEntry {
  name?: string;
  version?: string;
}

interface ComposerLockFile {
  packages?: ComposerLockEntry[];
  'packages-dev'?: ComposerLockEntry[];
}

export function parseComposerLock(raw: string): ResolvedMap {
  const out: ResolvedMap = new Map();
  const data = JSON.parse(raw) as ComposerLockFile;

  for (const list of [data.packages, data['packages-dev']]) {
    if (!list) continue;
    for (const entry of list) {
      if (!entry?.name || !entry?.version) continue;
      const version = entry.version.startsWith('v') ? entry.version.slice(1) : entry.version;
      addVersion(out, entry.name, { version });
    }
  }
  return out;
}
