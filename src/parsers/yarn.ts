import { ResolvedMap } from './types';

export function parseYarnLock(raw: string): ResolvedMap {
  if (raw.trimStart().startsWith('__metadata:')) return parseBerry(raw);
  return parseClassic(raw);
}

function parseClassic(raw: string): ResolvedMap {
  const out: ResolvedMap = new Map();
  const lines = raw.split(/\r?\n/);
  let headers: string[] = [];
  let version: string | null = null;

  const flush = () => {
    if (!headers.length || !version) return;
    for (const header of headers) {
      const name = stripRange(header);
      if (name && !out.has(name)) out.set(name, version);
    }
  };

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      flush();
      headers = [];
      version = null;
      const header = line.replace(/:\s*$/, '');
      headers = splitHeaders(header);
      continue;
    }

    const vm = /^\s+version\s+"?([^"\s]+)"?/.exec(line);
    if (vm) version = vm[1];
  }
  flush();
  return out;
}

function parseBerry(raw: string): ResolvedMap {
  const out: ResolvedMap = new Map();
  const lines = raw.split(/\r?\n/);
  let headers: string[] = [];
  let version: string | null = null;

  const flush = () => {
    if (!headers.length || !version) return;
    for (const header of headers) {
      const name = stripRange(header);
      if (name && !out.has(name)) out.set(name, version);
    }
  };

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      if (line.startsWith('__metadata')) { flush(); headers = []; version = null; continue; }
      flush();
      headers = [];
      version = null;
      const header = line.replace(/:\s*$/, '');
      headers = splitHeaders(header);
      continue;
    }

    const vm = /^\s+version:\s*"?([^"\s]+)"?/.exec(line);
    if (vm) version = vm[1];
  }
  flush();
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

function stripRange(spec: string): string | null {
  let s = spec.trim().replace(/^"|"$/g, '');
  if (!s) return null;
  const scoped = s.startsWith('@');
  const searchFrom = scoped ? 1 : 0;
  const at = s.indexOf('@', searchFrom);
  if (at === -1) return s;
  return s.slice(0, at);
}
