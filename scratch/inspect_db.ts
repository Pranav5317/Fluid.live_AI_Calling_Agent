import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectDatabase() {
  console.log('🔍 Running Neon PostgreSQL Migration Preflight Inspection...\n');

  try {
    // 1. Query information_schema.tables to get all tables in public schema
    const tables: any[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    console.log('📋 Existing PostgreSQL Tables in "public" schema:');
    const tableNames = tables.map((t) => t.table_name);
    console.log(tableNames.join(', '));
    console.log(`Total tables found: ${tableNames.length}\n`);

    // 2. Check if _prisma_migrations table exists
    const hasMigrationsTable = tableNames.includes('_prisma_migrations');
    console.log(`📌 "_prisma_migrations" table status: ${hasMigrationsTable ? 'EXISTS' : 'DOES NOT EXIST'}`);

    if (hasMigrationsTable) {
      const migrationRows: any[] = await prisma.$queryRaw`SELECT * FROM _prisma_migrations;`;
      console.log(`Migration entries recorded: ${migrationRows.length}`);
    }

    // 3. Count rows in key application tables
    console.log('\n📊 Row Counts in Key Application Tables:');
    const counts: Record<string, number> = {
      businesses: await prisma.business.count(),
      agents: await prisma.agent.count(),
      agent_versions: await prisma.agentVersion.count(),
      campaigns: await prisma.campaign.count(),
      leads: await prisma.lead.count(),
      campaign_leads: await prisma.campaignLead.count(),
      calls: await prisma.call.count(),
      usage_events: await prisma.usageEvent.count(),
      billing_periods: await prisma.billingPeriod.count(),
      knowledge_bases: await prisma.knowledgeBase.count(),
      phone_numbers: await prisma.phoneNumber.count(),
      webhook_events: await prisma.webhookEvent.count(),
    };

    for (const [tbl, count] of Object.entries(counts)) {
      console.log(`  - ${tbl}: ${count} rows`);
    }

    console.log('\n✅ Migration Preflight Database Inspection Complete.');
  } catch (err) {
    console.error('❌ Error during preflight database inspection:', err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDatabase();

