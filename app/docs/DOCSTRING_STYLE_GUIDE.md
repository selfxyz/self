# Mobile app docstring style guide

Docstrings for the React Native app live alongside the source in `app/src`. We follow [TSDoc](https://tsdoc.org) conventions so that typed tooling can generate consistent API documentation.

## Authoring guidelines

- Document every exported component, hook, utility, or type alias with a leading `/** ... */` block written in the imperative mood.
- Include `@param`, `@returns`, and `@remarks` tags when they improve clarity, especially for side-effects or platform-specific behaviour.
- Keep examples concise. Prefer inline code blocks for short snippets and use fenced blocks only when you need multiple lines.
- Mention platform differences explicitly (for example, “iOS only”) so consumers understand the scope of the implementation.

## Coverage expectations

Docstring coverage can be checked locally by running `yarn docstrings:app` (or `yarn docstrings` for both app and SDK). The reports generate JSON snapshots in `docs/coverage/*.json` that can be committed to track progress over time. Coverage targets are not enforced—treat the reports as guardrails to identify documentation gaps.
