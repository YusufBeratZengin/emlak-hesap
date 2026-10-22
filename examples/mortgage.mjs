import { mortgage } from 'emlak-hesap';

// Fictional two-month loan; interest is monthly. Taxes remain explicit modeling inputs.
const { monthlyPaymentKurus, totalPaymentKurus, totalInterestKurus, finalPaymentKurus } = mortgage({
  principalKurus: 10_000,
  monthlyInterestRate: 0.01,
  months: 2,
  bsmvRate: 0,
  kkdfRate: 0,
});
console.log(JSON.stringify({ monthlyPaymentKurus, totalPaymentKurus, totalInterestKurus, finalPaymentKurus }, null, 2));
