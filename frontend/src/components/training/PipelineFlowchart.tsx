import { useMemo } from 'react';
import { cn } from '../../lib/utils';

/* ── Node definitions ─────────────────────────────── */
interface FlowNode {
  id: string;
  label: string;
  subtitle: string;
  x: number;
  y: number;
  color?: string;
  /** Whether this node participates in active/complete/pending state logic */
  isProcessing?: boolean;
  /** Ordered index among processing nodes (0-based) */
  stageIndex?: number;
}

interface FlowEdge {
  from: string;
  to: string;
}

const NODES: FlowNode[] = [
  { id: 'data-train',  label: 'Training Data',  subtitle: 'Data packets',     x: 40,  y: 55 },
  { id: 'data-traffic', label: 'Traffic Data',   subtitle: 'Data packets',     x: 40,  y: 175 },
  { id: 'sg-gan',      label: 'SG-GAN',         subtitle: 'Traffic synthesis', x: 260, y: 40,  color: '#f59e0b', isProcessing: true, stageIndex: 0 },
  { id: 'q-learning',  label: 'Q-Learning',     subtitle: 'RL agent',          x: 260, y: 140, color: '#10b981', isProcessing: true, stageIndex: 1 },
  { id: 'gnn',         label: 'GNN',            subtitle: 'Route model',       x: 260, y: 240, color: '#06b6d4', isProcessing: true, stageIndex: 2 },
  { id: 'out-routes',  label: 'Route Output',   subtitle: 'Optimized routes',  x: 480, y: 90 },
  { id: 'out-traffic', label: 'Traffic Output',  subtitle: 'Predictions',       x: 480, y: 200 },
];

const EDGES: FlowEdge[] = [
  { from: 'data-train',   to: 'sg-gan' },
  { from: 'data-traffic',  to: 'sg-gan' },
  { from: 'data-train',   to: 'q-learning' },
  { from: 'data-traffic',  to: 'q-learning' },
  { from: 'sg-gan',       to: 'gnn' },
  { from: 'q-learning',   to: 'gnn' },
  { from: 'gnn',          to: 'out-routes' },
  { from: 'q-learning',   to: 'out-routes' },
  { from: 'sg-gan',       to: 'out-traffic' },
];

const NODE_W = 140;
const NODE_H = 50;

/** Map backend current_step values -> node ID */
function stepToNodeId(step: string): string | null {
  const s = step.toLowerCase();
  if (s.includes('sg_gan') || s.includes('sg-gan') || s.includes('traffic_generation') || s.includes('gan')) return 'sg-gan';
  if (s.includes('q_learning') || s.includes('q-learning') || s.includes('rl_training') || s.includes('rl training') || s.includes('agent')) return 'q-learning';
  if (s.includes('gnn') || s.includes('route_generation') || s.includes('route generation')) return 'gnn';
  if (s === 'complete' || s === 'done' || s === 'finished') return '__complete__';
  return null;
}

/** Stage order for determining completed nodes */
const STAGE_ORDER = ['sg-gan', 'q-learning', 'gnn'];

function getNodeCenter(node: FlowNode): [number, number] {
  return [node.x + NODE_W / 2, node.y + NODE_H / 2];
}

interface PipelineFlowchartProps {
  progress?: number;
  isTraining?: boolean;
  currentStep?: string;
}

export function PipelineFlowchart({ isTraining = false, currentStep = '', progress = 0 }: PipelineFlowchartProps) {
  const activeNodeId = stepToNodeId(currentStep);
  const allComplete = activeNodeId === '__complete__' || (!isTraining && progress >= 100);
  const activeStageIndex = activeNodeId ? STAGE_ORDER.indexOf(activeNodeId) : -1;

  const paths = useMemo(() => {
    const nodeMap = new Map(NODES.map(n => [n.id, n]));
    return EDGES.map((edge, i) => {
      const fromNode = nodeMap.get(edge.from)!;
      const toNode = nodeMap.get(edge.to)!;
      const [x1, y1] = getNodeCenter(fromNode);
      const [x2, y2] = getNodeCenter(toNode);
      const mx = (x1 + x2) / 2;
      const cpx = mx;
      const cpy = y1 + (y2 - y1) * 0.2;
      const d = `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;
      const isActiveEdge = allComplete || edge.from === activeNodeId || edge.to === activeNodeId;
      return { d, key: `${edge.from}-${edge.to}-${i}`, isActiveEdge };
    });
  }, [activeNodeId, allComplete]);

  const legendItems = [
    { label: 'Fast',   color: '#10b981' },
    { label: 'Eco',    color: '#f59e0b' },
    { label: 'Scenic', color: '#06b6d4' },
  ];

  return (
    <div className="relative w-full" style={{ minHeight: 320 }}>
      {/* Legend pills */}
      <div className="absolute top-0 right-0 flex items-center gap-3 z-10">
        {legendItems.map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <svg width="20" height="3"><line x1="0" y1="1.5" x2="20" y2="1.5" stroke={item.color} strokeWidth="2" strokeDasharray="6 3" /></svg>
            <span className="text-[10px] text-slate-400 font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Single SVG canvas */}
      <svg className="relative w-full h-full" viewBox="0 0 620 310" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="pathGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection paths */}
        {paths.map(p => (
          <path
            key={p.key}
            d={p.d}
            fill="none"
            stroke="#10b981"
            strokeWidth={p.isActiveEdge ? 2.5 : 1.5}
            strokeDasharray="8 4"
            filter={p.isActiveEdge ? 'url(#pathGlow)' : undefined}
            className={cn(p.isActiveEdge && isTraining && 'flow-path')}
            style={{ opacity: p.isActiveEdge ? 0.85 : 0.25, transition: 'opacity 0.5s' }}
          />
        ))}

        {/* Nodes */}
        {NODES.map(node => {
          const borderColor = node.color || '#ffffff';
          const isActive = !allComplete && node.id === activeNodeId;
          const isComplete = allComplete ||
            (node.isProcessing && activeStageIndex !== -1 && (node.stageIndex ?? 99) < activeStageIndex);
          const isPending = !isActive && !isComplete && node.isProcessing && isTraining;

          const opacity = isPending ? 0.35 : 1.0;
          const borderOpacity = isActive ? 'cc' : isComplete ? '99' : '1a';
          const borderWidth = isActive ? 2 : 1;

          let subtitle = node.subtitle;
          if (node.isProcessing) {
            if (isComplete) subtitle = '\u2713 Complete';
            else if (isActive) subtitle = `${Math.round(progress)}%`;
          }

          return (
            <g key={node.id} style={{ opacity, transition: 'opacity 0.5s' }}>
              {isActive && (
                <rect
                  x={node.x - 3}
                  y={node.y - 3}
                  width={NODE_W + 6}
                  height={NODE_H + 6}
                  rx={14}
                  fill="none"
                  stroke={borderColor}
                  strokeWidth={3}
                  filter="url(#nodeGlow)"
                  style={{ opacity: 0.55 }}
                />
              )}
              <rect
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
                rx={12}
                fill="rgba(10, 15, 22, 0.6)"
                stroke={`${borderColor}${borderOpacity}`}
                strokeWidth={borderWidth}
              />
              <text x={node.x + 12} y={node.y + 20} fill={isActive ? 'white' : 'white'} fontSize="11" fontWeight="600" fontFamily="inherit">
                {node.label}
              </text>
              <text x={node.x + 12} y={node.y + 36} fill={isComplete ? '#10b981' : '#94a3b8'} fontSize="9" fontFamily="inherit">
                {subtitle}
              </text>
              <text x={node.x + NODE_W - 16} y={node.y + 28} fill={isComplete ? '#10b981' : '#475569'} fontSize={isComplete ? '16' : '14'} textAnchor="middle">
                {isComplete ? '\u2713' : '\u22ee'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default PipelineFlowchart;
