import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface AlertMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

interface AlertBannerProps {
  alert: AlertMessage | null;
  onDismiss: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onDismiss }) => {
  if (!alert) return null;

  const isSuccess = alert.type === 'success';
  const isError = alert.type === 'error';

  return (
    <div
      className={`px-4 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 transition-all ${
        isSuccess
          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
          : isError
          ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
          : 'bg-zinc-900 border-zinc-800 text-zinc-300'
      }`}
    >
      <div className="flex items-center gap-2">
        {isSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
        )}
        <div>
          <span className="font-semibold mr-1.5">{alert.title}:</span>
          <span className="opacity-90">{alert.message}</span>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
