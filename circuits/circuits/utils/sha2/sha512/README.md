
SHA2-512 implementation in circom
---------------------------------

- `sha512_compress.circom`: inner loop of the compression functions
- `sha512_schedule.circom`: the "message schedule", where the message chunk is 1024 bits
- `sha512_round_const.circom`: the round constants (they are the same for SHA384 too)
- `sha512_initial_value.circom`: the hash initialization vector
- `sha512_rounds.circom`: the `n`-round compression function, where the hash state is 512 bits
- `sha512_padding.circom`: the padding (it's the same for SHA384 too)
- `sha512_hash_chunk.circom`: hash of a chunk (1024 bits), without applying any padding
- `sha512_hash_bits.circom`: SHA512 hash of a sequence of bits
- `sha512_hash_bytes.circom`: SHA512 hash of a sequence of bytes
