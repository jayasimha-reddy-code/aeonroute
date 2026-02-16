import { memo } from 'react';
import { Marker } from 'react-map-gl/maplibre';

interface NodeMarkersProps {
  sourceNodeId?: number;
  destNodeId?: number;
  posLookup: Record<string, [number, number]> | null;
}

const markerStyle = (bg: string, border: string, shadow: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: bg,
  border: `3px solid ${border}`,
  boxShadow: `0 0 12px ${shadow}`,
  color: 'white',
  fontWeight: 800,
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
});

export const NodeMarkers = memo(function NodeMarkers({
  sourceNodeId,
  destNodeId,
  posLookup,
}: NodeMarkersProps) {
  if (!posLookup) return null;

  const srcPos = sourceNodeId !== undefined ? posLookup[sourceNodeId.toString()] : undefined;
  const dstPos = destNodeId !== undefined ? posLookup[destNodeId.toString()] : undefined;

  return (
    <>
      {srcPos && (
        <Marker longitude={srcPos[0]} latitude={srcPos[1]} anchor="center">
          <div style={markerStyle('#10b981', '#065f46', 'rgba(16,185,129,0.5)')}>S</div>
        </Marker>
      )}
      {dstPos && (
        <Marker longitude={dstPos[0]} latitude={dstPos[1]} anchor="center">
          <div style={markerStyle('#ef4444', '#991b1b', 'rgba(239,68,68,0.5)')}>D</div>
        </Marker>
      )}
    </>
  );
});