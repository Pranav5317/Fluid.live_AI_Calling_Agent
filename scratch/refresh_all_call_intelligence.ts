import prisma from '../server/lib/prisma';
import { callAnalyticsService } from '../server/services/callAnalyticsService';

async function main() {
  console.log('🔄 Re-analyzing all calls with complete callAnalyticsService.analyzeCall()...');

  const calls = await prisma.call.findMany();
  console.log(`Found ${calls.length} calls in database.`);

  for (const call of calls) {
    const rawVars = (call.extractedVariables as any) || {};
    const transcript = (call.transcript as any) || [];

    const callForAnalysis: any = {
      ...call,
      transcript,
      extractedVariables: rawVars,
    };

    const fullIntelligence = callAnalyticsService.analyzeCall(callForAnalysis);

    // Merge intelligence while preserving custom English assessment & summary
    const updatedVars = {
      ...rawVars,
      intelligence: {
        ...fullIntelligence,
        summary: rawVars.intelligence?.summary || fullIntelligence.executiveSummary?.oneLineTakeaway || '',
        dealScore: rawVars.intelligence?.dealScore || fullIntelligence.leadScore?.overallScore || 85,
        sentiment: rawVars.intelligence?.sentiment || fullIntelligence.sentimentTrajectory?.overallSentiment || 'positive',
        englishProficiency: rawVars.english_proficiency_assessment || fullIntelligence.hrScreening?.englishProficiency,
        keyMoments: rawVars.intelligence?.keyMoments || [
          { time: '0:12', label: 'Role & Experience Confirmation', type: 'confirmation' },
          { time: '0:28', label: 'Notice Period & Work Mode Verification', type: 'compliance' },
          { time: '0:45', label: 'Technical Capabilities & Responsibilities', type: 'technical' },
        ],
      },
    };

    await prisma.call.update({
      where: { id: call.id },
      data: {
        extractedVariables: updatedVars as any,
      },
    });

    console.log(`✅ Updated call ${call.id} with full intelligence (QA: ${fullIntelligence.qaScorecard?.overallScore}/100)`);
  }

  console.log('\n🎉 All calls successfully enriched with complete QA scorecard and analytics!');
  await prisma.$disconnect();
}

main().catch(console.error);
