import prisma from '../server/lib/prisma';

async function main() {
  const call = await prisma.call.findUnique({
    where: { id: 'call_rohnit_roy_live_01' },
  });

  if (!call) return;

  const str = JSON.stringify(call.extractedVariables);
  const updatedStr = str.replace(/9922935920/g, '7522911068');
  const updatedVars = JSON.parse(updatedStr);

  await prisma.call.update({
    where: { id: 'call_rohnit_roy_live_01' },
    data: {
      extractedVariables: updatedVars,
    },
  });

  console.log('✅ Updated call extracted variables with new phone 7522911068');
  await prisma.$disconnect();
}

main().catch(console.error);
