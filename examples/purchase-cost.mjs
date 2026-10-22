import { purchaseCost } from 'emlak-hesap';
import { tr2026 } from 'emlak-hesap/presets/tr-2026';

// Opt-in dated rates: verify applicability. Fixed charges are fictional quotes.
const { buyerTotalKurus, buyerCostsKurus, sellerCostsKurus, totalTransactionCostsKurus } = purchaseCost({
  ...tr2026.purchase,
  propertyPriceKurus: 100_000_000,
  deedFeeBaseKurus: 100_000_000,
  revolvingFundKurus: 100_000,
  appraisalKurus: 50_000,
  daskKurus: 20_000,
});
console.log(JSON.stringify({ buyerTotalKurus, buyerCostsKurus, sellerCostsKurus, totalTransactionCostsKurus }, null, 2));
