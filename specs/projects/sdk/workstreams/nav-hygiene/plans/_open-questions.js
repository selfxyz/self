// Open Questions registry for the nav-hygiene workstream.
// Each question represents a decision the user must make before the plan can ship.
// Answers persist to localStorage under STORAGE_KEY.
// Both SPEC.html (aggregate view) and individual plan files load this script.
//
// The `context` field accepts inline HTML (we control the data, no XSS risk).

const STORAGE_KEY = "nav-hygiene-open-questions-v1";

const OPEN_QUESTIONS = [
  // NAV-02 ===============================================================
  {
    id: "nav-02-q1-dialogue-move",
    plan: "NAV-02",
    question: "Should the three /proving/dialogue* routes move to /dev/* or stay at /proving/* as component-showcase routes?",
    context: `
      <p><strong>What these are:</strong> three routes that render Euclid dialogue components for visual review.</p>
      <ul style="margin:4px 0 6px;padding-left:20px;font-size:13px;color:var(--muted)">
        <li><code>/proving/dialogue</code> → <code>SimpleDialogueScreen</code> (wraps Euclid's <code>SimpleDialogueScreen</code>). Hardcoded test copy "This is a simple dialogue screen…"</li>
        <li><code>/proving/dialogue-cta</code> → <code>DialogueWithCtaScreen</code> (wraps Euclid's <code>DialogueWithCtaScreen</code>). Fires <code>dialogue_cta_primary_pressed</code> analytics.</li>
        <li><code>/proving/generation-dialogue</code> → <code>ProofGenerationDialogueScreen</code> (wraps Euclid's <code>ProofGenerationScreen</code>).</li>
      </ul>
      <p><strong>Registered at:</strong> <code>packages/webview-app/src/App.tsx:143–145</code>. <strong>Only entry point:</strong> <code>DevRouteMenu.tsx:63–65</code>. No production <code>navigate()</code> caller — confirmed by grep.</p>
      <p><strong>Current state:</strong> reachable in DEV and PROD builds (no <code>{import.meta.env.DEV && …}</code> gate), but in PROD nothing links to them.</p>
    `,
    options: [
      { value: "move-dev", label: "Move under /dev/*", note: "Routes become /dev/dialogue, /dev/dialogue-cta, /dev/proof-generation. Wrap each in {import.meta.env.DEV && …}. PROD builds strip them. DevRouteMenu Dev group lists them. Recommended." },
      { value: "stay-proving", label: "Stay at /proving/* (showcase)", note: "Keep paths; ADD the DEV gate. Signals 'these are reusable components, viewable in the dev menu.' Risk: a future PR might wire one into a real flow and forget the gate." }
    ]
  },
  {
    id: "nav-02-q2-tunnel-kyc-pending",
    plan: "NAV-02",
    question: "/tunnel/kyc-pending is currently DEV-gated. Move to /dev/* with the rest, or keep at /tunnel/* (subject to NAV-08 rename)?",
    context: `
      <p><strong>What it is:</strong> <code>TunnelKycPendingScreen</code> at <code>packages/webview-app/src/screens/tunnel/TunnelKycPendingScreen.tsx</code>. Renders the embed-mode "KYC under review, check back later" state for manual testing — auto-advances on a timer when <code>?mock=demo</code> is in the URL.</p>
      <p><strong>Registered at:</strong> <code>App.tsx:156</code>: <code>{import.meta.env.DEV && &lt;Route path="/tunnel/kyc-pending" element={&lt;TunnelKycPendingScreen /&gt;} /&gt;}</code></p>
      <p><strong>Production counterpart:</strong> the real embed KYC-pending flow uses <code>/proving/kyc-pending</code> (or <code>/disclose/kyc-pending</code> after NAV-08). This route is a dev fixture, not a real state.</p>
    `,
    options: [
      { value: "move-dev", label: "Move to /dev/kyc-pending", note: "Cleaner: lives under the dev namespace with the rest. DevRouteMenu lists it under Dev. Loses its 'lives next to other tunnel screens' adjacency." },
      { value: "stay-tunnel", label: "Keep at /tunnel/kyc-pending until NAV-08", note: "No-op for NAV-02. NAV-08 renames /tunnel/* → /disclose/* anyway; the DEV gate moves along with the path. Smaller diff now." }
    ]
  },

  // NAV-03 ===============================================================
  {
    id: "nav-03-q1-return-vs-navigate",
    plan: "NAV-03",
    question: "Should the consolidated boot decision function return a target action, or perform navigate() itself?",
    context: `
      <p><strong>Current code:</strong> <code>packages/webview-app/src/components/ModeBoot.tsx:39–62</code> (fail-closed effect) and <code>:64–79</code> (route sync effect). Both call <code>navigate()</code> or <code>lifecycle.dismiss()</code> inside their <code>useEffect</code>.</p>
      <p><strong>What's being extracted:</strong> a pure <code>decideBootRoute({ mode, verificationRequest, isReady, pathname })</code> function. The function either returns a typed action object or performs side effects directly.</p>
      <p><strong>Why it matters:</strong> testability. A pure function takes inputs and returns outputs; it can be tested without React. A side-effecting function needs a React tree + mocked <code>navigate</code> + mocked <code>lifecycle</code>.</p>
    `,
    options: [
      { value: "return-path", label: "Pure function: returns BootAction = wait | navigate{to,replace} | fail-closed{error} | noop", note: "ModeBoot's one effect calls decideBootRoute() then dispatches. Six unit tests, no React tree needed. Recommended." },
      { value: "do-navigate", label: "Side-effecting function: takes navigate + lifecycle, calls them", note: "Smaller refactor. Tests need to mock useNavigate + useSelfClient. Matches current ModeBoot pattern." }
    ]
  },
  {
    id: "nav-03-q2-where-to-place",
    plan: "NAV-03",
    question: "Where does the consolidated boot decision live: rename ModeBoot, or keep the name and refactor internals?",
    context: `
      <p><strong>Current file:</strong> <code>packages/webview-app/src/components/ModeBoot.tsx</code>. <strong>Imported at:</strong> <code>App.tsx:95</code> (inside <code>SelfClientProvider</code>, above <code>Routes</code>).</p>
      <p><strong>Why a rename is on the table:</strong> "ModeBoot" implies the component only cares about mode. The expanded role — route sync + fail-closed + future boot-time decisions (e.g. NAV-13's mode-mismatch coordination) — is broader.</p>
      <p>The two options produce identical runtime behavior; this is about clarity.</p>
    `,
    options: [
      { value: "rename", label: "Rename ModeBoot → BootDecision", note: "Signals the broader role. Touches 1 import site (App.tsx) + git history. Recommended if the new function will absorb other boot checks later." },
      { value: "keep-name", label: "Keep ModeBoot name; refactor internals only", note: "Smallest diff. File name slightly misleads about scope." }
    ]
  },
  {
    id: "nav-03-q3-fail-closed-page",
    plan: "NAV-03",
    question: "On invalid embed-mode verificationRequest: only call lifecycle.setResult + lifecycle.dismiss (current behavior), or also navigate to a generic /embed/error page first?",
    context: `
      <p><strong>Current behavior</strong> (<code>ModeBoot.tsx:45–61</code>):</p>
      <pre style="margin:4px 0;padding:8px 10px;background:var(--surface-alt);border-radius:4px;font-size:11px;overflow-x:auto"><code>await lifecycle.setResult({ success: false, errorCode: 'INVALID_REQUEST', errorMessage: '…' });
lifecycle.dismiss();</code></pre>
      <p>If <code>setResult</code> or <code>dismiss</code> are slow or fail, the user sees whatever screen was already painted (could be a half-rendered tunnel tour). No fallback UI.</p>
      <p>A <code>/embed/error</code> page would be a generic "Verification could not start" screen, shown for the brief window before <code>dismiss()</code> takes effect — and as a persistent surface if <code>dismiss()</code> fails entirely.</p>
    `,
    options: [
      { value: "only-dismiss", label: "Keep current: only setResult + dismiss", note: "Matches existing behavior. No new screen to design. Risk if bridge is laggy." },
      { value: "also-navigate", label: "navigate('/embed/error') before setResult + dismiss", note: "Resilient if dismiss fails. Needs a small Euclid screen or local component. Adds one route + one screen file." }
    ]
  },

  // NAV-04 ===============================================================
  {
    id: "nav-04-q1-cluster-detection",
    plan: "NAV-04",
    question: "How does useClusterClose() know which cluster the caller belongs to?",
    context: `
      <p><strong>Why this matters:</strong> the cluster-close registry maps <em>cluster name</em> → <em>(self-app target, embed result)</em>. The hook needs the caller's cluster to pick the right entry.</p>
      <p><strong>Today's clusters</strong> (from <code>screens/</code> folder structure): <code>home</code>, <code>onboarding</code>, <code>onboarding/passport</code>, <code>onboarding/eu-id</code>, <code>onboarding/aadhaar</code>, <code>proving</code>, <code>recovery</code>, <code>tunnel</code>, <code>account</code>, <code>debug</code>.</p>
      <p><strong>Trade-off pivots on stability:</strong> NAV-08 will rewrite paths (<code>/proving/*</code> → <code>/disclose/*</code>). NAV-13 will declare each route's mode + cluster as metadata. Option (a) is brittle through NAV-08; option (c) is clean but couples NAV-04's release to NAV-13.</p>
    `,
    options: [
      { value: "path-segment", label: "(a) Infer from useLocation().pathname's first segment", note: "Self-contained. Hook works today, no other deps. Breaks if a screen is reachable under two paths (rare). Needs a path→cluster map that NAV-08 must update." },
      { value: "explicit-arg", label: "(b) Caller passes cluster: useClusterClose('proving')", note: "Most explicit. Call sites become verbose (~50 screens). Cluster name lives in screen file forever — survives path renames." },
      { value: "route-metadata", label: "(c) Read NAV-13's <ModeRoute cluster='…'> metadata", note: "Cleanest. Path renames don't touch cluster wiring. Couples NAV-04 release to NAV-13 release." }
    ]
  },
  {
    id: "nav-04-q2-default-close-target",
    plan: "NAV-04",
    question: "Default self-app close target: always navigate('/'), or cluster-specific entry points?",
    context: `
      <p><strong>Today:</strong> six terminal screens hardcode <code>navigate('/')</code>:</p>
      <ul style="margin:4px 0;padding-left:20px;font-size:13px;color:var(--muted)">
        <li><code>VerificationResultScreen.tsx:46</code></li>
        <li><code>KycFailureScreen.tsx:26</code></li>
        <li><code>ProofGenerationSuccessScreen.tsx:21</code></li>
        <li><code>RecoveryFailureScreen.tsx:33</code></li>
        <li><code>RecoverySuccessScreen.tsx:31</code> (with state.returnTo fallback)</li>
        <li>plus several tunnel screens that mix navigate('/tunnel/tour/4') and lifecycle.dismiss</li>
      </ul>
      <p><strong>"Cluster entry" examples:</strong> after finishing add-document in /onboarding/aadhaar/upload-success, land on /docs (the document list) instead of /. After /recovery/success, land on /settings/security instead of /.</p>
      <p>Cluster entry is better UX (user lands where they likely want to be next), but requires every cluster to define an entry point — a 10-row table in <code>clusterClose.ts</code>.</p>
    `,
    options: [
      { value: "always-home", label: "Always navigate('/')", note: "Matches current behavior. Zero design decisions. Some flows feel disorienting (recovery → home is fine; add-document → home loses context)." },
      { value: "cluster-entry", label: "Per-cluster entry point in the registry", note: "Better UX. ~10 entries to think about. Recommended if NAV-04 is shipping anyway — the registry exists either way; this just fills in the second column." }
    ]
  },
  {
    id: "nav-04-q3-overrides",
    plan: "NAV-04",
    question: "Should screens override the close target at call time (via state.returnTo), or only via the registry?",
    context: `
      <p><strong>Current per-call override pattern</strong> (recovery cluster only):</p>
      <pre style="margin:4px 0;padding:8px 10px;background:var(--surface-alt);border-radius:4px;font-size:11px;overflow-x:auto"><code>// RecoverySuccessScreen.tsx:28-32
const onClose = useCallback(() => {
  navigate(returnTo ?? '/', { replace: true });
}, [navigate, returnTo]);</code></pre>
      <p>The user enters recovery from <code>/settings/security</code>; <code>state.returnTo = '/settings/security'</code> is set on the way in; the success screen reads it back to return them where they came from.</p>
      <p>If <code>useClusterClose()</code> respects <code>state.returnTo</code>, it inherits this pattern. If not, NAV-04 either breaks the recovery flow or requires recovery screens to bypass the hook.</p>
      <p>NAV-09 will rename <code>state.returnTo</code> → <code>state.nextPath</code>. Whichever slot name wins, this hook reads it.</p>
    `,
    options: [
      { value: "registry-only", label: "Registry-only — no per-call overrides", note: "Strictest contract. Recovery screens have to compute their own close target outside the hook. Breaks the recovery pattern." },
      { value: "state-returnto", label: "Hook respects state.returnTo (state.nextPath after NAV-09)", note: "Matches recovery pattern. Hook signature: useClusterClose() reads location.state internally. Recommended." }
    ]
  },

  // NAV-05 ===============================================================
  {
    id: "nav-05-q1-handler-names",
    plan: "NAV-05",
    question: "Standardize handler names AND semantics, or only enforce semantics?",
    context: `
      <p><strong>Inconsistencies the audit found</strong> across ~50 screens, 11 handler patterns (<code>onClose</code>, <code>onDismiss</code>, <code>onCancel</code>, <code>handleDismiss</code>, <code>handleBack</code>, <code>onEscape</code>, …):</p>
      <ul style="margin:4px 0;padding-left:20px;font-size:13px;color:var(--muted)">
        <li><code>IDDataScreen.tsx:47</code> — <code>onClose</code> calls <code>navigate(-1)</code> (back behavior, called "close")</li>
        <li><code>RecoverySuccessScreen.tsx:28</code> — <code>onClose</code> calls <code>navigate(returnTo ?? '/')</code> (close behavior — correct)</li>
        <li><code>ProvingScreen.tsx:44</code> — <code>onCancel</code> calls <code>lifecycle.dismiss({reason:'user_cancel'})</code>, wired to Euclid's <code>onClose</code> prop</li>
        <li><code>KycFailureScreen.tsx:23</code> — <code>handleDismiss</code> calls <code>navigate('/', {state:{skipOnboardingRedirect:true}})</code> (cluster-exit under "dismiss" name)</li>
      </ul>
      <p><strong>The proposed canonical set:</strong> <code>handleClose</code> (cluster-exit via useClusterClose), <code>handleBack</code> (navigate(-1)), <code>handleRetry</code> (re-attempt), <code>handleContinue</code> (advance).</p>
      <p><strong>Note:</strong> Euclid prop names (<code>onClose</code>, <code>onDismiss</code>, <code>onTryAgain</code>) are NOT ours to rename — we control only local handler names and the wire from local to Euclid prop.</p>
    `,
    options: [
      { value: "both", label: "Standardize names AND semantics", note: "Strongest contract. Every handler renamed across ~50 screens (~150 LOC diff). Future code says what it does. Recommended." },
      { value: "semantics-only", label: "Only enforce semantics; allow any handler name", note: "Smaller diff. Easy to drift again — next agent re-introduces 'handleDismiss' meaning close." }
    ]
  },
  {
    id: "nav-05-q2-eslint-rule",
    plan: "NAV-05",
    question: "Add a custom ESLint rule to enforce handler names, or rely on review + AGENTS.md?",
    context: `
      <p><strong>Existing config:</strong> <code>.eslintrc.cjs</code> (no <code>eslint.config.*</code> in repo). Has imports/TypeScript rules; no react-router or naming rules.</p>
      <p><strong>What the rule would check:</strong> in <code>packages/webview-app/src/screens/**/*.tsx</code>, flag a <code>const</code> or <code>function</code> declaration named <code>onDismiss</code> / <code>handleDismiss</code> / <code>onCancel</code> / <code>handleCancel</code> / <code>onEscape</code>. Suggest <code>handleClose</code> or <code>handleBack</code> with a hint.</p>
      <p><strong>Cost:</strong> half-day to write + tests. Lives in <code>packages/webview-app/eslint-rules/</code>.</p>
    `,
    options: [
      { value: "rule", label: "Custom ESLint rule", note: "Permanent enforcement. Catches drift forever. Half-day to write. Some false positives possible (e.g. wrapping a third-party lib that expects 'onDismiss')." },
      { value: "docs", label: "Document in AGENTS.md only", note: "Cheap (~10 min). Relies on code review discipline. Will drift over months." }
    ]
  },

  // NAV-06 ===============================================================
  {
    id: "nav-06-q1-split-vs-param",
    plan: "NAV-06",
    question: "Approach: split routes per document (Aadhaar pattern), or parameterize the Euclid NfcErrorScreen?",
    context: `
      <p><strong>Today's situation:</strong></p>
      <ul style="margin:4px 0 6px;padding-left:20px;font-size:13px;color:var(--muted)">
        <li>Passport owns <code>/onboarding/passport/nfc-error</code> → <code>PassportNfcErrorRoute</code> wrapping Euclid's <code>PassportNfcErrorScreen</code>.</li>
        <li>Aadhaar owns <code>/onboarding/aadhaar/upload-error</code> → <code>AadhaarUploadErrorRoute</code> wrapping Euclid's <code>AadhaarUploadErrorScreen</code>.</li>
        <li>EU-ID has <strong>no</strong> error route. It navigates to passport's from two sites:
          <ul style="margin:2px 0;padding-left:18px">
            <li><code>EuIdNfcInstructionsRoute.tsx:115</code> (on NFC fail)</li>
            <li><code>EuIdViewfinderRoute.tsx:57</code> (on MRZ fail)</li>
          </ul>
        </li>
      </ul>
      <p><strong>Euclid coupling:</strong> <code>PassportNfcErrorScreen</code> is passport-specific — hardcoded strings ("Try scanning your passport again…"), passport-specific analytics like <code>passport_scan_start_over</code>. It does NOT accept a <code>documentType</code> prop today.</p>
      <p><strong>Split-routes path:</strong> add <code>/onboarding/eu-id/nfc-error</code> route + <code>EuIdNfcErrorRoute</code> component + an <code>EuIdNfcErrorScreen</code> Euclid component (or a local wrapper if Euclid lags). Mirrors Aadhaar.</p>
      <p><strong>Param-euclid path:</strong> change Euclid's <code>PassportNfcErrorScreen</code> to <code>NfcErrorScreen</code> with <code>documentType</code> prop. Affects everyone who consumes Euclid, including any other Self product using the library.</p>
    `,
    options: [
      { value: "split-routes", label: "Split: EU-ID gets its own /onboarding/eu-id/nfc-error route", note: "Matches Aadhaar precedent. No Euclid library changes. Creates ~80 LOC in webview-app + a follow-up Euclid issue for EuIdNfcErrorScreen. Recommended." },
      { value: "param-euclid", label: "Parameterize: <NfcErrorScreen documentType='eu-id' /> in Euclid", note: "Single shared component for every document. Larger blast radius across products that consume Euclid. Requires Euclid version bump + cross-product coordination." }
    ]
  },

  // NAV-07 ===============================================================
  {
    id: "nav-07-q1-eslint-rule",
    plan: "NAV-07",
    question: "Codify replace:true rule via custom ESLint rule or AGENTS.md documentation?",
    context: `
      <p><strong>Repo state:</strong> 194 <code>navigate()</code> calls in <code>packages/webview-app/src</code>. 44 use <code>{ replace: true }</code>. 150 omit the option (default <code>false</code>). Five specific violations:</p>
      <ul style="margin:4px 0;padding-left:20px;font-size:13px;color:var(--muted)">
        <li><code>ProofGenerationSuccessScreen.tsx:21</code> — terminal success, no replace</li>
        <li><code>RecoveryFailureScreen.tsx:33</code> — terminal failure, no replace (sibling line 44 has it)</li>
        <li><code>KycSuccessScreen.tsx:21</code> — terminal KYC success, no replace</li>
        <li><code>LaunchRecoveryScreen.tsx:22</code> — back nav uses replace — audit, may be correct</li>
      </ul>
      <p><strong>Rule design challenge:</strong> "is this a terminal handler?" is a heuristic, not a type. Possible signal: function names matching <code>handleClose|handleRetry|onSuccess|onFailure</code> + <code>navigate(…)</code> without explicit replace. False positives likely on borderline cases.</p>
    `,
    options: [
      { value: "docs", label: "Document in AGENTS.md; fix the 5 known violations", note: "Pragmatic. AGENTS.md gets a Navigation conventions section with invariant #9 verbatim + 3 examples. Five 1-line edits to fix violations. ~30 min total. Recommended." },
      { value: "rule", label: "Write a custom ESLint rule", note: "Half-day. Likely needs a tuning pass to suppress false positives. Permanent enforcement once shipped." }
    ]
  },
  {
    id: "nav-07-q2-audit-scope",
    plan: "NAV-07",
    question: "Audit scope: fix only the 5 known violations, or sweep all 150 default-replace calls?",
    context: `
      <p><strong>Quick-win:</strong> the 5 violations above are concrete user-facing bugs — press back on success and you're back on the success screen. Fix in 30 min.</p>
      <p><strong>Full sweep:</strong> walk every <code>navigate()</code> call without an explicit <code>replace</code>. For each, classify: terminal? invalid-state redirect? cluster-forward? If yes, add <code>{ replace: true }</code>. Expect to find 5–10 more violations among the 150. ~2–3 hours.</p>
      <p>The 150 include many legitimately-non-replace calls (forward push, modal opens, multi-step wizards where back-tracking IS expected). The sweep is high-toil for moderate yield.</p>
    `,
    options: [
      { value: "five", label: "Fix the 5 known violations only", note: "30 min. Covers the named user-visible bugs. Pragmatic. Recommended." },
      { value: "all", label: "Full sweep of all 150 default-replace calls", note: "2–3 hours. Likely surfaces 5–10 additional issues. Thorough but high-toil for the marginal cases." }
    ]
  },

  // NAV-08 ===============================================================
  {
    id: "nav-08-q1-tunnel-paths",
    plan: "NAV-08",
    question: "Should /tunnel/* paths rename to /embed/* or drop the mode prefix entirely?",
    context: `
      <p><strong>SPEC invariant #7:</strong> "Every URL is either a verb (operation) or a place (destination). No journey prefixes, no mode prefixes."</p>
      <p>Mode is metadata, not a URL segment. The invariant rules out both <code>/tunnel/*</code> and <code>/embed/*</code>.</p>
      <p><strong>Today's 11 tunnel routes</strong> (from <code>App.tsx:154–165</code>):</p>
      <ul style="margin:4px 0;padding-left:20px;font-size:13px;color:var(--muted)">
        <li><code>/tunnel/tour/:step</code>, <code>/tunnel/kyc</code>, <code>/tunnel/kyc-pending</code>, <code>/tunnel/kyc-failure</code>, <code>/tunnel/kyc-success</code></li>
        <li><code>/tunnel/registration/country</code>, <code>/tunnel/registration/id-type</code> (NAV-10 deletes)</li>
        <li><code>/tunnel/proof/receipt</code>, <code>/tunnel/proof/generating</code>, <code>/tunnel/proof/disclose</code>, <code>/tunnel/proof/result</code></li>
        <li><code>/tunnel/recovery-required</code></li>
      </ul>
      <p><strong>Drop-prefix examples:</strong> <code>/tunnel/proof/result</code> → <code>/disclose/result</code>; <code>/tunnel/kyc-pending</code> → <code>/disclose/kyc-pending</code> (shared with self-app); <code>/tunnel/tour/:step</code> → <code>/tour/:step</code> (mode-aware copy via <code>useOperatingMode()</code>).</p>
      <p><strong>NAV-13 enforcement:</strong> the <code>ModeRoute</code> wrapper rejects cross-mode access, so a self-app user hitting <code>/disclose/result</code> (an embed-only route) gets bounced — no need for the URL to encode the mode.</p>
    `,
    options: [
      { value: "drop-prefix", label: "Drop the prefix entirely (paths describe operations only)", note: "Strict invariant compliance. /tunnel/* paths fold into self-app routes; NAV-13 enforces mode access. Largest cognitive shift. Recommended." },
      { value: "rename-to-embed", label: "Rename /tunnel/* → /embed/*", note: "Easier diff (1:1 path map). Violates invariant #7. Mode leaks into URLs forever." }
    ]
  },
  {
    id: "nav-08-q2-backcompat",
    plan: "NAV-08",
    question: "Backwards-compat for old paths: redirect map for one release, or hard cut?",
    context: `
      <p><strong>Why hosts might depend on old paths:</strong> third-party integrators (Acme, etc.) may have hard-coded <code>/tunnel/proof/result</code> or similar in their deeplink configuration when launching the webview.</p>
      <p><strong>What the bridge actually sends:</strong> the bridge passes a <code>verificationRequest</code> object, not a path. Hosts don't typically navigate the webview to specific paths — they hand it a request, the webview decides. So host coupling on paths is <em>likely</em> nonexistent, but not verified.</p>
      <p><strong>Redirect map shape</strong> (if chosen):</p>
      <pre style="margin:4px 0;padding:8px 10px;background:var(--surface-alt);border-radius:4px;font-size:11px;overflow-x:auto"><code>&lt;Route path="/tunnel/proof/result" element={&lt;Navigate to="/disclose/result" replace /&gt;} /&gt;
// ~11 such redirects</code></pre>
      <p>Schedule removal one release later. Adds ~30 LOC + a follow-up issue to remove them.</p>
    `,
    options: [
      { value: "redirects", label: "Add redirect map for one release", note: "Safety net if any host has hard-coded old paths. ~30 LOC of <Navigate> entries. File a 'remove transitional redirects' issue with a target release." },
      { value: "hard-cut", label: "Hard cut; document the breaking change", note: "Cleaner code. Requires coordinating with host teams before the release ships." }
    ]
  },

  // NAV-09 ===============================================================
  {
    id: "nav-09-q1-canonical-names",
    plan: "NAV-09",
    question: "Canonical slot name for 'forward target': pick one of {nextPath, returnTo}, or keep both with explicit semantic split?",
    context: `
      <p><strong>Current usage</strong> — same intent ("where to go after this step"), two names:</p>
      <ul style="margin:4px 0;padding-left:20px;font-size:13px;color:var(--muted)">
        <li><code>nextPath</code> in onboarding/kyc: <code>ConfirmIdentificationScreen.tsx:23</code>, <code>ProviderLaunchScreen.tsx:37</code>, <code>TunnelKycWrapper.tsx:31</code></li>
        <li><code>returnTo</code> in recovery: <code>RecoveryFailureScreen.tsx:18</code>, <code>RecoverySuccessScreen.tsx:18</code>, <code>SecretPhraseInputScreen.tsx:68</code></li>
      </ul>
      <p><strong>"Semantic split" framing</strong> (if kept):</p>
      <ul style="margin:4px 0;padding-left:20px;font-size:13px;color:var(--muted)">
        <li><code>nextPath</code> = forward in the same flow (onboarding step → next step)</li>
        <li><code>returnTo</code> = exit back to the originating flow (settings → recovery → back to settings)</li>
      </ul>
      <p>In practice the line is fuzzy. Today, <code>RecoverySuccessScreen</code>'s <code>returnTo</code> is "go forward after recovery succeeded" — semantically identical to <code>nextPath</code>.</p>
    `,
    options: [
      { value: "nextPath-only", label: "Single name: nextPath. Rename returnTo → nextPath in recovery files", note: "One concept. ~4 recovery files updated. Cleaner type. Recommended." },
      { value: "both-split", label: "Keep both with documented semantic split", note: "Preserves a real-if-subtle distinction. Risk: code drifts back to inconsistent use without strict enforcement." }
    ]
  },
  {
    id: "nav-09-q2-url-returnto",
    plan: "NAV-09",
    question: "Recovery's URL ?returnTo= query param: keep, deprecate, or migrate to state-only?",
    context: `
      <p><strong>Today's dual transport</strong> (recovery cluster only):</p>
      <pre style="margin:4px 0;padding:8px 10px;background:var(--surface-alt);border-radius:4px;font-size:11px;overflow-x:auto"><code>// LaunchRecoveryScreen.tsx:31 — encode to URL
function buildRecoveryTarget(path, returnTo) {
  return returnTo ? \`\${path}?returnTo=\${encodeURIComponent(returnTo)}\` : path;
}

// RecoveryFailureScreen.tsx:18 — read URL first, fall back to state
const returnTo = searchParams.get('returnTo') ?? state?.returnTo;</code></pre>
      <p><strong>Why URL was used:</strong> survives a full page reload mid-flow. Matters less in a webview (no manual URL editing); matters more if the recovery flow can be deeplinked from outside.</p>
      <p><strong>Rest of the app:</strong> state-only. The recovery URL dance is the lone exception.</p>
    `,
    options: [
      { value: "state-only", label: "Migrate to state-only", note: "Consistency with rest of app. Lose page-reload survival (low-value in a webview). Recommended." },
      { value: "keep-both", label: "Keep dual: URL preferred, state fallback", note: "Current behavior. Documents the asymmetry as intentional. Code is slightly more complex." }
    ]
  },

  // NAV-10 ===============================================================
  {
    id: "nav-10-q1-delete-vs-move",
    plan: "NAV-10",
    question: "Delete /tunnel/registration/* entirely, or move to /dev/embed-registration/*?",
    context: `
      <p><strong>What's there:</strong></p>
      <ul style="margin:4px 0;padding-left:20px;font-size:13px;color:var(--muted)">
        <li><code>/tunnel/registration/country</code> → <code>TunnelCountryPickerScreen.tsx</code></li>
        <li><code>/tunnel/registration/id-type</code> → <code>TunnelIDTypeScreen.tsx</code></li>
      </ul>
      <p><strong>Purpose:</strong> a dev sub-flow that lets you pick a country + ID type and proceed <em>without</em> going through KYC. Used historically for testing the post-KYC screens in embed mode. Registered at <code>App.tsx:159–160</code>. Reachable only via <code>DevRouteMenu.tsx</code>.</p>
      <p><strong>Audit-confirmed:</strong> zero production callers. Grep <code>navigate('/tunnel/registration</code> returns no hits outside App.tsx + DevRouteMenu.</p>
    `,
    options: [
      { value: "delete", label: "Delete entirely (App.tsx routes + screen files + DevRouteMenu entries)", note: "Clean. ~150 LOC removed. If anyone needs a 'bypass KYC' dev tool later, they can re-add it explicitly. Recommended." },
      { value: "move-dev", label: "Move to /dev/embed-registration/* + DEV-gate", note: "Preserves as a manual testing fixture. ~30 LOC of route renames. Minor ongoing maintenance." }
    ]
  },

  // NAV-12 ===============================================================
  {
    id: "nav-12-q1-mode-literal",
    plan: "NAV-12",
    question: "Rename OperatingMode literal — to 'self-app'|'embed' (full rename) or 'wallet'|'embed' (minimal change)?",
    context: `
      <p><strong>Current type</strong> (two definition sites):</p>
      <ul style="margin:4px 0;padding-left:20px;font-size:13px;color:var(--muted)">
        <li><code>packages/webview-app/src/providers/OperatingModeProvider.tsx:10</code> — <code>type OperatingMode = 'wallet' | 'tunnel'</code></li>
        <li><code>packages/rn-sdk/src/handlers/LifecycleHandler.ts:10</code> — parallel definition</li>
      </ul>
      <p><strong>Why no compat shim needed:</strong> the bridge protocol does NOT send the literal across host↔webview. The mode value is owned independently on both sides (host sends a config object, both sides interpret it locally). Renaming both sides in sync is safe.</p>
      <p><strong>Terminology in docs:</strong> SPEC.html, AUDIT.html, and the workstream conversations all say "self-app" and "embed." The code is the lone holdout using "wallet" and "tunnel."</p>
      <p><strong>RN code impact:</strong> the Self app RN app reads the mode via <code>rn-sdk</code>. If the literal becomes 'self-app', the wallet code reads 'self-app' (matches the product name).</p>
    `,
    options: [
      { value: "self-app-embed", label: "'self-app' | 'embed'", note: "Matches all docs + AUDIT. Larger diff (every 'wallet' usage updates). Cleanest end state. Recommended." },
      { value: "wallet-embed", label: "'wallet' | 'embed' (minimal change)", note: "Only one literal renames. Keeps 'wallet' familiar to RN code. Doc/code mismatch persists ('wallet' in code, 'self-app' in docs)." }
    ]
  },
  {
    id: "nav-12-q2-folder-rename",
    plan: "NAV-12",
    question: "Rename screens/tunnel/ folder + Tunnel* file/class names in this PR, or split into a follow-up?",
    context: `
      <p><strong>Files to rename</strong> in <code>packages/webview-app/src/screens/tunnel/</code> (~910 LOC across 11 files):</p>
      <ul style="margin:4px 0;padding-left:20px;font-size:13px;color:var(--muted);columns:2;column-gap:24px">
        <li><code>TourScreen.tsx</code></li>
        <li><code>TunnelCountryPickerScreen.tsx</code></li>
        <li><code>TunnelDiscloseScreen.tsx</code></li>
        <li><code>TunnelIDTypeScreen.tsx</code></li>
        <li><code>TunnelKycFailureScreen.tsx</code></li>
        <li><code>TunnelKycPendingScreen.tsx</code></li>
        <li><code>TunnelKycSuccessScreen.tsx</code></li>
        <li><code>TunnelKycWrapper.tsx</code></li>
        <li><code>TunnelProofReceiptScreen.tsx</code></li>
        <li><code>TunnelProvingScreen.tsx</code></li>
        <li><code>TunnelRecoveryRequiredScreen.tsx</code></li>
      </ul>
      <p>Plus folder rename <code>screens/tunnel/</code> → <code>screens/embed/</code>, every <code>Tunnel*</code> class → <code>Embed*</code>, every importer (App.tsx, DevRouteMenu, tests).</p>
      <p><strong>Use <code>git mv</code></strong> for each rename so git history follows.</p>
    `,
    options: [
      { value: "all-in-one", label: "Rename everything in one PR", note: "Single coherent diff. ~250 LOC substantive change (renames + import updates). Reviewer reads the whole rename in one sitting." },
      { value: "split", label: "Mode literal first, files in follow-up", note: "Two smaller PRs. Codebase is inconsistent (literal='embed', files=Tunnel*) for one release window. Easier per-PR review." }
    ]
  },

  // NAV-13 ===============================================================
  {
    id: "nav-13-q1-wrapper-shape",
    plan: "NAV-13",
    question: "Wrapper API: <ModeRoute mode='…' path='…' element={…} />, or <Route element={<ModeGuard mode='…'>…</ModeGuard>} />?",
    context: `
      <p><strong>Scale:</strong> ~40 route registrations in <code>App.tsx:97–166</code>. The wrapper replaces (or wraps) every <code>&lt;Route&gt;</code>.</p>
      <p><strong>Option A — &lt;ModeRoute&gt;:</strong></p>
      <pre style="margin:4px 0;padding:8px 10px;background:var(--surface-alt);border-radius:4px;font-size:11px;overflow-x:auto"><code>&lt;ModeRoute mode="self-app" path="/settings" element={&lt;SettingsScreen /&gt;} /&gt;
&lt;ModeRoute mode="shared"   path="/disclose/kyc-pending" element={&lt;KycPendingScreen /&gt;} /&gt;
&lt;ModeRoute mode="dev"      path="/dev/keychain" element={&lt;KeychainDebugScreen /&gt;} /&gt;</code></pre>
      <p>Internally, <code>ModeRoute</code> either renders a <code>&lt;Route&gt;</code> or a <code>&lt;Route&gt;</code> with a redirect element, depending on the current mode. Requires understanding react-router's Route children semantics (Route can only be a child of Routes).</p>
      <p><strong>Option B — &lt;ModeGuard&gt;:</strong></p>
      <pre style="margin:4px 0;padding:8px 10px;background:var(--surface-alt);border-radius:4px;font-size:11px;overflow-x:auto"><code>&lt;Route path="/settings" element={
  &lt;ModeGuard mode="self-app"&gt;&lt;SettingsScreen /&gt;&lt;/ModeGuard&gt;
} /&gt;</code></pre>
      <p>Simpler wrapper (just a component). Every call site nests one extra level.</p>
    `,
    options: [
      { value: "mode-route", label: "<ModeRoute mode='…' path='…' element={<Screen/>} />", note: "Single declaration. Wrapper logic non-trivial (must render a Route to satisfy react-router). ~40 call sites stay one-liners. Recommended." },
      { value: "mode-guard", label: "<Route element={<ModeGuard mode='…'><Screen/></ModeGuard>} />", note: "Tiny wrapper. ~40 call sites double their nesting. Verbose but mechanical." }
    ]
  },
  {
    id: "nav-13-q2-mismatch-behavior",
    plan: "NAV-13",
    question: "On mode-mismatch (e.g. embed user hits /settings): 404, redirect to home, or fail-closed (dismiss)?",
    context: `
      <p><strong>What "mismatch" means:</strong> a self-app-mode user navigating to an embed-only route (e.g. <code>/disclose/result</code>), or an embed-mode user navigating to a self-app-only route (e.g. <code>/settings</code>).</p>
      <p><strong>Today:</strong> ModeBoot.tsx:76 redirects wallet users off <code>/tunnel/*</code> to <code>/</code>. There's no symmetric guard for tunnel users on wallet paths — they can technically reach them.</p>
      <p><strong>What each option looks like in practice:</strong></p>
      <ul style="margin:4px 0;padding-left:20px;font-size:13px;color:var(--muted)">
        <li><strong>Mode-aware:</strong> self-app user → <code>&lt;Navigate to="/" replace /&gt;</code> (lands on home). Embed user → <code>lifecycle.setResult({success:false,error:'route_not_allowed'})</code> + <code>lifecycle.dismiss()</code> (host gets a failure and the webview closes).</li>
        <li><strong>Always-home:</strong> both modes → <code>&lt;Navigate to="/" replace /&gt;</code>. For embed, this leaves the host with an open webview showing /, which the host wasn't expecting.</li>
        <li><strong>404:</strong> render a "Not found" component. Visible failure. Bad embed UX — host has no signal that something went wrong.</li>
      </ul>
    `,
    options: [
      { value: "mode-aware", label: "Mode-aware: redirect home in self-app, fail-closed in embed", note: "Matches mode semantics. Embed host gets a clean failure signal; self-app user lands somewhere sensible. Recommended." },
      { value: "always-home", label: "Always Navigate('/')", note: "Simpler wrapper logic. Wrong for embed (host gets a stranded webview)." },
      { value: "404", label: "Render <NotFound /> component", note: "Most visible failure. Useful in dev. Bad for embed (host has no signal). Could be a future addition behind a DEV flag." }
    ]
  }
];

// --- Storage ----------------------------------------------------------
//
// Answer shape: { value?: string, notes?: string }
//   value = id of the selected option (if any)
//   notes = free-text content (if any)
// A question is "answered" if either value or notes is present.
// Old-format answers (plain strings) are migrated on read.

function loadAnswers() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const out = {};
    Object.keys(raw).forEach(id => {
      const v = raw[id];
      if (typeof v === 'string') out[id] = { value: v };
      else if (v && typeof v === 'object') out[id] = v;
    });
    return out;
  } catch { return {}; }
}
function saveAnswer(id, partial) {
  // partial = { value?: string|null, notes?: string|null }; null deletes that field.
  const answers = loadAnswers();
  const next = { ...(answers[id] || {}) };
  if (partial && Object.prototype.hasOwnProperty.call(partial, 'value')) {
    if (partial.value == null) delete next.value;
    else next.value = partial.value;
  }
  if (partial && Object.prototype.hasOwnProperty.call(partial, 'notes')) {
    if (partial.notes == null || partial.notes === '') delete next.notes;
    else next.notes = partial.notes;
  }
  if (!next.value && !next.notes) delete answers[id];
  else answers[id] = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
}
function clearAnswer(id) {
  const answers = loadAnswers();
  delete answers[id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
}
const OTHER_VALUE = '__other__';

function getAnswerStatus(answer) {
  if (!answer) return 'open';
  const hasNotes = !!(answer.notes && answer.notes.trim());
  const value = answer.value;
  if (value && value !== OTHER_VALUE) return 'answered';     // picked a preset
  if (value === OTHER_VALUE && hasNotes) return 'answered';  // Other + notes = custom answer
  if (value === OTHER_VALUE && !hasNotes) return 'needs-text'; // Other but empty
  if (!value && hasNotes) return 'answered';                 // no radio but notes filled
  return 'open';
}
function isAnswered(answer) {
  return getAnswerStatus(answer) === 'answered';
}
function clearAllAnswers() {
  localStorage.removeItem(STORAGE_KEY);
}
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// --- Rendering --------------------------------------------------------

function renderQuestion(q, answers) {
  const answer = answers[q.id] || {};
  const status = getAnswerStatus(answer);
  const isOtherSelected = answer.value === OTHER_VALUE;
  const card = document.createElement('div');
  card.className = `oq-card status-${status}`;
  card.dataset.questionId = q.id;
  card.dataset.plan = q.plan;
  card.dataset.status = status;

  const presetHtml = q.options.map(opt => {
    const isRec = opt.note && /\bRecommended\b/i.test(opt.note);
    return `
      <label class="oq-option ${answer.value === opt.value ? 'selected' : ''}">
        <input type="radio" name="${q.id}" value="${escapeHtml(opt.value)}" ${answer.value === opt.value ? 'checked' : ''}/>
        <div>
          <div class="option-label">
            <span>${opt.label}</span>
            ${isRec ? '<span class="oq-rec-chip">Recommended</span>' : ''}
          </div>
          ${opt.note ? `<div class="option-note">${opt.note}</div>` : ''}
        </div>
      </label>
    `;
  }).join('');

  const otherHtml = `
    <label class="oq-option oq-option-other ${isOtherSelected ? 'selected' : ''}">
      <input type="radio" name="${q.id}" value="${OTHER_VALUE}" ${isOtherSelected ? 'checked' : ''}/>
      <div>
        <div class="option-label"><span>Chat about it</span></div>
        <div class="option-note">None of the above. Write a custom answer or open a discussion in the notes below.</div>
      </div>
    </label>
  `;

  const notesValue = answer.notes ? escapeHtml(answer.notes) : '';
  const notesLabel = isOtherSelected ? 'Your answer (required)' : 'Notes / nuance (optional)';
  const notesPlaceholder = isOtherSelected
    ? 'Write the answer you want. This becomes the decision in the export.'
    : 'Add nuance to your selection, capture follow-up questions, or paste links…';
  const statusText = status === 'answered' ? 'Answered' : status === 'needs-text' ? 'Needs text' : 'Open';
  const hasAnything = !!(answer.value || (answer.notes && answer.notes.trim()));

  card.innerHTML = `
    <div class="oq-head">
      <span class="oq-id">${q.id}</span>
      <span class="oq-plan">${q.plan}</span>
      <span class="oq-status">${statusText}</span>
    </div>
    <p class="oq-question">${q.question}</p>
    <div class="oq-context">${q.context}</div>
    <div class="oq-options">${presetHtml}${otherHtml}</div>
    <div class="oq-notes ${isOtherSelected ? 'oq-notes-required' : ''}">
      <label class="oq-notes-label" for="notes-${q.id}">${notesLabel}</label>
      <textarea
        id="notes-${q.id}"
        class="oq-notes-input"
        rows="${isOtherSelected ? 3 : 2}"
        placeholder="${notesPlaceholder}"
      >${notesValue}</textarea>
    </div>
    <div class="oq-actions">
      ${hasAnything ? `<button data-action="clear">Clear everything</button>` : ''}
    </div>
  `;

  // Radio change → save value + re-render (status pill flips)
  card.addEventListener('change', e => {
    if (e.target.matches('input[type="radio"]')) {
      saveAnswer(q.id, { value: e.target.value });
      const fresh = renderQuestion(q, loadAnswers());
      card.replaceWith(fresh);
      document.dispatchEvent(new CustomEvent('oq-answered', { detail: { id: q.id } }));
    }
  });

  // Notes textarea → save on blur (avoids re-render while typing)
  const textarea = card.querySelector('.oq-notes-input');
  if (textarea) {
    textarea.addEventListener('blur', () => {
      const current = (loadAnswers()[q.id] || {}).notes || '';
      const next = textarea.value.trim();
      if (next === current) return;
      saveAnswer(q.id, { notes: next || null });
      const fresh = renderQuestion(q, loadAnswers());
      card.replaceWith(fresh);
      document.dispatchEvent(new CustomEvent('oq-answered', { detail: { id: q.id } }));
    });
  }

  // Clear button → wipe both value and notes
  card.addEventListener('click', e => {
    if (e.target.matches('[data-action="clear"]')) {
      clearAnswer(q.id);
      const fresh = renderQuestion(q, loadAnswers());
      card.replaceWith(fresh);
      document.dispatchEvent(new CustomEvent('oq-answered', { detail: { id: q.id } }));
    }
  });

  return card;
}

function renderQuestionsForPlan(planId, container, opts = {}) {
  const answers = loadAnswers();
  const list = OPEN_QUESTIONS.filter(q => q.plan === planId);
  container.innerHTML = '';
  if (!list.length) {
    container.innerHTML = '<div class="oq-empty">No open questions for this plan.</div>';
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'oq-list';
  list.forEach(q => wrap.appendChild(renderQuestion(q, answers)));
  container.appendChild(wrap);
}

function renderAllQuestions(container, opts = {}) {
  const filter = opts.filter || 'all';
  const planFilter = opts.plan || 'all';
  const answers = loadAnswers();
  container.innerHTML = '';

  const list = OPEN_QUESTIONS.filter(q => {
    const status = isAnswered(answers[q.id]) ? 'answered' : 'open';
    if (filter !== 'all' && filter !== status) return false;
    if (planFilter !== 'all' && q.plan !== planFilter) return false;
    return true;
  });

  if (!list.length) {
    container.innerHTML = '<div class="oq-empty">No questions match the current filter.</div>';
    return;
  }

  const byPlan = {};
  list.forEach(q => {
    byPlan[q.plan] = byPlan[q.plan] || [];
    byPlan[q.plan].push(q);
  });

  Object.keys(byPlan).sort().forEach(plan => {
    const h = document.createElement('h3');
    h.style.cssText = 'margin-top: 18px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted);';
    h.textContent = `${plan} (${byPlan[plan].length})`;
    container.appendChild(h);
    const wrap = document.createElement('div');
    wrap.className = 'oq-list';
    byPlan[plan].forEach(q => wrap.appendChild(renderQuestion(q, answers)));
    container.appendChild(wrap);
  });
}

function exportAnswersMarkdown() {
  const answers = loadAnswers();
  const answered = OPEN_QUESTIONS.filter(q => isAnswered(answers[q.id]));
  if (!answered.length) return '_No answered questions yet._';
  let md = `## Nav-Hygiene Open-Questions Answers\n\n_${answered.length} of ${OPEN_QUESTIONS.length} answered_\n\n`;
  const byPlan = {};
  answered.forEach(q => {
    byPlan[q.plan] = byPlan[q.plan] || [];
    byPlan[q.plan].push(q);
  });
  Object.keys(byPlan).sort().forEach(plan => {
    md += `### ${plan}\n\n`;
    byPlan[plan].forEach(q => {
      const a = answers[q.id] || {};
      const option = a.value && a.value !== OTHER_VALUE ? q.options.find(o => o.value === a.value) : null;
      md += `- **${q.question}**\n`;
      if (option) {
        md += `  - Decided: ${option.label}\n`;
      } else if (a.value === OTHER_VALUE) {
        md += `  - Decided: _custom answer — see notes_\n`;
      } else if (a.value) {
        md += `  - Decided: ${a.value}\n`;
      } else {
        md += `  - Decided: _no preset selected — see notes_\n`;
      }
      if (a.notes && a.notes.trim()) {
        const notesLines = a.notes.trim().split('\n');
        md += `  - Notes: ${notesLines[0]}\n`;
        for (let i = 1; i < notesLines.length; i++) md += `    ${notesLines[i]}\n`;
      }
      md += `  - Question id: \`${q.id}\`\n\n`;
    });
  });
  return md;
}

function getQuestionStats() {
  const answers = loadAnswers();
  const total = OPEN_QUESTIONS.length;
  const answered = OPEN_QUESTIONS.filter(q => isAnswered(answers[q.id])).length;
  return { total, answered, open: total - answered };
}

window.NavHygieneOQ = {
  OPEN_QUESTIONS,
  loadAnswers,
  saveAnswer,
  clearAnswer,
  clearAllAnswers,
  isAnswered,
  renderQuestionsForPlan,
  renderAllQuestions,
  exportAnswersMarkdown,
  getQuestionStats
};
