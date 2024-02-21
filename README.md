![DALL·E 2023-10-25 11 57 47 - tight AF](https://github.com/zk-passport/proof-of-passport/assets/62038140/514ae671-3c02-434f-ac6a-31ce20eec24d)

Monorepo for the Proof of Passport protocol.

Proof of Passport lets users scan the NFC chip in their government-issued passport and prove the correctness of the signature in a zk-SNARK.
This unlocks two interesting use cases:
- For sybil-resistance, proof of passport can provide a source of unique identity.
- For identity and privacy, proof of passport allows selective disclosure of private data. For instance, users can disclose their nationality or their date of birth without revealing any other private information.

As a first application, users who can prove they indeed hold a valid passport can verify this proof on-chain to mint a Soulbound Token (SBT).

## Subdirectories

- `app`: Mobile app
- `circuits`: Circom circuits
- `contracts`: Solidity contracts
- `common`: Common utils

## Roadmap

- ✅ Basic passport verifier circuit
- ✅ Selective disclosure
- ✅ Basic react native frontend
- ✅ Passport verification pipeline, android
- ✅ Passport verification pipeline, iOS
- ✅ Contracts
- ✅ On-chain registry of CSCA pubkeys based on the official ICAO masterlist
- 🚧 Optimizations
- 🚧 Reimplementation of the passport NFC specs in javascript

## FAQ

#### Does my passport support Proof of Passport ?

![EPassport_logo_grey](https://github.com/zk-passport/proof-of-passport/assets/62038140/c3263600-19b6-45f9-9b5f-63f352992c88)

If it has this symbol on the front cover, yes.

#### What exactly is being signed ?

The circuit looks like this:

<p align="center">
  <img src="https://github.com/zk-passport/proof-of-passport/assets/62038140/593e6530-6ce1-4468-b088-b8defc512de8" width="50%" height="50%">
</p>

Most of the data of interest is in the Datagroup 1, which contains the following info:
- First name
- Last name
- Nationality
- Date of birth
- Gender
- Expiration date of passport
- Passport number

This goes through a bunch of hashes, concatenations with other data, and then is signed. By verifying the signature, we can make sure the personnal information cannot be altered.

#### What is the signature algorithm ?

Most countries use RSA with sha256 but some of them use other signature algorithms like ECDSA and other hash functions like SHA-512. You can find a summary of the signature algorithm used [here](https://github.com/zk-passport/modulus-extractooor/blob/main/signature_algorithms.json)

#### I just read my passport but it says my signature algorithm is not implemented. What do I do ?

Currently we only support the most common one `SHA256withRSA`. We will support the others shortly. Feel free to try your hand at implementing one!

#### What's the ICAO ?

The International Civil Aviation Organization (ICAO) is a specialized agency of the United Nations. Among other things, it establishes the specifications for passports, that have to be followed by all countries. The full passport specs are available [here](https://www.icao.int/publications/pages/publication.aspx?docnum=9303).

#### Where can I see those public keys ?

You can download the full list of public keys on the [ICAO website](https://download.pkd.icao.int/), in the strange `.ldif` format. The parsed list is [here](https://github.com/zk-passport/modulus-extractooor/blob/main/publicKeysParsed.json)

#### What can be proven ?

Here is all that can be proven:

<p align="center">
  <img src="https://github.com/zk-passport/proof-of-passport/assets/62038140/84ff70d2-1d82-4bee-9b57-d10c2d53f00a" width="70%" height="70%">
</p>

Note that we can't access DG3 and DG4 which are optional fingerprint and iris scan without government authorization.

#### Even the photo is signed ?!

Yep. Currently we don't use it. If you have an idea of some fun zkml to do with it, let us know!

#### When I mint a Proof of passport SBT, what prevents someone else to frontrun my transaction ?

The SBT circuit includes a commitment to your address. If someone else tries to mint it, they will mint it to your address.

## Project Ideas

- Integrate Proof of Passport to Gitcoin passport or a similar system to allow better sybil resistance in quadratic funding
- Combine with other sources of identity to provide quantified levels of uniqueness, [totem](https://github.com/0xturboblitz/totem)-style. Examples can be [anon aadhaar](https://github.com/privacy-scaling-explorations/anon-aadhaar), [Japan's my number cards](https://github.com/MynaWallet/monorepo) or [Taiwan DID](https://github.com/tw-did/tw-did/)
- Add Proof of Passport as a [Zupass](https://github.com/proofcarryingdata/zupass) PCD
- Build a social network/anonymous message board for people from one specific country
- Create a sybil-resistance tool to protect social networks against spambots
- Do an airdrop farming protection tool
- Allow DeFi protocols to check if the nationality of a user is included in a set of forbidden states
- Gate an adult content website to a specific age
- Create a petition system or a survey portal
- Use for proof of location using place of birth and/or address
- Passport Wallet: use [active authentication](https://en.wikipedia.org/wiki/Biometric_passport#:~:text=Active%20Authentication%20(AA),Using%20AA%20is%20optional.) to build a wallet, a multisig or a recovery module using passport signatures

We will provide bounties for all those applications. Those are not fixed right now, so please contact us if you're interested.

## Licensing

Everything we write is MIT licensed. Circom and circomlib are GPL tho.

## Contributing

We are actively looking for contributors. Please check the [open issues](https://github.com/zk-passport/proof-of-passport/issues) if you don't know were to start! We will provide bounties starting from $100 for any significant progress on these. Please contact us for more details.

## Contact us

Contact me @FlorentTavernier on telegram for any feedback.

Thanks to [Rémi](https://github.com/remicolin), [Youssef](https://github.com/yssf-io), [Aayush](https://twitter.com/yush_g), [Andy](https://twitter.com/AndyGuzmanEth), [Vivek](https://twitter.com/viv_boop), [Marcus](https://github.com/base0010) and [Andrew](https://github.com/AndrewCLu) for contributing ideas and helping build this technology, and to [EF PSE](https://pse.dev/) for supporting this work through grants!
