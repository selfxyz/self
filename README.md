![Github banner (2)](https://github.com/user-attachments/assets/e182b110-94a2-47b5-9875-48e1736fa923)

Monorepo for Self.

Self is an identity wallet that lets users generate privacy-preserving proofs from government-issued IDs such as passports.
By scanning the NFC chip in their ID document, users can prove their validity while only revealing specific attributes such as age, nationality or simply humanity.
Under the hood, Self uses zk-SNARKs to make sure personal data is redacted, but the document is verified.

Use cases unlocked include:
- **Airdrop protection**: Protect a token distribution from bots
- **Social media**: Add humanity checks to user's profiles
- **Quadratic funding**: Prevent farmers from skewing rewards
- **Wallet recovery**: Safeguard assets using IDs as recovery sources
- **Compliance**: Check a user is not part of a sanctioned entity list

## FAQ

#### Is my passport supported?

Checkout our [coverage map here](https://map.openpassport.app/)

#### What exactly is being signed ?

When a country issues a passport, they sign datagroups that include at least:
- First name
- Last name
- Nationality
- Date of birth
- Gender
- Expiration date
- Passport number
- Photo

#### What is the signature algorithm ?

Countries use different signature algorithms to sign passports. Check out our [coverage map](https://map.openpassport.app/) to see which~

#### I just read my passport but it says my signature algorithm is not implemented. What do I do ?

Not all signature algorithms are currently supported. To help us add support for yours, please contact us.

#### Where can I find the countries' public keys ?

You can download the full list of public keys on the [ICAO website](https://download.pkd.icao.int/). Our parsed list is at [`/registry`](https://github.com/zk-passport/openpassport/tree/main/registry).

#### What's the ICAO ?

The International Civil Aviation Organization (ICAO) is a specialized agency of the United Nations. Among other things, they establish the specifications for passports, that have to be followed by all countries. The full passport specs are available [here](https://www.icao.int/publications/pages/publication.aspx?docnum=9303).

## Project Ideas

- Integrate Self to Gitcoin passport or a similar system to allow better sybil resistance in quadratic funding
- Combine with other sources of identity to provide quantified levels of uniqueness, [totem](https://github.com/0xturboblitz/totem)-style. Examples can be [anon aadhaar](https://github.com/privacy-scaling-explorations/anon-aadhaar), [Japan's my number cards](https://github.com/MynaWallet/monorepo) or [Taiwan DID](https://github.com/tw-did/tw-did/)
- Add Self as a [Zupass](https://github.com/proofcarryingdata/zupass) PCD
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

We are actively looking for contributors. Please check the [open issues](https://github.com/zk-passport/openpassport/issues) if you don't know were to start! We will offer bounties from $100 to $1000 for any significant progress on these, depending on difficulty.

## Contact us

Contact me [@FlorentTavernier](https://t.me/FlorentTavernier) on telegram for any feedback or questions.

Thanks [Rémi](https://github.com/remicolin), [Youssef](https://github.com/yssf-io), [Aayush](https://twitter.com/yush_g), [Andy](https://twitter.com/AndyGuzmanEth), [Vivek](https://twitter.com/viv_boop) and [Andrew](https://github.com/AndrewCLu) for contributing ideas and helping build this technology, and [PSE](https://pse.dev/) for supporting this work through grants!
