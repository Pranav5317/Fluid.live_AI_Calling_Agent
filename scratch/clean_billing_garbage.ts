import prisma from '../server/lib/prisma';

async function cleanBillingGarbage() {
  console.log('--- Cleaning Billing & Usage Garbage Data from Neon DB ---');

  const deletedBps = await prisma.billingPeriod.deleteMany({});
  console.log(`Deleted ${deletedBps.count} legacy billing period records.`);

  const deletedUes = await prisma.usageEvent.deleteMany({});
  console.log(`Deleted ${deletedUes.count} legacy usage event records.`);

  // Create clean current billing period record
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  await prisma.billingPeriod.create({
    data: {
      id: `bp_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`,
      periodName: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
      startDate: startOfMonth,
      endDate: endOfMonth,
      totalMinutesUsed: 0,
      totalCallsCount: 0,
      providerCostTotal: 0,
      platformCostTotal: 0,
      estimatedTotalCost: 0,
      status: 'current',
    },
  });

  console.log('[SUCCESS] Cleaned billing DB tables. Initialized active period for current month.');
  process.exit(0);
}

cleanBillingGarbage();
