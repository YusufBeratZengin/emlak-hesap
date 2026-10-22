import { money, multiply, rate, sum } from './internal.js';

export interface PurchaseCostInput {
  propertyPriceKurus: number;
  /** Explicit fee base; can differ from the sale price. Verify the applicable floor. */
  deedFeeBaseKurus: number;
  buyerDeedFeeRate: number;
  sellerDeedFeeRate: number;
  revolvingFundKurus: number;
  /** Total brokerage rate, before VAT; buyer share is set separately. */
  agentFeeRate: number;
  agentVatRate: number;
  buyerAgentShare: number;
  appraisalKurus: number;
  daskKurus: number;
}

export interface PurchaseCostResult {
  propertyPriceKurus: number;
  deedFeeBaseKurus: number;
  buyerDeedFeeKurus: number;
  sellerDeedFeeKurus: number;
  revolvingFundKurus: number;
  agentFeeKurus: number;
  agentVatKurus: number;
  totalAgentFeeKurus: number;
  buyerAgentFeeKurus: number;
  sellerAgentFeeKurus: number;
  appraisalKurus: number;
  daskKurus: number;
  buyerCostsKurus: number;
  sellerCostsKurus: number;
  totalTransactionCostsKurus: number;
  buyerTotalKurus: number;
  sellerNetProceedsKurus: number;
}

export function purchaseCost(input: PurchaseCostInput): PurchaseCostResult {
  money(input.propertyPriceKurus, 'propertyPriceKurus', true);
  money(input.deedFeeBaseKurus, 'deedFeeBaseKurus', true);
  money(input.revolvingFundKurus, 'revolvingFundKurus');
  money(input.appraisalKurus, 'appraisalKurus');
  money(input.daskKurus, 'daskKurus');
  rate(input.buyerDeedFeeRate, 'buyerDeedFeeRate');
  rate(input.sellerDeedFeeRate, 'sellerDeedFeeRate');
  rate(input.agentFeeRate, 'agentFeeRate');
  rate(input.agentVatRate, 'agentVatRate');
  rate(input.buyerAgentShare, 'buyerAgentShare');
  const buyerDeedFeeKurus = multiply(input.deedFeeBaseKurus, input.buyerDeedFeeRate);
  const sellerDeedFeeKurus = multiply(input.deedFeeBaseKurus, input.sellerDeedFeeRate);
  const agentFeeKurus = multiply(input.propertyPriceKurus, input.agentFeeRate);
  const agentVatKurus = multiply(agentFeeKurus, input.agentVatRate);
  const totalAgentFeeKurus = sum(agentFeeKurus, agentVatKurus);
  const buyerAgentFeeKurus = multiply(totalAgentFeeKurus, input.buyerAgentShare);
  const sellerAgentFeeKurus = sum(totalAgentFeeKurus, -buyerAgentFeeKurus);
  // Fixed charges are assigned to the buyer in this simplified model.
  const buyerCostsKurus = sum(buyerDeedFeeKurus, buyerAgentFeeKurus,
    input.revolvingFundKurus, input.appraisalKurus, input.daskKurus);
  const sellerCostsKurus = sum(sellerDeedFeeKurus, sellerAgentFeeKurus);
  return {
    propertyPriceKurus: input.propertyPriceKurus, deedFeeBaseKurus: input.deedFeeBaseKurus,
    buyerDeedFeeKurus, sellerDeedFeeKurus, revolvingFundKurus: input.revolvingFundKurus,
    agentFeeKurus, agentVatKurus, totalAgentFeeKurus, buyerAgentFeeKurus, sellerAgentFeeKurus,
    appraisalKurus: input.appraisalKurus, daskKurus: input.daskKurus, buyerCostsKurus,
    sellerCostsKurus, totalTransactionCostsKurus: sum(buyerCostsKurus, sellerCostsKurus),
    buyerTotalKurus: sum(input.propertyPriceKurus, buyerCostsKurus),
    sellerNetProceedsKurus: sum(input.propertyPriceKurus, -sellerCostsKurus),
  };
}
