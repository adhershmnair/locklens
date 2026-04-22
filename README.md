<div align="center">

![LockLens](media/logo.png)

# LockLens

Inline resolved versions from lock files — one extension, five ecosystems.

**npm** &nbsp;·&nbsp; **yarn** &nbsp;·&nbsp; **pnpm** &nbsp;·&nbsp; **bun** &nbsp;·&nbsp; **composer**

</div>

---

## What it does

LockLens peeks into your lock files and shows the **actually resolved version** of every declared dependency, right next to the semver range in your manifest:

```jsonc
{
  "dependencies": {
    "react": "^18.2.0",        → 18.3.1  (pnpm)
    "lodash": "^4.0.0"         → 4.17.21 (pnpm)
  }
}
```

No more running `npm ls`, `pnpm why`, or `composer show` just to see what got installed.

## Supported files

| Manifest | Lock files it reads |
|---|---|
| `package.json` | `pnpm-lock.yaml`, `yarn.lock` (classic + Berry), `bun.lock`, `package-lock.json`, `npm-shrinkwrap.json` |
| `composer.json` | `composer.lock` |

LockLens picks the first lock file it finds in that priority order (pnpm → yarn → bun → npm), so monorepos with multiple lock files still resolve predictably.

## Features

- **Zero runtime dependencies** — all lock-file parsing is built in.
- **Inline decorations** — resolved versions render as subtle ghost text next to each entry.
- **Hover tooltips** — shows which lock file the version came from.
- **Auto-refresh** — re-reads when you save a lock file.
- **Toggle on/off** — `LockLens: Toggle inline versions` from the command palette.
- Sections scanned:
  - `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies` in `package.json`
  - `require`, `require-dev` in `composer.json`

## Settings

| Key | Default | Purpose |
|---|---|---|
| `locklens.enabled` | `true` | Show inline resolved versions. |
| `locklens.showOnlyIfDiffers` | `false` | Hide the annotation when the resolved version already matches the declared string. |
| `locklens.decorationColor` | `#7c7c7c` | Color of the inline text. |

## Commands

- `LockLens: Refresh resolved versions`
- `LockLens: Toggle inline versions`

## How it works

On opening a `package.json` or `composer.json`, LockLens:

1. Detects the manifest kind.
2. Looks for a sibling lock file.
3. Parses it into a `name → version` map.
4. Finds each declared dependency in the manifest and attaches an after-line decoration with the resolved version.

All parsing is done with hand-written, dependency-free parsers — the extension ships with **no `node_modules` at runtime**.

## Caveats

- Bun's binary `bun.lockb` is not read — generate the text format with `bun install --save-text-lockfile` (or use Bun 1.2+ defaults).
- Only direct dependencies shown in the manifest are annotated. Transitive versions are not surfaced inline.
- Workspaces/monorepos: the lock file must live in the same directory as the manifest, or alongside the root workspace manifest.

## License

MIT
