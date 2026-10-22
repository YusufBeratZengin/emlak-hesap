export type Calculator = 'rental' | 'payback' | 'mortgage' | 'purchase' | 'real' | 'sqm' | 'rentBuy';
export type FieldKind = 'money' | 'percent' | 'integer' | 'area';
export interface Field { key: string; kind: FieldKind; value: string; max?: number }
export const calculators: Calculator[] = ['rental', 'payback', 'mortgage', 'purchase', 'real', 'sqm', 'rentBuy'];
const m = (key: string, value: string): Field => ({ key, kind: 'money', value });
const p = (key: string, value: string): Field => ({ key, kind: 'percent', value });
const n = (key: string, value: string, max: number): Field => ({ key, kind: 'integer', value, max });

/** Synthetic starting scenarios. Amounts here are TL text, not library inputs. */
export const forms: Record<Calculator, Field[]> = {
  rental: [m('propertyPriceKurus', '1000000'), m('monthlyRentKurus', '5000'),
    m('monthlyDuesKurus', '100'), m('annualPropertyTaxKurus', '200'),
    m('annualMaintenanceKurus', '300'), p('vacancyRate', '10'), m('annualInsuranceKurus', '100')],
  payback: [m('investmentKurus', '1000000'), m('monthlyRentKurus', '5000'),
    p('annualRentGrowthRate', '0'), n('maxYears', '100', 1000)],
  mortgage: [m('principalKurus', '500000'), p('monthlyInterestRate', '2'), n('months', '120', 1200),
    p('bsmvRate', '0'), p('kkdfRate', '0')],
  purchase: [m('propertyPriceKurus', '1000000'), m('deedFeeBaseKurus', '1000000'),
    p('buyerDeedFeeRate', '0'), p('sellerDeedFeeRate', '0'), m('revolvingFundKurus', '0'),
    p('agentFeeRate', '0'), p('agentVatRate', '0'), p('buyerAgentShare', '50'),
    m('appraisalKurus', '0'), m('daskKurus', '0')],
  real: [p('nominalReturnRate', '50'), p('inflationRate', '25')],
  sqm: [m('propertyPriceKurus', '1000000'), { key: 'areaSqm', kind: 'area', value: '100' },
    m('regionalAverageKurus', '8000')],
  rentBuy: [m('propertyPriceKurus', '1000000'), m('monthlyRentKurus', '5000'),
    m('purchaseCostsKurus', '50000'), m('annualOwnershipCostsKurus', '10000'),
    p('annualOpportunityRate', '5'), n('years', '5', 1000)],
};

/** Exact TL string -> integer kuruş; no binary floating-point money conversion. */
export function parseMoney(value: string): number {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new RangeError('Enter a non-negative amount with at most two decimal places.');
  const amount = Number(BigInt(match[1]!) * 100n + BigInt((match[2] ?? '').padEnd(2, '0')));
  if (!Number.isSafeInteger(amount)) throw new RangeError('Amount exceeds the safe integer range.');
  return amount;
}

export function parseField(value: string, kind: FieldKind): number {
  if (kind === 'money') return parseMoney(value);
  if (!/^\d+(?:\.\d+)?$/.test(value)) throw new RangeError('Enter a non-negative number.');
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || (kind === 'integer' && !Number.isInteger(numeric))) {
    throw new RangeError('Enter a finite number in the required format.');
  }
  return kind === 'percent' ? numeric / 100 : numeric;
}

/** Preserve every kuruş even near MAX_SAFE_INTEGER, where amount / 100 can lose a cent. */
export function formatMoney(amount: number, formatter: Intl.NumberFormat): string {
  const integer = BigInt(amount);
  const magnitude = integer < 0n ? -integer : integer;
  const whole = integer / 100n;
  const fraction = (magnitude % 100n).toString().padStart(2, '0');
  const signed = integer < 0n && whole === 0n ? -0 : whole;
  return formatter.formatToParts(signed).map((part) => part.type === 'fraction' ? fraction : part.value).join('');
}
