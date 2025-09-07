![Self Developers horizontal](https://github.com/user-attachments/assets/14c33806-9549-4eee-a2b2-bcfcf873ae80)

Monorepo for Self.

Self is an identity wallet that lets users generate privacy-preserving proofs from government-issued IDs such as passports and ID cards.
By scanning the NFC chip in their ID document, users can prove their validity while only revealing specific attributes such as age, nationality or simply humanity.
Under the hood, Self uses zk-SNARKs to make sure personal data is redacted, but the document is verified.

Use cases unlocked include:

- **Airdrop protection**: Protect a token distribution from bots
- **Social media**: Add humanity checks to user's profiles
- **Quadratic funding**: Prevent farmers from skewing rewards
- **Wallet recovery**: Safeguard assets using IDs as recovery sources
- **Compliance**: Check a user is not part of a sanctioned entity list

Currently, Self supports electronic passports and biometric ID cards following the ICAO standards. Support for new identity documents is on the way!

[Checkout the docs](https://docs.self.xyz/) to add Self to your project.

## FAQ

#### Is my passport supported?

Biometric passports have the [biometric passport logo](https://en.wikipedia.org/wiki/Biometric_passport) on their front cover.
Checkout our [coverage map here](http://map.self.xyz/).

#### What can I request/prove with Self?

When a country issues a passport or a compliant ID document, they sign datagroups that include at least:

- First and last name
- Nationality
- Date of birth
- Gender
- Expiration date
- Passport number
- Photo

Applications are able to request each of those data points.

#### What is the signature algorithm ?

Countries use different signature algorithms to sign ID documents. Check out our [coverage map](http://map.self.xyz/) to see which.

#### Where can I find the countries' public keys ?

The main list of public keys can be downloaded from the [ICAO website](https://download.pkd.icao.int/). We use multiple lists published by different ICAO members.

#### What's the ICAO ?

The International Civil Aviation Organization (ICAO) is a specialized agency of the United Nations. Among other things, they establish the specifications for passports, that have to be followed by all countries. The full passport specs are available [here](https://www.icao.int/publications/pages/publication.aspx?docnum=9303).

## Project Ideas

- Combine Self with other identification mechanisms as in [Vitalik's pluralistic identity regime](https://vitalik.eth.limo/general/2025/06/28/zkid.html).
- Help adding support for other identity documents to Self, such as [Aadhaar](https://github.com/anon-aadhaar), [Japan's my number cards](https://github.com/MynaWallet/monorepo) or [Taiwan DID](https://github.com/tw-did/tw-did/).
- Build a social network/anonymous message board for people from one specific country.
- Create a sybil-resistance tool to protect social networks against spambots.
- Build an airdrop farming protection tool.
- Allow DeFi protocols to check if the nationality of a user is included in a set of forbidden states.
- Gate an adult content website to a specific age.
- Create a petition system or a survey portal.
- Passport Wallet: use [active authentication](<https://en.wikipedia.org/wiki/Biometric_passport#:~:text=Active%20Authentication%20(AA),Using%20AA%20is%20optional.>) to build a wallet, a multisig or a recovery module using passport signatures

We provide bounties for new and interesting applications using Self.

## Development Setup

This project requires **Node.js 22.x**. Use the included `.nvmrc` to match the version.

Run `yarn install` to bootstrap dependencies and husky hooks.
Gitleaks will scan staged changes on each commit via `yarn gitleaks`.

## Development Documentation

For detailed development patterns and conventions, see:

- **[Development Patterns](docs/development-patterns.md)** - React Native architecture, navigation, state management, and code organization
- **[Testing Guide](docs/testing-guide.md)** - Jest configuration, mock patterns, testing strategies, and E2E testing
- **[NFC Implementation](docs/nfc-implementation.md)** - Cross-platform NFC passport reading, authentication methods, and error handling

These guides provide comprehensive context for AI-assisted development with ChatGPT Codex, Cursor, and CodeRabbit AI.

## Contributing

We are actively looking for contributors. Please check the [open issues](https://github.com/selfxyz/self/issues) if you don't know where to start! We offer bounties for significant contributions.

> **Important:** Please open your pull request from the `staging` branch. Pull requests from other branches will be automatically closed.

## Contact us

[Contact us](https://t.me/selfprotocolbuilder) on telegram for feedback or questions.

Thanks [Rémi](https://github.com/remicolin), [Florent](https://github.com/0xturboblitz), [Ayman](https://github.com/Nesopie), [Justin](https://github.com/transphorm), [Seshanth](https://github.com/seshanthS), [Nico](https://github.com/motemotech) and all other contributors for building Self.

Thanks [Aayush](https://twitter.com/yush_g), [Vivek](https://twitter.com/viv_boop), [Andy](https://twitter.com/AndyGuzmanEth) and [Vitalik](https://github.com/vbuterin) for contributing ideas and inspiring us to build this technology, and [PSE](https://pse.dev/) for supporting the initial work through grants!
