import { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Minus, X } from 'lucide-react';

const IDLE_LINE = '[idle] Waiting for training to start…';

interface LiveTerminalProps {
  logs: string[];
}

export function LiveTerminal({ logs }: LiveTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const displayLines = logs.length > 0 ? logs : [IDLE_LINE];

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
        {displayLines.map((line, idx) => {
          const isIdle = line === IDLE_LINE;
          if (isIdle) {
            return (
              <div key={idx} className="whitespace-pre-wrap">
                <span className="text-slate-500">{line}</span>
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
