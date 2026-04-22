import { ResolvedMap, addVersion } from './types';

interface PnpmEntry {
  key: string;
  version: string | null;
  dependencies: Array<{ name: string; constraint: string }>;
}

export function parsePnpmLock(raw: string): ResolvedMap {
  const entries = parseEntries(raw);
  return buildResolvedMap(entries);
}

function parseEntries(raw: string): PnpmEntry[] {
  const entries: PnpmEntry[] = [];
  const lines = raw.split(/\r?\n/);

  let inBlock = false;
  let blockIndent = -1;
  let entryIndent = -1;
  let current: PnpmEntry | null = null;
  let inDeps = false;
  let depsIndent = -1;

  const finalize = () => {
    if (current) entries.push(current);
    current = null;
    inDeps = false;
  };

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) continue;
    const indent = rawLine.length - rawLine.trimStart().length;

    if (!inBlock) {
      if (/^(packages|snapshots)\s*:\s*$/.test(rawLine)) {
        inBlock = true;
        blockIndent = indent;
        entryIndent = -1;
      }
      continue;
    }

    if (indent <= blockIndent) {
      finalize();
      if (/^(packages|snapshots)\s*:\s*$/.test(rawLine)) {
        blockIndent = indent;
        entryIndent = -1;
        continue;
      }
      if (/^[A-Za-z0-9_-]+\s*:\s*$/.test(rawLine)) {
        inBlock = false;
      }
      continue;
    }

    if (entryIndent === -1) entryIndent = indent;

    if (indent === entryIndent) {
      finalize();
      const m = /^\s*'?([^']+?)'?\s*:\s*$/.exec(rawLine) || /^\s*"([^"]+)"\s*:\s*$/.exec(rawLine);
      if (m) current = { key: m[1], version: null, dependencies: [] };
      continue;
    }

    if (!current) continue;

    if (/^\s+version:\s*/.test(rawLine)) {
      const vm = /^\s+version:\s*'?"?([^'"\s]+)'?"?/.exec(rawLine);
      if (vm) current.version = vm[1];
      continue;
    }

    if (/^\s+dependencies:\s*$/.test(rawLine)) {
      inDeps = true;
      depsIndent = indent;
      continue;
    }
    if (/^\s+(optionalDependencies|peerDependencies|devDependencies):\s*$/.test(rawLine)) {
      inDeps = false;
      continue;
    }

    if (inDeps) {
      if (indent <= depsIndent) { inDeps = false; continue; }
      const dm = /^\s+'?([^':\s]+)'?:\s*'?"?([^'"\s]+)'?"?/.exec(rawLine);
      if (dm) current.dependencies.push({ name: dm[1], constraint: dm[2] });
    }
  }
  finalize();
  return entries;
}

function buildResolvedMap(entries: PnpmEntry[]): ResolvedMap {
  const out: ResolvedMap = new Map();
  const entryMap = new Map<string, PnpmEntry>();

  for (const entry of entries) {
    if (!entry.version) {
      const parsed = parsePackageKey(entry.key);
      if (parsed.version) entry.version = parsed.version;
    }
    entryMap.set(entry.key, entry);
  }

  const parentMap = new Map<string, Map<string, string>>();

  for (const entry of entries) {
    const parsedParent = parsePackageKey(entry.key);
    if (!parsedParent.name) continue;
    for (const dep of entry.dependencies) {
      const childKey = `${dep.name}@${dep.constraint}`;
      const candidates = [childKey, `/${childKey}`];
      let resolvedVersion: string | null = null;
      for (const cand of candidates) {
        const e = entryMap.get(cand);
        if (e?.version) { resolvedVersion = e.version; break; }
      }
      if (!resolvedVersion) resolvedVersion = dep.constraint.match(/^\d/) ? dep.constraint : null;
      if (!resolvedVersion) continue;

      const byVersion = parentMap.get(dep.name) ?? new Map<string, string>();
      if (!byVersion.has(resolvedVersion)) byVersion.set(resolvedVersion, parsedParent.name);
      parentMap.set(dep.name, byVersion);
    }
  }

  for (const entry of entries) {
    const parsed = parsePackageKey(entry.key);
    const version = entry.version ?? parsed.version;
    if (!parsed.name || !version) continue;
    const parent = parentMap.get(parsed.name)?.get(version);
    addVersion(out, parsed.name, { version, parent });
  }
  return out;
}

function parsePackageKey(key: string): { name: string | null; version: string | null } {
  let k = key.trim().replace(/^["']|["']$/g, '');
  if (k.startsWith('/')) k = k.slice(1);
  const parenIdx = k.indexOf('(');
  if (parenIdx !== -1) k = k.slice(0, parenIdx);

  const scoped = k.startsWith('@');
  const at = scoped ? k.indexOf('@', 1) : k.indexOf('@');
  if (at === -1) return { name: k || null, version: null };
  return { name: k.slice(0, at), version: k.slice(at + 1) || null };
}
