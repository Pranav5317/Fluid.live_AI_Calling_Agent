import { serverCallService } from '../server/services/callService';
import { serverCampaignService } from '../server/services/campaignService';
import prisma from '../server/lib/prisma';

async function runLiveTest() {
  console.log('--- Triggering Live Sarvam AI Outbound Call Test ---');

  const lead = await prisma.lead.findFirst();
  const agentVersion = await prisma.agentVersion.findFirst();
  const phone = await prisma.phoneNumber.findFirst();

  if (!lead || !agentVersion || !phone) {
    console.error('Missing DB records (lead, agentVersion, or phone)');
    process.exit(1);
  }

  console.log(`Lead: ${lead.name} (${lead.phone})`);
  console.log(`Agent Version: ${agentVersion.id}`);
  console.log(`From Phone: ${phone.phoneNumber}`);

  console.log('\n[1] Initiating Direct Test Call via Sarvam Provider...');
  try {
    const callRecord = await serverCallService.initiateTestCall({
      agentVersionId: agentVersion.id,
      phoneNumberId: phone.id,
      toPhoneNumber: lead.phone,
      leadId: lead.id,
    });
    console.log('[SUCCESS] Direct call initiated! Record:', callRecord);
  } catch (err: any) {
    console.error('[ERROR] Failed to initiate direct call:', err.message);
  }

  console.log('\n[2] Checking existing campaigns in DB...');
  const campaigns = await prisma.campaign.findMany();
  console.log(`Found ${campaigns.length} campaigns.`);

  if (campaigns.length > 0) {
    const latestCampaign = campaigns[0];
    console.log(`Starting campaign ${latestCampaign.id} (${latestCampaign.name})...`);
    try {
      const result = await serverCampaignService.startCampaign(latestCampaign.id);
      console.log('[SUCCESS] Campaign started:', result);
    } catch (err: any) {
      console.error('[ERROR] Failed to start campaign:', err.message);
    }
  }

  process.exit(0);
}

runLiveTest();
