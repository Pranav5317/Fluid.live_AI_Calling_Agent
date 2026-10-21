import {
  Call,
  CallIntelligence,
  CallPacingDynamics,
  QAComplianceReport,
  QAComplianceItem,
  ObjectionDetection,
  BuyingSignal,
  SentimentPhase,
  NextBestAction,
  TranscriptMessage,
  CallMilestoneProgress,
  ScriptDropOffStage,
  ScriptDropOffFunnel,
} from '../../src/types';

export class CallAnalyticsService {
  /**
   * Performs deep, automated conversational analysis on a call session.
   * Parses verbatim Hindi/Hinglish/English turns, computes airtime metrics,
   * runs automated QA script audits, detects objections & buying signals,
   * and provides a next-best-action recommendation for sales/operations.
   */
  analyzeCall(call: Call): CallIntelligence {
    const transcript: TranscriptMessage[] = Array.isArray(call.transcript) ? call.transcript : [];
    const durationSecs = call.durationSeconds || 0;
    const extractedVars = call.extractedVariables || {};

    const talkToListen = this.computePacingDynamics(transcript, durationSecs);
    const qaScorecard = this.auditQAScriptCompliance(transcript, call);
    const objections = this.detectObjections(transcript);
    const buyingSignals = this.detectBuyingSignals(transcript, extractedVars);
    const sentimentTrajectory = this.computeSentimentTrajectory(transcript, extractedVars);
    const nextBestAction = this.generateNextBestAction(call, buyingSignals, objections, extractedVars);
    const milestones = this.computeMilestoneProgress(transcript, call);

    return {
      talkToListen,
      qaScorecard,
      objections,
      buyingSignals,
      sentimentTrajectory,
      nextBestAction,
      milestones,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * 1. Talk-to-Listen Ratio & Conversational Pacing Dynamics
   */
  private computePacingDynamics(transcript: TranscriptMessage[], durationSecs: number): CallPacingDynamics {
    if (transcript.length === 0 || durationSecs === 0) {
      return {
        agentWordCount: 0,
        leadWordCount: 0,
        totalWordCount: 0,
        agentTalkPercentage: 0,
        leadTalkPercentage: 0,
        agentWPM: 0,
        leadWPM: 0,
        turnCount: 0,
        avgTurnLengthWords: 0,
        pacingAssessment: 'unbalanced',
        pacingSummary: 'No verbal turns recorded; call terminated without active dialogue.',
      };
    }

    let agentWords = 0;
    let leadWords = 0;

    for (const turn of transcript) {
      const words = turn.text.trim().split(/\s+/).filter(Boolean).length;
      if (turn.speaker === 'agent') {
        agentWords += words;
      } else {
        leadWords += words;
      }
    }

    const totalWords = agentWords + leadWords;
    let agentTalkPercentage = 50;
    let leadTalkPercentage = 50;

    if (totalWords > 0) {
      agentTalkPercentage = Math.round((agentWords / totalWords) * 100);
      leadTalkPercentage = 100 - agentTalkPercentage;
    } else if (agentWords > 0 && leadWords === 0) {
      agentTalkPercentage = 100;
      leadTalkPercentage = 0;
    }

    const durationMinutes = Math.max(durationSecs / 60, 0.1);
    const agentWPM = Math.round(agentWords / durationMinutes);
    const leadWPM = Math.round(leadWords / durationMinutes);
    const avgTurnLengthWords = Math.round(totalWords / transcript.length);

    let pacingAssessment: 'optimal' | 'fast_paced' | 'slow_paced' | 'unbalanced' = 'optimal';
    let pacingSummary = 'Balanced enterprise conversational exchange.';

    if (leadWords === 0) {
      pacingAssessment = 'unbalanced';
      pacingSummary = 'One-sided monologue. Customer remained silent or hung up during introduction.';
    } else if (agentTalkPercentage > 75) {
      pacingAssessment = 'unbalanced';
      pacingSummary = `Agent dominated airtime (${agentTalkPercentage}%). Consider shortening value pitch to encourage customer replies.`;
    } else if (agentTalkPercentage < 35) {
      pacingAssessment = 'unbalanced';
      pacingSummary = `Customer dominated airtime (${leadTalkPercentage}%). High prospect engagement or detailed feedback.`;
    } else if (agentWPM > 175) {
      pacingAssessment = 'fast_paced';
      pacingSummary = `Agent cadence is fast (${agentWPM} WPM). Recommended rate for Indian voice outreach is 120-145 WPM.`;
    } else {
      pacingAssessment = 'optimal';
      pacingSummary = `Ideal conversational ratio: Agent spoke ${agentTalkPercentage}% of words; prospect engaged for ${leadTalkPercentage}%.`;
    }

    return {
      agentWordCount: agentWords,
      leadWordCount: leadWords,
      totalWordCount: totalWords,
      agentTalkPercentage,
      leadTalkPercentage,
      agentWPM,
      leadWPM,
      turnCount: transcript.length,
      avgTurnLengthWords,
      pacingAssessment,
      pacingSummary,
    };
  }

  /**
   * 2. Automated QA Script Compliance Audit (0 - 100 Scorecard)
   */
  private auditQAScriptCompliance(transcript: TranscriptMessage[], call: Call): QAComplianceReport {
    const checklist: QAComplianceItem[] = [];
    const agentTurns = transcript.filter(t => t.speaker === 'agent');
    const combinedAgentText = agentTurns.map(t => t.text.toLowerCase()).join(' ');

    // Item 1: Agent Identification & Brand Disclosure (20 pts)
    const brandPattern = /(fluid\.live|fluid\s*live|fluid)/i;
    const agentNamePattern = /(shubh|शुभ|mera\s*naam|my\s*name)/i;
    const passedBrand = brandPattern.test(combinedAgentText) && agentNamePattern.test(combinedAgentText);
    checklist.push({
      id: 'qa_brand_id',
      category: 'Identification',
      criterion: 'Agent Identification & Brand Disclosure',
      score: passedBrand ? 20 : 0,
      passed: passedBrand,
      details: passedBrand
        ? 'Agent clearly introduced self as Shubh representing Fluid.live.'
        : 'Failed to mention both agent identity and company brand in opening.',
    });

    // Item 2: Customer Identity Verification (20 pts)
    const leadName = (call.extractedVariables?.user_name || '').toLowerCase();
    const verifyPattern = new RegExp(`(${leadName || 'pranav'}|kya\\s*meri\\s*baat|baat\\s*ho\\s*rahi\\s*hai|am\\s*i\\s*speaking|is\\s*this)`, 'i');
    const passedVerify = verifyPattern.test(combinedAgentText) || call.extractedVariables?.verification_status === 'completed';
    checklist.push({
      id: 'qa_verification',
      category: 'Verification',
      criterion: 'Target Contact Verification',
      score: passedVerify ? 20 : 0,
      passed: passedVerify,
      details: passedVerify
        ? 'Agent addressed customer respectfully by name and validated identity.'
        : 'Customer identity verification omitted in opening dialogue.',
    });

    // Item 3: Core Value Proposition Articulation (20 pts)
    const pitchPattern = /(ai\s*voice\s*calling|calling|reminders|follow\s*ups|voice\s*calling|business|businesses)/i;
    const passedPitch = pitchPattern.test(combinedAgentText);
    checklist.push({
      id: 'qa_pitch',
      category: 'Pitch Clarity',
      criterion: 'Value Proposition Articulation',
      score: passedPitch ? 20 : 0,
      passed: passedPitch,
      details: passedPitch
        ? 'Articulated core AI voice calling capabilities and automated follow-up benefits.'
        : 'Value proposition was not delivered or call ended prematurely.',
    });

    // Item 4: Active Consent & Channel Preference Discovery (20 pts)
    const discoveryPattern = /(chhota\s*sa\s*sawal|ek\s*sawal|quick\s*question|whatsapp|demo|preference|prefer)/i;
    const passedDiscovery = discoveryPattern.test(combinedAgentText) || Boolean(call.extractedVariables?.follow_up_preference);
    checklist.push({
      id: 'qa_discovery',
      category: 'Consent & Discovery',
      criterion: 'Explicit Consent & Channel Preference',
      score: passedDiscovery ? 20 : 0,
      passed: passedDiscovery,
      details: passedDiscovery
        ? 'Politely sought permission before pitching and gathered follow-up channel preference.'
        : 'No customer consent or follow-up preference captured.',
    });

    // Item 5: Professional Courteous Sign-off (20 pts)
    const closingPattern = /(shukriya|शुक्रिया|din\s*shubh|thank\s*you|thanks|aapka\s*din|have\s*a\s*great\s*day)/i;
    const passedClosing = closingPattern.test(combinedAgentText);
    checklist.push({
      id: 'qa_closing',
      category: 'Professionalism',
      criterion: 'Courteous Enterprise Sign-off',
      score: passedClosing ? 20 : 0,
      passed: passedClosing,
      details: passedClosing
        ? 'Agent thanked prospect for their time and closed with polite cultural greeting.'
        : 'Call terminated abruptly without standard courteous sign-off.',
    });

    const overallScore = checklist.reduce((sum, item) => sum + item.score, 0);

    let grade: 'A+' | 'A' | 'B' | 'C' | 'Needs Improvement' = 'Needs Improvement';
    let status: 'passed' | 'warning' | 'failed' = 'failed';
    let keyFeedback = '';

    if (overallScore >= 95) {
      grade = 'A+';
      status = 'passed';
      keyFeedback = 'Flawless execution. All compliance and conversational milestones fulfilled.';
    } else if (overallScore >= 80) {
      grade = 'A';
      status = 'passed';
      keyFeedback = 'Strong compliance. Minor opportunities in discovery cadence.';
    } else if (overallScore >= 60) {
      grade = 'B';
      status = 'warning';
      keyFeedback = 'Acceptable. Call completed partial workflow before disengagement.';
    } else if (overallScore >= 40) {
      grade = 'C';
      status = 'warning';
      keyFeedback = 'Incomplete dialogue. Critical script checkpoints were missed.';
    } else {
      grade = 'Needs Improvement';
      status = 'failed';
      keyFeedback = 'Call dropped early or customer hung up before core script delivery.';
    }

    return {
      overallScore,
      grade,
      status,
      checklist,
      keyFeedback,
    };
  }

  /**
   * 3. Objection & Friction Detection (Hindi / Hinglish / English)
   */
  private detectObjections(transcript: TranscriptMessage[]): ObjectionDetection[] {
    const objections: ObjectionDetection[] = [];
    const leadTurns = transcript.filter(t => t.speaker === 'lead');

    const patterns = [
      {
        category: 'pricing' as const,
        label: 'Pricing / Budget Concern',
        regex: /(kitna\s*kharcha|rate\s*kya|expensive|mehenga|cost|price|kitne\s*paise|charges|fees|budget|kitna\s*lagega|kya\s*charge)/i,
      },
      {
        category: 'timing' as const,
        label: 'Timing / Busyness Hesitation',
        regex: /(busy|baad\s*me|not\s*right\s*now|call\s*later|time\s*nahi|driving|meeting|abhi\s*nahi|kal\s*call|fursat\s*nahi|busy\s*hoon|free\s*nahi)/i,
      },
      {
        category: 'ai_skepticism' as const,
        label: 'AI / Bot Skepticism',
        regex: /(ai\s*ho|robot|computer|machine|real\s*person|insaan|asli\s*insaan|recorded|automated|bot\s*ho)/i,
      },
      {
        category: 'competitor' as const,
        label: 'Existing Provider / Competitor',
        regex: /(already\s*using|pehle\s*se|kisi\s*aur\s*se|dusra\s*software|dusri\s*service|already\s*have|vendor)/i,
      },
      {
        category: 'authority' as const,
        label: 'Authority / Gatekeeper Escalation',
        regex: /(boss\s*se|owner\s*se|sir\s*se|decision\s*maker|papa\s*se|kisi\s*aur\s*ka\s*phone|puchna\s*padega)/i,
      },
    ];

    for (const turn of leadTurns) {
      for (const p of patterns) {
        if (p.regex.test(turn.text)) {
          objections.push({
            category: p.category,
            label: p.label,
            detectedText: turn.text,
            speaker: 'lead',
            turnId: turn.id,
            confidence: 0.92,
          });
        }
      }
    }

    return objections;
  }

  /**
   * 4. Buying Signal & High Intent Detection
   */
  private detectBuyingSignals(transcript: TranscriptMessage[], extractedVars: Record<string, any>): BuyingSignal[] {
    const signals: BuyingSignal[] = [];
    const leadTurns = transcript.filter(t => t.speaker === 'lead');

    // Check transcript turns
    for (const turn of leadTurns) {
      const text = turn.text.toLowerCase();

      // Signal A: WhatsApp Information Request
      if (/(whatsapp|whats\s*app|details\s*bhejo|bhej\s*do|bhejiye|pdf|catalogue|brochure|message\s*karo)/i.test(text)) {
        signals.push({
          type: 'whatsapp_request',
          label: 'Requested WhatsApp Documentation & Pricing',
          detectedText: turn.text,
          turnId: turn.id,
          confidence: 0.96,
        });
      }

      // Signal B: Demo Request
      if (/(demo|sample|trial|dikhao|dekhna\s*hai|meeting|schedule|presentation)/i.test(text)) {
        signals.push({
          type: 'demo_request',
          label: 'Requested Live Product Demonstration',
          detectedText: turn.text,
          turnId: turn.id,
          confidence: 0.94,
        });
      }

      // Signal C: Explicit Affirmative Interest
      if (/(interested|haan\s*interest|bilkul|sure|sahi\s*hai|acha\s*laga|achha\s*laga|aur\s*batao|theek\s*hai)/i.test(text)) {
        signals.push({
          type: 'affirmative_interest',
          label: 'Expressed Explicit Business Interest',
          detectedText: turn.text,
          turnId: turn.id,
          confidence: 0.95,
        });
      }

      // Signal D: Identity & Contact Verification
      if (/(haan|bol\s*raha\s*hoon|speaking|yes\s*speaking|ji\s*haan)/i.test(text) && signals.length === 0) {
        signals.push({
          type: 'contact_verification',
          label: 'Confirmed Target Identity',
          detectedText: turn.text,
          turnId: turn.id,
          confidence: 0.9,
        });
      }
    }

    // Also inject signals from Sarvam extracted variables if not already caught
    if (extractedVars.interest_level === 'interested' && !signals.some(s => s.type === 'affirmative_interest')) {
      signals.push({
        type: 'affirmative_interest',
        label: 'Sarvam AI Flagged High Purchase Intent',
        detectedText: extractedVars.call_summary || 'Customer expressed positive interest during conversation.',
        turnId: 'sarvam_summary',
        confidence: 0.95,
      });
    }

    if (
      extractedVars.follow_up_preference === 'whatsapp_details' &&
      !signals.some(s => s.type === 'whatsapp_request')
    ) {
      signals.push({
        type: 'whatsapp_request',
        label: 'WhatsApp Follow-Up Preference Recorded',
        detectedText: 'Preferred follow-up via WhatsApp details.',
        turnId: 'sarvam_follow_up',
        confidence: 0.98,
      });
    }

    return signals;
  }

  /**
   * 5. Sentiment Trajectory Analysis (Opening -> Pitch -> Closing)
   */
  private computeSentimentTrajectory(transcript: TranscriptMessage[], extractedVars: Record<string, any>) {
    if (transcript.length === 0) {
      return {
        overallSentiment: 'neutral' as const,
        overallScore: 0,
        trajectoryTrend: 'neutral' as const,
        phases: [],
      };
    }

    const turnsCount = transcript.length;
    const openingEnd = Math.max(1, Math.floor(turnsCount * 0.33));
    const pitchEnd = Math.max(openingEnd + 1, Math.floor(turnsCount * 0.67));

    const openingTurns = transcript.slice(0, openingEnd);
    const pitchTurns = transcript.slice(openingEnd, pitchEnd);
    const closingTurns = transcript.slice(pitchEnd);

    const scorePhase = (phase: 'opening' | 'pitch' | 'closing', turns: TranscriptMessage[]): SentimentPhase => {
      const combined = turns.map(t => t.text).join(' ').toLowerCase();

      let positiveMarkers = (combined.match(/(shukriya|शुक्रिया|achha|acha|great|interested|sure|haan|हाँ|bhejo|sahi|wah|good|whatsapp|शुभ|धन्यवाद|thanks)/gi) || []).length;
      let negativeMarkers = (combined.match(/(nahi|नहीं|busy|mat|not|fursat|wrong|disconnect|bekaar)/gi) || []).length;

      let score = 0;
      let sentiment: 'positive' | 'neutral' | 'negative' | 'hesitant' = 'neutral';

      if (positiveMarkers > negativeMarkers) {
        score = Math.min(1.0, 0.4 + (positiveMarkers - negativeMarkers) * 0.2);
        sentiment = 'positive';
      } else if (negativeMarkers > positiveMarkers) {
        score = Math.max(-1.0, -0.4 - (negativeMarkers - positiveMarkers) * 0.2);
        sentiment = 'negative';
      } else if (turns.length === 0 || turns.every(t => t.speaker === 'agent')) {
        score = 0;
        sentiment = 'hesitant';
      }

      return {
        phase,
        sentiment,
        score: Number(score.toFixed(2)),
        snippet: turns.length > 0 ? turns[turns.length - 1].text.slice(0, 80) : undefined,
      };
    };

    const phases = [
      scorePhase('opening', openingTurns),
      scorePhase('pitch', pitchTurns),
      scorePhase('closing', closingTurns),
    ];

    if (extractedVars.interest_level === 'interested') {
      if (phases[1]) {
        phases[1].score = Math.max(phases[1].score, 0.8);
        phases[1].sentiment = 'positive';
      }
      if (phases[2]) {
        phases[2].score = Math.max(phases[2].score, 0.9);
        phases[2].sentiment = 'positive';
      }
    }

    let overallScore = phases.reduce((acc, p) => acc + p.score, 0) / phases.length;
    if (extractedVars.interest_level === 'interested') {
      overallScore = Math.max(overallScore, 0.85);
    } else if (extractedVars.interest_level === 'not_interested') {
      overallScore = Math.min(overallScore, -0.6);
    }

    let overallSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (overallScore > 0.2) overallSentiment = 'positive';
    else if (overallScore < -0.2) overallSentiment = 'negative';

    let trajectoryTrend: 'consistently_positive' | 'ascending' | 'descending' | 'neutral' | 'disengaged' = 'neutral';
    if (phases[0].score >= 0.3 && phases[2].score >= 0.5) {
      trajectoryTrend = 'consistently_positive';
    } else if (phases[2].score > phases[0].score && phases[2].score > 0.3) {
      trajectoryTrend = 'ascending';
    } else if (phases[2].score < phases[0].score && phases[2].score < 0) {
      trajectoryTrend = 'descending';
    } else if (transcript.every(t => t.speaker === 'agent')) {
      trajectoryTrend = 'disengaged';
    }

    return {
      overallSentiment,
      overallScore: Number(overallScore.toFixed(2)),
      trajectoryTrend,
      phases,
    };
  }

  /**
   * 6. Next Best Action Generator
   */
  private generateNextBestAction(
    call: Call,
    buyingSignals: BuyingSignal[],
    objections: ObjectionDetection[],
    extractedVars: Record<string, any>
  ): NextBestAction {
    const leadName = extractedVars.user_name || 'Customer';

    // Rule A: Prospect explicitly opted for WhatsApp details
    if (
      extractedVars.follow_up_preference === 'whatsapp_details' ||
      buyingSignals.some(s => s.type === 'whatsapp_request')
    ) {
      return {
        actionTitle: `Dispatch WhatsApp Demo & One-Pager to ${leadName}`,
        actionType: 'dispatch_whatsapp',
        priority: 'urgent',
        suggestedMessage: `Namaste ${leadName} ji, thank you for speaking with Fluid.live! As requested, here is our 1-minute video demo and enterprise pricing brochure for AI Voice Calling. Let us know if you would like to test a sample workflow!`,
      };
    }

    // Rule B: Demo or Callback requested
    if (
      extractedVars.follow_up_preference === 'callback' ||
      buyingSignals.some(s => s.type === 'demo_request')
    ) {
      return {
        actionTitle: `Schedule Solution Architect Live Demo with ${leadName}`,
        actionType: 'book_demo',
        priority: 'high',
        suggestedMessage: `Namaste ${leadName} ji, following our conversation, our team would love to show you how Fluid.live automates 10,000+ customer calls daily. When is a convenient time for a 10-minute walkthrough?`,
      };
    }

    // Rule C: Timing objection (busy right now)
    if (objections.some(o => o.category === 'timing')) {
      return {
        actionTitle: `Auto-Schedule Follow-up Call for ${leadName}`,
        actionType: 'schedule_callback',
        priority: 'medium',
        suggestedMessage: `Namaste ${leadName} ji, sorry to have caught you at a busy moment! We will reach out again tomorrow at a better time. Have a wonderful day ahead!`,
      };
    }

    // Rule D: Not interested / disengaged
    if (extractedVars.interest_level === 'not_interested' || call.outcome === 'not_interested') {
      return {
        actionTitle: `Mark Lead as Unqualified & Suppress Dialer`,
        actionType: 'suppress',
        priority: 'low',
      };
    }

    // Rule E: Incomplete / Silent Call
    if (call.durationSeconds > 0 && (!call.transcript || call.transcript.length <= 1)) {
      return {
        actionTitle: `Re-queue for Secondary Afternoon Calling Slot`,
        actionType: 're_queue',
        priority: 'medium',
      };
    }

    // Default Fallback
    return {
      actionTitle: `Log Interaction & Review Call Recording`,
      actionType: 'escalate_human',
      priority: 'medium',
    };
  }

  /**
   * 7. Conversational Milestone Progress (Per-Call Funnel)
   */
  computeMilestoneProgress(transcript: TranscriptMessage[], call: Call): CallMilestoneProgress {
    const stagesCompleted: ('greeting' | 'verification' | 'pitch' | 'discovery' | 'close')[] = [];
    const leadTurns = transcript.filter(t => t.speaker === 'lead');
    const agentTurns = transcript.filter(t => t.speaker === 'agent');

    // Milestone 1: Greeting delivered
    if (call.durationSeconds > 0 || transcript.length >= 1) {
      stagesCompleted.push('greeting');
    }

    // Milestone 2: Contact Verification (Lead acknowledged identity or spoke back)
    const isVerified =
      call.extractedVariables?.verification_status === 'completed' ||
      leadTurns.length >= 1 ||
      transcript.length >= 2;
    if (isVerified && stagesCompleted.includes('greeting')) {
      stagesCompleted.push('verification');
    }

    // Milestone 3: Value Proposition Delivered (Agent pitched benefits)
    const hasPitched = agentTurns.length >= 2 || transcript.length >= 3;
    if (hasPitched && stagesCompleted.includes('verification')) {
      stagesCompleted.push('pitch');
    }

    // Milestone 4: Channel Discovery & Preference (Asked for WhatsApp/Demo or customer expressed preference)
    const hasDiscovery =
      Boolean(call.extractedVariables?.follow_up_preference) ||
      call.extractedVariables?.interest_level === 'interested' ||
      transcript.length >= 5;
    if (hasDiscovery && stagesCompleted.includes('pitch')) {
      stagesCompleted.push('discovery');
    }

    // Milestone 5: Confirmed Close (Polite sign-off reached)
    const hasClosed =
      stagesCompleted.includes('discovery') &&
      (transcript.length >= 7 ||
        call.outcome === 'successful_contact' ||
        call.outcome === 'callback_requested');
    if (hasClosed) {
      stagesCompleted.push('close');
    }

    const currentStageId = stagesCompleted[stagesCompleted.length - 1] || 'greeting';

    const stageNames: Record<string, string> = {
      greeting: '1. Initial Greeting',
      verification: '2. Contact Verification',
      pitch: '3. Value Pitch',
      discovery: '4. Channel Discovery',
      close: '5. Successful Close',
    };

    let dropOffStageId: 'greeting' | 'verification' | 'pitch' | 'discovery' | undefined;
    let dropOffReason: string | undefined;

    if (!stagesCompleted.includes('close')) {
      if (!stagesCompleted.includes('verification')) {
        dropOffStageId = 'greeting';
        dropOffReason = 'Customer remained silent or disconnected during opening verification question.';
      } else if (!stagesCompleted.includes('pitch')) {
        dropOffStageId = 'verification';
        dropOffReason = 'Dialogue ended immediately after identity verification before value pitch.';
      } else if (!stagesCompleted.includes('discovery')) {
        dropOffStageId = 'pitch';
        dropOffReason = 'Prospect disengaged or hung up during core value proposition pitch.';
      } else {
        dropOffStageId = 'discovery';
        dropOffReason = 'Call ended before final channel confirmation and sign-off.';
      }
    }

    return {
      currentStageId,
      currentStageName: stageNames[currentStageId] || 'Initial Greeting',
      stagesCompleted,
      dropOffStageId,
      dropOffReason,
    };
  }

  /**
   * 8. Aggregate Script Drop-Off Funnel & AI Recommendations (Across All Calls)
   */
  computeScriptDropOffFunnel(calls: Call[]): ScriptDropOffFunnel {
    const connectedCalls = calls.filter(c => c.durationSeconds > 0 || (c.transcript && c.transcript.length > 0));
    const total = connectedCalls.length || 1;

    let greetingCount = 0;
    let verificationCount = 0;
    let pitchCount = 0;
    let discoveryCount = 0;
    let closeCount = 0;

    for (const c of connectedCalls) {
      const ms = c.extractedVariables?.intelligence?.milestones || this.computeMilestoneProgress(c.transcript || [], c);
      if (ms.stagesCompleted.includes('greeting')) greetingCount++;
      if (ms.stagesCompleted.includes('verification')) verificationCount++;
      if (ms.stagesCompleted.includes('pitch')) pitchCount++;
      if (ms.stagesCompleted.includes('discovery')) discoveryCount++;
      if (ms.stagesCompleted.includes('close')) closeCount++;
    }

    const stageDefs = [
      {
        stageId: 'greeting',
        stageName: '1. Greeting Delivered',
        description: 'Agent initiated call and delivered introductory greeting.',
        callsReached: greetingCount,
      },
      {
        stageId: 'verification',
        stageName: '2. Contact Verified',
        description: 'Prospect responded and confirmed identity.',
        callsReached: verificationCount,
      },
      {
        stageId: 'pitch',
        stageName: '3. Value Proposition',
        description: 'Core AI voice calling capabilities presented.',
        callsReached: pitchCount,
      },
      {
        stageId: 'discovery',
        stageName: '4. Channel Discovery',
        description: 'Follow-up channel preference (WhatsApp / Demo) discussed.',
        callsReached: discoveryCount,
      },
      {
        stageId: 'close',
        stageName: '5. Successful Close',
        description: 'Follow-up agreed and courteous sign-off concluded.',
        callsReached: closeCount,
      },
    ];

    const stages: ScriptDropOffStage[] = [];
    let prevCount = total;

    for (let i = 0; i < stageDefs.length; i++) {
      const def = stageDefs[i];
      const reached = def.callsReached;
      const dropOffCount = Math.max(0, prevCount - reached);
      const retentionRate = Math.round((reached / total) * 100);
      const dropOffRate = prevCount > 0 ? Math.round((dropOffCount / prevCount) * 100) : 0;

      stages.push({
        stageId: def.stageId,
        stageName: def.stageName,
        description: def.description,
        callsReached: reached,
        dropOffCount,
        retentionRate,
        dropOffRate,
      });

      prevCount = reached;
    }

    // Determine biggest drop-off point
    let biggestDrop = stages[1]; // default to verification
    for (let i = 1; i < stages.length; i++) {
      if (stages[i].dropOffCount > biggestDrop.dropOffCount) {
        biggestDrop = stages[i];
      }
    }

    let scriptRecommendation = '';
    if (biggestDrop.stageId === 'verification') {
      scriptRecommendation =
        'Primary drop-off occurs during initial Contact Verification. Prospects remained silent or hung up during the opening monologue. Recommendation: Shorten the initial greeting from 4 sentences to 1 concise prompt ("Namaste Pranav ji?") to solicit an immediate response before pitching.';
    } else if (biggestDrop.stageId === 'pitch') {
      scriptRecommendation =
        'Primary drop-off occurs during the Value Proposition. Recommendation: Shorten the explanation to under 15 words and immediately follow with an engaging discovery question.';
    } else if (biggestDrop.stageId === 'discovery') {
      scriptRecommendation =
        'Drop-off detected during Channel Discovery. Recommendation: Set WhatsApp as the default choice ("May I WhatsApp you the details?") rather than offering multiple competing options.';
    } else {
      scriptRecommendation =
        'Strong conversational progression across all funnel stages. Continue monitoring agent latency and response clarity.';
    }

    return {
      totalConnectedCalls: connectedCalls.length,
      stages,
      biggestDropOffStage: biggestDrop.stageName,
      scriptRecommendation,
    };
  }
}

export const callAnalyticsService = new CallAnalyticsService();
