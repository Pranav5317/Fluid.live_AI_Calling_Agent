import prisma from '../server/lib/prisma';
import { dashboardRepository } from '../server/repositories/dashboardRepository';
import { businessRepository } from '../server/repositories/businessRepository';
import { campaignRepository } from '../server/repositories/campaignRepository';

async function debugDashboardAll() {
  console.log('\n🔍 Debugging All Dashboard Endpoints for HTTP 500...\n');

  // 1. GET /api/dashboard/metrics
  try {
    const metrics = await dashboardRepository.getMetrics();
    console.log('✅ 1. getMetrics() -> OK');
  } catch (e: any) {
    console.error('❌ 1. getMetrics() FAILED:', e.message);
  }

  // 2. GET /api/dashboard/activity
  try {
    const activity = await dashboardRepository.getRecentActivities();
    console.log('✅ 2. getRecentActivities() -> OK (Items:', activity.length, ')');
  } catch (e: any) {
    console.error('❌ 2. getRecentActivities() FAILED:', e.message);
  }

  // 3. GET /api/dashboard/chart
  try {
    const chart = await dashboardRepository.getCallActivityChart();
    console.log('✅ 3. getCallActivityChart() -> OK (Points:', chart.length, ')');
  } catch (e: any) {
    console.error('❌ 3. getCallActivityChart() FAILED:', e.message);
  }

  // 4. GET /api/dashboard/business
  try {
    const biz = await businessRepository.getBusinessProfile();
    console.log('✅ 4. getBusinessProfile() -> OK:', biz?.name);
  } catch (e: any) {
    console.error('❌ 4. getBusinessProfile() FAILED:', e.message);
  }

  // 5. GET /api/campaigns
  try {
    const cmps = await campaignRepository.getCampaigns();
    console.log('✅ 5. getCampaigns() -> OK (Items:', cmps.length, ')');
  } catch (e: any) {
    console.error('❌ 5. getCampaigns() FAILED:', e.message);
  }

  await prisma.$disconnect();
}

debugDashboardAll();
