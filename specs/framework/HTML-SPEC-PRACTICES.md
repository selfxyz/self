# HTML Spec Practices

> Short. Big principles only. Future skill candidate.

When a spec earns HTML (interactive elements, diagrams, status pills, multi-page workstream), follow these. Markdown is still the default for prose-only specs.

## Fonts

Google Fonts. Use both.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,500;0,600;0,700;1,500&display=swap" />
```

- **Lora** (serif) for every heading (`h1`–`h6`) and for prominent decision text rendered as a paragraph (e.g. the OQ card question).
- **Lato** (sans) for body, navigation, tables, uppercase eyebrow labels, and mermaid diagram labels.
- `ui-monospace` for code, pre, kbd. Don't theme these.

CSS shape:

```css
body { font: 14.5px/1.6 "Lato", -apple-system, BlinkMacSystemFont, sans-serif; }
h1, h2, h3, h4, h5, h6 { font-family: "Lora", Georgia, serif; font-weight: 600; letter-spacing: -0.005em; }
```

## Writing style

- **No em dashes.** Use a hyphen, a comma, parentheses, or a period and a new sentence. This goes for the rendered prose, the JS data files that feed it, and the commit messages that ship it.
- **Eyebrow labels stay sans.** `main h3` used as a small-caps label ("WHY", "DECISION") stays in Lato bold caps. Reserve Lora for real headings.
- **Descriptive link text.** `[SDK Overview](./OVERVIEW.md)` not `[OVERVIEW.md](./OVERVIEW.md)`.

## Layout

- Sticky topbar with title + pills + cross-doc links.
- 2-column grid: TOC sidebar (≤180px) + main (`minmax(0, 1fr)`), wrap on narrow.
- TOC sticky under the topbar, font 12.5px, narrow padding. Don't oversize the rail; content first.
- Sections in cards: white surface, soft border, 8px radius, 16px gap.

## Status & chips

- One status vocabulary across the workstream. Done / In progress / Active / Pending / Deferred / Blocked / Superseded.
- Status pills are class-driven (`.status.done`, `.status.pending`, etc.). Color comes from the palette tokens.
- A **Recommended** chip on a chosen option uses the palette accent on its background with ink text. Don't tint the surrounding card; let the chip carry the signal.

## Diagrams

- Mermaid via CDN. One page can mix static topology diagrams and dynamically-rendered per-option diagrams.
- `theme: 'base'` + explicit `themeVariables` keeps mermaid in sync with the palette. Don't rely on `default`.
- For decision questions with multiple options, give each option its own small diagram. Don't pack all options into one big subgraph diagram.

## Interactive open questions

When a page collects user decisions:

- Each question is a card: id + impact chip + status pill + Lora question text + context + radio options + "Something else" + notes textarea + Clear button.
- One option per question can be `recommended: true` with a `because:` rationale shown under it.
- Persist to `localStorage` (keyed per workstream, versioned: e.g. `wia-17-open-questions-v1`).
- Provide a thin sticky summary pill at the top: `X / N` + progress bar + export-as-markdown + reset.
- Pattern reference: `specs/projects/sdk/workstreams/webview-in-app/plans/WIA-17-open-questions.js`.

## CSS strategy

Do **not** pull in a classless framework (sakura, water, simple, pico, etc.). They don't ship the layouts we need (sticky sidebar, status pills, mermaid containers, OQ cards), and fighting their defaults costs more than writing 100 lines of CSS once.

Do:

1. **Inline `<style>` per page** while a pattern is being trialed (current default). Self-contained, no link rot.
2. **Extract to `specs/framework/_spec.css`** the moment the same CSS appears in 3+ files. Link it with `<link rel="stylesheet" href="../../framework/_spec.css">` (relative path resolved per page).
3. **Keep page-specific styles inline** (e.g. OQ card variations, custom diagram cards). Don't push everything into the shared file.

Tokens live in `:root` as CSS custom properties so a palette swap is a 5-variable edit, not a find-and-replace.

## Palette

Currently **trialing** the WIA-17 palette on a single page before rolling out. When locked in, document it here. Until then, copy the `:root` block from `specs/projects/sdk/workstreams/webview-in-app/plans/WIA-17-architecture-options.html`.

## Filename conventions

- `SPEC.html` for the workstream spec, `SPEC-<TOPIC>.html` for sub-topics.
- `plans/<ID>-<slug>.html` for execution plans.
- `plans/<ID>-open-questions.js` for the interactive question registry that feeds a plan or audit page.
- No singleton folders, no project prefix in filenames (use the folder, not the name).
