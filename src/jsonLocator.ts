import * as vscode from 'vscode';

export interface DependencyRef {
  name: string;
  declaredRange: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
}

const NODE_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const COMPOSER_SECTIONS = ['require', 'require-dev'];

export function findDependencies(doc: vscode.TextDocument, kind: 'node' | 'composer'): DependencyRef[] {
  const sections = kind === 'node' ? NODE_SECTIONS : COMPOSER_SECTIONS;
  const text = doc.getText();
  const refs: DependencyRef[] = [];

  for (const section of sections) {
    const block = locateSection(text, section);
    if (!block) continue;
    refs.push(...scanBlock(doc, text, block.start, block.end));
  }
  return refs;
}

function locateSection(text: string, name: string): { start: number; end: number } | null {
  const re = new RegExp(`"${escapeRegex(name)}"\\s*:\\s*\\{`, 'g');
  const match = re.exec(text);
  if (!match) return null;
  const start = match.index + match[0].length;
  const end = findMatchingBrace(text, start - 1);
  if (end === -1) return null;
  return { start, end };
}

function findMatchingBrace(text: string, openIdx: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function scanBlock(doc: vscode.TextDocument, text: string, start: number, end: number): DependencyRef[] {
  const entryRe = /"([^"\\]+)"\s*:\s*"([^"\\]*)"/g;
  entryRe.lastIndex = start;
  const refs: DependencyRef[] = [];

  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(text)) !== null) {
    if (m.index > end) break;
    const name = m[1];
    const range = m[2];
    const startOffset = m.index;
    const endOffset = m.index + m[0].length;
    const startPos = doc.positionAt(startOffset);
    const endPos = doc.positionAt(endOffset);
    refs.push({
      name,
      declaredRange: range,
      startLine: startPos.line,
      startChar: startPos.character,
      endLine: endPos.line,
      endChar: endPos.character
    });
  }
  return refs;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
