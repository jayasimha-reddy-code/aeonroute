import { useState } from 'react';
import { Cloud, CloudRain, Sun, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface WeatherData {
  condition: 'sunny' | 'cloudy' | 'rainy';
  temperature: number;
  label: string;
}

const WEATHER: WeatherData = {
  condition: 'cloudy',
  temperature: 28,
  label: 'Partly Cloudy',
};

const icons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
};

export function WeatherWidget() {
  const [visible, setVisible] = useState(true);

  const WeatherIcon = icons[WEATHER.condition];

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5">
      {/* Toggle pill */}
      <button
        onClick={() => setVisible(!visible)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium transition-all duration-300',
          'bg-[#0a0f16]/60 backdrop-blur-2xl border border-white/10',
          visible ? 'text-emerald' : 'text-slate-400',
        )}
      >
        <Cloud className="w-3 h-3" />
        Weather
        {visible ? <EyeOff className="w-2.5 h-2.5 ml-0.5 opacity-50" /> : <Eye className="w-2.5 h-2.5 ml-0.5 opacity-50" />}
      </button>

      {/* Weather card */}
      {visible && (
        <div className="bg-[#0a0f16]/60 backdrop-blur-2xl rounded-xl border border-white/10 px-3 py-1.5 flex items-center gap-2 shadow-lg">
          <WeatherIcon className="w-5 h-5 text-amber" />
          <div>
            <p className="text-sm font-bold text-white tabular-nums">{WEATHER.temperature}°C</p>
            <p className="text-[9px] text-slate-400">{WEATHER.label}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeatherWidget;
