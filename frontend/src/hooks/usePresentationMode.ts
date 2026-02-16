import { useEffect } from 'react';
import { usePresentationMode } from '../store/store';

/**
 * Registers the Ctrl+Shift+P keyboard shortcut for toggling presentation mode.
 * Also syncs the .presentation class on document.documentElement.
 * Call this once at the App level.
 */
export function usePresentationModeEffect(): void {
  const { presentationMode, togglePresentationMode } = usePresentationMode();

  // Sync .presentation class on <html>
  useEffect(() => {
    const el = document.documentElement;
    if (presentationMode) {
      el.classList.add('presentation');
    } else {
      el.classList.remove('presentation');
    }
  }, [presentationMode]);

  // Register Ctrl+Shift+P keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        togglePresentationMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePresentationMode]);
}
