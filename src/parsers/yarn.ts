import { ResolvedMap, addVersion } from './types';

interface YarnEntry {
  headers: string[];
  version: string | null;
  dependencies: Array<{ name: string; constraint: string }>;
}

export function parseYarnLock(raw: string): ResolvedMap {
  const berry = raw.trimStart().startsWith('__metadata:');
  const entries = berry ? parseBerryEntries(raw) : parseClassicEntries(raw);
  return buildResolvedMap(entries);
}

function parseClassicEntries(raw: string): YarnEntry[] {
  const entries: YarnEntry[] = [];
  const lines = raw.split(/\r?\n/);
  let current: YarnEntry | null = null;
  let inDeps = false;

  const finalize = () => {
    if (current) entries.push(current);
    current = null;
    inDeps = false;
  };

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      finalize();
      const header = line.replace(/:\s*$/, '');
      current = { headers: splitHeaders(header), version: null, dependencies: [] };
      continue;
    }

    if (!current) continue;

    const vm = /^\s+version\s+"?([^"\s]+)"?/.exec(line);
    if (vm) { current.version = vm[1]; continue; }

    if (/^\s{2,}dependencies:\s*$/.test(line)) { inDeps = true; continue; }
    if (/^\s{2,}(optionalDependencies|peerDependencies):\s*$/.test(line)) { inDeps = false; continue; }

    if (inDeps) {
      const dm = /^\s{4,}"?([^"\s]+)"?\s+"?([^"]+?)"?$/.exec(line);
      if (dm) current.dependencies.push({ name: dm[1], constraint: dm[2] });
      else if (/^\s{2}[A-Za-z]/.test(line)) inDeps = false;
    }
  }
  finalize();
  return entries;
}

function parseBerryEntries(raw: string): YarnEntry[] {
  const entries: YarnEntry[] = [];
  const lines = raw.split(/\r?\n/);
  let current: YarnEntry | null = null;
  let inDeps = false;

  const finalize = () => {
    if (current) entries.push(current);
    current = null;
    inDeps = false;
  };

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      finalize();
      if (line.startsWith('__metadata')) continue;
      const header = line.replace(/:\s*$/, '');
      current = { headers: splitHeaders(header), version: null, dependencies: [] };
      continue;
    }

    if (!current) continue;

    const vm = /^\s+version:\s*"?([^"\s]+)"?/.exec(line);
    if (vm) { current.version = vm[1]; continue; }

    if (/^\s{2,}dependencies:\s*$/.test(line)) { inDeps = true; continue; }
    if (/^\s{2,}(optionalDependencies|peerDependencies):\s*$/.test(line)) { inDeps = false; continue; }

    if (inDeps) {
      const dm = /^\s{4,}"?([^"\s:]+)"?:\s*"?([^"]+?)"?$/.exec(line);
      if (dm) current.dependencies.push({ name: dm[1], constraint: dm[2] });
      else if (/^\s{2}[A-Za-z]/.test(line)) inDeps = false;
    }
  }
  finalize();
  return entries;
}

function buildResolvedMap(entries: YarnEntry[]): ResolvedMap {
  const out: ResolvedMap = new Map();
  const specToVersion = new Map<string, string>();

  for (const entry of entries) {
    if (!entry.version) continue;
    for (const header of entry.headers) {
      specToVersion.set(normalizeSpec(header), entry.version);
    }
  }

  const parentMap = new Map<string, Map<string, string>>();
  for (const entry of entries) {
    if (!entry.version || !entry.headers.length) continue;
    const parentName = stripRange(entry.headers[0]);
    if (!parentName) continue;
    for (const dep of entry.dependencies) {
      const specKey = normalizeSpec(`${dep.name}@${dep.constraint}`);
      const childVersion = specToVersion.get(specKey);
      if (!childVersion) continue;
      const byVersion = parentMap.get(dep.name) ?? new Map();
      if (!byVersion.has(childVersion)) byVersion.set(childVersion, parentName);
      parentMap.set(dep.name, byVersion);
    }
  }

  for (const entry of entries) {
    if (!entry.version) continue;
    for (const header of entry.headers) {
      const name = stripRange(header);
      if (!name) continue;
      const parent = parentMap.get(name)?.get(entry.version);
      addVersion(out, name, { version: entry.version, parent });
    }
  }
  return out;
}

function splitHeaders(header: string): string[] {
  const parts: string[] = [];
  let buf = '';
  let inQuote = false;
  for (const ch of header) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ',' && !inQuote) { parts.push(buf.trim()); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

function normalizeSpec(spec: string): string {
  return spec.trim().replace(/^"|"$/g, '').replace(/^npm:/, '');
}

function stripRange(spec: string): string | null {
  let s = spec.trim().replace(/^"|"$/g, '');
  if (!s) return null;
  const scoped = s.startsWith('@');
  const searchFrom = scoped ? 1 : 0;
  const at = s.indexOf('@', searchFrom);
  if (at === -1) return s;
  return s.slice(0, at);
}
