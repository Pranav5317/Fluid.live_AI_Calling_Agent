import prisma from '../server/lib/prisma';

async function applyMigration() {
  console.log('⚡ Applying Migration 20260924000000_make_call_campaign_optional to Neon PostgreSQL...\n');

  try {
    // 1. Drop existing CASCADE foreign key constraints
    await prisma.$executeRawUnsafe(`ALTER TABLE "calls" DROP CONSTRAINT IF EXISTS "calls_campaignId_fkey";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "usage_events" DROP CONSTRAINT IF EXISTS "usage_events_campaignId_fkey";`);

    // 2. Make campaignId nullable on calls and usage_events
    await prisma.$executeRawUnsafe(`ALTER TABLE "calls" ALTER COLUMN "campaignId" DROP NOT NULL;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "usage_events" ALTER COLUMN "campaignId" DROP NOT NULL;`);

    // 3. Add SET NULL foreign key constraints
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "calls" 
      ADD CONSTRAINT "calls_campaignId_fkey" 
      FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "usage_events" 
      ADD CONSTRAINT "usage_events_campaignId_fkey" 
      FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    console.log('✅ PostgreSQL Schema updated successfully: calls.campaignId and usage_events.campaignId are now nullable (String?).');
  } catch (err) {
    console.error('❌ Error executing migration DDL on Neon:', err);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();

