import { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '../ui';
import { Flame } from 'lucide-react';

interface HotspotPoint {
  x: number;
  y: number;
  intensity: number; // 0-1
}

function generateHotspots(): HotspotPoint[] {
  // Simulate charging demand hotspots across a geographic area
  return [
    { x: 0.25, y: 0.3, intensity: 0.9 },  // High demand — city center
    { x: 0.6, y: 0.2, intensity: 0.7 },   // Medium — tech hub
    { x: 0.4, y: 0.55, intensity: 0.85 },  // High — commercial area
    { x: 0.75, y: 0.65, intensity: 0.5 },  // Medium-low — suburban
    { x: 0.15, y: 0.7, intensity: 0.6 },   // Medium — residential
    { x: 0.85, y: 0.35, intensity: 0.4 },  // Low — outskirts
    { x: 0.5, y: 0.85, intensity: 0.75 },  // High — transport hub
    { x: 0.35, y: 0.15, intensity: 0.55 }, // Medium — shopping district
    { x: 0.7, y: 0.8, intensity: 0.3 },    // Low — rural
    { x: 0.55, y: 0.45, intensity: 0.65 }, // Medium — industrial
  ];
}

function getColor(intensity: number): [number, number, number] {
  if (intensity > 0.7) return [239, 68, 68];     // Red
  if (intensity > 0.4) return [245, 158, 11];     // Amber/Yellow
  return [16, 185, 129];                           // Green
}

function drawHeatmap(canvas: HTMLCanvasElement, hotspots: HotspotPoint[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // Dark background with subtle grid
  ctx.fillStyle = 'rgba(10, 15, 22, 0.3)';
  ctx.fillRect(0, 0, width, height);

  // Draw grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Draw hotspots with additive blending
  ctx.globalCompositeOperation = 'lighter';

  for (const point of hotspots) {
    const px = point.x * width;
    const py = point.y * height;
    const radius = 40 + point.intensity * 60;
    const [r, g, b] = getColor(point.intensity);

    const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.4 * point.intensity})`);
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${0.2 * point.intensity})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
}

export function DemandHeatmap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hotspots] = useState<HotspotPoint[]>(generateHotspots);

  const resizeAndDraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    drawHeatmap(canvas, hotspots.map(h => ({
      ...h,
      x: h.x, // already normalized 0-1
      y: h.y,
    })));
  }, [hotspots]);

  useEffect(() => {
    resizeAndDraw();
    const observer = new ResizeObserver(resizeAndDraw);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [resizeAndDraw]);

  return (
    <Card className="group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose/10">
            <Flame className="w-3.5 h-3.5 text-rose" />
          </div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Charging Demand Hotspots
          </h3>
        </div>

      </div>
      <div ref={containerRef} className="relative w-full h-[240px] rounded-xl overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
        />
      </div>
      {/* Scale bar */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-slate-500">Low</span>
        <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-emerald via-amber to-rose opacity-60" />
        <span className="text-[10px] text-slate-500">High</span>
      </div>
    </Card>
  );
}

export default DemandHeatmap;
