import { ResolvedMap } from './types';

export function parsePnpmLock(raw: string): ResolvedMap {
  const out: ResolvedMap = new Map();
  const lines = raw.split(/\r?\n/);

  let inPackages = false;
  let packagesIndent = -1;
  let entryIndent = -1;
  let currentKey: string | null = null;
  let currentVersion: string | null = null;

  const flush = () => {
    if (!currentKey) return;
    const { name, version } = parsePackageKey(currentKey);
    const resolved = currentVersion ?? version;
    if (name && resolved && !out.has(name)) out.set(name, resolved);
    currentKey = null;
    currentVersion = null;
  };

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) continue;
    const indent = rawLine.length - rawLine.trimStart().length;

    if (!inPackages) {
      if (/^packages\s*:\s*$/.test(rawLine)) {
        inPackages = true;
        packagesIndent = indent;
      }
      continue;
    }

    if (indent <= packagesIndent) {
      flush();
      if (/^[A-Za-z0-9_-]+\s*:\s*$/.test(rawLine)) {
        inPackages = false;
      }
      continue;
    }

    if (entryIndent === -1) entryIndent = indent;

    if (indent === entryIndent) {
      flush();
      const m = /^\s*'?([^']+?)'?\s*:\s*$/.exec(rawLine) || /^\s*"([^"]+)"\s*:\s*$/.exec(rawLine);
      if (m) currentKey = m[1];
      continue;
    }

    if (currentKey && /^\s+version:\s*/.test(rawLine)) {
      const vm = /^\s+version:\s*'?"?([^'"\s]+)'?"?/.exec(rawLine);
      if (vm) currentVersion = vm[1];
    }
  }
  flush();
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
