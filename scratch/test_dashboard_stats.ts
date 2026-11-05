import { dashboardRepository } from '../server/repositories/dashboardRepository';
import prisma from '../server/lib/prisma';

async function test() {
  console.log('Testing dashboardRepository.getMetrics()...');
  const stats = await dashboardRepository.getMetrics();
  console.log('Metrics keys:', Object.keys(stats));
  console.log('Total calls:', stats.callsAttempted);
  console.log('Completed:', stats.completedCallsCount);
  console.log('intelligenceSummary:', JSON.stringify(stats.intelligenceSummary, null, 2));
  await prisma.$disconnect();
}

test().catch(console.error);
