import { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, Minus, X } from 'lucide-react';

const MOCK_LOGS = [
  '[2023-09-15 12:23:57] Starting #452 generated...',
  '[2023-08-15 11:23:01] Starting episode generation...',
  '[2023-08-15 11:23:03] Trading stats generated...',
  '[2023-08-15 11:23:05] Training started generated...',
  '[2023-08-04 11:34:00] Training Monitoring...',
  '[2023-08-03 11:33:00] Tracing GNR reconfiguration...',
  '[2023-04-03 11:52:00] Training union Data Updated...',
  '[2023-09-15 12:24:12] Q-table update cycle complete',
  '[2023-09-15 12:24:15] Reward calculation: +0.847',
  '[2023-09-15 12:24:18] Episode 452 complete, avg reward: 0.823',
  '[2023-09-15 12:24:20] GAN discriminator loss: 0.341',
  '[2023-09-15 12:24:22] Traffic pattern sync initiated...',
  '[2023-09-15 12:24:25] Grid energy optimization: 94.2%',
  '[2023-09-15 12:24:28] Route feasibility check passed',
  '[2023-09-15 12:24:30] Checkpoint saved: model_step_452.pt',
];

interface LiveTerminalProps {
  sseMessages?: string[];
  isSSEConnected?: boolean;
}

export function LiveTerminal({ sseMessages, isSSEConnected }: LiveTerminalProps) {
  const [logs, setLogs] = useState<string[]>(() => MOCK_LOGS.slice(0, 5));
  const scrollRef = useRef<HTMLDivElement>(null);
  const mockIdxRef = useRef(5);

  // Auto-scroll on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // If SSE connected, use SSE messages
  useEffect(() => {
    if (isSSEConnected && sseMessages && sseMessages.length > 0) {
      setLogs(sseMessages);
    }
  }, [isSSEConnected, sseMessages]);

  // Mock log generation when SSE not connected
  useEffect(() => {
    if (isSSEConnected) return;

    const interval = setInterval(() => {
      const nextLog = MOCK_LOGS[mockIdxRef.current % MOCK_LOGS.length];
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const logMsg = nextLog.replace(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/, `[${timestamp}]`);
      
      setLogs(prev => {
        const updated = [...prev, logMsg];
        // Keep max 50 lines
        if (updated.length > 50) return updated.slice(-50);
        return updated;
      });
      mockIdxRef.current++;
    }, 3000);

    return () => clearInterval(interval);
  }, [isSSEConnected]);

  return (
    <div className="bg-black rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-emerald" />
          <span className="text-xs font-medium text-slate-300">Real-time Logs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="p-1 text-slate-600 hover:text-slate-400 transition-colors">
            <Minus className="w-3 h-3" />
          </button>
          <button className="p-1 text-slate-600 hover:text-slate-400 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Log body */}
      <div
        ref={scrollRef}
        className="p-3 max-h-[200px] overflow-y-auto font-mono text-[10px] leading-relaxed"
      >
        {logs.map((line, idx) => {
          // Split timestamp from message
          const match = line.match(/^(\[.+?\])\s*(.*)/);
          return (
            <div key={idx} className="whitespace-pre-wrap">
              {match ? (
                <>
                  <span className="text-slate-500">{match[1]}</span>{' '}
                  <span className="text-emerald-400">{match[2]}</span>
                </>
              ) : (
                <span className="text-emerald-400">{line}</span>
              )}
            </div>
          );
        })}
        {/* Blinking cursor */}
        <span className="text-emerald-400 animate-pulse">▌</span>
      </div>
    </div>
  );
}

export default LiveTerminal;
