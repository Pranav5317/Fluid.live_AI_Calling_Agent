import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { AgentConfig } from '../../types';
import {
  Mic,
  MicOff,
  Send,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Clock,
  Radio,
} from 'lucide-react';
import { agentService } from '../../services/agentService';

export interface AgentSandboxSimulatorProps {
  agentName: string;
  config: AgentConfig;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'agent' | 'user';
  text: string;
  timestamp: string;
}

export const AgentSandboxSimulator: React.FC<AgentSandboxSimulatorProps> = ({
  agentName,
  config,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [extractedData, setExtractedData] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const speakerName = config.voiceModel.toLowerCase().includes('shubh')
    ? 'shubh'
    : config.voiceModel.toLowerCase().includes('shreya') || config.voiceModel.toLowerCase().includes('female')
    ? 'meera'
    : 'arvind';

  // Speak text aloud using browser synthesis or Sarvam audio
  const speakAloud = (text: string) => {
    if (isAudioMuted) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = config.language || 'en-IN';
      if (speakerName === 'shubh') {
        utterance.pitch = 0.95;
        utterance.rate = 1.0;
      } else if (speakerName === 'meera') {
        utterance.pitch = 1.15;
        utterance.rate = 1.05;
      } else {
        utterance.pitch = 0.85;
        utterance.rate = 0.95;
      }
      utterance.onstart = () => setIsAgentSpeaking(true);
      utterance.onend = () => setIsAgentSpeaking(false);
      utterance.onerror = () => setIsAgentSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start call simulation with Agent opening line
  const startSimulation = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    const openingText =
      config.openingLine ||
      'Namaste! Main Shubh bol raha hoon Fluid.live se. How can I assist you today?';

    const initialMsg: ChatMessage = {
      id: 'msg_1',
      sender: 'agent',
      text: openingText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setMessages([initialMsg]);
    setCallDuration(0);
    setExtractedData({});
    speakAloud(openingText);
  };

  // Initialize simulation on mount
  useEffect(() => {
    startSimulation();
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentSpeaking]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate realistic agent reply based on user input and agent persona
  const handleSendMessage = (textToSend?: string) => {
    const input = (textToSend || inputText).trim();
    if (!input) return;

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Simulate intelligent agent deliberation & variable extraction
    setTimeout(() => {
      const lower = input.toLowerCase();
      let replyText = '';
      const updatedVars = { ...extractedData };

      if (lower.includes('busy') || lower.includes('call later') || lower.includes('tomorrow') || lower.includes('baad me')) {
        replyText = 'Samajh gaya ji! Main kal dopahar me aapko call schedule kar deta hoon. Thank you for your time!';
        updatedVars.callback_requested = true;
        updatedVars.lead_availability = 'tomorrow_afternoon';
      } else if (lower.includes('yes') || lower.includes('haan') || lower.includes('confirm') || lower.includes('interested')) {
        replyText = 'Shukriya confirm karne ke liye! Maine aapki details note kar li hain. What time works best for you?';
        updatedVars.lead_interest = 'high';
        updatedVars.verified = true;
      } else if (lower.includes('whatsapp') || lower.includes('link') || lower.includes('upi') || lower.includes('payment')) {
        replyText = 'Ji bilkul! Maine aapke WhatsApp par direct verification aur link share kar diya hai. Please check kijiye!';
        updatedVars.whatsapp_link_sent = true;
        updatedVars.payment_mode = 'upi_whatsapp';
      } else if (lower.includes('cancel') || lower.includes('nahi chahiye') || lower.includes('not interested')) {
        replyText = 'Ji bilkul koi baat nahi. Maine aapki request record kar li hai aur dispatch cancel kar diya hai. Thank you!';
        updatedVars.order_status = 'cancelled';
        updatedVars.cancellation_noted = true;
      } else if (lower.includes('price') || lower.includes('cost') || lower.includes('kitna') || lower.includes('rate')) {
        replyText = 'Humare plans volume ke basis par customize hote hain, starting around ₹1 per minute without any platform lock-in. Would you like a quick walkthrough?';
        updatedVars.pricing_inquiry = true;
      } else {
        // Fallback natural response
        replyText = `Ji bilkul. Aapne "${input}" kaha, maine note kar liya hai. Would you like me to share a quick summary over SMS?`;
        updatedVars.last_inquiry = input;
      }

      setExtractedData(updatedVars);

      const agentMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        sender: 'agent',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setMessages(prev => [...prev, agentMsg]);
      speakAloud(replyText);
    }, 600);
  };

  const quickReplies = [
    'Haan ji, tell me more',
    'I am busy right now, call tomorrow',
    'Please send link on WhatsApp',
    'What is the pricing?',
    'Please cancel my request',
  ];

  return (
    <div className="w-full lg:w-96 rounded-xl border border-slate-700 bg-slate-900 text-white flex flex-col justify-between h-[620px] shadow-2xl overflow-hidden">
      {/* Top Bar: Call Telephony Header */}
      <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping absolute" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 relative" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">Audio Sandbox</span>
              <Badge variant="brand" size="sm" className="text-[10px] py-0 px-1.5">
                Live
              </Badge>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">{formatTimer(callDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white h-7 w-7 p-0"
            onClick={() => {
              setIsAudioMuted(!isAudioMuted);
              if (!isAudioMuted && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
            }}
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5 text-emerald-400" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white h-7 w-7 p-0"
            onClick={startSimulation}
            title="Restart Call Simulation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Dynamic Voice Activity Bar */}
      <div className="px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          {isAgentSpeaking ? (
            <>
              <div className="flex items-center gap-0.5 h-3">
                <span className="w-1 bg-emerald-400 rounded-full h-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 bg-emerald-400 rounded-full h-2 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 bg-emerald-400 rounded-full h-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="w-1 bg-emerald-400 rounded-full h-1.5 animate-bounce" style={{ animationDelay: '200ms' }} />
              </div>
              <span className="text-emerald-400 font-semibold">{speakerName} speaking...</span>
            </>
          ) : (
            <>
              <Radio className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-400">Listening for lead reply</span>
            </>
          )}
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {config.language || 'en-IN'} • {speakerName}
        </span>
      </div>

      {/* Messages Transcript Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 font-sans text-xs">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-mono">
              <span>{msg.sender === 'agent' ? `${agentName || 'Agent'} (${speakerName})` : 'You (Customer)'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isAgentSpeaking && (
          <div className="flex items-center gap-2 text-slate-400 text-[11px] italic px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            Generating voice audio...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Live Extracted Variables Strip */}
      {Object.keys(extractedData).length > 0 && (
        <div className="px-3 py-1.5 bg-slate-950/70 border-t border-slate-800 text-[10px] flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-bold uppercase tracking-wider">Extracted:</span>
          {Object.entries(extractedData).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-mono"
            >
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
              {k}: <span className="font-bold text-white">{String(v)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Quick Suggestion Pills */}
      <div className="px-3 py-2 bg-slate-950/40 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {quickReplies.map((reply, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendMessage(reply)}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white border border-slate-700 transition"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Bottom Input Box */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          placeholder="Speak or type customer response..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSendMessage();
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="primary"
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

