# AGENTS Instructions

## Development Workflow

### Prerequisites

- Install nargo via noirup (pin the version used in CI for reproducibility):
  - curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
  - noirup -v <noir_version>    # e.g., noirup -v v0.30.0
- Verify nargo is on the expected version:
  - nargo --version
- Ensure Rust toolchain is installed and up to date (required by nargo).
- From the repository root, run commands inside the `noir/` workspace unless otherwise noted.

## Pre-PR Checklist

Before creating a PR for noir circuits:

### Code Quality
- [ ] `nargo fmt` passes (formatting is correct)
- [ ] `nargo check -p <crate>` passes (compilation errors fixed)
- [ ] `nargo test -p <crate>` passes (all tests pass)
- [ ] `nargo build -p <crate>` succeeds (circuit builds correctly)

### Circuit-Specific Validation
- [ ] Zero-knowledge proof constraints are correct
- [ ] Public inputs/outputs properly defined
- [ ] No arithmetic overflow/underflow
- [ ] Circuit complexity is acceptable
- [ ] Security properties maintained

### AI Review Preparation
- [ ] Circuit logic documented with comments
- [ ] Mathematical operations explained
- [ ] Security assumptions clearly stated
- [ ] Performance implications noted

## Post-PR Validation

After PR creation:

### Automated Checks
- [ ] CI pipeline passes all stages
- [ ] No new compilation errors
- [ ] All tests pass across all crates
- [ ] Build artifacts generated successfully

### Circuit-Specific Checks
- [ ] Proof generation still works
- [ ] Verification passes for all test cases
- [ ] No constraint system changes break existing proofs
- [ ] Circuit size within acceptable limits

### Review Integration
- [ ] Address CodeRabbitAI feedback
- [ ] Resolve any security warnings
- [ ] Verify cryptographic properties
- [ ] Confirm no logical errors introduced

## Workflow Commands

### Pre-PR Validation
```bash
# Run all checks before PR
nargo fmt
nargo check -p <crate>
nargo test -p <crate>
nargo build -p <crate>
```

### Post-PR Cleanup
```bash
# After addressing review feedback
nargo fmt  # Fix any formatting issues
nargo test -p <crate>  # Ensure tests still pass
nargo check -p <crate> # Verify compilation
```

### Code Quality

For the best development experience:

```bash
# Format Noir files
nargo fmt

# Check for compilation errors
nargo check -p <crate>
```

### Building

- Run `nargo build --package <crate>` (`-p <crate>`) to compile a Noir circuit (requires nargo >= 0.31.0)
- Run `nargo build` to build all crates in the workspace

### Testing

- Run `nargo test -p <crate>` for each circuit crate in `crates/`
- Run `nargo test` to test all crates in the workspace

### Formatting

- Run `nargo fmt` to format all Noir files in the workspace
- To format files in a specific crate, change into that crate's directory and run:
  ```
  cd <crate>
  nargo fmt
  ```

### Pre-commit Checklist

Before committing your changes, ensure:

1. ✅ Code is properly formatted: `nargo fmt`
2. ✅ All tests pass: `nargo test`
3. ✅ Build succeeds: `nargo build`

## Notes

- This workspace contains multiple Noir circuit crates
- Use `-p <crate>` flag to target specific crates
- Noir files should be formatted with `nargo fmt` for consistency
