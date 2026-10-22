// Dependency-free checks against the compiled ESM package. This does not replace Vitest coverage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { grossRentalYield, netRentalYield, paybackPeriod, mortgage, purchaseCost,
  realReturn, pricePerSqm, comparePricePerSqm, rentVsBuy } from '../dist/index.js';
import { tr2026 } from '../dist/presets/tr-2026.js';

test('gross and net yields: synthetic, hand-calculated annual cash flows', () => {
  const input = { propertyPriceKurus: 100_000_000, monthlyRentKurus: 500_000 };
  // 500,000 * 12 / 100,000,000 = .06.
  assert.equal(grossRentalYield(input).grossYield, 0.06);
  // 6,000,000 - 600,000 vacancy - (120,000 + 20,000 + 30,000 + 10,000) = 5,220,000.
  const net = netRentalYield({ ...input, monthlyDuesKurus: 10_000, annualPropertyTaxKurus: 20_000,
    annualMaintenanceKurus: 30_000, vacancyRate: 0.1, annualInsuranceKurus: 10_000 });
  assert.equal(net.netAnnualIncomeKurus, 5_220_000);
  assert.equal(net.netYield, 0.0522);
});

test('payback: flat, growing and unrecovered rent', () => {
  // 3000 / (100 * 12) = 2.5; 1200 + 1320 = 2520 in 2 years with 10% growth.
  assert.equal(paybackPeriod({ investmentKurus: 3000, monthlyRentKurus: 100 }).years, 2.5);
  assert.equal(paybackPeriod({ investmentKurus: 2520, monthlyRentKurus: 100, annualRentGrowthRate: 0.1 }).years, 2);
  assert.equal(paybackPeriod({ investmentKurus: 3000, monthlyRentKurus: 0 }).years, null);
});

test('mortgage: annuity, zero-interest rounding and explicit interest taxes', () => {
  // 10000*.01/(1-1.01^-2) -> 5075; interest = 100 + round(5025*.01) = 150.
  const value = mortgage({ principalKurus: 10000, monthlyInterestRate: 0.01, months: 2 });
  assert.equal(value.monthlyPaymentKurus, 5075);
  assert.equal(value.totalInterestKurus, 150);
  assert.equal(value.totalPaymentKurus, 10150);
  assert.deepEqual(mortgage({ principalKurus: 100, monthlyInterestRate: 0, months: 3 })
    .schedule.map((row) => row.paymentKurus), [33, 33, 34]);
  // One month: 10,000 principal + 100 interest + 10 BSMV + 15 KKDF.
  assert.equal(mortgage({ principalKurus: 10000, monthlyInterestRate: 0.01,
    months: 1, bsmvRate: 0.1, kkdfRate: 0.15 }).totalPaymentKurus, 10125);
});

test('purchase: decimal rounding, separate parties and dated preset', () => {
  const input = { propertyPriceKurus: 100, deedFeeBaseKurus: 100, ...tr2026.purchase,
    agentFeeRate: 0.145, agentVatRate: 0 };
  // 100 * .145 = 14.5 -> 15; buyer = round(15*.5) = 8, seller = 7.
  const value = purchaseCost(input);
  assert.equal(value.agentFeeKurus, 15);
  assert.equal(value.buyerAgentFeeKurus, 8);
  assert.equal(value.sellerAgentFeeKurus, 7);
  assert.equal(value.buyerDeedFeeKurus, 2);
  assert.equal(value.sellerDeedFeeKurus, 2);
  assert.equal(value.buyerTotalKurus, 110);
  assert.equal(tr2026.asOf, '2026-10-22');
});

test('Fisher and price per sqm', () => {
  // 1.5/1.25 - 1 = .2. 100000/10 = 10000; (10000-8000)/8000 = .25.
  assert.equal(realReturn({ nominalReturnRate: 0.5, inflationRate: 0.25 }).realReturnRate, 0.2);
  assert.equal(realReturn({ nominalReturnRate: 0, inflationRate: 0.25 }).realReturnRate, -0.2);
  assert.equal(pricePerSqm({ propertyPriceKurus: 101, areaSqm: 2 }).pricePerSqmKurus, 51);
  assert.equal(comparePricePerSqm({ propertyPriceKurus: 100000, areaSqm: 10,
    regionalAverageKurus: 8000 }).differenceRate, 0.25);
});

test('rent versus buy: unrecoverable cost comparison', () => {
  // Rent: 100000*12*5 = 6000000. Buy: 500000 + 100000*5 + 10500000*.05*5 = 3625000.
  const value = rentVsBuy({ propertyPriceKurus: 10000000, monthlyRentKurus: 100000,
    purchaseCostsKurus: 500000, annualOwnershipCostsKurus: 100000,
    annualOpportunityRate: 0.05, years: 5 });
  assert.equal(value.totalBuyingEconomicCostKurus, 3625000);
  assert.equal(value.rentMinusBuyKurus, 2375000);
  assert.equal(value.lowerCostOption, 'buy');
});

test('mortgage principal, payments and balances reconcile across 60 scenarios', () => {
  for (const principalKurus of [1, 2, 99, 10000, 100000000]) {
    for (const monthlyInterestRate of [0, 1e-12, 0.025, 1]) {
      for (const months of [1, 3, 120]) {
        const value = mortgage({ principalKurus, monthlyInterestRate, months, bsmvRate: 0.1, kkdfRate: 0.15 });
        assert.equal(value.schedule.reduce((total, row) => total + row.principalKurus, 0), principalKurus);
        assert.equal(value.schedule.reduce((total, row) => total + row.paymentKurus, 0), value.totalPaymentKurus);
        assert.equal(value.schedule.at(-1).closingBalanceKurus, 0);
        assert.ok(value.schedule.every((row) => Number.isSafeInteger(row.paymentKurus) && row.closingBalanceKurus >= 0));
      }
    }
  }
});

test('public functions reject invalid or unsafe inputs', () => {
  for (const invalid of [-1, 0, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => grossRentalYield({ propertyPriceKurus: invalid, monthlyRentKurus: 1 }), RangeError);
    assert.throws(() => mortgage({ principalKurus: invalid, monthlyInterestRate: 0, months: 1 }), RangeError);
  }
  assert.throws(() => pricePerSqm({ propertyPriceKurus: 1, areaSqm: 0 }), RangeError);
  assert.throws(() => comparePricePerSqm({ propertyPriceKurus: 1, areaSqm: 1, regionalAverageKurus: 0 }), RangeError);
  assert.throws(() => realReturn({ nominalReturnRate: -1, inflationRate: 0 }), RangeError);
  assert.throws(() => paybackPeriod({ investmentKurus: 1, monthlyRentKurus: 1, maxYears: 0 }), RangeError);
  assert.throws(() => purchaseCost({ propertyPriceKurus: 1, deedFeeBaseKurus: 1, ...tr2026.purchase, agentVatRate: NaN }), RangeError);
  assert.throws(() => netRentalYield({ propertyPriceKurus: 1, monthlyRentKurus: 1, monthlyDuesKurus: -1,
    annualPropertyTaxKurus: 0, annualMaintenanceKurus: 0, vacancyRate: 0, annualInsuranceKurus: 0 }), RangeError);
  assert.throws(() => rentVsBuy({ propertyPriceKurus: 1, monthlyRentKurus: 1, purchaseCostsKurus: 0,
    annualOwnershipCostsKurus: 0, annualOpportunityRate: 1.1, years: 1 }), RangeError);
  assert.throws(() => grossRentalYield({ propertyPriceKurus: 1, monthlyRentKurus: Number.MAX_SAFE_INTEGER }), RangeError);
});
