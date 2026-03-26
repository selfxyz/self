# WebView Workstream

**Current pass: faithful 1:1 Euclid screen migration with temporary mocked
states.** Production logic (provider SDK, KYC persistence, proving-machine
wiring, lifecycle callbacks) is a future follow-up by another team.

- [Workstream Spec](./SPEC.md)
- [Screen Inventory](./SCREEN-INVENTORY.md)
- [Ticket Plan](./TICKET-PLAN.md)

Use the inventory as the source of truth for scope and counts. Use the ticket
plan to stage spec work, candidate tickets, and PR slices before creating
Linear issues.

## Execution order

1. **Screen migration** (current) — WV-09, WV-12, then WV-13–WV-16
2. **Tunnel flow** (next) — WV-05, WV-06, WV-08 (real Didit + KYC + proving)
3. **Disclose** — WV-11 (real proving on the main disclose route)
4. **Social login** — not yet spec'd in this workstream
5. **Launch readiness** — not yet spec'd in this workstream
