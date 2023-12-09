# Proof of Passport

![DALL·E 2023-10-25 11 57 47 - tight AF](https://github.com/zk-passport/proof-of-passport/assets/62038140/514ae671-3c02-434f-ac6a-31ce20eec24d)

Monorepo for the Proof of Passport protocol.

Proof of Passport lets users scan the NFC chip in their government-issued passport and prove the correctness of the signature in a zk-SNARK.
This unlocks two interesting perspectives:
- For sybil-resistance, proof of passport can provide a reliable while not universal source of unique identity.
- For identity and privacy, proof of passport allows selective disclosure of private data. For instance, users can disclose their nationality or their date of birth without revealing any other private information.

As a first application, users who can prove they indeed hold a valid passport can verify this proof on-chain to mint a Soulbound Token (SBT).


### Subdirectories

- `app`: Mobile app
- `circuits`: Circom circuits
- `contracts`: Solidity contracts

### Roadmap

- ✅ Basic passport verifier circuit
- 🚧 Optimization
- 🚧 Selective disclosure
- ✅ Basic react native frontend
- ✅ Passport verification pipeline, android
- 🚧 Passport verification pipeline, iOS
- 🚧 Contracts
- 🚧 On-chain registry of CSCA pubkeys based on the official ICAO masterlist
