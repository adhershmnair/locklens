import * as vscode from 'vscode';
import { detectManifest, resolveForManifest } from './parsers';
import { findDependencies } from './jsonLocator';
import { VersionEntry } from './parsers/types';
import { getCachedLatest, getLatestVersion } from './registry';
import { classifyDrift, compareVersions } from './semver';

type Source = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'composer';
type Status = 'outdated' | 'current';

const NEUTRAL_COLOR = '#7c7c7c';

export class LockLensDecorator {
  private deco: Record<Status, vscode.TextEditorDecorationType>;
  private enabled = true;
  private pendingTimers = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.deco = this.buildDecorations();
  }

  dispose(): void {
    for (const d of Object.values(this.deco)) d.dispose();
    for (const t of this.pendingTimers.values()) clearTimeout(t);
  }

  toggle(): void {
    this.enabled = !this.enabled;
    for (const editor of vscode.window.visibleTextEditors) this.refresh(editor);
  }

  reloadConfig(): void {
    for (const d of Object.values(this.deco)) d.dispose();
    this.deco = this.buildDecorations();
  }

  refresh(editor: vscode.TextEditor | undefined): void {
    if (!editor) return;
    const kind = detectManifest(editor.document.fileName);
    if (!kind) { this.clear(editor); return; }

    if (!this.enabled || !this.cfg<boolean>('enabled', true)) {
      this.clear(editor);
      return;
    }

    const resolution = resolveForManifest(editor.document.fileName);
    if (!resolution) { this.clear(editor); return; }

    const checkUpdates = this.cfg<boolean>('checkUpdates', true);
    const deps = findDependencies(editor.document, kind);

    const buckets: Record<Status, vscode.DecorationOptions[]> = {
      outdated: [],
      current: []
    };

    for (const dep of deps) {
      const entries = resolution.resolved.get(dep.name);
      if (!entries || entries.length === 0) continue;

      const sorted = [...entries].sort((a, b) => compareVersions(b.version, a.version));
      const primary = sorted[0].version;

      const registryKind = kind === 'composer' ? 'composer' : 'node';
      let latest: string | null | undefined = undefined;
      let status: Status = 'current';

      if (checkUpdates) {
        latest = getCachedLatest(registryKind, dep.name);
        if (latest === undefined) {
          this.scheduleFetch(editor, registryKind, dep.name);
        } else if (latest && compareVersions(primary, latest) < 0) {
          status = 'outdated';
        }
      }

      const range = new vscode.Range(
        new vscode.Position(dep.startLine, dep.startChar),
        new vscode.Position(dep.endLine, dep.endChar)
      );
      buckets[status].push({
        range,
        renderOptions: { after: { contentText: `→ ${primary}` } },
        hoverMessage: this.buildHover(resolution.source, dep.name, sorted, latest, status)
      });
    }

    for (const [key, opts] of Object.entries(buckets) as [Status, vscode.DecorationOptions[]][]) {
      editor.setDecorations(this.deco[key], opts);
    }
  }

  private clear(editor: vscode.TextEditor): void {
    for (const d of Object.values(this.deco)) editor.setDecorations(d, []);
  }

  private scheduleFetch(editor: vscode.TextEditor, kind: 'node' | 'composer', name: string): void {
    const key = `${kind}:${name}`;
    if (this.pendingTimers.has(key)) return;
    const timer = setTimeout(() => {
      this.pendingTimers.delete(key);
      getLatestVersion(kind, name).then(() => {
        if (vscode.window.activeTextEditor === editor) this.refresh(editor);
      });
    }, 50);
    this.pendingTimers.set(key, timer);
  }

  private buildHover(
    source: Source,
    name: string,
    sorted: VersionEntry[],
    latest: string | null | undefined,
    status: Status
  ): vscode.MarkdownString {
    const registryName = source === 'composer' ? 'Packagist' : 'npm';
    const primary = sorted[0].version;
    const url = source === 'composer'
      ? `https://packagist.org/packages/${name}#${encodeURIComponent(primary)}`
      : `https://www.npmjs.com/package/${name}/v/${encodeURIComponent(primary)}`;

    const lines: string[] = [];
    lines.push(`**${name}**`);
    lines.push('');
    lines.push(`**Installed:** \`${primary}\` _(from \`${source}\` lockfile)_`);

    if (sorted.length > 1) {
      lines.push('');
      lines.push(`**Other installed versions** _(from transitive dependencies)_:`);
      for (const entry of sorted.slice(1)) {
        const parentNote = entry.parent ? ` — via \`${entry.parent}\`` : '';
        lines.push(`- \`${entry.version}\`${parentNote}`);
      }
    }

    lines.push('');
    if (status === 'outdated' && latest) {
      const drift = classifyDrift(primary, latest);
      lines.push(`**Latest on ${registryName}:** \`${latest}\` — 🔴 ${drift} update available`);
    } else if (latest) {
      lines.push(`**Latest on ${registryName}:** \`${latest}\` — 🟢 up to date`);
    } else if (latest === null) {
      lines.push(`**Latest on ${registryName}:** couldn't reach the registry`);
    } else {
      lines.push(`**Latest on ${registryName}:** checking…`);
    }

    lines.push('');
    lines.push(`[View on ${registryName}](${url})`);

    return new vscode.MarkdownString(lines.join('\n'));
  }

  private buildDecorations(): Record<Status, vscode.TextEditorDecorationType> {
    const colorize = this.cfg<boolean>('colorize', true);
    const outdatedColor = colorize ? this.cfg<string>('outdatedColor', '#d64545') : NEUTRAL_COLOR;
    const currentColor = colorize ? this.cfg<string>('upToDateColor', '#64a46b') : NEUTRAL_COLOR;
    const margin = '0 0 0 1.5rem';
    return {
      outdated: vscode.window.createTextEditorDecorationType({ after: { margin, color: outdatedColor } }),
      current: vscode.window.createTextEditorDecorationType({ after: { margin, color: currentColor } })
    };
  }

  private cfg<T>(key: string, fallback: T): T {
    return vscode.workspace.getConfiguration('locklens').get<T>(key, fallback);
  }
}
