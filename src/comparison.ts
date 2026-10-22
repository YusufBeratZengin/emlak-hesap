import { divide, money, multiply, period, positive, rate, result, sum } from './internal.js';

export interface RealReturnInput { nominalReturnRate: number; inflationRate: number }
export interface RealReturnResult extends RealReturnInput { realReturnRate: number }

/** Fisher equation. This API accepts non-negative scenario rates. */
export function realReturn(input: RealReturnInput): RealReturnResult {
  rate(input.nominalReturnRate, 'nominalReturnRate', Number.MAX_VALUE);
  rate(input.inflationRate, 'inflationRate', Number.MAX_VALUE);
  // Equivalent to (1 + nominal) / (1 + inflation) - 1, preserving small differences.
  return { ...input, realReturnRate: result((input.nominalReturnRate - input.inflationRate) / (1 + input.inflationRate)) };
}

export interface PricePerSqmInput { propertyPriceKurus: number; areaSqm: number }
export interface PricePerSqmResult extends PricePerSqmInput { pricePerSqmKurus: number }

export function pricePerSqm(input: PricePerSqmInput): PricePerSqmResult {
  money(input.propertyPriceKurus, 'propertyPriceKurus', true);
  positive(input.areaSqm, 'areaSqm');
  return { ...input, pricePerSqmKurus: divide(input.propertyPriceKurus, input.areaSqm) };
}

export interface ComparePricePerSqmInput extends PricePerSqmInput { regionalAverageKurus: number }
export interface ComparePricePerSqmResult extends PricePerSqmResult {
  regionalAverageKurus: number;
  differenceKurus: number;
  /** Decimal ratio; negative is below the regional average. Uses rounded kuruş/m². */
  differenceRate: number;
}

export function comparePricePerSqm(input: ComparePricePerSqmInput): ComparePricePerSqmResult {
  const price = pricePerSqm(input);
  money(input.regionalAverageKurus, 'regionalAverageKurus', true);
  const differenceKurus = sum(price.pricePerSqmKurus, -input.regionalAverageKurus);
  return { ...price, regionalAverageKurus: input.regionalAverageKurus, differenceKurus,
    differenceRate: differenceKurus / input.regionalAverageKurus };
}

export interface RentVsBuyInput {
  propertyPriceKurus: number;
  monthlyRentKurus: number;
  purchaseCostsKurus: number;
  annualOwnershipCostsKurus: number;
  annualOpportunityRate: number;
  years: number;
}

export interface RentVsBuyResult {
  initialCapitalKurus: number;
  annualRentKurus: number;
  annualOpportunityCostKurus: number;
  totalRentKurus: number;
  totalOwnershipCostsKurus: number;
  totalOpportunityCostKurus: number;
  totalBuyingEconomicCostKurus: number;
  /** Positive means renting costs more; excludes the retained home value. */
  rentMinusBuyKurus: number;
  lowerCostOption: 'rent' | 'buy' | 'equal';
  years: number;
}

/** Cash purchase, flat rent/home value, simple (not compounded) opportunity cost. */
export function rentVsBuy(input: RentVsBuyInput): RentVsBuyResult {
  money(input.propertyPriceKurus, 'propertyPriceKurus', true);
  money(input.monthlyRentKurus, 'monthlyRentKurus');
  money(input.purchaseCostsKurus, 'purchaseCostsKurus');
  money(input.annualOwnershipCostsKurus, 'annualOwnershipCostsKurus');
  rate(input.annualOpportunityRate, 'annualOpportunityRate');
  period(input.years, 'years', 1000);
  const initialCapitalKurus = sum(input.propertyPriceKurus, input.purchaseCostsKurus);
  const annualRentKurus = multiply(input.monthlyRentKurus, 12);
  const annualOpportunityCostKurus = multiply(initialCapitalKurus, input.annualOpportunityRate);
  const totalRentKurus = multiply(annualRentKurus, input.years);
  const totalOwnershipCostsKurus = multiply(input.annualOwnershipCostsKurus, input.years);
  const totalOpportunityCostKurus = multiply(annualOpportunityCostKurus, input.years);
  const totalBuyingEconomicCostKurus = sum(input.purchaseCostsKurus, totalOwnershipCostsKurus, totalOpportunityCostKurus);
  const rentMinusBuyKurus = sum(totalRentKurus, -totalBuyingEconomicCostKurus);
  return { initialCapitalKurus, annualRentKurus, annualOpportunityCostKurus, totalRentKurus,
    totalOwnershipCostsKurus, totalOpportunityCostKurus, totalBuyingEconomicCostKurus,
    rentMinusBuyKurus, lowerCostOption: rentMinusBuyKurus > 0 ? 'buy' : rentMinusBuyKurus < 0 ? 'rent' : 'equal', years: input.years };
}
