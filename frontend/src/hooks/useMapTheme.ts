import { useMemo } from 'react';
import { useSystemStore } from '../store/store';
import { DARK_STYLE, LIGHT_STYLE } from '../components/map/mapStyles';
import type { StyleSpecification } from 'maplibre-gl';

export function useMapTheme(): { mapStyle: StyleSpecification; isDarkMode: boolean } {
  const isDarkMode = useSystemStore((s) => s.isDarkMode);

  return useMemo(
    () => ({ mapStyle: isDarkMode ? DARK_STYLE : LIGHT_STYLE, isDarkMode }),
    [isDarkMode],
  );
}
