import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  FileText,
  Webhook,
  PhoneCall,
  Code2,
  Copy,
  Check,
  Layers,
  ArrowRight,
  ExternalLink,
  Zap,
} from 'lucide-react';

export interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'api' | 'webhooks'>('architecture');
  const [copied, setCopied] = useState(false);

  const sampleCurl = `curl -X POST https://fluid-live-calling-agent.vercel.app/api/calls/test \\
  -H "Content-Type: application/json" \\
  -d '{
    "toPhoneNumber": "+919922935920",
    "userName": "Rahul Sharma",
    "agentVersionId": "agv_sarvam_prod_v1"
  }'`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fluid.live Platform Documentation & Architecture"
      description="Developer guides, conversational state machine specifications, webhook signatures, and REST endpoints."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-500">API Version: v1.0.0 (Production)</span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close Documentation
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-slate-800">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Architecture & Calling Lifecycle</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'api'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>REST API Reference</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('webhooks')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'webhooks'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Webhook className="h-3.5 w-3.5" />
            <span>Webhook Contract</span>
          </button>
        </div>

        {/* Tab 1: Architecture */}
        {activeTab === 'architecture' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <span className="font-bold text-slate-900 block">Outbound Telephony Pipeline Flow</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[11px] pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-blue-600 block">1. Scheduler Tick</span>
                  <span className="text-slate-500 text-[10px]">Validates interval & DND policy</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-indigo-600 block">2. SIP Dispatch</span>
                  <span className="text-slate-500 text-[10px]">TLS 1.3 to Sarvam carrier gateway</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-emerald-600 block">3. Live Audio Turn</span>
                  <span className="text-slate-500 text-[10px]">Sub-25 word turns & Saaras ASR</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-purple-600 block">4. Post-Call Audit</span>
                  <span className="text-slate-500 text-[10px]">BANT scoring & R2 audio upload</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <span className="font-bold text-slate-900 block">Interval Calling Engine (Autonomous Dispatch)</span>
              <p className="text-slate-600 leading-relaxed">
                Leads configured with target interval calling windows (e.g., 6:00 PM – 8:00 PM IST) are strictly dispatched when the current wall-clock time falls inside the window. If outside the window, the scheduler rolls forward to the next business window without early dialing.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: REST API */}
        {activeTab === 'api' && (
          <div className="space-y-3 text-xs">
            <div className="space-y-2">
              <span className="font-bold text-slate-900 block">Core Endpoints</span>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-[11px] font-mono">
                <div className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded mr-2">GET</span>
                    <span className="text-slate-800">/api/leads</span>
                  </div>
                  <span className="text-slate-400 font-sans text-[10px]">List leads & scheduled intervals</span>
                </div>
                <div className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded mr-2">POST</span>
                    <span className="text-slate-800">/api/campaigns</span>
                  </div>
                  <span className="text-slate-400 font-sans text-[10px]">Create new calling campaign</span>
                </div>
                <div className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded mr-2">POST</span>
                    <span className="text-slate-800">/api/calls/test</span>
                  </div>
                  <span className="text-slate-400 font-sans text-[10px]">Direct agent preview call</span>
                </div>
                <div className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded mr-2">GET</span>
                    <span className="text-slate-800">/api/campaigns/scheduler/status</span>
                  </div>
                  <span className="text-slate-400 font-sans text-[10px]">Scheduler active window status</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Sample Outbound Call Request</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-sans"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto">
                {sampleCurl}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: Webhooks */}
        {activeTab === 'webhooks' && (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Carrier webhooks are received at <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">/api/webhooks/carrier</code>. Inbound events are validated using the HMAC-SHA256 signature in the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">X-Fluid-Signature</code> header.
            </p>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-900 block text-[11px]">Supported Event Types</span>
              <ul className="space-y-1 text-slate-700 text-[11px] list-disc list-inside">
                <li><code className="font-mono text-indigo-700 font-semibold">call.initiated</code>: Dispatched when carrier acknowledges outbound dial.</li>
                <li><code className="font-mono text-emerald-700 font-semibold">call.completed</code>: Contains duration, recording URL, and final disconnect cause.</li>
                <li><code className="font-mono text-purple-700 font-semibold">call.analyzed</code>: Includes BANT scores, sentiment trajectory, and extracted variables.</li>
                <li><code className="font-mono text-rose-700 font-semibold">call.failed</code>: Enters the dead-letter queue for exponential backoff retries.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
