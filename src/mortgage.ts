import { money, multiply, period, rate, sum } from './internal.js';

export interface MortgageInput {
  principalKurus: number;
  monthlyInterestRate: number;
  months: number;
  /** Applied separately to each month's interest. No tax applicability is inferred. */
  bsmvRate?: number;
  kkdfRate?: number;
}

export interface AmortizationRow {
  month: number;
  openingBalanceKurus: number;
  paymentKurus: number;
  principalKurus: number;
  interestKurus: number;
  bsmvKurus: number;
  kkdfKurus: number;
  closingBalanceKurus: number;
}

export interface MortgageResult {
  principalKurus: number;
  monthlyInterestRate: number;
  effectiveMonthlyRate: number;
  bsmvRate: number;
  kkdfRate: number;
  /** All-in annuity target; the final payment clears the rounded balance. */
  monthlyPaymentKurus: number;
  finalPaymentKurus: number;
  totalPaymentKurus: number;
  totalInterestKurus: number;
  totalBsmvKurus: number;
  totalKkdfKurus: number;
  totalFinancingCostKurus: number;
  schedule: AmortizationRow[];
}

export function mortgage(input: MortgageInput): MortgageResult {
  money(input.principalKurus, 'principalKurus', true);
  rate(input.monthlyInterestRate, 'monthlyInterestRate');
  period(input.months, 'months', 1200);
  const bsmvRate = input.bsmvRate ?? 0;
  const kkdfRate = input.kkdfRate ?? 0;
  rate(bsmvRate, 'bsmvRate');
  rate(kkdfRate, 'kkdfRate');
  const effectiveMonthlyRate = input.monthlyInterestRate * (1 + bsmvRate + kkdfRate);
  // P*r/(1-(1+r)^-n), with log1p/expm1 to avoid cancellation near zero.
  const factor = effectiveMonthlyRate === 0 ? 1 / input.months
    : effectiveMonthlyRate / -Math.expm1(-input.months * Math.log1p(effectiveMonthlyRate));
  const monthlyPaymentKurus = multiply(input.principalKurus, factor);
  const schedule: AmortizationRow[] = [];
  let balance = input.principalKurus;
  for (let month = 1; month <= input.months; month++) {
    const interestKurus = multiply(balance, input.monthlyInterestRate);
    const bsmvKurus = multiply(interestKurus, bsmvRate);
    const kkdfKurus = multiply(interestKurus, kkdfRate);
    const charges = sum(interestKurus, bsmvKurus, kkdfKurus);
    const principalKurus = month === input.months ? balance
      : Math.min(balance, Math.max(0, monthlyPaymentKurus - charges));
    const paymentKurus = sum(principalKurus, charges);
    const closingBalanceKurus = sum(balance, -principalKurus);
    schedule.push({ month, openingBalanceKurus: balance, paymentKurus, principalKurus,
      interestKurus, bsmvKurus, kkdfKurus, closingBalanceKurus });
    balance = closingBalanceKurus;
  }
  const totalInterestKurus = sum(...schedule.map((row) => row.interestKurus));
  const totalBsmvKurus = sum(...schedule.map((row) => row.bsmvKurus));
  const totalKkdfKurus = sum(...schedule.map((row) => row.kkdfKurus));
  const totalFinancingCostKurus = sum(totalInterestKurus, totalBsmvKurus, totalKkdfKurus);
  return {
    principalKurus: input.principalKurus, monthlyInterestRate: input.monthlyInterestRate,
    effectiveMonthlyRate, bsmvRate, kkdfRate, monthlyPaymentKurus,
    finalPaymentKurus: schedule[schedule.length - 1]!.paymentKurus,
    totalPaymentKurus: sum(input.principalKurus, totalFinancingCostKurus),
    totalInterestKurus, totalBsmvKurus, totalKkdfKurus, totalFinancingCostKurus, schedule,
  };
}
