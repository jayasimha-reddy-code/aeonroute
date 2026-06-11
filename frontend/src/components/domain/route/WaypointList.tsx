import { useState, useCallback, useRef } from 'react';
import { cn } from '../../../lib/utils';
import { GripVertical, X, Plus } from 'lucide-react';

export interface Waypoint {
  id: string;
  label: string;
  type: 'start' | 'waypoint' | 'end';
  lat?: number;
  lon?: number;
}

interface WaypointListProps {
  waypoints: Waypoint[];
  onChange: (waypoints: Waypoint[]) => void;
  landmarks?: { label: string; lat: number; lon: number }[];
}

const dotColor: Record<string, string> = {
  start: 'bg-emerald',
  waypoint: 'bg-amber',
  end: 'bg-rose',
};

let nextId = 100;

export function WaypointList({ waypoints, onChange, landmarks = [] }: WaypointListProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
    dragRef.current = idx;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((idx: number) => {
    if (dragRef.current === null || dragRef.current === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const updated = [...waypoints];
    const [moved] = updated.splice(dragRef.current, 1);
    updated.splice(idx, 0, moved);
    // Reassign types
    updated.forEach((wp, i) => {
      if (i === 0) wp.type = 'start';
      else if (i === updated.length - 1) wp.type = 'end';
      else wp.type = 'waypoint';
    });
    onChange(updated);
    setDragIdx(null);
    setDragOverIdx(null);
    dragRef.current = null;
  }, [waypoints, onChange]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
    dragRef.current = null;
  }, []);

  const handleRemove = useCallback((idx: number) => {
    if (waypoints.length <= 2) return; // Minimum start + end
    const updated = waypoints.filter((_, i) => i !== idx);
    // Reassign types
    updated.forEach((wp, i) => {
      if (i === 0) wp.type = 'start';
      else if (i === updated.length - 1) wp.type = 'end';
      else wp.type = 'waypoint';
    });
    onChange(updated);
  }, [waypoints, onChange]);

  const handleAdd = useCallback(() => {
    const id = `wp-${nextId++}`;
    const newWp: Waypoint = {
      id,
      label: '',
      type: 'waypoint',
    };
    // Insert before end
    const updated = [...waypoints];
    updated.splice(updated.length - 1, 0, newWp);
    // Reassign types
    updated.forEach((wp, i) => {
      if (i === 0) wp.type = 'start';
      else if (i === updated.length - 1) wp.type = 'end';
      else wp.type = 'waypoint';
    });
    onChange(updated);
  }, [waypoints, onChange]);

  const handleLabelChange = useCallback((idx: number, label: string) => {
    const updated = [...waypoints];
    updated[idx] = { ...updated[idx], label };
    // If landmarks provided, try to match
    if (landmarks.length > 0) {
      const match = landmarks.find(l => l.label === label);
      if (match) {
        updated[idx].lat = match.lat;
        updated[idx].lon = match.lon;
      }
    }
    onChange(updated);
  }, [waypoints, onChange, landmarks]);

  return (
    <div className="space-y-0">
      {waypoints.map((wp, idx) => (
        <div key={wp.id} className="relative">
          {/* Connecting line */}
          {idx < waypoints.length - 1 && (
            <div className="absolute left-[22px] top-[28px] w-[2px] h-[calc(100%)] bg-white/[0.08] z-0" />
          )}

          <div
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={handleDragEnd}
            className={cn(
              'relative z-10 flex items-center gap-2 py-2 px-1 rounded-lg transition-all duration-200',
              dragIdx === idx && 'opacity-40',
              dragOverIdx === idx && dragIdx !== idx && 'bg-white/[0.04]',
            )}
          >
            {/* Drag handle */}
            <GripVertical className="w-3.5 h-3.5 text-slate-600 cursor-grab active:cursor-grabbing shrink-0" />

            {/* Dot indicator */}
            <div className={cn('w-3 h-3 rounded-full shrink-0 ring-2 ring-white/10', dotColor[wp.type])} />

            {/* Input */}
            {landmarks.length > 0 ? (
              <select
                value={wp.label}
                onChange={(e) => handleLabelChange(idx, e.target.value)}
                className="flex-1 bg-transparent border-b border-white/10 text-white text-sm py-1 px-1 focus:border-emerald-500 focus:outline-none transition-colors"
              >
                <option value="" className="bg-[#0a0f16]">Select location…</option>
                {landmarks.map(lm => (
                  <option key={lm.label} value={lm.label} className="bg-[#0a0f16]">{lm.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={wp.label}
                onChange={(e) => handleLabelChange(idx, e.target.value)}
                placeholder={wp.type === 'start' ? 'Start location' : wp.type === 'end' ? 'End location' : 'Waypoint'}
                className="flex-1 bg-transparent border-b border-white/10 text-white text-sm placeholder:text-slate-500 py-1 px-1 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            )}

            {/* Remove button (only if > 2 waypoints) */}
            {waypoints.length > 2 && (
              <button
                onClick={() => handleRemove(idx)}
                className="p-1 text-slate-600 hover:text-rose transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Add stop button */}
      <button
        onClick={handleAdd}
        className="flex items-center gap-2 w-full py-2.5 px-4 mt-2 rounded-xl text-xs text-slate-400 hover:text-emerald hover:bg-white/[0.03] transition-colors duration-200"
      >
        <Plus className="w-3.5 h-3.5" />
        Add stop
      </button>
    </div>
  );
}

export default WaypointList;
