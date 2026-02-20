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
}

interface FlowEdge {
  from: string;
  to: string;
}

const NODES: FlowNode[] = [
  { id: 'data-train',  label: 'Training Data',  subtitle: 'Data packets',     x: 40,  y: 55 },
  { id: 'data-traffic', label: 'Traffic Data',   subtitle: 'Data packets',     x: 40,  y: 175 },
  { id: 'sg-gan',      label: 'SG-GAN',         subtitle: 'Stage: 100%',      x: 260, y: 40,  color: '#f59e0b' },
  { id: 'q-learning',  label: 'Q-Learning',     subtitle: 'Stage: 100%',      x: 260, y: 140, color: '#10b981' },
  { id: 'gnn',         label: 'GNN',            subtitle: 'Stage: 100%',      x: 260, y: 240, color: '#06b6d4' },
  { id: 'out-routes',  label: 'Route Output',   subtitle: 'Optimized routes', x: 480, y: 90 },
  { id: 'out-traffic', label: 'Traffic Output',  subtitle: 'Predictions',      x: 480, y: 200 },
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

function getNodeCenter(node: FlowNode): [number, number] {
  return [node.x + NODE_W / 2, node.y + NODE_H / 2];
}

interface PipelineFlowchartProps {
  progress?: number;
  isTraining?: boolean;
}

export function PipelineFlowchart({ isTraining = false }: PipelineFlowchartProps) {
  const paths = useMemo(() => {
    const nodeMap = new Map(NODES.map(n => [n.id, n]));
    return EDGES.map((edge, i) => {
      const fromNode = nodeMap.get(edge.from)!;
      const toNode = nodeMap.get(edge.to)!;
      const [x1, y1] = getNodeCenter(fromNode);
      const [x2, y2] = getNodeCenter(toNode);
      // Quadratic bezier with midpoint offset
      const mx = (x1 + x2) / 2;
      const cpx = mx;
      const cpy = y1 + (y2 - y1) * 0.2;
      const d = `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;
      return { d, key: `${edge.from}-${edge.to}-${i}` };
    });
  }, []);

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

      {/* SVG connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 620 310" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="pathGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {paths.map(p => (
          <path
            key={p.key}
            d={p.d}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="8 4"
            filter="url(#pathGlow)"
            className={cn(isTraining && 'flow-path')}
            style={{ opacity: 0.7 }}
          />
        ))}
      </svg>

      {/* Nodes */}
      <svg className="relative w-full h-full" viewBox="0 0 620 310" preserveAspectRatio="xMidYMid meet">
        {/* Re-render connections in same SVG for proper layering */}
        <defs>
          <filter id="pathGlow2">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {paths.map(p => (
          <path
            key={p.key}
            d={p.d}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="8 4"
            filter="url(#pathGlow2)"
            className={cn(isTraining && 'flow-path')}
            style={{ opacity: 0.6 }}
          />
        ))}
        {NODES.map(node => {
          const borderColor = node.color || '#ffffff';
          return (
            <g key={node.id}>
              {/* Node card background */}
              <rect
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
                rx={12}
                fill="rgba(10, 15, 22, 0.6)"
                stroke={`${borderColor}1a`}
                strokeWidth={1}
              />
              {/* Label */}
              <text
                x={node.x + 12}
                y={node.y + 20}
                fill="white"
                fontSize="11"
                fontWeight="600"
                fontFamily="inherit"
              >
                {node.label}
              </text>
              {/* Subtitle */}
              <text
                x={node.x + 12}
                y={node.y + 36}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="inherit"
              >
                {node.subtitle}
              </text>
              {/* Overflow icon */}
              <text
                x={node.x + NODE_W - 16}
                y={node.y + 28}
                fill="#475569"
                fontSize="14"
                textAnchor="middle"
              >
                ⋮
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default PipelineFlowchart;
