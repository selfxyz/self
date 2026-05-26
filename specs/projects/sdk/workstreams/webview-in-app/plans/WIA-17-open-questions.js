// WIA-17 architecture decisions — interactive registry.
//
// Each question gets rendered as a card with radio options + an "Other" slot
// + a notes textarea. Selections persist to localStorage so the page survives
// refresh and re-loading.
//
// Recommended option is set via `recommended: true`. The Why line under
// the recommended option comes from `because`.
//
// Optional `diagram` on an option renders a small mermaid graph under the
// option body (used where the choice has a visual shape worth seeing).
//
// The `context` field accepts inline HTML (data is hand-authored, no XSS risk).

(() => {
  'use strict';

  const STORAGE_KEY = 'wia-17-open-questions-v1';
  const OTHER_VALUE = '__other__';

  const OPEN_QUESTIONS = [
    {
      id: 'oq-1',
      title: 'Where does the iOS Swift provider code live?',
      impact: 'Blocks #2 / #3',
      context: `
        <p>
          KMP iOS handlers (<code>SecureStorageBridgeHandler.kt</code>,
          <code>CryptoBridgeHandler.kt</code>) delegate to
          <code>IosProviderRegistry</code>. Someone has to register a Swift impl
          (<code>SecureStorageProvider</code>, <code>CryptoProviderImpl</code>)
          before the WebView mounts. Two homes are viable.
        </p>
      `,
      options: [
        {
          value: 'a-vendor',
          label: 'A. Vendor provider files in packages/rn-sdk/ios/',
          note: 'Self-contained: @selfxyz/rn-sdk npm tarball carries the Swift code. Duplicates what self-sdk-swift already has; every provider change has to land twice.',
          diagram: `flowchart LR
  A[rn-sdk/ios Provider.swift]
  B[self-sdk-swift Provider.swift]
  A -. duplicate .-> B
  classDef dup fill:#F24236,stroke:#F24236,stroke-width:0px,color:#FFFFFF
  class A,B dup`
        },
        {
          value: 'b-peer-spm',
          label: 'B. Import from self-sdk-swift as a peer SPM dep',
          note: 'One source of truth for Swift providers. Mirrors the Android side (Android impls live in kmp-sdk/androidMain, not duplicated in rn-sdk/android/). Costs one line in selfxyz-rn-sdk.podspec.',
          recommended: true,
          because: 'Matches the Android pattern, eliminates a 2× maintenance cost forever. The cross-package coupling is small (one podspec dep) and explicit.',
          diagram: `flowchart LR
  P[self-sdk-swift Provider impls]
  RN[rn-sdk podspec] --> P
  NS[native-shell-ios podspec] --> P
  classDef src fill:#46AA44,stroke:#46AA44,stroke-width:0px,color:#FFFFFF
  class P src`
        }
      ]
    },
    {
      id: 'oq-2',
      title: 'How do the MOD handlers (nfc, biometrics, camera) reach rn-sdk?',
      impact: 'Blocks #5 / #6 / #7',
      context: `
        <p>
          Commit <code>37b8f0ca7</code> (#1915, 2026-04-04) deliberately scoped
          this repo's <code>packages/kmp-sdk/</code> down to 3 domains and
          stripped the optional MOD modules. They live in the private
          <code>selfxyz/self-webview-sdk</code> fork. Three ways to bridge the gap.
        </p>
      `,
      options: [
        {
          value: 'a-publish',
          label: 'A. Publish private fork as a Maven artifact (via SD-06)',
          note: 'Cleanest for keeping selfxyz/self OSS-slim. Couples rollout of #5–#7 to SD-06 shipping. Adds a release-coordination process between the two repos forever.',
          diagram: `flowchart LR
  PRIV[self-webview-sdk private fork]
  PUB[GitHub Packages]
  RN[rn-sdk build.gradle]
  PRIV -- publish-kmp-sdk.yml --> PUB --> RN`
        },
        {
          value: 'b-merge',
          label: 'B. Merge MOD modules back into selfxyz/self, gated by Gradle flag',
          note: "MOD modules live in this repo's packages/kmp-sdk/shared/src/androidMain/; build flag self.sdk.optional.nfc=true opts them in. Default OSS distribution stays slim (flag off); Self app's app/ turns the flags on. self-webview-sdk retires.",
          recommended: true,
          because: 'Eliminates the two-repo coordination cost permanently — every protocol change is one PR, every contributor sees the same code, no "is X in the right repo" friction. Public OSS surface stays slim via the Gradle flag, not via a repo split.',
          diagram: `flowchart LR
  THIS[selfxyz/self kmp-sdk + MOD modules]
  FLAG[Gradle flag self.sdk.optional.nfc]
  RETIRED[self-webview-sdk retired]
  THIS --- FLAG
  RETIRED -. retired .-> THIS
  classDef src fill:#46AA44,stroke:#46AA44,stroke-width:0px,color:#FFFFFF
  class THIS,FLAG src`
        },
        {
          value: 'c-mirror',
          label: 'C. Mirror script (sync the two repos)',
          note: 'Permanent dual maintenance. Drift inevitable. Not recommended under any framing.',
          diagram: `flowchart LR
  T[selfxyz/self kmp-sdk]
  P[self-webview-sdk kmp-sdk]
  T <-. periodic sync .-> P
  classDef bad fill:#F24236,stroke:#F24236,stroke-width:0px,color:#FFFFFF
  class T,P bad`
        }
      ]
    },
    {
      id: 'oq-3',
      title: 'How do we get a release-variant XCFramework for iOS?',
      impact: 'Affects #2 / #3',
      context: `
        <p>
          <code>packages/kmp-sdk/shared/build.gradle.kts:184</code>'s
          <code>createXCFramework</code> task currently produces <em>debug</em>
          variants only. iOS podspecs that vendor the framework need release
          variants to ship to the App Store.
        </p>
      `,
      options: [
        {
          value: 'a-fix-now',
          label: 'A. Fix createXCFramework in the WIA-17 #2 PR',
          note: '~15 LOC change: add release+simulator targets to the existing task. Self-contained, unblocks domain #2, doesn\'t depend on SD-06.',
          recommended: true,
          because: 'Trivial change, eliminates an SD-06 dependency for #2. We were going to do it eventually anyway; doing it now removes a coordination point.'
        },
        {
          value: 'b-wait-sd06',
          label: 'B. Wait for SD-06 to ship the release-variant DoD',
          note: 'Defers the task off this rollout\'s critical path. But it adds an external dependency for something that\'s an in-tree Gradle edit.'
        }
      ]
    },
    {
      id: 'oq-4',
      title: 'Should native-shells-lite also wrap kmp-sdk after Path A lands?',
      impact: 'Future workstream (not WIA-17)',
      context: `
        <p>
          Confirmed by reading the code: <code>packages/native-shell-android/</code>
          and <code>packages/native-shell-ios/</code> each ship their own
          <code>MessageRouter</code> + <code>BridgeHandler</code> classes
          (Kotlin and Swift), <em>not</em> consuming <code>kmp-sdk</code>.
          That's the third parallel implementation Path A doesn't touch.
        </p>
      `,
      options: [
        {
          value: 'a-file-wia-18',
          label: 'A. File WIA-18 · Native-shells onto kmp-sdk as a follow-up',
          note: 'Replace native-shell-android\'s + native-shell-ios\'s MessageRouter + bridge handlers with KMP equivalents; native shells become thin glue. Same shape as Path A. Land after WIA-17 stabilizes (≥3 domains migrated), before WIA-11 cutover.',
          recommended: true,
          because: 'Not in WIA-17 scope, but explicitly captured so it doesn\'t get forgotten. Same maintenance calculus as the RN side — every bridge change today lands three times, we can make it one.',
          diagram: `flowchart TB
  KMP[kmp-sdk MessageRouter]
  RN[rn-sdk thin glue]
  NS[native-shells thin glue]
  RN --> KMP
  NS --> KMP
  classDef src fill:#46AA44,stroke:#46AA44,stroke-width:0px,color:#FFFFFF
  class KMP src`
        },
        {
          value: 'b-leave',
          label: 'B. Leave native-shells-lite as is',
          note: 'Accepts permanent triple maintenance for the bridge protocol. Hidden cost that grows with every domain and every contract change.',
          diagram: `flowchart TB
  KMP[kmp-sdk router]
  RN[rn-sdk uses kmp-sdk]
  NS[native-shells own router 3rd dup]
  RN --> KMP
  classDef bad fill:#F24236,stroke:#F24236,stroke-width:0px,color:#FFFFFF
  class NS bad`
        }
      ]
    },
    {
      id: 'oq-5',
      title: 'How do we resolve the bridge envelope drift?',
      impact: 'After ≥3 domains migrated',
      context: `
        <p>Observed drift between TS and KMP routers:</p>
        <ul>
          <li>Missing-handler error: KMP <code>DOMAIN_NOT_FOUND</code> vs TS <code>HANDLER_NOT_FOUND</code></li>
          <li>KMP responses lack <code>type</code> / <code>version</code> / <code>timestamp</code> fields</li>
          <li>KMP enforces <code>isTrustedSource</code>; TS has no equivalent</li>
          <li>Malformed-message handling: KMP silent drop vs TS <code>console.error</code></li>
        </ul>
      `,
      options: [
        {
          value: 'a-kmp-canonical',
          label: 'A. Make KMP\'s shape canonical · patch TS once',
          note: 'KMP is the source of truth for the WebView protocol per the umbrella spec. Patch packages/webview-bridge/ and the WebView-side adapters to match KMP\'s shape; everyone converges in one PR.',
          recommended: true,
          because: 'Directionally correct — Path A is putting KMP at the center anyway. Doing it once (after ≥3 domains have proven KMP\'s behavior under load) is cheaper than per-domain patches.'
        },
        {
          value: 'b-shim',
          label: 'B. Keep KmpBridgeTransport.ts as a permanent shim that normalizes responses',
          note: 'Avoids touching WebView code. Hides drift behind a translation layer that has to be maintained alongside both routers — exactly the kind of "two-implementations-with-a-bridge" debt we\'re retiring elsewhere.'
        }
      ]
    },
    {
      id: 'oq-6',
      title: 'What happens to the useKmpBridge flag once all domains migrate?',
      impact: 'Final cleanup PR',
      context: `
        <p>
          <code>useKmpBridge</code> is a per-domain routing flag in
          <code>SelfVerification.tsx</code>. It exists so each domain PR can
          ship additively (TS handler still runs by default; KMP path opt-in).
          After domain #8 lands and its TS handler is deleted, the flag has
          nothing to gate.
        </p>
      `,
      options: [
        {
          value: 'a-delete',
          label: 'A. Delete the flag in the final cleanup PR',
          note: 'One small PR: removes the prop, removes the conditional branches in SelfVerification.tsx, removes the prop from any test app. Routing is unconditional through SelfBridgeModule.',
          recommended: true,
          because: 'Dead flags rot. Delete in the same change that makes them obsolete.'
        },
        {
          value: 'b-keep',
          label: 'B. Keep the flag as a "debug TS fallback" for emergencies',
          note: 'Tempting but wrong: by the time all 8 TS handlers are deleted, there\'s no fallback to fall back to. Keeping the flag means keeping the TS code dead-but-undead "just in case."'
        }
      ]
    },
    {
      id: 'oq-7',
      title: 'Where does DocumentsBridgeHandler for Android come from?',
      impact: 'Affects #8',
      context: `
        <p>
          Confirmed by file listing: this repo's <code>kmp-sdk</code> has a
          <code>DocumentsBridgeHandler.kt</code> in <code>iosMain/</code> but
          <strong>not</strong> in <code>androidMain/</code> or
          <code>commonMain/</code>. Either we add it here, or it arrives via
          <a href="#oq-2">OQ-2</a> (the MOD path).
        </p>
      `,
      options: [
        {
          value: 'a-common-main',
          label: 'A. Move to commonMain/ with a DocumentsProvider interface in the #8 PR',
          note: 'Matches the pattern from #1915 (which moved SecureStorageBridgeHandler and CryptoBridgeHandler to commonMain). Handler is platform-agnostic business logic; the provider interface gets Android and iOS impls.',
          recommended: true,
          because: 'Consistent with the architecture #1915 already established for the other handlers. The iOS version is small enough that promoting it to commonMain is roughly a file-move + interface extraction.'
        },
        {
          value: 'b-mod-path',
          label: 'B. Wait for OQ-2\'s MOD path to deliver it',
          note: 'Couples #8 to OQ-2 unnecessarily. Documents is a wholly-public domain — there\'s no reason it should travel with the optional MOD modules.'
        }
      ]
    },
    {
      id: 'oq-8',
      title: 'Should KMP iOS cinterop be re-enabled?',
      impact: 'Doesn\'t affect WIA-17 — captured to defer explicitly',
      context: `
        <p>
          <code>packages/kmp-sdk/shared/build.gradle.kts:34-63</code> has
          cinterop <strong>disabled</strong>. That's why iOS handlers are
          <code>NotImplementedError</code> stubs that delegate to
          <code>IosProviderRegistry</code>. Re-enabling cinterop would let KMP
          iOS handlers call Keychain Services / Security framework directly —
          no Swift provider needed for stock impls.
        </p>
      `,
      options: [
        {
          value: 'a-keep-disabled',
          label: 'A. Keep cinterop disabled · Swift providers via registry',
          note: 'Matches the Android pattern (KMP delegates to providers; some are KMP-internal, some are consumer-supplied). The Swift provider model gives RN/native-shell consumers a place to inject their own impls. Cinterop adds K/N toolchain risk and gives no architectural win we don\'t already have.',
          recommended: true,
          because: 'The registry model is the right separation of concerns; cinterop would mix policy (in K/N) with mechanism (Swift APIs). Keep them on opposite sides of a clean interface.'
        },
        {
          value: 'b-enable',
          label: 'B. Re-enable cinterop for stock iOS impls',
          note: 'Would let KMP own iOS Keychain / crypto directly. K/N cinterop is finicky; we\'d own its maintenance. Doesn\'t compose well with the consumer-supplied provider model we keep for things like react-native-biometrics.'
        }
      ]
    }
  ];

  // ---------- persistence ----------

  function loadAnswers() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  function saveAnswer(id, patch) {
    const all = loadAnswers();
    all[id] = { ...(all[id] || {}), ...patch };
    if (all[id].value === null) delete all[id].value;
    if (all[id].notes === null) delete all[id].notes;
    if (!all[id].value && !all[id].notes) delete all[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  function clearAnswer(id) {
    const all = loadAnswers();
    delete all[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  function answerStatus(answer) {
    if (!answer) return 'open';
    if (answer.value === OTHER_VALUE) {
      return (answer.notes && answer.notes.trim()) ? 'answered' : 'needs-text';
    }
    return answer.value ? 'answered' : 'open';
  }

  // ---------- rendering ----------

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  // Process any unrendered mermaid blocks inside a root element.
  function runMermaid(root) {
    if (!window.mermaid || !window.mermaid.run) return;
    const nodes = root.querySelectorAll('pre.mermaid:not([data-processed="true"])');
    if (!nodes.length) return;
    try {
      window.mermaid.run({ nodes: Array.from(nodes) });
    } catch (e) {
      // Mermaid may not be ready yet on first paint — try again next tick.
      setTimeout(() => {
        try { window.mermaid.run({ nodes: Array.from(nodes) }); } catch {}
      }, 50);
    }
  }

  function renderCard(q) {
    const answers = loadAnswers();
    const answer = answers[q.id] || {};
    const status = answerStatus(answer);
    const isOther = answer.value === OTHER_VALUE;

    const card = document.createElement('div');
    card.className = `oq-card status-${status}`;
    card.dataset.oqId = q.id;

    const optionsHtml = q.options.map(opt => {
      const selected = answer.value === opt.value;
      const rec = !!opt.recommended;
      // opt.diagram is mermaid syntax (hand-authored, trusted). Do not escape —
      // mermaid expects raw text including <br/> tags inside node labels.
      const diagramHtml = opt.diagram
        ? `<div class="oq-option-diagram"><pre class="mermaid">${opt.diagram}</pre></div>`
        : '';
      return `
        <label class="oq-option ${selected ? 'selected' : ''}">
          <input type="radio" name="${q.id}" value="${escapeHtml(opt.value)}" ${selected ? 'checked' : ''}/>
          <div class="oq-option-body">
            <div class="option-label">
              <span>${escapeHtml(opt.label)}</span>
              ${rec ? '<span class="oq-rec-chip">Recommended</span>' : ''}
            </div>
            <div class="option-note">${opt.note}</div>
            ${rec && opt.because ? `<div class="oq-rec-because"><strong>Why:</strong> ${opt.because}</div>` : ''}
            ${diagramHtml}
          </div>
        </label>
      `;
    }).join('');

    const otherHtml = `
      <label class="oq-option oq-option-other ${isOther ? 'selected' : ''}">
        <input type="radio" name="${q.id}" value="${OTHER_VALUE}" ${isOther ? 'checked' : ''}/>
        <div class="oq-option-body">
          <div class="option-label"><span>Something else</span></div>
          <div class="option-note">None of the above. Write your answer in the notes field below.</div>
        </div>
      </label>
    `;

    const notesValue = answer.notes ? escapeHtml(answer.notes) : '';
    const notesLabel = isOther ? 'Your answer (required)' : 'Notes / nuance (optional)';
    const notesPlaceholder = isOther
      ? 'Write the answer you want. This becomes the decision on export.'
      : 'Add nuance, capture follow-up questions, or paste links…';
    const statusLabel = { 'answered': 'Answered', 'open': 'Open', 'needs-text': 'Needs text' }[status];
    const hasAnything = !!(answer.value || (answer.notes && answer.notes.trim()));

    card.innerHTML = `
      <div class="oq-head">
        <span class="oq-id">${q.id.toUpperCase()}</span>
        <span class="oq-impact">${escapeHtml(q.impact)}</span>
        <span class="oq-status">${statusLabel}</span>
      </div>
      <p class="oq-question">${escapeHtml(q.title)}</p>
      <div class="oq-context">${q.context}</div>
      <div class="oq-options">${optionsHtml}${otherHtml}</div>
      <div class="oq-notes ${isOther ? 'oq-notes-required' : ''}">
        <label class="oq-notes-label" for="notes-${q.id}">${notesLabel}</label>
        <textarea
          id="notes-${q.id}"
          class="oq-notes-input"
          rows="${isOther ? 3 : 2}"
          placeholder="${notesPlaceholder}"
        >${notesValue}</textarea>
      </div>
      <div class="oq-actions">
        ${hasAnything ? '<button type="button" data-action="clear" class="oq-clear-btn">Clear</button>' : ''}
      </div>
    `;

    // radio selection
    card.addEventListener('change', e => {
      if (e.target.matches('input[type="radio"]')) {
        saveAnswer(q.id, { value: e.target.value });
        const fresh = renderCard(q);
        card.replaceWith(fresh);
        runMermaid(fresh);
        document.dispatchEvent(new CustomEvent('oq-changed'));
      }
    });

    // notes blur
    const textarea = card.querySelector('.oq-notes-input');
    if (textarea) {
      textarea.addEventListener('blur', () => {
        const prev = (loadAnswers()[q.id] || {}).notes || '';
        const next = textarea.value.trim();
        if (next === prev) return;
        saveAnswer(q.id, { notes: next || null });
        const fresh = renderCard(q);
        card.replaceWith(fresh);
        runMermaid(fresh);
        document.dispatchEvent(new CustomEvent('oq-changed'));
      });
    }

    // clear button
    card.addEventListener('click', e => {
      if (e.target.matches('[data-action="clear"]')) {
        clearAnswer(q.id);
        const fresh = renderCard(q);
        card.replaceWith(fresh);
        runMermaid(fresh);
        document.dispatchEvent(new CustomEvent('oq-changed'));
      }
    });

    return card;
  }

  function updateSummary() {
    const summary = document.getElementById('oq-summary');
    if (!summary) return;
    const answers = loadAnswers();
    const answered = OPEN_QUESTIONS.filter(q => answerStatus(answers[q.id]) === 'answered').length;
    const total = OPEN_QUESTIONS.length;
    const pct = Math.round((answered / total) * 100);
    summary.innerHTML = `
      <span class="oq-summary-count">${answered} / ${total}</span>
      <span class="oq-summary-bar"><span class="oq-summary-fill" style="width:${pct}%"></span></span>
      ${answered ? '<button type="button" id="oq-export-btn" class="oq-icon-btn" title="Export as markdown">↗</button>' : ''}
      ${answered ? '<button type="button" id="oq-reset-btn" class="oq-icon-btn oq-icon-btn-danger" title="Reset all">⟲</button>' : ''}
    `;

    const exportBtn = document.getElementById('oq-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportAnswers);
    const resetBtn = document.getElementById('oq-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      if (confirm('Reset all WIA-17 decisions? This clears your local selections.')) {
        localStorage.removeItem(STORAGE_KEY);
        renderAll();
        document.dispatchEvent(new CustomEvent('oq-changed'));
      }
    });
  }

  function exportAnswers() {
    const answers = loadAnswers();
    const lines = ['## WIA-17 Architecture Decisions', ''];
    OPEN_QUESTIONS.forEach(q => {
      const a = answers[q.id];
      const status = answerStatus(a);
      lines.push(`### ${q.id.toUpperCase()} · ${q.title}`);
      lines.push(`_Impact: ${q.impact} · Status: ${status}_`);
      lines.push('');
      if (status === 'answered') {
        if (a.value === OTHER_VALUE) {
          lines.push(`**Answer:** ${a.notes}`);
        } else {
          const opt = q.options.find(o => o.value === a.value);
          lines.push(`**Answer:** ${opt ? opt.label : a.value}${opt && opt.recommended ? ' ★ (recommended)' : ''}`);
          if (a.notes) lines.push(`**Notes:** ${a.notes}`);
        }
      } else {
        lines.push('**Answer:** _(not decided)_');
        if (a && a.notes) lines.push(`**Notes:** ${a.notes}`);
      }
      lines.push('');
    });
    const md = lines.join('\n');
    navigator.clipboard.writeText(md).then(
      () => alert('Markdown copied to clipboard.'),
      () => prompt('Copy the markdown below:', md)
    );
  }

  function renderAll() {
    OPEN_QUESTIONS.forEach(q => {
      const slot = document.querySelector(`[data-oq-slot="${q.id}"]`);
      if (slot) {
        slot.innerHTML = '';
        const card = renderCard(q);
        slot.appendChild(card);
        runMermaid(card);
      }
    });
    updateSummary();
  }

  // Wait for mermaid to be ready before initial render so option diagrams paint.
  function whenReady(cb) {
    if (window.mermaid && window.mermaid.run) return cb();
    let tries = 0;
    const t = setInterval(() => {
      if ((window.mermaid && window.mermaid.run) || ++tries > 40) {
        clearInterval(t);
        cb();
      }
    }, 50);
  }

  document.addEventListener('DOMContentLoaded', () => whenReady(renderAll));
  document.addEventListener('oq-changed', updateSummary);

  // Expose for debugging
  window.WIA17_OQ = { OPEN_QUESTIONS, loadAnswers, exportAnswers, renderAll };
})();
