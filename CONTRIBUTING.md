# Contributing

Use Node.js 20 or newer and npm. Keep changes focused, typed, dependency-free at runtime, and free of network calls. All fixtures must be generated or clearly fictional. Never include real identity numbers, contact details, bank accounts, names, addresses, financial records or secrets in code, tests, issues or screenshots.

## Local workflow

```sh
npm ci --ignore-scripts
git config core.hooksPath .githooks
npm run check
npm run test:smoke
git diff --check
```

The hook scans added staged content for common secret patterns and rejects private key/environment files. A whole-tree scan is also included in `npm run check`. Pattern scanning is a safeguard, not proof that content is safe; inspect every staged diff yourself. Do not disable the hook to commit rejected content. You can enable it per commit without changing local Git settings with `git -c core.hooksPath=.githooks commit ...`.

Before opening a pull request:

- Add independently calculated numeric examples (show the arithmetic in comments), valid and invalid input cases, and edge/rounding tests for each behavior change. Assert cash-flow reconciliation when schedules change.
- Run `npm run check` and `npm run test:smoke`. Coverage output is in `coverage/index.html` (or the provider's nested HTML directory) and `coverage/lcov.info`.
- Preview `web/dist` after `npm run build:web`. Check both languages, keyboard use, narrow screens, both themes and validation errors. Financial inputs must remain in memory only.
- Keep `README.md`, `README.tr.md`, both locale files and the changelog consistent. Explain assumptions in ordinary language.
- Use small English Conventional Commits, for example `feat: add a cost breakdown` or `test: cover final payment rounding`.

CI uses the committed lockfile with `npm ci --ignore-scripts`. If installation is unavailable, report the exact failed command. Do not claim that Vitest, lint or coverage passed based on smoke tests.

## Reference presets

Legal and tax rates belong only in dated `src/presets/` modules, never in calculation functions. Include primary-source links, the snapshot date, applicability caveats and a reminder to verify. A ceiling is not a compulsory charge. A zero placeholder is not an exemption. Discuss any change to money units, rounding or economic assumptions explicitly; these are API behavior changes.

Follow the [rate verification checklist](docs/rates-update.md). The freshness test allows at most 18 calendar months after the preset's verified date; advancing the date requires checking sources again.

CI runs on Ubuntu with Node 20, 22 and 24 and Windows with Node 22. The Pages workflow runs only after a push to `main`; changing documentation or opening a PR does not deploy a site. Do not include credentials in workflow files or client code.

## Releasing

The maintainer performs releases. The [publish workflow](.github/workflows/publish.yml) uses Node 24 with npm 11 (npm must be at least 11.5.1 for [trusted publishing](https://docs.npmjs.com/trusted-publishers/)). Configure the package's npm trusted publisher for owner `YusufBeratZengin`, repository `emlak-hesap`, workflow `publish.yml`, and GitHub environment `npm`. Create that environment in GitHub, restrict it to release tags and configure any required reviewers. Publishing requires `contents: read` and `id-token: write` only. No npm token is configured in the default workflow.

For the first release, if the npm package does not exist and trusted publishing cannot yet be configured, perform the initial publication from an authenticated maintainer session, then configure the trusted publisher for later tags. Do not assume the npm install command or version badge works before that first publication.

1. Verify any preset changes against official sources. Update both READMEs and move the relevant `[Unreleased]` notes into a dated SemVer release section in `CHANGELOG.md`.
2. Update the version in both `package.json` and `package-lock.json` (for example `npm version 0.1.1 --no-git-tag-version`). Keep `0.x` until the API is stable and has two real-world uses. Breaking changes before 1.0 increment the minor version.
3. Run `npm run check`, `npm run test:smoke`, `npm pack --dry-run`, `npm publish --dry-run`, `npx publint` and `npx @arethetypeswrong/cli --pack`. Inspect the package contents and generated web calculator. Packaging lint is initially advisory in CI; resolve findings before a release.
4. Review the diff and commit using `chore(release): vX.Y.Z`. Create `git tag vX.Y.Z`, where the tag exactly matches `package.json`.
5. When ready to publish, the maintainer pushes the release commit and tag. The tag triggers `npm ci`, the full checks, compiled examples, a tag/version comparison and `npm publish --provenance --access public`. Confirm the npm version, provenance and workflow result afterward.

Only if OIDC is unavailable, use a narrowly scoped, short-lived npm publishing token stored as GitHub environment secret `NPM_TOKEN`. Add `env: { NODE_AUTH_TOKEN: '${{ secrets.NPM_TOKEN }}' }` to the publish step. Never place its value in a file, log, issue or commit. Remove this fallback once trusted publishing is available. An existing npm version cannot be overwritten; correct failures before selecting a new version and tag. Never rewrite a published tag.

## Community and reporting

- Follow the [Contributor Covenant 2.1 code of conduct](CODE_OF_CONDUCT.md).
- Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md); the maintainer must enable private reporting in repository settings.
- Use the [bug report](.github/ISSUE_TEMPLATE/bug_report.yml) or [feature request](.github/ISSUE_TEMPLATE/feature_request.yml) form. [Issue configuration](.github/ISSUE_TEMPLATE/config.yml) disables blank issues and links to security reporting.
- Complete the [pull request checklist](.github/PULL_REQUEST_TEMPLATE.md), including tests, changelog and privacy review.
