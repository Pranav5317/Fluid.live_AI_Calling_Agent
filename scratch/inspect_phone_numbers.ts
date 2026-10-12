import prisma from '../server/lib/prisma';

async function inspectPhoneNumbers() {
  console.log('\n📞 Inspecting Phone Numbers in Neon PostgreSQL Database...\n');

  try {
    const phoneNumbers = await prisma.phoneNumber.findMany({
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Total Phone Numbers Found: ${phoneNumbers.length}\n`);

    phoneNumbers.forEach((p, index) => {
      console.log(`[${index + 1}] ID: ${p.id}`);
      console.log(`    Phone Number: ${p.phoneNumber}`);
      console.log(`    Status: ${p.status}`);
      console.log(`    Provider: ${p.provider}`);
      console.log(`    Provider ID: ${p.providerId || 'None'}`);
      console.log(`    Business ID: ${p.businessId || 'None'}`);
      console.log(`    Created At: ${p.createdAt.toISOString()}\n`);
    });
  } catch (err: any) {
    console.error('❌ Error querying phone_numbers:', err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectPhoneNumbers();
