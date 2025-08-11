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
