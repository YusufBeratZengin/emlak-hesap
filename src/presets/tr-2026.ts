/**
 * Reference snapshot: 2026-10-22. May change; verify for your transaction.
 * No preset is applied automatically by the library.
 *
 * Deed fee: GİB, 492 sayılı Harçlar Kanunu (4) sayılı tarife 20/a.
 * https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Finfografikler%2Fpdfs%2Ftapuharci.pdf
 * Brokerage: Taşınmaz Ticareti Hakkında Yönetmelik, Article 20:
 * 4% EXCLUDING VAT is a total ceiling, not a mandatory fee or a per-party rate.
 * Equal sharing is an assumption; the agreement may specify otherwise.
 * https://eskisehir.ticaret.gov.tr/data/64edb08513b876171c69c106/TA%C5%9EINMAZ%20T%C4%B0CARET%C4%B0%20HAKKINDA%20Y%C3%96NETMEL%C4%B0K%20.pdf
 * VAT: general rate under Decision 7346, effective 2023-07-10. Verify applicability.
 * https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fkdv-oranlari.pdf
 * Fixed charges require quotes; zero means NOT ESTIMATED, not legally free.
 * BSMV/KKDF zero is a modeling default, not a determination of exemption.
 */
export const tr2026 = Object.freeze({
  asOf: '2026-10-22',
  purchase: Object.freeze({
    buyerDeedFeeRate: 0.02,
    sellerDeedFeeRate: 0.02,
    agentFeeRate: 0.04,
    agentVatRate: 0.20,
    buyerAgentShare: 0.5,
    revolvingFundKurus: 0,
    appraisalKurus: 0,
    daskKurus: 0,
  }),
  mortgage: Object.freeze({ bsmvRate: 0, kkdfRate: 0 }),
});
