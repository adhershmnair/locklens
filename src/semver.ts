export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  pre: string | null;
}

export function parseVersion(v: string): ParsedVersion | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+.+)?$/.exec(v.trim());
  if (!m) return null;
  return {
    major: parseInt(m[1], 10),
    minor: parseInt(m[2], 10),
    patch: parseInt(m[3], 10),
    pre: m[4] ?? null
  };
}

export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return 0;
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  if (pa.patch !== pb.patch) return pa.patch - pb.patch;
  if (!pa.pre && !pb.pre) return 0;
  if (!pa.pre) return 1;
  if (!pb.pre) return -1;
  return pa.pre < pb.pre ? -1 : pa.pre > pb.pre ? 1 : 0;
}

export function classifyDrift(current: string, latest: string): 'major' | 'minor' | 'patch' | 'same' {
  const pa = parseVersion(current);
  const pb = parseVersion(latest);
  if (!pa || !pb) return 'same';
  if (pa.major !== pb.major) return 'major';
  if (pa.minor !== pb.minor) return 'minor';
  if (pa.patch !== pb.patch) return 'patch';
  return 'same';
}
