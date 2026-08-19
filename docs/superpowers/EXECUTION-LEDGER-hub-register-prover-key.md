# SDD ledger — plan: docs/superpowers/plans/2026-08-18-hub-register-prover-key.md

Spec: docs/superpowers/specs/2026-08-18-hub-register-prover-key-design.md (read, binding authority)
Branch: feat/hub-register-prover-key off dev, primary checkout (not a worktree). Not main/master.

## Pre-flight conflict scan

### Cross-task pairs (shared file or interface)

| Pair | Producer -> Consumer | Finding |
|---|---|---|
| T1 -> T3 | `unpackAndDecodeAddress(uint256,uint256) -> address` -> called in registerProverKey | agrees |
| T2 -> T3 | `_getProverStorage()` + 4 config setters -> used by register/revoke and by T3's test setup | agrees |
| T2 -> T3 | both modify IdentityVerificationHubImplV2.sol and test/v2/registerProverKey.test.ts | sequential, same files, no conflict |
| T2 -> T3 | forge-inspect baseline captured in T2 Step 1, re-diffed in T3 Step 5 | agrees — baseline is pre-change, correct |
| T4 -> T1 | T4 produces a bare-40-hex nonce; T1's decoder REQUIRES bare 40 hex | agrees, but ORDER IS INVERTED (see Ruling 1) |
| T3 -> T4 | nothing shared | n/a |

### Per-task self-consistency

| Task | Tests vs code / files created vs touched | Finding |
|---|---|---|
| T1 | 5 tests vs the decoder; `test/unit/` exists; harness `TestGCPJWTHelper.sol` already exists | self-consistent |
| T2 | 3 config tests vs namespace+setters; baseline captured before any edit | self-consistent |
| T3 | 14 tests, all revert cases matched by `revertedWithCustomError` with PROVER_-prefixed names matching the impl | self-consistent |
| T4 | different repo entirely (tee-prover-server, branch feat/tee-attestation-proof-signing) | self-consistent internally; see Ruling 2 |

## Rulings

Ruling 1 (task ordering, T4 before T1 in dependency terms): the plan orders the on-chain decoder
(T1) before the enclave-side nonce format change (T4), so between T1 and T4 the two repos disagree
about the nonce shape. This is NOT a defect: nothing executes across the two repos until the `chain`
feature is enabled, which is explicitly deferred, and T1's tests construct their own packed input via
packAscii so they never depend on the enclave. Keeping the plan's order — contracts first — because the
contract decoder is the authority the enclave must satisfy, not the reverse.
Cost if wrong: none while `chain` is off; the pairing must both be merged before it is switched on.

Ruling 2 (cross-repo task): T4 commits to /Users/ayman/self/tee-prover-server on branch
feat/tee-attestation-proof-signing (open as PR #36), a different repo from this ledger's. Consequence
for me: `scripts/review-package` runs git in the cwd, so T4's review package must be generated with
that repo as cwd, and its BASE recorded from that repo's HEAD. Noting it so I do not silently diff the
wrong repository and review an empty range.
Cost if wrong: a review of the wrong diff, which the reviewer would flag as an empty/unrelated package.

Ruling 3 (T4 pushes to an open PR): T4's final step pushes to feat/tee-attestation-proof-signing, which
is already open as PR #36 — a side effect outside this repo on a branch the user has published. The user
explicitly asked for the nonce change to land there when approving the spec, and asked for this plan to
be executed, so the authorization exists. I will still hold T4's push until its review is clean rather
than pushing on the implementer's word.
Cost if wrong: an extra commit on an unmerged PR the user already owns; revertable.

## Progress

Task 1: DONE (commit 3d1723e25) — 5 passing, confirmed failing pre-implementation.

Ruling 4 (plan defect, affects T2 and T3): the plan's verification steps say `npx hardhat test`.
  npx does not work in this environment — pnpm/corepack is not provisioned on this branch, the same root
  cause as the broken pre-commit hook. The working invocation is `./node_modules/.bin/hardhat test <path>`
  from `contracts/`. Carrying this correction into the T2 and T3 dispatches.
  Cost if wrong: none — the implementer demonstrated the corrected form runs the suite.

Task 1: minor (deferred): a repo-wide PostToolUse TypeScript-check hook reports ~40 pre-existing type
  errors elsewhere (IdentityRegistry.test.ts, new-common, others). None in files this plan touches.
  Out of scope, but it means that hook's output is noise for every task here — do not treat it as a
  regression signal.
Task 1: review — spec compliant, quality approved, but 1 Important (plan-mandated) + 2 Minor.
  Reviewer verified by hand: every wrong-length input is excluded (including the p0-side overflow case
  the brief did not call out), endianness matches unpackAndConvertImageHash's known-correct loop AND the
  TS packAscii helper independently (so not "both wrong in the same direction"), and the 160-bit
  truncation drops no meaningful bits.

Ruling 5 (Important, plan-mandated): the new function's hex-decode loop is logic-for-logic identical to
  unpackAndDecodeHexPubkey's — same branch ranges, same offsets, same revert string. My brief's Step 3
  prescribed exactly that inline code, and the constraint against modifying the existing decoders is why
  the implementer could not factor it out there.
  I rule FIX IT. This library sits on a security-critical decode path and already carries more duplication
  than it should; a second copy of validation logic is precisely what drifts later. The reviewer's fix
  respects the constraint: extract a NEW private helper that reverts on invalid input (distinct from
  _hexToNibble, which silently returns 0) and call it only from the new function. The old decoders stay
  byte-identical.
  Cost if wrong: one small private function in a library that already has two.

Ruling 6 (folding two Minors into the open round): the reviewer verified case-insensitivity, the
  exactly-31-char boundary, and the p0-side overflow by inspection only — no test covers them. Since
  Ruling 5 already opens a round on this file, the boundary cases get tests. They are the two the reviewer
  had to reason about by hand, which is exactly the kind of property that should be pinned rather than
  re-derived by the next reader.
  Cost if wrong: three extra test cases.
Task 1: fix round 1/5 (Rulings 5+6 applied; commits 3d1723e25..730a6744b) — 8 passing (5 original + 3 new:
  exactly-31-chars, p0-side overflow via a directly-constructed chunk, uppercase/mixed-case).
Task 1: complete (commits 0639e39ee..730a6744b, review clean after 1 fix round)
  Re-reviewer confirmed the p0-overflow test constructs its chunk DIRECTLY rather than via packAscii
  (which cannot produce it), so the residual check is genuinely pinned; and that the mixed-case test
  compares against getAddress of the lowercase equivalent rather than routing mixed case through
  getAddress, which would have enforced EIP-55 casing instead.

Task 2: DONE (commit c4bd655f3) — 3/3 config tests passing. forge inspect before/after diff is
  byte-for-byte EMPTY: __gap@0 and AADHAAR_REGISTRATION_WINDOW@50 untouched.
  IMPORTANT NUANCE I noticed, not raised by the implementer as a concern: an empty diff proves the
  ABSENCE of a regression, but ERC-7201 namespaced structs do not appear in forge's storageLayout at all,
  so nothing positively verifies the new namespace sits at the intended slot. A single-character typo in
  the pasted constant would land the namespace at an arbitrary slot and NO test could catch it, because
  read and write both go through the same constant — a consistent-but-wrong slot behaves identically.
  Routing this to the reviewer as a scrutiny point rather than pre-judging it.
Task 2: implementer ran `git submodule update --init` (forge-std, openzeppelin-foundry-upgrades were
  uninitialized) to make forge inspect runnable. Checkout-only to already-pinned commits; nothing under
  lib/ staged or committed. Accepted.
Task 2: CARRY TO TASK 3 — a pre-existing registerKyc.test.ts failure ("Invalid witness length",
  snarkjs/circuit artifact mismatch) exists identically with and without this change; the implementer
  confirmed via git stash. Task 3 runs the full suite, so it must not mistake this for a regression.
Task 2: complete (commits 730a6744b..c4bd655f3, review clean — spec compliant, quality approved)
  Reviewer independently recomputed the ERC-7201 constant from scratch with cast keccak/cast abi-encode:
  character-for-character match, and distinct from both pre-existing namespace constants. That closes the
  mistyped-constant risk the forge inspect diff structurally cannot detect. It also verified the role gate
  is not vacuous (ImplRoot.initialize grants SECURITY_ROLE to msg.sender, and deploymentV2 initializes
  through the deployer, so owner genuinely holds it and user1 genuinely does not).
Task 2: minor (deferred): the report claims an empty forge-inspect diff is "the strongest possible
  confirmation" of namespace placement. It is not — namespaced structs never appear in that output.
  Code is correct (independently verified); the report's reasoning is not. Reviewer recommends a direct
  ethers.provider.getStorage assertion instead. CARRYING THAT INTO TASK 3 as an addition, since Task 3
  writes to the same namespace and is the natural place to pin it automatically.

Task 3 attempt 1 FAILED — agent stalled on the 600s watchdog with ZERO output. Verified: HEAD still
  c4bd655f3, working tree clean, no partial work. Third infra stall this session (two host-sleep, one
  watchdog), so not task-specific.

Ruling 7 (mitigation, not a plan change): Task 3 is the largest task in the plan (308-line brief, 14 tests,
  three files). Re-dispatching fresh, with one added instruction: commit in TWO stages — contract + interface
  first, then the test suite — so a stall costs at most half the work instead of all of it. This does not
  change what gets built or how it is reviewed; the review still covers the whole BASE..HEAD range as one
  task. Cost if wrong: one extra commit in the history.
Task 3: DONE (commits 956f5a90b contract+interface, 357a10dcc tests) — 19/19 in the new file.
  Full suite 416 passing / 36 failing, with the 36 verified byte-for-byte identical BY TITLE to a
  pre-task baseline obtained by stashing and checking out c4bd655f3. All pre-existing.
  Both names flagged in point 5 turned out already correct (MockGCPJWTVerifier.setShouldVerify and the
  deployedActors fields) — only a structural nesting change, placing the new describe inside the existing
  outer one to reuse its fixture/snapshot hooks rather than duplicating them.
  NOTE for the final review: this repo's suite is substantially red at baseline (36 failures on dev-derived
  branches). That is the environment, not this branch.
Task 3: review (opus) — spec compliant; quality NEEDS FIXES. 1 Important (plan-mandated), 5 Minor.
  Reviewer traced the full path against IdentityRegistryKycImplV1:496-535 line by line: no bypass, no
  swallowed error, no value consumed before its own validation. All four config values guarded (three
  inline, _proverTee in the modifier). Padding assertion provably cannot reject a valid 40-char nonce
  (PackBytes carries 31 bytes/element, so 40 chars occupy chunks 0-1 with 22 bytes spare). Timestamp
  arithmetic and both inequality directions byte-identical to the reference. Slot-pinning test derives
  independently and the reviewer re-derived it in Node to confirm.
  Resolved both "cannot verify from diff" items: the baseline-equality and forge-inspect claims rest on the
  report, but the diff adds NO storage (the mapping landed in Task 2), so they are consistent; accepted.
  The untested decoder revert paths become Ruling 10 below.

Ruling 8 (Important, plan-mandated): the revocation access-control test uses bare `to.be.reverted`. My own
  global constraint said every revert test matches its error by name, and my brief's snippet then violated
  it. The reviewer found the repo already uses the named form in three other test files, and rebutted the
  implementer's rationale (the args are optional under revertedWithCustomError). FIX: assert
  AccessControlUnauthorizedAccount by name. This guards the only function that can retire a compromised
  prover key, so "something reverted" is the wrong assertion there.
  Cost if wrong: none — a strictly stronger assertion.

Ruling 9 (ELEVATING Minor 3 to the fix round): no address(0) guard on the decoded prover key. 40 ASCII
  '0' characters decode to address(0). Not reachable today — it needs a genuine attestation over an
  all-zeros eat_nonce. I am fixing it anyway because of the cost/consequence asymmetry: the mapping is
  consumed as an authorization oracle, and ecrecover returns address(0) for a malformed signature, so any
  consumer doing isRegisteredProverKey(ecrecover(...)) would have an auth bypass if address(0) were ever
  registered. One line against a bypass. Same shape as the enclave-side "empty string decodes to 0"
  finding earlier in this session.
  Cost if wrong: one redundant guard in a function that runs once per prover boot.

Ruling 10 (folding Minors 4 and 5 into the open round): the `nonce` option on the test's signals() helper
  is dead, so the decoder's revert paths reached THROUGH the hub are untested; and the freshness window is
  only exercised at +/-2h, meaning a window mistyped as `1 minutes` or `1 days` would pass every current
  assertion. Both are cheap and both pin properties currently held by inspection.
  Cost if wrong: three extra test cases.

Ruling 11 (parked): Minor 2, decode-and-store moved after the timestamp check, diverging from the
  reference's order. The new order is strictly better — validate before write — and matches my brief's own
  snippet. Parked as a deliberate, documented divergence rather than "fixed" back to the weaker order.
  Cost if wrong: a future reader diffing the two functions sees one ordering difference.

Task 3: minor (deferred): Minor 6 — IdentityVerificationHubImplV2 does not declare `is
  IIdentityVerificationHubV2`, so impl/interface signature drift compiles silently; and the interface is now
  half-populated (isRegisteredProverKey present, Task 2's four config views/setters absent). Reviewer
  hand-checked the three new declarations against the impl and they match. Deferring to the final review as
  a repo-wide consistency question, NOT pushing it into Task 4 which is a different repository.
Task 3: fix round 1/5 (Rulings 8+9+10 applied; commits 357a10dcc..39ba5d2b0) — 26 passing, run 3x, no flakes.
  Implementer found the +/-59m/61m boundary test was flaky against JS wall-clock and re-anchored it to the
  chain's own block timestamp instead of Date.now(). Good catch — a boundary test that drifts is worse than
  no boundary test.
Task 3: complete (commits c4bd655f3..39ba5d2b0, review clean after 1 fix round)
  Re-reviewer traced the zero-address test past every earlier check to confirm INVALID_PROVER_ADDRESS is
  what actually fires, and traced both decoder tests (38-char and 42-char nonces) to confirm they trip the
  decoder's own string reverts rather than the padding assertion. Final order: config -> proof -> root CA ->
  image -> padding -> timestamp -> decode -> zero-address guard -> write -> emit.
Task 3: minor (deferred): two of four boundary tests (-59m accept, +61m revert) retain a ~60s theoretical
  drift window between reading the chain timestamp and the tx mining. Immaterial on a local Hardhat node;
  relevant only if the suite ever moves to a slower or remote node.

Task 4: complete (commit 8f90adf..2335e47 in tee-prover-server, review clean — NO issues at any severity)
  Reviewer read the live index.ts rather than trusting the truncated diff hunk, and confirmed
  assertNonceBindsEnclaveKey builds `expected` via the same requestedNonces() helper that builds the
  request — so request and assertion cannot drift. It also grepped for a second Rust-side nonce builder and
  found src/server.rs:105's legacy ECDH `hello` nonce, correctly untouched and unrelated. Length arithmetic
  is clean: eat_nonce_0_b64_length is computed off the actual string, so 42->40 needed no change.
  COMMIT IS LOCAL, NOT PUSHED (Ruling 3 held).

ALL 4 TASKS COMPLETE. Proceeding to final whole-branch review.

## FINAL WHOLE-BRANCH REVIEW (opus) — verdict: READY TO MERGE WITH SMALL FIXES
No Critical. Upgrade safety independently established: reviewer recomputed all THREE ERC-7201 constants from
scratch (reproducing both pre-existing ones first to validate the method), confirmed forge inspect shows only
__gap@0 and AADHAAR_REGISTRATION_WINDOW@50, and confirmed no reachable namespace collision. All three spec
security properties verified against the FINAL code. Cross-repo selector match verified.

Ruling 12 (Important #2): @custom:version still 2.13.0. This repo's upgrade tooling reads it —
  tasks/upgrade/utils.ts:444 parses it and tasks/upgrade/upgrade.ts:294 hard-errors on "version matches
  current"; UPGRADE_GUIDE.md:44 makes bumping it step 2. Git history shows the convention is kept.
  FIX: bump to 2.14.0. Cost if wrong: a version number that later needs correcting; trivial.

Ruling 13 (Important #3 + #4 together, docs): the spec accepted config duplication with the mitigation
  "a rotation runbook must touch both contracts" — and no such runbook exists anywhere in contracts/. An
  accepted cost whose only mitigation is an unwritten document is an unmitigated cost. Worse, the reviewer
  found a real hazard it needs to cover: PCR0Manager has no notion of enclave ROLE, so if prover images are
  added to the same instance the KYC registry points at, a prover attestation replayed into
  registerPubkeyCommitment passes the image check — and that path has NO length assertion, so it would
  register the address value as a KYC pubkey commitment. Not an auth bypass (needs the KYC _tee key and a
  commitment preimage) but a garbage write, and it re-enters through shared image authority exactly the
  hazard the spec's hub-not-registry decision existed to remove.
  FIX: add a runbook section to contracts/UPGRADE_GUIDE.md covering (a) rotating _gcpRootCAPubkeyHash and
  _pcr0Manager in BOTH contracts, (b) the requirement that the hub use its OWN PCR0Manager instance holding
  only prover images and that prover digests never be added to the KYC instance, (c) the post-upgrade
  config-setting sequence. Both pointers are independently configurable, so the separation is free — but
  only if written down before someone reuses the existing instance for convenience.
  Cost if wrong: a documentation section that turns out over-cautious.

Ruling 14 (Minor 1 — elevating, because it was MUTATION-CHECKED): two tests in
  gcpJwtHelperAddress.test.ts use bare to.be.reverted, and the reviewer proved by mutation that deleting
  `if (idx != 40) revert(...)` leaves BOTH still passing — the zero-filled tail reaches _hexCharToValue(0)
  and reverts with "Invalid hex character" instead. So the guard those tests exist to pin is not pinned by
  them. FIX: name the expected revert strings. Cost if wrong: none, strictly stronger.

Ruling 15 (Minor 2): registerProverKey.test.ts:87 still uses bare to.be.reverted for the config-setter
  access-control case — the same class Ruling 8 declared must be fixed, missed because it was written in
  Task 2 while Ruling 8 was applied in Task 3. A seam between two per-task reviews. FIX.
  Cost if wrong: none.

Ruling 16 (Minor 3 — error naming, and this is the LAST FREE MOMENT): the 8 new errors use
  SCREAMING_SNAKE, imported from the KYC registry's style, while all 21 pre-existing errors in the hub use
  CapWords — and `ConfigNotSet` already exists there alongside my `PROVER_CONFIG_NOT_SET`. Error names
  determine ABI selectors, so this is free to change now and permanent after deploy.
  FIX: rename to CapWords matching the file they live in. Consistency within the file a reader is reading
  beats consistency with a file they are not.
  Cost if wrong: a rename that touches only this branch's own code and tests.

Ruling 17 (deferred): Minor 4 — the hub imports IGCPJWTVerifier/IPCR0Manager from the KYC *implementation*,
  compile-depending on it for two 5-line interfaces. Real, but the clean fix extracts shared interface files
  and those two interfaces are declared FOUR times across the registry impls. That is a repo-wide tidy-up,
  not this branch's business, and it adds no code size either way. Deferring.
  Cost if wrong: the coupling persists until someone does the extraction.

Final fix wave: COMPLETE (commits 39ba5d2b0..3990340b6, 4 commits — version bump, error rename, test
  pinning, runbook). 8/8 and 26/26 still passing.
  Item-3 mutation check WAS PERFORMED and reported with exact output: commenting out the idx != 40 guard
  produced 6 passing / 2 failing, both failures on the targeted tests with
  "Expected ... 'Nonce is not 40 hex characters', but it reverted with reason 'Invalid hex character'" —
  confirming the old bare assertions were falling through undetected. Guard restored, back to 8/8.
  Also confirmed IIdentityVerificationHubV2.sol declares no error selectors, so the rename had nothing to
  update there, and grepped repo-wide for leftover SCREAMING_SNAKE references.

Scoped re-review of fix wave: ALL 5 ADDRESSED, no new breakage. Reviewer grepped repo-wide for all 8
  SCREAMING_SNAKE forms (zero hits), confirmed the 21 pre-existing errors are byte-for-byte unchanged so no
  live ABI selector moved, independently re-derived item 3's mutation sensitivity from the code, and
  confirmed the runbook states the PCR0Manager separation as a security rule rather than tidiness.

BRANCH COMPLETE. 4 tasks + final review + fix wave + scoped re-review.
Companion commit 2335e47 in tee-prover-server is LOCAL AND UNPUSHED — must reach PR #36 before the `chain`
feature is ever flipped, or the enclave reverts on every registration.
