import * as fs from 'fs';
import * as path from 'path';
import { ResolutionResult, ResolvedMap } from './types';
import { parseNpmLock } from './npm';
import { parseYarnLock } from './yarn';
import { parsePnpmLock } from './pnpm';
import { parseBunLock } from './bun';
import { parseComposerLock } from './composer';

type ManifestKind = 'node' | 'composer';

export function detectManifest(filePath: string): ManifestKind | null {
  const base = path.basename(filePath);
  if (base === 'package.json') return 'node';
  if (base === 'composer.json') return 'composer';
  return null;
}

export function resolveForManifest(manifestPath: string): ResolutionResult | null {
  const kind = detectManifest(manifestPath);
  if (!kind) return null;
  const dir = path.dirname(manifestPath);

  if (kind === 'composer') {
    const lock = path.join(dir, 'composer.lock');
    if (exists(lock)) {
      return { source: 'composer', resolved: safe(() => parseComposerLock(read(lock))) };
    }
    return null;
  }

  const candidates: Array<{ name: string; source: ResolutionResult['source']; parse: (raw: string) => ResolvedMap }> = [
    { name: 'pnpm-lock.yaml', source: 'pnpm', parse: parsePnpmLock },
    { name: 'yarn.lock', source: 'yarn', parse: parseYarnLock },
    { name: 'bun.lock', source: 'bun', parse: parseBunLock },
    { name: 'package-lock.json', source: 'npm', parse: parseNpmLock },
    { name: 'npm-shrinkwrap.json', source: 'npm', parse: parseNpmLock }
  ];

  for (const c of candidates) {
    const p = path.join(dir, c.name);
    if (exists(p)) {
      return { source: c.source, resolved: safe(() => c.parse(read(p))) };
    }
  }
  return null;
}

function exists(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function read(p: string): string {
  return fs.readFileSync(p, 'utf8');
}

function safe(fn: () => ResolvedMap): ResolvedMap {
  try {
    return fn();
  } catch {
    return new Map();
  }
}
