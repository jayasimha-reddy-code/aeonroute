import { useState } from 'react';
import { Card } from '../ui';
import { ChevronDown, ChevronUp, List } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Segment {
  id: number;
  name: string;
  distance_km: number;
  color: string;
  detail?: string;
}

interface SegmentListProps {
  segments?: Segment[];
}

const DEFAULT_SEGMENTS: Segment[] = [
  { id: 1, name: 'Segment #1', distance_km: 3.24, color: '#10b981', detail: 'Start zone' },
  { id: 2, name: 'Segment #2', distance_km: 12.66, color: '#10b981', detail: 'Highway merge' },
  { id: 3, name: 'Route #50', distance_km: 17.42, color: '#f59e0b', detail: 'Charging stop: near' },
  { id: 4, name: 'Segment 73', distance_km: 15.88, color: '#06b6d4', detail: 'Scenic bypass' },
  { id: 5, name: 'Segment #5', distance_km: 8.12, color: '#10b981', detail: 'Urban zone' },
  { id: 6, name: 'Segment #6', distance_km: 5.93, color: '#f59e0b', detail: 'Low speed zone' },
  { id: 7, name: 'Segment #7', distance_km: 9.47, color: '#06b6d4', detail: 'Destination approach' },
];

export function SegmentList({ segments }: SegmentListProps) {
  const [collapsed, setCollapsed] = useState(false);
  const items = segments && segments.length > 0 ? segments : DEFAULT_SEGMENTS;

  return (
    <Card className="group">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2.5 group/toggle"
        >
          <div className="p-1.5 rounded-lg bg-blue/10">
            <List className="w-3.5 h-3.5 text-blue" />
          </div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Segment-by-Segment
          </h3>
          {collapsed
            ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            : <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          }
        </button>

      </div>

      {!collapsed && (
        <div className="space-y-0">
          {items.map((seg, i) => (
            <div
              key={seg.id}
              className={cn(
                'flex items-center gap-3 py-2.5 px-1',
                i < items.length - 1 && 'border-b border-white/[0.04]'
              )}
            >
              {/* Glowing dot */}
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: seg.color,
                  boxShadow: `0 0 6px ${seg.color}`,
                }}
              />
              {/* Name + detail */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{seg.name}</p>
                {seg.detail && (
                  <p className="text-xs text-slate-500 truncate">{seg.detail}</p>
                )}
              </div>
              {/* Distance */}
              <span className="text-sm text-slate-300 tabular-nums flex-shrink-0">
                {seg.distance_km.toFixed(2)}m
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default SegmentList;
