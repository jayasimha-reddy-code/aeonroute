import { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface LiveTerminalProps {
  logs: string[];
  /** Whether the SSE connection to the backend is currently open */
  sseConnected?: boolean;
  /** Whether training is currently active */
  isTraining?: boolean;
}

export function LiveTerminal({ logs, sseConnected = false, isTraining = false }: LiveTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  /** Derive idle/reconnect lines when there are no real logs yet */
  function getDisplayLines(): string[] {
    if (logs.length > 0) return logs;
    if (isTraining && !sseConnected) {
      return ['[warn] Connection lost. Reconnecting to training stream…'];
    }
    return ['[idle] No active training session. Click \'Start Training\' to begin.'];
  }

  const displayLines = getDisplayLines();

  /** Dot colour:  green = connected & training  |  red = disconnected mid-training  |  grey = idle */
  const dotClass = isTraining
    ? (sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-pulse')
    : 'bg-slate-600';

  const dotLabel = isTraining
    ? (sseConnected ? 'Connected' : 'Reconnecting…')
    : 'Idle';

  return (
    <div className="bg-black rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-emerald" />
          <span className="text-xs font-medium text-slate-300">Real-time Logs</span>
        </div>
        {/* Connection status dot */}
        <div className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full', dotClass)} />
          <span className="text-[10px] text-slate-500">{dotLabel}</span>
        </div>
      </div>

      {/* Log body */}
      <div
        ref={scrollRef}
        className="p-3 max-h-[200px] overflow-y-auto font-mono text-[10px] leading-relaxed"
      >
        {displayLines.map((line, idx) => {
          const isIdle = line.startsWith('[idle]');
          const isWarn = line.startsWith('[warn]');
          if (isIdle || isWarn) {
            return (
              <div key={idx} className="whitespace-pre-wrap">
                <span className={isWarn ? 'text-amber-400' : 'text-slate-500'}>{line}</span>
              </div>
            );
          }
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
