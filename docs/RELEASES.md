# Mobile App Release Process

This project uses **semantic-release** to handle versioning and changelog generation for the mobile app located in the `app` directory. Automated releases via GitHub Actions are currently disabled while we evaluate a manual approach.

## Commit Message Conventions

Changes must follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. The most common prefixes are:

- `feat:` for new features
- `fix:` for bug fixes
- `perf:` for performance improvements
- `docs:` for documentation only
- `deps:` for dependency updates
- `refactor:` for internal refactoring
- `build:` for build system updates
- add `!` or use `BREAKING CHANGE:` in the commit body for breaking changes

Only commits that affect the app will influence the release. Other commit types such as `chore`, `style`, `ci` and `test` are ignored for versioning.

## Triggering a Release

For now releases are triggered manually. Run the following from the `app` directory:

```sh
yarn release
```

The bundled semantic-release process performs the following steps:

1. Determines the next version based on commit messages.
2. Updates `app/CHANGELOG.md` and `app/package.json`.
3. Creates a git tag in the format `app-v<version>`.
4. Publishes GitHub release notes using `.github/release-template.md`.

You can also trigger the **Release Mobile App** workflow manually from the GitHub Actions tab once the automated flow is re-enabled.

## Customising the Changelog

The changelog is generated with `.github/changelog-template.hbs`. Sections are grouped by commit type and follow Keep a Changelog style. Feel free to adjust the template or update `app/release.config.js` to change the behaviour.

