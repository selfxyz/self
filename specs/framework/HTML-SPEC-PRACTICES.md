# HTML Spec Practices

> Short. Big principles only. Future skill candidate.

When a spec earns HTML (interactive elements, diagrams, status pills, multi-page workstream), follow these. Markdown is still the default for prose-only specs.

**Reference page:** [WIA-17 Architecture deep-dive](../projects/sdk/workstreams/webview-in-app/plans/WIA-17-architecture-options.html) is the canonical example. Copy its `:root` block, mermaid init, and OQ card pattern verbatim. Don't roll your own.

## Fonts

Locked in. Google Fonts, both.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,500;0,600;0,700;1,500&display=swap"
/>
```

- **Lora** (serif) for every heading (`h1`–`h6`) and for prominent decision text rendered as a paragraph (e.g. the OQ card question).
- **Lato** (sans) for body, navigation, tables, eyebrow labels, mermaid diagram labels, code captions.
- `ui-monospace` for code, pre, kbd. Don't theme these.

```css
body {
  font:
    14.5px/1.6 'Lato',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}
h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: 'Lora', Georgia, serif;
  font-weight: 600;
  letter-spacing: -0.005em;
}
```

## Palette

Locked in. Drop this `:root` block into any new page.

```css
:root {
  --p-yellow: #fce694;
  --p-blue: #067bc2;
  --p-green: #46aa44;
  --p-ice: #d6edff;
  --p-red: #f24236;

  --bg: #fffdf6;
  --surface: #ffffff;
  --surface-alt: #f5f3ec;
  --border: #ddd7cd;
  --border-soft: #ece7de;
  --text: #2a1f18;
  --muted: #786c60;

  --accent: var(--p-blue);
  --accent-soft: var(--p-ice);
  --accent-chip: var(--p-blue);

  --done: var(--p-green);
  --done-soft: #dcf3db;

  --high: var(--p-red);
  --high-soft: #fdddda;

  --med: #8a6a1f;
  --med-soft: var(--p-yellow);

  --graph-bg: #f5f3ec;
}
```

- Page bg (`--bg`) is the warm cream `#FFFDF6`. White section cards sit one shade brighter on top.
- `--graph-bg` and `--surface-alt` are the same slightly-darker cream so graph panels, code blocks, table headers, and status chips all share one tone.
- One accent (`#067BC2`, AA on white). Soft tint `#D6EDFF` for hover/selected backgrounds.
- Real green for success/answered, real red for danger/duplicate, palette yellow for warnings.

## Writing style

- **No em dashes.** Use a colon, hyphen, comma, parentheses, or a new sentence. Applies to prose, JS data, commit messages.
- **Titles use colons** when the second clause elaborates: `Today: three parallel bridge implementations`, not `Today — three parallel bridge implementations`.
- **No `text-transform: uppercase` as decoration.** Eyebrow labels stay sans + small + letter-spaced, but render in sentence case. The exception is the explicit mermaid scope override (see Diagrams).
- **Descriptive link text:** `[SDK Overview](./OVERVIEW.md)`, not `[OVERVIEW.md](./OVERVIEW.md)`.
- **Compound code identifiers in diagrams get spaced:** `KMP Message Router`, not `KMP MessageRouter`, when readability beats code-mapping.

## Layout

- Sticky topbar with title + pills + cross-doc links. Add `will-change: transform` and a 1px shadow so it stays composited across rerenders.
- 2-column grid: TOC sidebar (160px), main `minmax(0, 1fr)`, gap 24px, max-width 1180px.
- TOC sticky under the topbar, 12.5px Lato, narrow padding. Content first; don't oversize the rail.
- Each `<section>` is the box: white surface, 1px `--border`, 8px radius, 16px margin between sections. **Don't add another card inside.**

## One box per question

The hardest rule to enforce and the most worth it. Trace from any chip (e.g. the OQ id pill) outward to the page background. It should pass **exactly one** white card. If you count two, you've nested a `.oq-card` or similar inside the `<section>` and need to flatten it.

```css
.oq-card {
  background: transparent;
  border: 0;
  padding: 0;
  margin: 0;
}
```

The section provides the box. The card is just a content wrapper for the JS renderer.

## Status & chips

- One status vocabulary across the workstream. Done / In progress / Active / Pending / Deferred / Blocked / Superseded.
- Status pills are class-driven (`.status.done`, `.status.pending`, etc.). Color comes from the palette tokens.
- The **Recommended** chip is inline `·` separator text, not a pill. Inherits the answer label's font and color (`var(--accent)`), prefixed by a muted middot. Reads as `B. Import from self-sdk-swift · Recommended`.

```css
.oq-rec-chip {
  font: inherit;
  color: var(--accent);
  background: transparent;
  border: 0;
  padding: 0;
}
.oq-rec-chip::before {
  content: '·';
  color: var(--muted);
  margin-right: 6px;
  font-weight: 400;
}
```

## Diagrams

Mermaid v10 via CDN. Static topology diagrams + dynamically-rendered per-option diagrams on the same page.

### Theme + chrome

- `theme: 'base'` plus the explicit `themeVariables` from the reference page. **Never `theme: 'default'`** because its palette is purple/yellow and overrides yours.
- **Don't use the ELK layout adapter.** It silently overrides `themeVariables` and reverts the palette to purple/yellow.
- `curve: 'basis'` for smooth arrows. The corner-arrival issue (multi-edge fan-in landing at node corners) is a mermaid layout quirk; restructure the diagram to avoid it rather than switching engines.
- `nodeSpacing: 40`, `rankSpacing: 60`, `padding: 18`, `htmlLabels: true`, `useMaxWidth: true`.

### Minimalism for readability

- **Every node goes through a classDef** with explicit `stroke:#DDD7CD, stroke-width:1px`. Default mermaid borders render with subtly different attributes than classDef strokes; passing all nodes through the same path makes border color and width visually identical across red/green/plain boxes.
  ```
  classDef plain fill:#FFFFFF,stroke:#DDD7CD,stroke-width:1px,color:#2A1F18
  classDef src   fill:#46AA44,stroke:#DDD7CD,stroke-width:1px,color:#FFFFFF
  classDef dup   fill:#F24236,stroke:#DDD7CD,stroke-width:1px,color:#FFFFFF
  ```
- **Color is reserved for the 2–3 nodes that carry the point.** White text on saturated fill, not tinted backgrounds with colored borders.
- **Arrows are coffee-ink and strong:** `lineColor: '#2A1F18'`, edge path `stroke-width: 1.5px`. Default mermaid gray disappears behind labels.
- **Subgraphs:** dashed 1px border, transparent fill, 8px radius. They're grouping, not containers.
- **Edge and cluster labels get a `--graph-bg` background patch** (not transparent, not page-bg). They sit on top of the arrow / dashed border behind them and erase the line under the text.

### Label positioning (mermaid post-process)

Mermaid v10 places cluster (subgraph) labels at the top-center, where incoming arrows clip them. Reposition them via a small post-render JS pass:

```js
// after mermaid.run({ nodes }) resolves
root.querySelectorAll('svg g.cluster').forEach(cluster => {
  const rect = cluster.querySelector('rect');
  const label = cluster.querySelector('g.cluster-label');
  if (!rect || !label || label.dataset.repositioned === 'true') return;
  label.dataset.repositioned = 'true';
  const rx = parseFloat(rect.getAttribute('x') || '0');
  const ry = parseFloat(rect.getAttribute('y') || '0');
  const rh = parseFloat(rect.getAttribute('height') || '0');
  label.setAttribute('transform', `translate(${rx + 4}, ${ry + rh - 8})`);
});
```

Same pass also: re-appends `g.edgeLabels` to the end of the SVG (so labels paint on top of arrows) and hides empty `g.edgeLabel` foreignObjects (mermaid emits one per edge, leaving a stray patch at the SVG origin).

### Rendering gotchas

- No `<br/>` in subgraph titles. Title height gets mis-measured and the first contained node renders behind it.
- No `{}`, parentheses, or `#` inside quoted subgraph titles. Use plain `subgraph FOO[Label]`.
- Explicit `text-transform: none !important` on `.nodeLabel`, `.edgeLabel`, `foreignObject > div` inside `themeCSS`. Inherited page CSS leaks into mermaid SVG otherwise; node text comes out uppercased.
- For decision questions with multiple options, **give each option its own small diagram** inside the option card. Don't pack multiple options into nested subgraphs of one big diagram.
- For the canonical `themeVariables` + `themeCSS` + post-process JS, copy from the reference page. Don't reinvent.

### Diagram chrome

Caption sits on the section surface; only the rendered SVG carries the tinted graph background.

```css
.diagram {
  margin: 14px 0;
}
.diagram .label {
  font-size: 11.5px;
  color: var(--muted);
  padding: 0 2px 6px;
}
.diagram pre.mermaid,
.oq-option-diagram pre.mermaid {
  background: var(--graph-bg) !important;
  border: 1px solid var(--border-soft) !important;
  padding: 6px 8px !important;
  border-radius: 6px !important;
  margin: 0 !important;
}
```

## Interactive open questions

When a page collects user decisions:

- Each question is a `<section>` with a `<div data-oq-slot="oq-N"></div>` placeholder. A JS registry (`*-open-questions.js`) renders the card into the slot.
- The card itself has no chrome (`.oq-card` is transparent); the `<section>` is the visible box.
- Card content: id + impact + status pill (header row, no surface) → Lora question text → muted description (flat, no inner box) → radio options → notes textarea → optional Clear button.
- Each option (`.oq-option`) is a thin-bordered row, transparent at rest, accent-soft on hover/selected with a 3px accent inset on the left when selected.
- One option per question can be `recommended: true` with a `because:` rationale rendered below it.
- Persist to `localStorage`, versioned per workstream: `wia-17-open-questions-v1`.
- **Sticky summary pill** centered at the top: `X / N` + 100px progress bar + inline-SVG export and reset icons (12px, 22px round buttons). Pure pill shape, fully rounded, only as wide as its contents.

**Use inline SVG for icons**, not unicode glyphs. `⟲` and `↺` render with inconsistent baselines across font fallbacks and don't center reliably; SVG inherits `currentColor` and centers deterministically.

Pattern reference: [WIA-17 open questions JS](../projects/sdk/workstreams/webview-in-app/plans/WIA-17-open-questions.js).

## CSS strategy

Do **not** pull in a classless framework (sakura, water, simple, pico). They don't ship the layouts we need (sticky sidebar, status pills, mermaid containers, OQ cards), and fighting their defaults costs more than writing ~150 lines of CSS once.

Do:

1. **Inline `<style>` per page** while a pattern is being trialed (current default). Self-contained, no link rot.
2. **Extract to `specs/framework/_spec.css`** the moment the same CSS appears in 3+ files. Link with `<link rel="stylesheet" href="../../framework/_spec.css">`.
3. **Keep page-specific styles inline.** Don't push everything into the shared file.

Tokens live in `:root` as CSS custom properties so a palette swap is a 5-variable edit.

## Filename conventions

- `SPEC.html` for the workstream spec, `SPEC-<TOPIC>.html` for sub-topics.
- `plans/<ID>-<slug>.html` for execution plans.
- `plans/<ID>-open-questions.js` for the interactive question registry that feeds a plan or audit page.
- No singleton folders, no project prefix in filenames (use the folder, not the name).
