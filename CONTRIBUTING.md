# Contributing

Use Node.js 20 or newer and npm. Keep changes focused, typed, dependency-free at runtime, and free of network calls. All fixtures must be generated or clearly fictional. Never include real identity numbers, contact details, bank accounts, names, addresses, financial records or secrets in code, tests, issues or screenshots.

## Local workflow

```sh
npm install
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

The project currently uses `npm install` in CI. If dependency installation is unavailable, still write complete tests and report the exact failed command. Do not claim that Vitest, lint or coverage passed based on smoke tests. After installation becomes available, run the full checks and commit the generated `package-lock.json` to support a switch to `npm ci`.

## Reference presets

Legal and tax rates belong only in dated `src/presets/` modules, never in calculation functions. Include primary-source links, the snapshot date, applicability caveats and a reminder to verify. A ceiling is not a compulsory charge. A zero placeholder is not an exemption. Discuss any change to money units, rounding or economic assumptions explicitly; these are API behavior changes.

CI runs on Node 20, 22 and 24. The Pages workflow runs only after a push to `main`; changing documentation or opening a PR does not deploy a site. Do not include credentials in workflow files or client code.
