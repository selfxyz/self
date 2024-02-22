# ark-zkey

Library to read `zkey` faster by serializing to `arkworks` friendly format.

See https://github.com/oskarth/mopro/issues/25 for context.

## How to use

Run the following to convert a `zkey` to an `arkzkey`. This should be done as a pre-processing step.

`cargo run --bin arkzkey-util --release -- ../mopro-core/examples/circom/keccak256/target/keccak256_256_test_final.zkey`

This will generate and place an `arkzkey` file in the same directory as the original zkey.

You can also install it locally:

`cargo install --bin arkzkey-util --path . --release`

## Tests

```
cargo test multiplier2 --release -- --nocapture
cargo test keccak256 --release -- --nocapture
cargo test rsa --release -- --nocapture
```

## Benchmark (Keccak)

`cargo test keccak256 --release -- --nocapture`

```
[build] Processing zkey data...
test tests::test_keccak256_serialization_deserialization has been running for over 60 seconds
[build]Time to process zkey data: 158.753181958s
[build] Serializing proving key and constraint matrices
[build] Time to serialize proving key and constraint matrices: 42ns
[build] Writing arkzkey to: ../mopro-core/examples/circom/keccak256/target/keccak256_256_test_final.arkzkey
[build] Time to write arkzkey: 16.204274125s
Reading arkzkey from: ../mopro-core/examples/circom/keccak256/target/keccak256_256_test_final.arkzkey
Time to open arkzkey file: 51.75µs
Time to mmap arkzkey: 17.25µs
Time to deserialize proving key: 18.323550083s
Time to deserialize matrices: 46.935792ms
Time to read arkzkey: 18.3730695s
test tests::test_keccak256_serialization_deserialization ... ok
```

Vs naive:

`[build] Time to process zkey data: 158.753181958s`

**Result: 18s vs 158s**