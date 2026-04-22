# Changelog

All notable changes to **LockLens** are documented in this file.

## [0.2.0] — 2026-04-22

### Added

- **Outdated-version detection.** LockLens now queries the registry for the latest published version and color-codes each dependency:
  - 🔴 **Red** — a newer version is available on the registry.
  - 🟢 **Green** — the resolved version matches the latest on the registry.
  - ⚪ **Gray** — the latest version is being fetched, the registry is unreachable, or update checks are disabled.
- When a dependency is outdated, the inline annotation shows both the resolved and the latest version (e.g. `→ 18.2.0 ⟶ 19.2.5`).
- Hover card now reports the update status and classifies the drift as `major`, `minor`, or `patch`.
- In-memory cache with a 1-hour TTL so the registry is never hammered.
- Graceful fallback to the "unknown" state when the registry is unreachable or a package isn't found.

### Settings

- `locklens.checkUpdates` — enable or disable registry lookups (default: `true`).
- `locklens.colorize` — toggle red/green coloring; when off, a single neutral color is used (default: `true`).
- `locklens.outdatedColor` — color when a newer version is available on the registry (default: `#d64545`).
- `locklens.upToDateColor` — color otherwise (default: `#64a46b`).

### Removed

- `locklens.showOnlyIfDiffers` setting (always show the resolved version now).
- `locklens.decorationColor` setting (simplified to two states).

## [0.1.0] — 2026-04-22

### Added

- Inline resolved-version annotations for `package.json`, sourced from:
  - `pnpm-lock.yaml`
  - `yarn.lock` (classic and Berry)
  - `bun.lock` (Bun ≥ 1.2, text format)
  - `package-lock.json` (lockfile v1, v2, v3)
  - `npm-shrinkwrap.json`
- Inline resolved-version annotations for `composer.json`, sourced from `composer.lock`.
- Rich hover card per dependency, linking to [npmjs.com](https://www.npmjs.com) or [Packagist](https://packagist.org).
- Commands: `LockLens: Refresh resolved versions`, `LockLens: Toggle inline versions`.
- Configuration: `locklens.enabled`, `locklens.showOnlyIfDiffers`, `locklens.decorationColor`.
- Automatic refresh on lock-file save.
- Zero runtime dependencies — all lock-file parsing is implemented in-tree.
