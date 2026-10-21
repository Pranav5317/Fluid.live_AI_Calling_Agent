import { Call } from '../types';

/**
 * Escapes a cell value for standard RFC-4180 CSV format.
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates and triggers browser download of a comprehensive enterprise Call Audit CSV.
 */
export function exportCallsToCSV(calls: Call[], filenamePrefix: string = 'fluid_live_call_audit') {
  if (!calls || calls.length === 0) {
    alert('No call records available to export.');
    return;
  }

  const headers = [
    'Call ID',
    'Date & Time (UTC)',
    'Lead Name',
    'Lead Phone',
    'Campaign ID',
    'Agent Version ID',
    'Call Status',
    'Outcome',
    'Duration (Seconds)',
    'QA Audit Score (0-100)',
    'QA Grade',
    'Agent Talk Ratio (%)',
    'Lead Talk Ratio (%)',
    'Agent Cadence (WPM)',
    'Overall Sentiment',
    'Sentiment Trajectory',
    'Detected Buying Signals',
    'Detected Objections',
    'Executive AI Summary',
    'Recommended Next Best Action',
    'Suggested Message',
    'Recording Audio Stream URL',
    'Full Verbatim Transcript',
  ];

  const rows = calls.map(call => {
    const intel = call.extractedVariables?.intelligence;
    const buyingSignals = (intel?.buyingSignals || []).map(s => s.label).join('; ');
    const objections = (intel?.objections || []).map(o => o.label).join('; ');

    const fullTranscript = Array.isArray(call.transcript)
      ? call.transcript.map(t => `[${t.speaker.toUpperCase()} - ${t.timestampSeconds}s]: ${t.text}`).join('\n')
      : '';

    const recordingUrl = `https://fluid-live-calling-agent.vercel.app/api/calls/${call.id}/audio`;

    return [
      escapeCSV(call.id),
      escapeCSV(call.startedAt),
      escapeCSV(call.leadName || call.leadId || 'Customer'),
      escapeCSV(call.leadPhone || ''),
      escapeCSV(call.campaignId || 'Direct Outreach'),
      escapeCSV(call.agentVersionId || ''),
      escapeCSV(call.status),
      escapeCSV(call.outcome || ''),
      escapeCSV(call.durationSeconds),
      escapeCSV(intel?.qaScorecard?.overallScore ?? ''),
      escapeCSV(intel?.qaScorecard?.grade ?? ''),
      escapeCSV(intel?.talkToListen?.agentTalkPercentage ?? ''),
      escapeCSV(intel?.talkToListen?.leadTalkPercentage ?? ''),
      escapeCSV(intel?.talkToListen?.agentWPM ?? ''),
      escapeCSV(intel?.sentimentTrajectory?.overallSentiment ?? ''),
      escapeCSV(intel?.sentimentTrajectory?.trajectoryTrend ?? ''),
      escapeCSV(buyingSignals),
      escapeCSV(objections),
      escapeCSV(call.extractedVariables?.call_summary || ''),
      escapeCSV(intel?.nextBestAction?.actionTitle || ''),
      escapeCSV(intel?.nextBestAction?.suggestedMessage || ''),
      escapeCSV(recordingUrl),
      escapeCSV(fullTranscript),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

