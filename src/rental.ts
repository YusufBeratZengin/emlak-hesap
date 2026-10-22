import { money, multiply, period, rate, result, sum } from './internal.js';

export interface RentalInput {
  propertyPriceKurus: number;
  monthlyRentKurus: number;
}

export interface GrossRentalYieldResult {
  propertyPriceKurus: number;
  annualRentKurus: number;
  /** Decimal ratio: 0.06 means 6%. */
  grossYield: number;
}

export function grossRentalYield(input: RentalInput): GrossRentalYieldResult {
  money(input.propertyPriceKurus, 'propertyPriceKurus', true);
  money(input.monthlyRentKurus, 'monthlyRentKurus');
  const annualRentKurus = multiply(input.monthlyRentKurus, 12);
  return {
    propertyPriceKurus: input.propertyPriceKurus,
    annualRentKurus,
    grossYield: annualRentKurus / input.propertyPriceKurus,
  };
}

export interface NetRentalYieldInput extends RentalInput {
  /** Owner-paid dues only; tenant-paid dues are not an owner expense. */
  monthlyDuesKurus: number;
  annualPropertyTaxKurus: number;
  annualMaintenanceKurus: number;
  vacancyRate: number;
  annualInsuranceKurus: number;
}

export interface NetRentalYieldResult extends GrossRentalYieldResult {
  vacancyLossKurus: number;
  collectedRentKurus: number;
  annualDuesKurus: number;
  annualPropertyTaxKurus: number;
  annualMaintenanceKurus: number;
  annualInsuranceKurus: number;
  annualExpensesKurus: number;
  netAnnualIncomeKurus: number;
  netYield: number;
}

export function netRentalYield(input: NetRentalYieldInput): NetRentalYieldResult {
  const gross = grossRentalYield(input);
  money(input.monthlyDuesKurus, 'monthlyDuesKurus');
  money(input.annualPropertyTaxKurus, 'annualPropertyTaxKurus');
  money(input.annualMaintenanceKurus, 'annualMaintenanceKurus');
  money(input.annualInsuranceKurus, 'annualInsuranceKurus');
  rate(input.vacancyRate, 'vacancyRate');
  const vacancyLossKurus = multiply(gross.annualRentKurus, input.vacancyRate);
  const collectedRentKurus = sum(gross.annualRentKurus, -vacancyLossKurus);
  const annualDuesKurus = multiply(input.monthlyDuesKurus, 12);
  const annualExpensesKurus = sum(annualDuesKurus, input.annualPropertyTaxKurus,
    input.annualMaintenanceKurus, input.annualInsuranceKurus);
  const netAnnualIncomeKurus = sum(collectedRentKurus, -annualExpensesKurus);
  return {
    ...gross, vacancyLossKurus, collectedRentKurus, annualDuesKurus,
    annualPropertyTaxKurus: input.annualPropertyTaxKurus,
    annualMaintenanceKurus: input.annualMaintenanceKurus,
    annualInsuranceKurus: input.annualInsuranceKurus,
    annualExpensesKurus, netAnnualIncomeKurus,
    netYield: netAnnualIncomeKurus / input.propertyPriceKurus,
  };
}

export interface PaybackInput {
  investmentKurus: number;
  monthlyRentKurus: number;
  annualRentGrowthRate?: number;
  /** Projection cap, 1–1000 years. Defaults to 100. */
  maxYears?: number;
}

export interface PaybackResult {
  investmentKurus: number;
  initialAnnualRentKurus: number;
  annualRentGrowthRate: number;
  maxYears: number;
  recovered: boolean;
  years: number | null;
  /** Whole-year cash flows; the final year can exceed the recovery point. */
  schedule: { year: number; annualRentKurus: number; cumulativeRentKurus: number }[];
}

export function paybackPeriod(input: PaybackInput): PaybackResult {
  money(input.investmentKurus, 'investmentKurus', true);
  money(input.monthlyRentKurus, 'monthlyRentKurus');
  const growth = input.annualRentGrowthRate ?? 0;
  const maxYears = input.maxYears ?? 100;
  rate(growth, 'annualRentGrowthRate');
  period(maxYears, 'maxYears', 1000);
  const initialAnnualRentKurus = multiply(input.monthlyRentKurus, 12);
  const schedule: PaybackResult['schedule'] = [];
  let annualRentKurus = initialAnnualRentKurus;
  let cumulative = 0;
  let years: number | null = null;
  for (let year = 1; year <= maxYears; year++) {
    const previous = cumulative;
    cumulative = sum(cumulative, annualRentKurus);
    schedule.push({ year, annualRentKurus, cumulativeRentKurus: cumulative });
    if (cumulative >= input.investmentKurus) {
      years = result(year - 1 + (input.investmentKurus - previous) / annualRentKurus);
      break;
    }
    // Increment separately so a decimal growth rate is not altered by 1 + rate.
    if (year < maxYears) annualRentKurus = sum(annualRentKurus, multiply(annualRentKurus, growth));
  }
  return {
    investmentKurus: input.investmentKurus, initialAnnualRentKurus,
    annualRentGrowthRate: growth, maxYears, recovered: years !== null, years, schedule,
  };
}
