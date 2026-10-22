# Verifying Turkish reference presets

The opt-in snapshot is [`src/presets/tr-2026.ts`](../src/presets/tr-2026.ts); its `asOf` field records the last completed source review. This guide does not certify that rates remain current and is not legal, tax or financial advice. Verify applicability for the particular transaction with qualified professionals. Calculation functions must remain independent of statutory defaults.

## Official sources

- [GİB deed fee information](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Finfografikler%2Fpdfs%2Ftapuharci.pdf): check the separate parties, base and applicable provisions of Law 492, tariff (4), item 20/a.
- [Ministry of Trade real estate trade regulation](https://eskisehir.ticaret.gov.tr/data/64edb08513b876171c69c106/TA%C5%9EINMAZ%20T%C4%B0CARET%C4%B0%20HAKKINDA%20Y%C3%96NETMEL%C4%B0K%20.pdf): check Article 20, the total brokerage ceiling excluding VAT, and allocation by agreement.
- [GİB VAT rate reference](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fkdv-oranlari.pdf): check Decision 7346 and later amendments, effective dates and applicability to brokerage services.
- [Official Gazette](https://www.resmigazete.gov.tr/) and [Legislation Information System](https://www.mevzuat.gov.tr/): check for amendments newer than the linked explanatory PDFs. A hosted PDF may itself be stale.

## Verification checklist

- [ ] Open the official sources and check amendments, publication dates, effective dates and transitional provisions. Record the review date and evidence in the change description; do not copy personal transaction records.
- [ ] Verify the deed base and separate buyer/seller charges, the total brokerage ceiling, its VAT treatment and allocation assumptions. A ceiling is not a compulsory charge.
- [ ] Verify applicability and exemptions with a qualified professional. Keep fixed charges quote-driven; zero means not estimated. BSMV/KKDF modeling defaults do not establish exemptions.
- [ ] Keep statutory values only in the dated preset module. For a new year's snapshot add a separately dated module rather than silently replacing an old snapshot's meaning; retain existing exports for compatibility.
- [ ] Update `asOf` only after review, including when the verified values remain unchanged. Preserve applicability caveats and source comments. Update both README warnings, web locale notices and exports if relevant.
- [ ] Add independently calculated regression cases for any changed results; explain changed assumptions and dates in `CHANGELOG.md`.
- [ ] Run `npm run check` and `npm run test:smoke`; manually verify preset opt-in, both languages and preservation of entered fixed-charge quotes.

## Freshness guard

`tests/calculations.test.ts` compares the real current UTC day to `asOf` plus the clearly commented `PRESET_MAX_AGE_MONTHS = 18` calendar-month policy. The boundary day passes; the following day fails. There are no network calls in tests. The clock is not a pinned fixture: CI eventually fails if nobody reviews the snapshot. Do not disable the test, advance a fake clock or change the policy merely to make it pass. Follow the checklist and record the verification instead. Passing freshness checks does not prove legal correctness.
