import { describe, expect, it } from 'vitest';
import {
  comparePricePerSqm, grossRentalYield, mortgage, netRentalYield,
  paybackPeriod, pricePerSqm, purchaseCost, realReturn, rentVsBuy,
} from '../src/index.js';
import { tr2026 } from '../src/presets/tr-2026.js';

// All figures are synthetic arithmetic fixtures; no people or properties are represented.
const rental = { propertyPriceKurus: 100_000_000, monthlyRentKurus: 500_000 };
const net = { ...rental, monthlyDuesKurus: 10_000, annualPropertyTaxKurus: 20_000,
  annualMaintenanceKurus: 30_000, vacancyRate: 0.1, annualInsuranceKurus: 10_000 };
const purchase = { propertyPriceKurus: 100_000_000, deedFeeBaseKurus: 100_000_000,
  buyerDeedFeeRate: 0.02, sellerDeedFeeRate: 0.02, revolvingFundKurus: 100_000,
  agentFeeRate: 0.04, agentVatRate: 0.2, buyerAgentShare: 0.5, appraisalKurus: 50_000, daskKurus: 20_000 };
const loan = { principalKurus: 10_000, monthlyInterestRate: 0.01, months: 2 };
const comparison = { propertyPriceKurus: 10_000_000, monthlyRentKurus: 100_000,
  purchaseCostsKurus: 500_000, annualOwnershipCostsKurus: 100_000, annualOpportunityRate: 0.05, years: 5 };

describe('rental yields', () => {
  it('calculates annual gross yield', () => {
    // 500,000 * 12 / 100,000,000 = 0.06.
    expect(grossRentalYield(rental)).toEqual({ propertyPriceKurus: 100_000_000,
      annualRentKurus: 6_000_000, grossYield: 0.06 });
    expect(grossRentalYield({ ...rental, monthlyRentKurus: 0 }).grossYield).toBe(0);
  });

  it('itemizes vacancy and each owner expense', () => {
    // Collected: 6,000,000 - 600,000 = 5,400,000.
    // Costs: 120,000 + 20,000 + 30,000 + 10,000 = 180,000.
    // Net: 5,220,000 / 100,000,000 = 0.0522.
    expect(netRentalYield(net)).toEqual({ propertyPriceKurus: 100_000_000,
      annualRentKurus: 6_000_000, grossYield: 0.06, vacancyLossKurus: 600_000,
      collectedRentKurus: 5_400_000, annualDuesKurus: 120_000,
      annualPropertyTaxKurus: 20_000, annualMaintenanceKurus: 30_000,
      annualInsuranceKurus: 10_000, annualExpensesKurus: 180_000,
      netAnnualIncomeKurus: 5_220_000, netYield: 0.0522 });
    expect(netRentalYield({ ...net, vacancyRate: 1 }).netAnnualIncomeKurus).toBe(-180_000);
    expect(netRentalYield({ ...net, vacancyRate: 0 }).collectedRentKurus).toBe(6_000_000);
  });

  it('rounds vacancy loss rather than independently rounding collected rent', () => {
    const value = netRentalYield({ ...net, monthlyRentKurus: 1, vacancyRate: 0.125 });
    // 12 * 0.125 = 1.5 -> 2 kuruş; collected = 12 - 2 = 10.
    expect(value.vacancyLossKurus).toBe(2);
    expect(value.collectedRentKurus).toBe(10);
  });
});

describe('payback', () => {
  it('interpolates within a year for flat rents', () => {
    // 3,000 / (100 * 12) = 2.5 years.
    const value = paybackPeriod({ investmentKurus: 3000, monthlyRentKurus: 100 });
    expect(value.years).toBe(2.5);
    expect(value.recovered).toBe(true);
    expect(value.schedule).toEqual([
      { year: 1, annualRentKurus: 1200, cumulativeRentKurus: 1200 },
      { year: 2, annualRentKurus: 1200, cumulativeRentKurus: 2400 },
      { year: 3, annualRentKurus: 1200, cumulativeRentKurus: 3600 },
    ]);
  });

  it('applies the rent increase at each anniversary', () => {
    // Year 1: 1200; year 2: 1320. 2520 is recovered exactly in 2 years.
    expect(paybackPeriod({ investmentKurus: 2520, monthlyRentKurus: 100,
      annualRentGrowthRate: 0.1 }).years).toBe(2);
    // 1200 + half of 1320 = 1860: 1.5 years.
    expect(paybackPeriod({ investmentKurus: 1860, monthlyRentKurus: 100,
      annualRentGrowthRate: 0.1 }).years).toBe(1.5);
  });

  it('returns null when the investment is not recovered in the projection', () => {
    for (const monthlyRentKurus of [0, 1]) {
      const value = paybackPeriod({ investmentKurus: 1000, monthlyRentKurus, maxYears: 2 });
      expect(value.years).toBeNull();
      expect(value.recovered).toBe(false);
      expect(value.schedule).toHaveLength(2);
    }
    expect(paybackPeriod({ investmentKurus: 600, monthlyRentKurus: 100 }).years).toBe(0.5);
    expect(paybackPeriod({ investmentKurus: 1000, monthlyRentKurus: 0 }).schedule).toHaveLength(100);
  });

  it('rounds annual growth half up in kuruş', () => {
    // Year 1 = 12, increment = 12 * .125 = 1.5 -> 2; year 2 = 14.
    expect(paybackPeriod({ investmentKurus: 26, monthlyRentKurus: 1,
      annualRentGrowthRate: 0.125 }).schedule[1]?.annualRentKurus).toBe(14);
  });
});

describe('mortgage', () => {
  it('calculates an annuity and clears the final balance', () => {
    // 10000 * .01 / (1 - 1.01^-2) = 5075.124378 -> 5075.
    // Month 1: interest 100, principal 4975, balance 5025.
    // Month 2: interest 50.25 -> 50, final payment 5025 + 50 = 5075.
    const value = mortgage(loan);
    expect(value.monthlyPaymentKurus).toBe(5075);
    expect(value.totalPaymentKurus).toBe(10150);
    expect(value.totalInterestKurus).toBe(150);
    expect(value.totalFinancingCostKurus).toBe(150);
    expect(value.schedule).toEqual([
      { month: 1, openingBalanceKurus: 10000, paymentKurus: 5075, principalKurus: 4975,
        interestKurus: 100, bsmvKurus: 0, kkdfKurus: 0, closingBalanceKurus: 5025 },
      { month: 2, openingBalanceKurus: 5025, paymentKurus: 5075, principalKurus: 5025,
        interestKurus: 50, bsmvKurus: 0, kkdfKurus: 0, closingBalanceKurus: 0 },
    ]);
  });

  it('handles zero interest and the final rounding adjustment', () => {
    // 100 / 3 = 33.333... -> 33, 33, 34; not 99 total.
    const value = mortgage({ principalKurus: 100, monthlyInterestRate: 0, months: 3 });
    expect(value.schedule.map((row) => row.paymentKurus)).toEqual([33, 33, 34]);
    expect(value.finalPaymentKurus).toBe(34);
    expect(value.totalInterestKurus).toBe(0);
    expect(value.totalPaymentKurus).toBe(100);
  });

  it('separately charges taxes on rounded interest, including one-month loans', () => {
    // Interest = 10000 * .01 = 100; BSMV = 10; KKDF = 15; payment = 10125.
    const value = mortgage({ ...loan, months: 1, bsmvRate: 0.1, kkdfRate: 0.15 });
    expect(value.effectiveMonthlyRate).toBe(0.0125);
    expect(value.totalBsmvKurus).toBe(10);
    expect(value.totalKkdfKurus).toBe(15);
    expect(value.totalPaymentKurus).toBe(10125);
    expect(value.finalPaymentKurus).toBe(10125);
    expect(mortgage({ ...loan, bsmvRate: 0, kkdfRate: 0 })).toEqual(mortgage(loan));
  });

  it('keeps schedule and totals consistent across scenarios', () => {
    for (const principalKurus of [1, 2, 99, 10_000, 100_000_000]) {
      for (const monthlyInterestRate of [0, 1e-12, 0.025, 1]) {
        const value = mortgage({ principalKurus, monthlyInterestRate, months: 120,
          bsmvRate: 0.1, kkdfRate: 0.15 });
        expect(value.schedule.reduce((total, row) => total + row.principalKurus, 0)).toBe(principalKurus);
        expect(value.schedule.reduce((total, row) => total + row.paymentKurus, 0)).toBe(value.totalPaymentKurus);
        expect(value.schedule.at(-1)?.closingBalanceKurus).toBe(0);
        expect(value.schedule.every((row) => Number.isSafeInteger(row.paymentKurus)
          && row.closingBalanceKurus >= 0)).toBe(true);
      }
    }
  });
});

describe('purchase costs', () => {
  it('itemizes buyer and seller costs without double-counting commission', () => {
    // Deed: 2,000,000 per party. Agent: 4,000,000 + 800,000 VAT = 4,800,000.
    // Buyer: 2,000,000 + 2,400,000 + 100,000 + 50,000 + 20,000 = 4,570,000.
    // Seller: 2,000,000 + 2,400,000 = 4,400,000.
    expect(purchaseCost(purchase)).toEqual({ propertyPriceKurus: 100_000_000,
      deedFeeBaseKurus: 100_000_000, buyerDeedFeeKurus: 2_000_000,
      sellerDeedFeeKurus: 2_000_000, revolvingFundKurus: 100_000,
      agentFeeKurus: 4_000_000, agentVatKurus: 800_000, totalAgentFeeKurus: 4_800_000,
      buyerAgentFeeKurus: 2_400_000, sellerAgentFeeKurus: 2_400_000,
      appraisalKurus: 50_000, daskKurus: 20_000, buyerCostsKurus: 4_570_000,
      sellerCostsKurus: 4_400_000, totalTransactionCostsKurus: 8_970_000,
      buyerTotalKurus: 104_570_000, sellerNetProceedsKurus: 95_600_000 });
  });

  it('uses a separate deed fee base and configurable party allocation', () => {
    const value = purchaseCost({ ...purchase, deedFeeBaseKurus: 200_000_000,
      buyerDeedFeeRate: 0, sellerDeedFeeRate: 0.03, buyerAgentShare: 1 });
    expect(value.buyerDeedFeeKurus).toBe(0);
    expect(value.sellerDeedFeeKurus).toBe(6_000_000);
    expect(value.sellerAgentFeeKurus).toBe(0);
    expect(purchaseCost({ ...purchase, buyerAgentShare: 0 }).buyerAgentFeeKurus).toBe(0);
  });

  it('preserves split totals for odd kuruş and avoids the 100 * 0.145 float trap', () => {
    const value = purchaseCost({ ...purchase, propertyPriceKurus: 100,
      agentFeeRate: 0.145, agentVatRate: 0 });
    // Native Math.round(100 * .145) is 14. Exact decimal is 14.5 -> 15.
    expect(value.agentFeeKurus).toBe(15);
    expect(value.buyerAgentFeeKurus).toBe(8);
    expect(value.sellerAgentFeeKurus).toBe(7);
    expect(value.buyerAgentFeeKurus + value.sellerAgentFeeKurus).toBe(value.totalAgentFeeKurus);
  });

  it('accepts all-zero fees and does not apply a preset implicitly', () => {
    const value = purchaseCost({ propertyPriceKurus: 100, deedFeeBaseKurus: 100,
      buyerDeedFeeRate: 0, sellerDeedFeeRate: 0, revolvingFundKurus: 0,
      agentFeeRate: 0, agentVatRate: 0, buyerAgentShare: 0, appraisalKurus: 0, daskKurus: 0 });
    expect(value.buyerTotalKurus).toBe(100);
    expect(value.totalTransactionCostsKurus).toBe(0);
  });
});

describe('returns and price comparisons', () => {
  it('uses Fisher rather than subtracting percentage points', () => {
    // (1.5 / 1.25) - 1 = .2, not .25.
    expect(realReturn({ nominalReturnRate: 0.5, inflationRate: 0.25 }).realReturnRate).toBe(0.2);
    expect(realReturn({ nominalReturnRate: 0, inflationRate: 0.25 }).realReturnRate).toBe(-0.2);
    expect(realReturn({ nominalReturnRate: 0, inflationRate: 0 }).realReturnRate).toBe(0);
    expect(realReturn({ nominalReturnRate: 2, inflationRate: 1 }).realReturnRate).toBe(0.5);
  });

  it('calculates and rounds price per sqm with fractional areas', () => {
    // 1,000,000 / 100 = 10,000 kuruş/m²; 100 / 2.5 = 40.
    expect(pricePerSqm({ propertyPriceKurus: 1_000_000, areaSqm: 100 }).pricePerSqmKurus).toBe(10_000);
    expect(pricePerSqm({ propertyPriceKurus: 100, areaSqm: 2.5 }).pricePerSqmKurus).toBe(40);
    // 101 / 2 = 50.5 -> 51.
    expect(pricePerSqm({ propertyPriceKurus: 101, areaSqm: 2 }).pricePerSqmKurus).toBe(51);
  });

  it('compares with the regional average in both directions', () => {
    // 100,000 / 10 = 10,000; (10,000 - 8,000) / 8,000 = .25.
    const input = { propertyPriceKurus: 100_000, areaSqm: 10, regionalAverageKurus: 8000 };
    expect(comparePricePerSqm(input).differenceRate).toBe(0.25);
    expect(comparePricePerSqm({ ...input, regionalAverageKurus: 20_000 }).differenceRate).toBe(-0.5);
    expect(comparePricePerSqm({ ...input, regionalAverageKurus: 10_000 }).differenceKurus).toBe(0);
  });
});

describe('rent versus buy', () => {
  it('compares unrecoverable costs and simple opportunity cost', () => {
    // Capital = 10,500,000; opportunity = 525,000/year.
    // Rent = 100,000*12*5 = 6,000,000.
    // Buy cost = 500,000 + 100,000*5 + 525,000*5 = 3,625,000.
    // Rent - buy = 2,375,000 (buy has lower modeled cost).
    expect(rentVsBuy(comparison)).toEqual({ initialCapitalKurus: 10_500_000,
      annualRentKurus: 1_200_000, annualOpportunityCostKurus: 525_000,
      totalRentKurus: 6_000_000, totalOwnershipCostsKurus: 500_000,
      totalOpportunityCostKurus: 2_625_000, totalBuyingEconomicCostKurus: 3_625_000,
      rentMinusBuyKurus: 2_375_000, lowerCostOption: 'buy', years: 5 });
    expect(rentVsBuy({ ...comparison, monthlyRentKurus: 0 }).lowerCostOption).toBe('rent');
    expect(rentVsBuy({ ...comparison, monthlyRentKurus: 0, purchaseCostsKurus: 0,
      annualOwnershipCostsKurus: 0, annualOpportunityRate: 0 }).lowerCostOption).toBe('equal');
  });
});

describe('validation', () => {
  const cases = [
    { name: 'grossRentalYield', call: (v: typeof rental) => grossRentalYield(v), valid: rental,
      moneyFields: ['propertyPriceKurus', 'monthlyRentKurus'], positiveFields: ['propertyPriceKurus'], rateFields: [] },
    { name: 'netRentalYield', call: (v: typeof net) => netRentalYield(v), valid: net,
      moneyFields: ['propertyPriceKurus', 'monthlyRentKurus', 'monthlyDuesKurus', 'annualPropertyTaxKurus', 'annualMaintenanceKurus', 'annualInsuranceKurus'], positiveFields: ['propertyPriceKurus'], rateFields: ['vacancyRate'] },
    { name: 'paybackPeriod', call: (v: Parameters<typeof paybackPeriod>[0]) => paybackPeriod(v),
      valid: { investmentKurus: 1000, monthlyRentKurus: 10, annualRentGrowthRate: 0.1, maxYears: 10 },
      moneyFields: ['investmentKurus', 'monthlyRentKurus'], positiveFields: ['investmentKurus'], rateFields: ['annualRentGrowthRate'] },
    { name: 'mortgage', call: (v: Parameters<typeof mortgage>[0]) => mortgage(v),
      valid: { ...loan, bsmvRate: 0.1, kkdfRate: 0.15 }, moneyFields: ['principalKurus'], positiveFields: ['principalKurus'], rateFields: ['monthlyInterestRate', 'bsmvRate', 'kkdfRate'] },
    { name: 'purchaseCost', call: (v: typeof purchase) => purchaseCost(v), valid: purchase,
      moneyFields: ['propertyPriceKurus', 'deedFeeBaseKurus', 'revolvingFundKurus', 'appraisalKurus', 'daskKurus'], positiveFields: ['propertyPriceKurus', 'deedFeeBaseKurus'], rateFields: ['buyerDeedFeeRate', 'sellerDeedFeeRate', 'agentFeeRate', 'agentVatRate', 'buyerAgentShare'] },
    { name: 'realReturn', call: (v: Parameters<typeof realReturn>[0]) => realReturn(v), valid: { nominalReturnRate: 0.1, inflationRate: 0.05 }, moneyFields: [], positiveFields: [], rateFields: ['nominalReturnRate', 'inflationRate'] },
    { name: 'pricePerSqm', call: (v: Parameters<typeof pricePerSqm>[0]) => pricePerSqm(v), valid: { propertyPriceKurus: 1000, areaSqm: 10 }, moneyFields: ['propertyPriceKurus'], positiveFields: ['propertyPriceKurus'], rateFields: [] },
    { name: 'comparePricePerSqm', call: (v: Parameters<typeof comparePricePerSqm>[0]) => comparePricePerSqm(v), valid: { propertyPriceKurus: 1000, areaSqm: 10, regionalAverageKurus: 100 }, moneyFields: ['propertyPriceKurus', 'regionalAverageKurus'], positiveFields: ['propertyPriceKurus', 'regionalAverageKurus'], rateFields: [] },
    { name: 'rentVsBuy', call: (v: typeof comparison) => rentVsBuy(v), valid: comparison,
      moneyFields: ['propertyPriceKurus', 'monthlyRentKurus', 'purchaseCostsKurus', 'annualOwnershipCostsKurus'], positiveFields: ['propertyPriceKurus'], rateFields: ['annualOpportunityRate'] },
  ];

  for (const scenario of cases) {
    it(`${scenario.name}: accepts its valid fixture and rejects invalid fields`, () => {
      // Each union member's fixture matches its own function, including after field overrides.
      const call = scenario.call as (input: Record<string, number>) => unknown;
      expect(() => call(scenario.valid)).not.toThrow();
      for (const field of scenario.moneyFields) {
        for (const invalid of [-1, NaN, Infinity, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
          expect(() => call({ ...scenario.valid, [field]: invalid }), field).toThrow(RangeError);
        }
      }
      for (const field of scenario.positiveFields) {
        expect(() => call({ ...scenario.valid, [field]: 0 }), field).toThrow(RangeError);
      }
      for (const field of scenario.rateFields) {
        for (const invalid of [-0.01, NaN, Infinity, -Infinity,
          ...(scenario.name === 'realReturn' ? [] : [1.01])]) {
          expect(() => call({ ...scenario.valid, [field]: invalid }), field).toThrow(RangeError);
        }
      }
    });
  }

  it.each([-1, 0, NaN, Infinity])('rejects invalid area %s', (areaSqm: number) => {
    expect(() => pricePerSqm({ propertyPriceKurus: 100, areaSqm })).toThrow(/areaSqm/);
    expect(() => comparePricePerSqm({ propertyPriceKurus: 100, areaSqm, regionalAverageKurus: 1 })).toThrow(/areaSqm/);
  });

  it.each([-1, 0, 0.5, NaN, Infinity, 1001])('rejects invalid year count %s', (years: number) => {
    expect(() => paybackPeriod({ investmentKurus: 100, monthlyRentKurus: 1, maxYears: years })).toThrow(/maxYears/);
    expect(() => rentVsBuy({ ...comparison, years })).toThrow(/years/);
  });

  it.each([-1, 0, 0.5, NaN, Infinity, 1201])('rejects invalid month count %s', (months: number) => {
    expect(() => mortgage({ ...loan, months })).toThrow(/months/);
  });

  it('rejects overflow rather than returning inaccurate money', () => {
    expect(() => grossRentalYield({ ...rental, monthlyRentKurus: Number.MAX_SAFE_INTEGER })).toThrow(/safe integer/);
    expect(() => pricePerSqm({ propertyPriceKurus: Number.MAX_SAFE_INTEGER, areaSqm: 0.1 })).toThrow(/safe integer/);
    expect(() => purchaseCost({ ...purchase, propertyPriceKurus: Number.MAX_SAFE_INTEGER })).toThrow(/safe integer/);
    expect(() => mortgage({ ...loan, principalKurus: Number.MAX_SAFE_INTEGER, monthlyInterestRate: 1 })).toThrow(/safe integer/);
    expect(() => paybackPeriod({ investmentKurus: Number.MAX_SAFE_INTEGER,
      monthlyRentKurus: 1_000_000_000_000, annualRentGrowthRate: 1 })).toThrow(/safe integer/);
  });

  it('does not mutate inputs', () => {
    expect(() => netRentalYield(Object.freeze(net))).not.toThrow();
    expect(() => purchaseCost(Object.freeze(purchase))).not.toThrow();
    expect(() => mortgage(Object.freeze(loan))).not.toThrow();
  });

  it('exposes a dated frozen opt-in preset', () => {
    expect(tr2026.asOf).toBe('2026-10-22');
    expect(Object.isFrozen(tr2026)).toBe(true);
    expect(Object.isFrozen(tr2026.purchase)).toBe(true);
    expect(Object.isFrozen(tr2026.mortgage)).toBe(true);
    expect(purchaseCost({ propertyPriceKurus: 10000, deedFeeBaseKurus: 10000, ...tr2026.purchase }).buyerDeedFeeKurus).toBe(200);
  });
});
