# Proof of Passport Circuits

Proof of Passport circuits verify signatures of passport-emitting authorities.

🚧 under heavy development 🚧

#### Requirements

Install `circom` and `nodejs v18`

#### Installation

```bash
yarn
```

#### Build circuits (dev only, not secure)

```bash
./scripts/build_circuit.sh
```

#### Run tests

```bash
yarn test
```

This will run tests with sample data generated on the fly.

To run tests with your own passport data, extract your `passportData.json` using the app (available soon), place it in `inputs/`, then run `yarn test`
