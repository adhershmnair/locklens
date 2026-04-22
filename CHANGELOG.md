# Changelog

All notable changes to **LockLens** are documented in this file.

## [0.1.0] — 2026-04-22

### Added

- Inline resolved-version annotations for `package.json`, sourced from:
  - `pnpm-lock.yaml`
  - `yarn.lock` (classic and Berry)
  - `bun.lock` (Bun ≥ 1.2, text format)
  - `package-lock.json` (lockfile v1, v2, v3)
  - `npm-shrinkwrap.json`
- Inline resolved-version annotations for `composer.json`, sourced from `composer.lock`.
- Rich hover card per dependency, linking to:
  - [npmjs.com](https://www.npmjs.com) for Node packages
  - [Packagist](https://packagist.org) for Composer packages
- Commands:
  - `LockLens: Refresh resolved versions`
  - `LockLens: Toggle inline versions`
- Configuration:
  - `locklens.enabled` — show or hide annotations
  - `locklens.showOnlyIfDiffers` — only annotate when the resolved version differs from the declared constraint
  - `locklens.decorationColor` — customise the inline text color
- Automatic refresh when a lock file is saved.

### Notes

- Zero runtime dependencies — all lock-file parsing is implemented in-tree.
- Binary `bun.lockb` is not supported; generate the text format with `bun install` on Bun 1.2+.
