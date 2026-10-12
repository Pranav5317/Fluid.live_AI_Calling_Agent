import prisma from '../server/lib/prisma';

async function seedRealPhoneNumber() {
  console.log('\n📱 Seeding & Cleaning Phone Numbers in Neon DB...\n');

  try {
    const firstBiz = await prisma.business.findFirst();
    const bizId = firstBiz ? firstBiz.id : 'biz_01h9x7890abcdef';

    // 1. Upsert Real Production Sarvam Phone Number
    const realNumber = await prisma.phoneNumber.upsert({
      where: { phoneNumber: '+917965480599' },
      create: {
        id: 'phone_sarvam_prod_01',
        phoneNumber: '+917965480599',
        status: 'active',
        provider: 'Sarvam Voice Telephony Infrastructure',
        providerId: '7efd8897-87-220da5aa-1d5e',
        businessId: bizId,
      },
      update: {
        status: 'active',
        provider: 'Sarvam Voice Telephony Infrastructure',
        providerId: '7efd8897-87-220da5aa-1d5e',
        businessId: bizId,
      },
    });

    console.log(`✅ Upserted Production Sarvam Phone Number:`);
    console.log(`   ID: ${realNumber.id}`);
    console.log(`   Phone Number: ${realNumber.phoneNumber}`);
    console.log(`   Provider ID (Connection ID): ${realNumber.providerId}`);
    console.log(`   Status: ${realNumber.status}\n`);

    // 2. Fetch and list all phone numbers after seeding
    const allNumbers = await prisma.phoneNumber.findMany({ orderBy: { createdAt: 'desc' } });
    console.log(`📋 Total Phone Numbers in Neon DB Now (${allNumbers.length}):`);
    allNumbers.forEach((n) => console.log(`   - ${n.phoneNumber} | Status: ${n.status} | Provider ID: ${n.providerId || 'N/A'}`));

  } catch (err: any) {
    console.error('❌ Error seeding real phone number:', err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

seedRealPhoneNumber();
