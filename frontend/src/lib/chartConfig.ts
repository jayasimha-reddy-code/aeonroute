import React from 'react';

/** ── Centralized Recharts Styling Tokens ────────────── */

export const CHART_COLORS = {
  emerald: '#10B981',
  cyan: '#14B8A6',
  amber: '#F59E0B',
  rose: '#EF4444',
  blue: '#3B82F6',
  purple: '#8B5CF6',
} as const;

export const CHART_PALETTE = [
  CHART_COLORS.emerald,
  CHART_COLORS.cyan,
  CHART_COLORS.amber,
  CHART_COLORS.rose,
  CHART_COLORS.blue,
  CHART_COLORS.purple,
];

/** Unified tooltip styling — dark glass */
export const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'rgba(10, 15, 22, 0.9)',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  fontSize: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  padding: '10px 14px',
};

/** Axis tick style */
export const axisStyle = {
  fontSize: 11,
  fill: 'rgba(255,255,255,0.3)',
  fontFamily: 'inherit',
};

/** Grid line style — barely visible */
export const gridStyle = {
  stroke: 'rgba(255,255,255,0.03)',
  strokeDasharray: '3 3',
};

/** Legend style */
export const legendStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.5)',
};

/**
 * SVG gradient definition block for AreaChart fills.
 * Usage: Place inside <defs> of the chart.
 * Then reference as `fill="url(#emeraldGradient)"` on <Area>.
 *
 * Example:
 * ```tsx
 * <AreaChart data={data}>
 *   <defs>
 *     {areaGradient('emeraldGradient', CHART_COLORS.emerald)}
 *   </defs>
 *   <Area fill="url(#emeraldGradient)" stroke={CHART_COLORS.emerald} />
 * </AreaChart>
 * ```
 */
export function areaGradient(id: string, color: string, topOpacity = 0.5, bottomOpacity = 0) {
  return React.createElement(
    'linearGradient',
    { id, x1: '0', y1: '0', x2: '0', y2: '1', key: id },
    React.createElement('stop', { offset: '0%', stopColor: color, stopOpacity: topOpacity }),
    React.createElement('stop', { offset: '100%', stopColor: color, stopOpacity: bottomOpacity }),
  );
}

/** Cursor line style for chart crosshairs */
export const cursorStyle = {
  stroke: 'rgba(255,255,255,0.1)',
  strokeWidth: 1,
};
