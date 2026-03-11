# NFCPassportReader Distribution Strategy

> Last updated: 2026-03-10
> Status: Ready

- Workstream: native-shells
- Backlog IDs: NS-09
- Owner: Native Shells
- Branch: TBD
- PR: TBD

## Goal

Make `self-sdk-swift` consumable by external iOS host apps. The blocker is the private `NFCPassportReader` fork dependency.

## Problem

`self-sdk-swift/Package.swift` depends on `git@github.com:selfxyz/NFCPassportReader.git` (SSH, private fork). Any external consumer needs GitHub SSH access to the selfxyz org to resolve this dependency. MiniPay (or any host app outside the org) can't build without it.

## Options

| Option                                                | Effort | Trade-off                                                                       |
| ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| Make the fork public                                  | Low    | Exposes fork changes; may have upstream license implications to check           |
| Vendor NFCPassportReader source into `self-sdk-swift` | Medium | No external dependency; increases repo size; must manually sync upstream        |
| Pre-build NFCPassportReader as XCFramework binary     | Medium | Consumers get a binary; but adds a build/release step for the dependency itself |
| Switch Package.swift to HTTPS + access token          | Low    | Still requires credentials; doesn't solve the external consumer problem         |

## Recommendation

Make the fork public unless there's a specific reason it's private. Lowest effort, solves the problem completely.

## Scope

1. Decide on approach (decision, not code).
2. Execute the chosen option.
3. Validate: `self-sdk-swift` resolves from a clean environment without org SSH credentials.

## Definition of Done

- [ ] An external iOS consumer can resolve all `self-sdk-swift` dependencies without selfxyz org credentials
