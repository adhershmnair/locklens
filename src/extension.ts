import * as vscode from 'vscode';
import * as path from 'path';
import { LockLensDecorator } from './decorator';

const LOCK_FILES = new Set([
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lock',
  'composer.lock'
]);

export function activate(context: vscode.ExtensionContext): void {
  const decorator = new LockLensDecorator();
  context.subscriptions.push(decorator);

  const refreshAll = () => {
    for (const editor of vscode.window.visibleTextEditors) decorator.refresh(editor);
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => decorator.refresh(editor)),
    vscode.window.onDidChangeVisibleTextEditors(() => refreshAll()),
    vscode.workspace.onDidSaveTextDocument(doc => {
      if (LOCK_FILES.has(path.basename(doc.fileName))) refreshAll();
      else decorator.refresh(vscode.window.activeTextEditor);
    }),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('locklens')) {
        decorator.reloadConfig();
        refreshAll();
      }
    }),
    vscode.commands.registerCommand('locklens.refresh', refreshAll),
    vscode.commands.registerCommand('locklens.toggle', () => decorator.toggle())
  );

  refreshAll();
}

export function deactivate(): void {}
