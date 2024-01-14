# Circom examples

 Example circuits written in Circom used for testing. One basic, multiplier2, and another one slightly more involved, keccak256. The former is a good minimal circuit to test things end to end. The latter is useful for benchmarking.

 To compile circuits, run `./scripts/compile.sh <directory> <circom-circuit>`. For example, `./scripts/compile.sh multiplier2 multiplier2.circom`.

 To run a trusted setup, run `./scripts/trusted_setup.sh <ptau> <circuit-name>`. For example, `./scripts/trusted_setup.sh multiplier2 08 multiplier2`.

Both of these actions are done as part of the `./scripts/prepare.sh` script in the root directory `multiplier2` and `keccak256`.