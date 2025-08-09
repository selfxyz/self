# AGENTS Instructions

## Development Workflow

### Code Quality

For the best development experience:

```bash
# Format Noir files
nargo fmt

# Check for compilation errors
nargo check -p <crate>
```

### Building

- Run `nargo build -p <crate>` to compile a Noir circuit
- Run `nargo build` to build all crates in the workspace

### Testing

- Run `nargo test -p <crate>` for each circuit crate in `crates/`
- Run `nargo test` to test all crates in the workspace

### Formatting

- Run `nargo fmt` to format all Noir files in the workspace
- Run `nargo fmt -p <crate>` to format files in a specific crate

### Pre-commit Checklist

Before committing your changes, ensure:

1. ✅ Code is properly formatted: `nargo fmt`
2. ✅ All tests pass: `nargo test`
3. ✅ Build succeeds: `nargo build`

## Notes

- This workspace contains multiple Noir circuit crates
- Use `-p <crate>` flag to target specific crates
- Noir files should be formatted with `nargo fmt` for consistency
