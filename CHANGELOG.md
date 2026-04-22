# Changelog

## [0.2.0] — 2026-04-22

### Added

- Registry update checks: queries [npmjs.com](https://www.npmjs.com) for Node manifests and [Packagist](https://packagist.org) for Composer manifests.
- Inline color coding: **red** when a newer version is available, **green** otherwise.
- Multi-version tracking: when a package has multiple resolved versions in the lockfile, the highest one is shown inline and the rest are listed in the hover with their parent packages.
- Parent attribution for transitive dependencies across npm, yarn (classic + Berry), and pnpm.
- Clickable registry links in the hover, pinned to the installed version.
- One-hour in-memory cache for registry responses. `LockLens: Refresh resolved versions` clears the cache and re-fetches.

### Changed

- Simplified settings surface.
- Hover no longer mentions the lockfile type redundantly.
- HTTPS fetch hardened: https-only, redirect cap, response-size cap, stream error handler.

### Removed

- `locklens.showOnlyIfDiffers` — the resolved version is always shown now.
- `locklens.decorationColor` — superseded by the two status colors.

### Settings

- `locklens.enabled`
- `locklens.checkUpdates`
- `locklens.colorize`
- `locklens.outdatedColor`
- `locklens.upToDateColor`

## [0.1.0] — 2026-04-22

### Added

- Inline resolved-version annotations for `package.json` (npm, yarn classic + Berry, pnpm, bun) and `composer.json`.
- Rich hover card with a deep link to the registry.
- Commands: `LockLens: Refresh resolved versions`, `LockLens: Toggle inline versions`.
- Auto-refresh on lock-file save.
- Zero runtime dependencies.
