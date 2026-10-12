import { billingRepository } from '../server/repositories/billingRepository';

async function testBilling() {
  console.log('--- Testing Clean Billing & Time Utilization Metrics ---');

  const currentPeriod = await billingRepository.getCurrentBillingPeriod();
  const history = await billingRepository.getBillingHistory();
  const usageEvents = await billingRepository.getUsageEvents();

  console.log('\nCurrent Billing Period Metrics:');
  console.log('Period Name:', currentPeriod.periodName);
  console.log('Total Calls Count:', currentPeriod.totalCallsCount);
  console.log('Total Minutes Used:', currentPeriod.totalMinutesUsed, 'm');
  console.log('Provider Cost Total:', `$${currentPeriod.providerCostTotal}`);
  console.log('Platform Cost Total:', `$${currentPeriod.platformCostTotal}`);
  console.log('Estimated Total Cost:', `$${currentPeriod.estimatedTotalCost}`);

  console.log('\nBilling History Count:', history.length);
  console.log('Usage Events Count:', usageEvents.length);

  process.exit(0);
}

testBilling();
