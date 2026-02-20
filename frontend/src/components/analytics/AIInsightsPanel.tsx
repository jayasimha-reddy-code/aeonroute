import { Card } from '../ui';
import { Sparkles } from 'lucide-react';

interface Insight {
  text: string;
  severity: 'info' | 'warning' | 'critical';
}

const DEFAULT_INSIGHTS: Insight[] = [
  { text: 'Peak demand shifted to 18:00. Peak energy consumption compared to 16 stations is higher than predicted baseline.', severity: 'warning' },
  { text: 'Q-Learning agent converged after 180 episodes with stable reward plateau — model is production-ready.', severity: 'info' },
  { text: 'SG-GAN traffic patterns show abnormal evening peak distribution. Retraining recommended.', severity: 'critical' },
  { text: 'Station Data Updated. System health metrics show 99.2% uptime across all endpoints.', severity: 'info' },
  { text: 'Route feasibility rate improved 12% after latest GNN training cycle. Energy predictions within 3% margin.', severity: 'info' },
];

interface AIInsightsPanelProps {
  insights?: Insight[];
}

function SeverityDot({ severity }: { severity: string }) {
  const color = severity === 'critical' ? 'bg-red-500' : severity === 'warning' ? 'bg-amber-500' : 'bg-emerald';
  return <span className={`w-1.5 h-1.5 rounded-full ${color} flex-shrink-0 mt-2`} />;
}

function GlowingStar() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0 mt-0.5">
      <defs>
        <filter id="starGlowFilter">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M6 0 L7.5 4.5 L12 6 L7.5 7.5 L6 12 L4.5 7.5 L0 6 L4.5 4.5 Z"
        fill="#10b981"
        filter="url(#starGlowFilter)"
      />
    </svg>
  );
}

export function AIInsightsPanel({ insights = DEFAULT_INSIGHTS }: AIInsightsPanelProps) {
  return (
    <Card className="group relative overflow-hidden">
      {/* Decorative sparkle background */}
      <div className="absolute top-4 right-6 opacity-[0.06]">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <path d="M40 0 L50 30 L80 40 L50 50 L40 80 L30 50 L0 40 L30 30 Z" fill="#10b981" />
        </svg>
      </div>

      <div className="flex items-center gap-2.5 mb-5 relative">
        <div className="p-1.5 rounded-lg bg-emerald/10">
          <Sparkles className="w-3.5 h-3.5 text-emerald" />
        </div>
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">AI Insights</h3>
      </div>

      <div className="space-y-3 relative">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-3">
            <GlowingStar />
            <SeverityDot severity={insight.severity} />
            <p className="text-sm text-slate-300 leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default AIInsightsPanel;
