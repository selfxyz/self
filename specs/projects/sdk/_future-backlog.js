// Cross-workstream future backlog.
// Tangential ideas surfaced during day-to-day work that don't belong to the
// active workstream. Each item is a candidate for a future spec.
//
// `TRACKED_ITEMS` is the version-controlled seed list (edit this file to add).
// User-added drafts persist to localStorage under STORAGE_KEY and live only in
// the user's browser until promoted to TRACKED_ITEMS in a PR.

const STORAGE_KEY = 'sdk-future-backlog-v1';

const TRACKED_ITEMS = [
  {
    id: 'fb-001',
    title: 'Mobile app should use Euclid ProofRequestScreen',
    description: 'Today `app/src/components/proof-request/ProofRequestCard.tsx` + `ProofRequestHeader.tsx` are local re-implementations using Tamagui. The webview-app correctly imports `ProofRequestScreen` from `@selfxyz/euclid`. The two surfaces diverge — Euclid changes only land on the webview-app side. Migrate the mobile app to consume Euclid directly so both surfaces share the canonical component.',
    surfaced: 'nav-hygiene investigation, 2026-05-25',
    tags: ['euclid', 'mobile-app', 'consistency', 'tech-debt'],
    priority: 'medium',
    status: 'idea'
  },
  {
    id: 'fb-002',
    title: 'Euclid ProofRequest renders disabled info icon when onInfoPress is undefined',
    description: 'In `@selfxyz/euclid/components/proof/ProofRequest.tsx:79-89`, every ProofRequestItem renders an `<InfoCircleIcon>` button regardless of whether `onInfoPress` is provided. When undefined, the button is `disabled={!onInfoPress}` but the icon is still visible. Should hide the button entirely when no handler is provided. File upstream Euclid issue.',
    surfaced: 'nav-hygiene investigation, 2026-05-25',
    tags: ['euclid', 'upstream-bug', 'proof-request'],
    priority: 'low',
    status: 'idea'
  },
  {
    id: 'fb-003',
    title: 'appEndpoint shows full URL with protocol + path on proof request',
    description: 'FIXED in feat/webview-in-app (merged into chore/nav-hygiene 2026-05-25). `formatEndpointForDisplay` added at `packages/webview-app/src/utils/verificationRequest.ts:101` strips protocol + path; consumed via `displayAppEndpoint` in `ProvingScreen.tsx:67`. Verified manually.',
    surfaced: 'nav-hygiene investigation, 2026-05-25',
    tags: ['webview-app', 'proof-request', 'quick-win'],
    priority: 'medium',
    status: 'done'
  },
  {
    id: 'fb-004',
    title: 'appIcon hardcoded to <SelfLogo> on proof request',
    description: '`packages/webview-app/src/screens/proving/ProvingScreen.tsx:64` passes `appIcon={<SelfLogo size={40} />}`. In embed mode this should be the requesting host app\'s icon (passed via the verification request payload), not Self\'s logo. Today the host has no way to provide an icon. Either thread it through the bridge payload or fall back to a generic placeholder until provided.',
    surfaced: 'nav-hygiene investigation, 2026-05-25',
    tags: ['webview-app', 'proof-request', 'bridge-payload'],
    priority: 'medium',
    status: 'idea'
  },
  {
    id: 'fb-005',
    title: 'Mock-passport asset race on proof generation screen',
    description: 'FIXED in feat/webview-in-app (merged 2026-05-25). New `RegisteringScreen.tsx` caches `documentCategory` + `mock` from nav state on mount (`packages/webview-app/src/screens/onboarding/RegisteringScreen.tsx:64-75`), with explicit `docIdentity` state to bridge the proving-machine reset between dsc/register phases. `getIdCardProps` now takes a `mock?: boolean` second arg (`utils/provingUtils.ts:61-72`). The dev-passport variant renders on first paint.',
    surfaced: 'nav-hygiene investigation, 2026-05-25',
    tags: ['webview-app', 'proof-generation', 'first-paint-bug'],
    priority: 'medium',
    status: 'done'
  },
  {
    id: 'fb-006',
    title: 'Rebuild the proof-dialogue showcase screens (deleted by NAV-02)',
    description: 'NAV-02 deletes `/proving/dialogue`, `/proving/dialogue-cta`, `/proving/generation-dialogue` plus the three screen files (`SimpleDialogueScreen.tsx`, `DialogueWithCtaScreen.tsx`, `ProofGenerationDialogueScreen.tsx`). The current implementations are clunky and unused by any production flow. When we eventually need a dialogue showcase again, rebuild it cleanly — likely as a single `/dev/dialogue-gallery` Storybook-style page that renders every Euclid dialogue variant side-by-side instead of one route per component.',
    surfaced: 'NAV-02 decision (nav-02-q1-dialogue-move), 2026-05-25',
    tags: ['webview-app', 'dev-tools', 'follow-up', 'euclid'],
    priority: 'low',
    status: 'idea'
  }
];

// --- Storage ----------------------------------------------------------

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveOverrides(o) { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); }
function getState() {
  const o = loadOverrides();
  return {
    overrides: o.overrides || {},  // { [trackedId]: { status?, priority?, notes? } }
    drafts: o.drafts || []          // [{ id, title, description, ... }]
  };
}
function persistState(s) { saveOverrides(s); }

function generateId() {
  return 'fb-draft-' + Math.random().toString(36).slice(2, 8);
}

function addDraft(partial) {
  const s = getState();
  const draft = {
    id: generateId(),
    title: partial.title || '(untitled)',
    description: partial.description || '',
    surfaced: partial.surfaced || `Added ${new Date().toISOString().slice(0, 10)}`,
    tags: partial.tags || [],
    priority: partial.priority || 'medium',
    status: partial.status || 'idea',
    isDraft: true
  };
  s.drafts = [...s.drafts, draft];
  persistState(s);
  return draft;
}
function updateDraft(id, partial) {
  const s = getState();
  s.drafts = s.drafts.map(d => d.id === id ? { ...d, ...partial } : d);
  persistState(s);
}
function deleteDraft(id) {
  const s = getState();
  s.drafts = s.drafts.filter(d => d.id !== id);
  persistState(s);
}
function setTrackedOverride(id, partial) {
  const s = getState();
  s.overrides = { ...s.overrides, [id]: { ...(s.overrides[id] || {}), ...partial } };
  // Clean up empty overrides
  if (!Object.keys(s.overrides[id]).filter(k => s.overrides[id][k] != null).length) {
    delete s.overrides[id];
  }
  persistState(s);
}
function clearTrackedOverride(id) {
  const s = getState();
  delete s.overrides[id];
  persistState(s);
}

function getAllItems() {
  const s = getState();
  const tracked = TRACKED_ITEMS.map(item => {
    const ov = s.overrides[item.id] || {};
    return { ...item, ...ov, isTracked: true };
  });
  return [...tracked, ...s.drafts];
}

// --- Rendering --------------------------------------------------------

const STATUSES = ['idea', 'triaged', 'planned', 'scheduled', 'done', 'dropped'];
const PRIORITIES = ['high', 'medium', 'low'];

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderTags(tags) {
  if (!tags || !tags.length) return '';
  return tags.map(t => `<span class="fb-tag">${escapeHtml(t)}</span>`).join('');
}

function renderItem(item) {
  const card = document.createElement('div');
  card.className = `fb-card status-${item.status} prio-${item.priority}${item.isDraft ? ' is-draft' : ''}`;
  card.dataset.id = item.id;

  const statusOptions = STATUSES.map(s =>
    `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`
  ).join('');
  const priorityOptions = PRIORITIES.map(p =>
    `<option value="${p}" ${item.priority === p ? 'selected' : ''}>${p}</option>`
  ).join('');

  card.innerHTML = `
    <div class="fb-head">
      <span class="fb-id">${item.id}</span>
      ${item.isDraft ? '<span class="fb-draft-pill">Draft (local only)</span>' : '<span class="fb-tracked-pill">Tracked</span>'}
      <span class="fb-spacer"></span>
      <select class="fb-status-select" data-field="status">${statusOptions}</select>
      <select class="fb-priority-select" data-field="priority">${priorityOptions}</select>
      ${item.isDraft ? '<button class="fb-delete" data-action="delete" title="Delete this draft">×</button>' : '<button class="fb-reset" data-action="reset" title="Reset to tracked default">Reset</button>'}
    </div>
    <h3 class="fb-title">${escapeHtml(item.title)}</h3>
    <p class="fb-description">${escapeHtml(item.description)}</p>
    <div class="fb-meta-row">
      <span class="fb-surfaced">${escapeHtml(item.surfaced || '')}</span>
      <span class="fb-tags-list">${renderTags(item.tags)}</span>
    </div>
  `;

  card.querySelector('.fb-status-select').addEventListener('change', e => {
    if (item.isDraft) updateDraft(item.id, { status: e.target.value });
    else setTrackedOverride(item.id, { status: e.target.value });
    document.dispatchEvent(new CustomEvent('fb-changed'));
  });
  card.querySelector('.fb-priority-select').addEventListener('change', e => {
    if (item.isDraft) updateDraft(item.id, { priority: e.target.value });
    else setTrackedOverride(item.id, { priority: e.target.value });
    document.dispatchEvent(new CustomEvent('fb-changed'));
  });
  const delBtn = card.querySelector('[data-action="delete"]');
  if (delBtn) delBtn.addEventListener('click', () => {
    if (!confirm(`Delete draft "${item.title}"? This only removes it from your browser; tracked items live in the JS file.`)) return;
    deleteDraft(item.id);
    document.dispatchEvent(new CustomEvent('fb-changed'));
  });
  const resetBtn = card.querySelector('[data-action="reset"]');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    clearTrackedOverride(item.id);
    document.dispatchEvent(new CustomEvent('fb-changed'));
  });

  return card;
}

function getStats() {
  const items = getAllItems();
  const byStatus = {};
  STATUSES.forEach(s => byStatus[s] = 0);
  items.forEach(i => byStatus[i.status] = (byStatus[i.status] || 0) + 1);
  return { total: items.length, byStatus, drafts: items.filter(i => i.isDraft).length };
}

function renderAll(container, opts = {}) {
  const filters = opts.filters || {};
  const items = getAllItems()
    .filter(i => !filters.status || filters.status === 'all' || i.status === filters.status)
    .filter(i => !filters.priority || filters.priority === 'all' || i.priority === filters.priority)
    .filter(i => !filters.tag || filters.tag === 'all' || (i.tags || []).includes(filters.tag));

  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<div class="fb-empty">No items match the current filters. Use <em>+ Add item</em> to capture something new.</div>';
    return;
  }
  items.forEach(i => container.appendChild(renderItem(i)));
}

function getAllTags() {
  const tags = new Set();
  getAllItems().forEach(i => (i.tags || []).forEach(t => tags.add(t)));
  return [...tags].sort();
}

function exportMarkdown() {
  const items = getAllItems();
  if (!items.length) return '_Empty._';
  const byStatus = {};
  items.forEach(i => {
    byStatus[i.status] = byStatus[i.status] || [];
    byStatus[i.status].push(i);
  });
  let md = `# SDK Future Backlog\n\n_${items.length} items (${items.filter(i => i.isDraft).length} local drafts)_\n\n`;
  STATUSES.forEach(s => {
    const list = byStatus[s];
    if (!list || !list.length) return;
    md += `## ${s} (${list.length})\n\n`;
    list.forEach(i => {
      md += `### ${i.title} \`${i.id}\`${i.isDraft ? ' _(draft)_' : ''}\n\n`;
      md += `- **Priority:** ${i.priority}\n`;
      md += `- **Surfaced:** ${i.surfaced}\n`;
      if (i.tags && i.tags.length) md += `- **Tags:** ${i.tags.join(', ')}\n`;
      md += `\n${i.description}\n\n`;
    });
  });
  return md;
}

window.SdkFutureBacklog = {
  TRACKED_ITEMS,
  STATUSES,
  PRIORITIES,
  getAllItems,
  getAllTags,
  getStats,
  addDraft,
  updateDraft,
  deleteDraft,
  setTrackedOverride,
  clearTrackedOverride,
  renderAll,
  exportMarkdown
};
