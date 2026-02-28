// ─── Hardware Profiling Utility ──────────────────────────
// Detects client hardware capabilities and recommends simulation settings.

export interface HardwareProfile {
  cpuCores: number;
  deviceMemoryGB: number | null; // navigator.deviceMemory (Chrome only)
  tier: 'low-end' | 'mid-range' | 'high-end';
  recommendations: {
    simulationScale: 'light' | 'standard' | 'full';
    trainingEpisodes: number;
    mapRadius: string;
    description: string;
  };
}

export function getHardwareProfile(): HardwareProfile {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as any).deviceMemory || null;

  let tier: HardwareProfile['tier'];
  if (cores <= 4 || (mem && mem <= 4)) {
    tier = 'low-end';
  } else if (cores <= 8 || (mem && mem <= 8)) {
    tier = 'mid-range';
  } else {
    tier = 'high-end';
  }

  const recommendations: Record<HardwareProfile['tier'], HardwareProfile['recommendations']> = {
    'low-end': {
      simulationScale: 'light',
      trainingEpisodes: 50,
      mapRadius: '3km',
      description: 'Light mode recommended for smooth performance',
    },
    'mid-range': {
      simulationScale: 'standard',
      trainingEpisodes: 200,
      mapRadius: '5km',
      description: 'Standard mode — good balance of detail and speed',
    },
    'high-end': {
      simulationScale: 'full',
      trainingEpisodes: 500,
      mapRadius: '10km',
      description: 'Full mode — maximum detail and fidelity',
    },
  };

  return {
    cpuCores: cores,
    deviceMemoryGB: mem,
    tier,
    recommendations: recommendations[tier],
  };
}
