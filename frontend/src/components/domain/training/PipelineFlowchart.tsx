import { useMemo } from 'react';
import { cn } from '../../../lib/utils';

// ─── Node definitions ──────────────────────────────────────────────────────
// Stages match the ACTUAL backend _run_pipeline() in training_service.py:
//   Step 1: loading_graph    → Load Graph
//   Step 2: loading_stations → Load Stations
//   Step 3: creating_env     → Init Environment
//   Step 4: training         → Train Q-Learning
//   Step 5: saving           → Save Q-table
//   Step 6: complete         → Complete
//
// Layout: 2-column (col-1: steps 1-3, bridge, col-2: steps 4-6)
// ───────────────────────────────────────────────────────────────────────────

interface FlowNode {
  id: string;
  label: string;
  subtitle: string;
  x: number;
  y: number;
  color: string;
  stageIndex: number;
}

interface FlowEdge {
  from: string;
  to: string;
  bridge?: boolean;
}

const NODE_W = 175;
const NODE_H = 50;

const COL1_X = 15;
const COL2_X = 430;
const ROW1_Y = 20;
const ROW2_Y = 120;
const ROW3_Y = 220;

const NODES: FlowNode[] = [
  { id: 'load-graph',    label: 'Load Graph',       subtitle: 'Hyderabad OSM',     x: COL1_X, y: ROW1_Y, color: '#10b981', stageIndex: 0 },
  { id: 'load-stations', label: 'Load Stations',    subtitle: 'Charging points',   x: COL1_X, y: ROW2_Y, color: '#10b981', stageIndex: 1 },
  { id: 'init-env',      label: 'Init Environment', subtitle: 'Gymnasium RL',      x: COL1_X, y: ROW3_Y, color: '#f59e0b', stageIndex: 2 },
  { id: 'train-ql',      label: 'Train Q-Learning', subtitle: 'RL agent episodes', x: COL2_X, y: ROW1_Y, color: '#f59e0b', stageIndex: 3 },
  { id: 'save-model',    label: 'Save Q-table',     subtitle: 'Persist to disk',   x: COL2_X, y: ROW2_Y, color: '#10b981', stageIndex: 4 },
  { id: 'complete-node', label: 'Complete',          subtitle: 'Model loaded',      x: COL2_X, y: ROW3_Y, color: '#10b981', stageIndex: 5 },
];

const EDGES: FlowEdge[] = [
  { from: 'load-graph',    to: 'load-stations'  },
  { from: 'load-stations', to: 'init-env'        },
  { from: 'init-env',      to: 'train-ql', bridge: true },
  { from: 'train-ql',      to: 'save-model'      },
  { from: 'save-model',    to: 'complete-node'   },
];

const STAGE_ORDER = NODES.map(n => n.id);

/** Map SSE current_step / phase values → node id */
function stepToNodeId(step: string): string | null {
  const s = step.toLowerCase().trim();
  if (s === 'loading_graph'    || (s.includes('loading') && s.includes('graph')))    return 'load-graph';
  if (s === 'loading_stations' || (s.includes('loading') && s.includes('station'))) return 'load-stations';
  if (s === 'creating_env'     || s.includes('creating') || s.includes('gymnas'))   return 'init-env';
  if (s === 'training'         || s.includes('q-learning') || s.includes('q_learning') || s.includes('episode') || s.includes('agent')) return 'train-ql';
  if (s === 'saving'           || s.includes('saving') || s.includes('q-table') || s.includes('q_table')) return 'save-model';
  if (s === 'complete' || s === 'done' || s === 'finished' || s.includes('complete')) return '__complete__';
  // English fallbacks from legacy _update() calls
  if (s.includes('hyderabad') || s.includes('graph'))    return 'load-graph';
  if (s.includes('station'))                              return 'load-stations';
  if (s.includes('environment') || s.includes('rl env')) return 'init-env';
  if (s.includes('training'))                             return 'train-ql';
  if (s.includes('sav'))                                  return 'save-model';
  return null;
}

function getNodeCenter(node: FlowNode): [number, number] {
  return [node.x + NODE_W / 2, node.y + NODE_H / 2];
}

interface PipelineFlowchartProps {
  progress?: number;
  isTraining?: boolean;
  currentStep?: string;
}

export function PipelineFlowchart({ isTraining = false, currentStep = '', progress = 0 }: PipelineFlowchartProps) {
  const activeNodeId   = stepToNodeId(currentStep);
  const allComplete    = activeNodeId === '__complete__' || (!isTraining && progress >= 100);
  const activeStageIdx = activeNodeId ? STAGE_ORDER.indexOf(activeNodeId) : -1;

  const paths = useMemo(() => {
    const nodeMap = new Map(NODES.map(n => [n.id, n]));
    return EDGES.map((edge, i) => {
      const fromNode = nodeMap.get(edge.from)!;
      const toNode   = nodeMap.get(edge.to)!;
      const [, y1]   = getNodeCenter(fromNode);
      const [, y2]   = getNodeCenter(toNode);

      let d: string;
      if (edge.bridge) {
        const startX = fromNode.x + NODE_W;
        const endX   = toNode.x;
        const cpX    = (startX + endX) / 2;
        d = `M ${startX} ${y1} C ${cpX} ${y1}, ${cpX} ${y2}, ${endX} ${y2}`;
      } else {
        const [x1] = getNodeCenter(fromNode);
        const [x2] = getNodeCenter(toNode);
        const mx = (x1 + x2) / 2;
        d = `M ${x1} ${y1} Q ${mx} ${y1 + (y2 - y1) * 0.4} ${x2} ${y2}`;
      }

      const fromIdx     = STAGE_ORDER.indexOf(edge.from);
      const toIdx       = STAGE_ORDER.indexOf(edge.to);
      const isActiveEdge = allComplete
        || (activeStageIdx !== -1 && (fromIdx < activeStageIdx || toIdx <= activeStageIdx));

      return { d, key: `${edge.from}-${edge.to}-${i}`, isActiveEdge };
    });
  }, [activeNodeId, allComplete, activeStageIdx]);

  return (
    <div className="relative w-full" style={{ minHeight: 290 }}>
      <svg
        className="relative w-full h-full"
        viewBox="0 0 620 290"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="pathGlow2">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="nodeGlow2">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Subtle column divider */}
        <line x1="310" y1="10" x2="310" y2="280"
          stroke="white" strokeWidth="1" strokeDasharray="4 8" opacity="0.05" />

        {/* Connection paths */}
        {paths.map(p => (
          <path
            key={p.key}
            d={p.d}
            fill="none"
            stroke="#10b981"
            strokeWidth={p.isActiveEdge ? 2.5 : 1.5}
            strokeDasharray="8 4"
            filter={p.isActiveEdge ? 'url(#pathGlow2)' : undefined}
            className={cn(p.isActiveEdge && isTraining && 'flow-path')}
            style={{ opacity: p.isActiveEdge ? 0.85 : 0.18, transition: 'opacity 0.5s' }}
          />
        ))}

        {/* Nodes */}
        {NODES.map(node => {
          const isActive   = !allComplete && node.id === activeNodeId;
          const isComplete = allComplete || (activeStageIdx !== -1 && node.stageIndex < activeStageIdx);
          const isPending  = !isActive && !isComplete && isTraining;
          const opacity    = isPending ? 0.35 : 1.0;
          const borderAlpha = isActive ? 'cc' : isComplete ? '88' : '22';

          let subtitle = node.subtitle;
          if (isComplete) subtitle = '\u2713 Complete';
          else if (isActive) subtitle = `${Math.round(progress)}%`;

          return (
            <g key={node.id} style={{ opacity, transition: 'opacity 0.5s' }}>
              {isActive && (
                <rect x={node.x - 3} y={node.y - 3}
                  width={NODE_W + 6} height={NODE_H + 6} rx={13}
                  fill="none" stroke={node.color} strokeWidth={3}
                  filter="url(#nodeGlow2)" style={{ opacity: 0.5 }} />
              )}
              <rect x={node.x} y={node.y}
                width={NODE_W} height={NODE_H} rx={11}
                fill="rgba(10, 15, 22, 0.65)"
                stroke={`${node.color}${borderAlpha}`}
                strokeWidth={isActive ? 2 : 1} />
              {/* Step number badge */}
              <rect x={node.x + 8} y={node.y + 12}
                width={18} height={18} rx={5}
                fill={isComplete ? '#10b981' : isActive ? node.color : 'rgba(255,255,255,0.05)'}
                style={{ transition: 'fill 0.4s' }} />
              <text x={node.x + 17} y={node.y + 25}
                fill={isComplete || isActive ? '#000' : '#64748b'}
                fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="inherit">
                {node.stageIndex + 1}
              </text>
              {/* Label */}
              <text x={node.x + 34} y={node.y + 20}
                fill="white" fontSize="11" fontWeight="600" fontFamily="inherit">
                {node.label}
              </text>
              {/* Subtitle */}
              <text x={node.x + 34} y={node.y + 35}
                fill={isComplete ? '#10b981' : '#94a3b8'}
                fontSize="9" fontFamily="inherit">
                {subtitle}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default PipelineFlowchart;
