import prisma from '../server/lib/prisma';

async function main() {
  const newPhone = '+91 7522 911 068';
  console.log(`Updating Rohnit Roy's phone number to ${newPhone}...`);

  // Update Rohnit's lead
  const updatedLead = await prisma.lead.update({
    where: { id: 'lead_rohnit_roy_01' },
    data: {
      phone: newPhone,
    },
  });

  console.log('✅ Lead updated successfully:', updatedLead.id, updatedLead.name, updatedLead.phone);

  // Check calls associated with this lead
  const calls = await prisma.call.findMany({
    where: { leadId: 'lead_rohnit_roy_01' },
    include: { lead: true },
  });

  for (const call of calls) {
    console.log(`Call ${call.id} associated lead phone: ${call.lead?.phone}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
