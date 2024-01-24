# mopro-core

Core mobile Rust library. For FFI, see `mopro-ffi` which is a thin wrapper for exposing UniFFI bindings around this library.

## Overview

TBD.

## Examples

Run `cargo run --example circom`. Also see `examples/circom/README.md` for more information.

## Build dylib

Experimental support.

Turns `.wasm` file into a dynamic library (`.dylib`).

Run:

`cargo build --features dylib`

After that you'll see location of the dylib file:

```
warning: Building dylib for aarch64-apple-darwin
warning: Dylib location: /Users/user/repos/github.com/oskarth/mopro/mopro-core/target/debug/aarch64-apple-darwin/keccak256.dylib
```

Right now this is hardcoded for `rsa`.

Note that:
- It has to be built for the right architecture
- Have to run `install_name_tool` to adjust install name
- Run `codesign` to sign dylib for use on iOS

### Script

Add third argument: `dylib`:

`./scripts/update_bindings.sh device release dylib`

Note that `APPLE_SIGNING_IDENTITY` must be set.

## To use ark-zkey

Experimental support for significantly faster zkey loading. See `../ark-zkey` README for how to build arkzkey.