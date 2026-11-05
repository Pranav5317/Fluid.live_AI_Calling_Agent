import prisma from '../server/lib/prisma';
import { callRepository } from '../server/repositories/callRepository';
import { serverCallService } from '../server/services/callService';

async function check() {
  const calls = await serverCallService.getCalls();
  console.log(`\n=== Verification: Fetched ${calls.length} calls from ServerCallService ===\n`);
  for (const c of calls.slice(0, 8)) {
    const vars = c.extractedVariables || {};
    const hr = (vars as any).intelligence?.hrScreening;
    console.log(`[${c.id}] Candidate: "${c.leadName}" | Role: "${vars.applied_role || hr?.roleApplied}" | Exp: "${vars.confirmed_experience || hr?.verificationMatrix?.[1]?.statedValue}" | Notice: "${vars.confirmed_notice_period || hr?.verificationMatrix?.[2]?.statedValue}" | English: "${hr?.englishAssessment?.overallBand || vars.english_proficiency_level}"`);
  }
  await prisma.$disconnect();
}

check().catch(console.error);

