# Changelog

## 0.1.0 — 2026-10-22

### Added

- Gross/net rental yields, rent-only payback with optional annual growth, fixed-rate mortgage amortization, itemized purchase costs, Fisher real return, price-per-square-metre comparison and a simple rent-versus-buy cost model.
- Safe-integer kuruş inputs, exact decimal charge rounding, explicit validation and typed ESM exports for Node.js 20+ with no runtime dependencies.
- Opt-in Turkish reference rates dated 2026-10-22 with official source links and applicability warnings.
- Framework-free English/Turkish static calculator with theme switching, accessible forms, keyboard tabs and a monthly mortgage table.
- Numerical, validation, boundary, rounding and DOM tests; Vitest coverage configuration; dependency-free compiled-package smoke checks.
- English/Turkish documentation, MIT license, staged secret-scan hook, CI matrix and a main-push-only GitHub Pages workflow.

### Validation note

The initial development environment blocked npm installation (`ENOTCACHED`). Vitest, ESLint, coverage and the esbuild web build require dependency installation before their results can be verified. See the delivery report for checks actually executed; configured coverage thresholds are not a measured coverage claim.
