import { netRentalYield } from 'emlak-hesap';

// Fictional amounts, all in integer kurus. No personal or property records.
const result = netRentalYield({
  propertyPriceKurus: 100_000_000,
  monthlyRentKurus: 500_000,
  monthlyDuesKurus: 10_000,
  annualPropertyTaxKurus: 20_000,
  annualMaintenanceKurus: 30_000,
  vacancyRate: 0.1,
  annualInsuranceKurus: 10_000,
});
console.log(JSON.stringify(result, null, 2));
