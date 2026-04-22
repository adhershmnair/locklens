export interface VersionEntry {
  version: string;
  parent?: string;
}

export type ResolvedMap = Map<string, VersionEntry[]>;

export interface ResolutionResult {
  source: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'composer';
  resolved: ResolvedMap;
}

export function addVersion(out: ResolvedMap, name: string, entry: VersionEntry): void {
  const list = out.get(name);
  if (!list) {
    out.set(name, [entry]);
    return;
  }
  if (list.some(e => e.version === entry.version && e.parent === entry.parent)) return;
  list.push(entry);
}
