# AGENTS Instructions

## Development Workflow

```bash
yarn dev        # Start Vite dev server at http://localhost:5173
yarn build      # Type-check + production build
yarn nice       # Fix linting + formatting + type-check in one command
yarn types      # TypeScript type-check only
```

### Pre-commit Checklist

- [ ] `yarn nice` passes
- [ ] `yarn build` succeeds
- [ ] Visually verify affected screens in the browser dev server

## Euclid Screen Migration Checklist

When importing or wrapping a screen from `@selfxyz/euclid`, complete **every** item before considering the screen done. Missing any of these causes silent runtime failures (blank animations, broken layouts, missing fonts).

### 1. Assets — public directory

Euclid screens reference assets by URL path (e.g., `/animations/app-tour-welcome.json`, `/backgrounds/dialogue-background.jpg`). These are **not** bundled by the package — the consuming app must serve them from its `public/` directory.

- **Animations:** Check the Euclid screen source for Lottie URI constants or default props pointing to `/animations/*.json`. Copy the corresponding files from `selfxyz/euclid → packages/storybook/public/animations/` into `packages/webview-app/public/animations/`.
- **Backgrounds:** Check for `/backgrounds/*` references. Copy from `selfxyz/euclid → packages/storybook/public/backgrounds/`.
- **Fonts:** Verify `packages/webview-app/public/fonts/` has all typefaces used by the screen's Euclid components. Current set: Advercase-Regular, DINOT-Bold, DINOT-Medium, IBMPlexMono-Regular.
- **Images:** Euclid components that import images from `../../assets/images/` are bundled via the build — no action needed. Only URL-path references (string literals starting with `/`) require `public/` copies.

Run a quick grep to catch URL-path asset references you might miss:

```bash
grep -rE "'/[a-z].*\.(json|jpg|png|svg)'" packages/webview-app/node_modules/@selfxyz/euclid/src/screens/<screen-path>/
```

**Downloading assets from the euclid repo:** The `selfxyz/euclid` repo is private. Use `gh api` to download files. The GitHub contents API silently returns empty content for files >1 MB. For any asset that may be large (Lottie animations, images), always use the **git blob API**:

```bash
# Step 1: get the file's SHA
sha=$(gh api repos/selfxyz/euclid/contents/<path> --jq '.sha')

# Step 2: download via blob (handles files up to 100 MB)
gh api repos/selfxyz/euclid/git/blobs/$sha --jq '.content' | base64 -d > <filename>
```

After downloading, always verify file sizes are non-zero (`wc -c <file>`). A 0-byte or 14-byte file means the download silently failed.

**Sandboxed / offline environments (Codex):** If you cannot access the network, check whether the required asset already exists in `public/animations/` or `public/backgrounds/`. If it does not exist and you cannot download it, document the missing asset in your PR description so it can be added before merge.

**Asset locations:**

| Asset type  | Euclid source                                             | Local destination                          |
| ----------- | --------------------------------------------------------- | ------------------------------------------ |
| Animations  | `selfxyz/euclid → packages/storybook/public/animations/`  | `packages/webview-app/public/animations/`  |
| Backgrounds | `selfxyz/euclid → packages/storybook/public/backgrounds/` | `packages/webview-app/public/backgrounds/` |
| Fonts       | Already in place                                          | `packages/webview-app/public/fonts/`       |
| Images      | Bundled via imports (no action needed)                    | N/A                                        |

**Note on Prettier:** Lottie animation JSON files in `public/animations/` are excluded from Prettier formatting (see `.prettierignore`). These files should remain flat/minified — do not reformat them.

### 2. Safe area insets

Every Euclid screen that accepts a `SafeArea` / `insets` prop **must** receive `WEB_SAFE_AREA` (from `src/utils/insets.ts`). Missing insets cause content to render under notches or flush against edges.

- Full-screen Euclid components (e.g., `LaunchTour*Screen`, `IDTypeScreen`, `CountryPickerScreen`): spread `{...WEB_SAFE_AREA}` as a prop.
- Composite Euclid components used inside custom layouts (e.g., `StatusState`, `ProofRequestScreen`): check whether the parent layout already handles padding. If the Euclid component accepts `insets`, pass them.

### 3. Validation

After wiring the screen, visually verify in the browser dev server (`yarn dev`):

- Lottie animations play (not blank/black or a static dot).
- Background images load (not a solid color fallback).
- Text renders in the correct typeface (not system fallback).
- Content respects safe area padding (not clipped or flush).

## Architecture Notes

- **Vite + React** — SPA with `react-router-dom` for routing
- **`@selfxyz/euclid`** — external design system package providing screen components, icons, and tokens
- **`@selfxyz/webview-bridge`** — communication layer to native shells; in standalone browser mode (no native shell), bridge requests reject immediately since there is no transport
- **`@selfxyz/mobile-sdk-alpha`** — shared SDK logic consumed via the `/browser` entry point

## Routes

- **Dev-only routes register under `/dev/*`** and are gated on `import.meta.env.DEV` at the registration site. Production builds never include them. `DevRouteMenu` is the only allowed entry point.
- The nav-hygiene workstream owns the routing contract — see [specs/projects/sdk/workstreams/nav-hygiene/SPEC.html](../../specs/projects/sdk/workstreams/nav-hygiene/SPEC.html).
