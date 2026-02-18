import { useMemo } from 'react';
import { DARK_STYLE } from '../components/map/mapStyles';
import type { StyleSpecification } from 'maplibre-gl';

export function useMapTheme(): { mapStyle: StyleSpecification; isDarkMode: boolean } {
  return useMemo(
    () => ({ mapStyle: DARK_STYLE, isDarkMode: true }),
    [],
  );
}
