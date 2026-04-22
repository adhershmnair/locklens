export type ResolvedMap = Map<string, string>;

export interface ResolutionResult {
  source: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'composer';
  resolved: ResolvedMap;
}
