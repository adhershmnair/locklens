import * as vscode from 'vscode';
import { detectManifest, resolveForManifest } from './parsers';
import { findDependencies } from './jsonLocator';

const SOURCE_LABEL: Record<string, string> = {
  npm: 'npm',
  yarn: 'yarn',
  pnpm: 'pnpm',
  bun: 'bun',
  composer: 'composer'
};

export class LockLensDecorator {
  private decorationType: vscode.TextEditorDecorationType;
  private enabled = true;

  constructor() {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: { margin: '0 0 0 1.5rem', color: this.currentColor() }
    });
  }

  dispose(): void {
    this.decorationType.dispose();
  }

  toggle(): void {
    this.enabled = !this.enabled;
    for (const editor of vscode.window.visibleTextEditors) {
      this.refresh(editor);
    }
  }

  reloadConfig(): void {
    this.decorationType.dispose();
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: { margin: '0 0 0 1.5rem', color: this.currentColor() }
    });
  }

  refresh(editor: vscode.TextEditor | undefined): void {
    if (!editor) return;
    const kind = detectManifest(editor.document.fileName);
    if (!kind) {
      editor.setDecorations(this.decorationType, []);
      return;
    }
    if (!this.enabled || !this.configEnabled()) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const resolution = resolveForManifest(editor.document.fileName);
    if (!resolution) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const onlyIfDiffers = this.configOnlyIfDiffers();
    const deps = findDependencies(editor.document, kind);
    const decorations: vscode.DecorationOptions[] = [];

    for (const dep of deps) {
      const resolved = resolution.resolved.get(dep.name);
      if (!resolved) continue;
      if (onlyIfDiffers && rangesMatch(dep.declaredRange, resolved)) continue;

      const start = new vscode.Position(dep.startLine, dep.startChar);
      const end = new vscode.Position(dep.endLine, dep.endChar);
      const link = buildRegistryLink(resolution.source, dep.name, resolved);
      const hover = new vscode.MarkdownString(
        `**${dep.name}** \`${resolved}\`\n\n` +
        `Resolved via \`${SOURCE_LABEL[resolution.source]}\` lockfile.` +
        (link ? `\n\n[${link.label}](${link.url})` : '')
      );
      hover.isTrusted = true;
      decorations.push({
        range: new vscode.Range(start, end),
        renderOptions: {
          after: {
            contentText: `→ ${resolved}`
          }
        },
        hoverMessage: hover
      });
    }
    editor.setDecorations(this.decorationType, decorations);
  }

  private currentColor(): string {
    return vscode.workspace.getConfiguration('locklens').get<string>('decorationColor', '#7c7c7c');
  }

  private configEnabled(): boolean {
    return vscode.workspace.getConfiguration('locklens').get<boolean>('enabled', true);
  }

  private configOnlyIfDiffers(): boolean {
    return vscode.workspace.getConfiguration('locklens').get<boolean>('showOnlyIfDiffers', false);
  }
}

function rangesMatch(declared: string, resolved: string): boolean {
  const trimmed = declared.replace(/^[\^~>=<\s]+/, '').trim();
  return trimmed === resolved;
}

function buildRegistryLink(
  source: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'composer',
  name: string,
  version: string
): { url: string; label: string } | null {
  if (source === 'composer') {
    return {
      url: `https://packagist.org/packages/${name}#${encodeURIComponent(version)}`,
      label: 'View on Packagist'
    };
  }
  return {
    url: `https://www.npmjs.com/package/${name}/v/${encodeURIComponent(version)}`,
    label: 'View on npm'
  };
}
