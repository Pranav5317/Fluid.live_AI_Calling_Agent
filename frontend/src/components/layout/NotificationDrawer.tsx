import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, ArrowUpRight } from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { RecentActivity } from '../../types';
import { formatDate } from '../../lib/formatters';

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    if (isOpen) {
      dashboardService.getRecentActivities().then(setActivities);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-[1px]" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-sm bg-white shadow-modal z-10 flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">System Activity Stream</h3>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
              {activities.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activities.map(act => (
            <div
              key={act.id}
              className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 hover:bg-white hover:shadow-subtle transition-all"
            >
              <div className="flex items-start gap-2.5">
                {act.type === 'campaign_completed' || act.type === 'call_completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : act.type === 'campaign_started' ? (
                  <ArrowUpRight className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                ) : act.type === 'agent_updated' ? (
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">{act.title}</h4>
                  <p className="mt-0.5 text-[11px] text-slate-600 leading-normal">{act.description}</p>
                  <span className="mt-1.5 block text-[10px] font-medium text-slate-400">
                    {formatDate(act.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 p-3 bg-slate-50 text-center">
          <span className="text-[11px] text-slate-500 font-medium">
            Real-time webhook events are synced automatically
          </span>
        </div>
      </div>
    </div>
  );
};
