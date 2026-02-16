/**
 * Presentation Mode Tests
 * =======================
 * Verifies store toggle, CSS class sync, and keyboard shortcut.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSystemStore } from '../store/store';
import { usePresentationModeEffect } from '../hooks/usePresentationMode';

describe('Presentation Mode', () => {
  beforeEach(() => {
    useSystemStore.setState({ presentationMode: false });
    document.documentElement.classList.remove('presentation');
  });

  afterEach(() => {
    document.documentElement.classList.remove('presentation');
  });

  it('togglePresentationMode flips the boolean', () => {
    expect(useSystemStore.getState().presentationMode).toBe(false);
    act(() => {
      useSystemStore.getState().togglePresentationMode();
    });
    expect(useSystemStore.getState().presentationMode).toBe(true);
    act(() => {
      useSystemStore.getState().togglePresentationMode();
    });
    expect(useSystemStore.getState().presentationMode).toBe(false);
  });

  it('adds .presentation class to <html> when enabled', () => {
    const { rerender } = renderHook(() => usePresentationModeEffect());
    expect(document.documentElement.classList.contains('presentation')).toBe(false);

    act(() => {
      useSystemStore.setState({ presentationMode: true });
    });
    rerender();
    expect(document.documentElement.classList.contains('presentation')).toBe(true);
  });

  it('removes .presentation class when disabled', () => {
    useSystemStore.setState({ presentationMode: true });
    const { rerender } = renderHook(() => usePresentationModeEffect());
    expect(document.documentElement.classList.contains('presentation')).toBe(true);

    act(() => {
      useSystemStore.setState({ presentationMode: false });
    });
    rerender();
    expect(document.documentElement.classList.contains('presentation')).toBe(false);
  });

  it('Ctrl+Shift+P keyboard shortcut toggles presentation mode', () => {
    renderHook(() => usePresentationModeEffect());
    expect(useSystemStore.getState().presentationMode).toBe(false);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'P',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        }),
      );
    });
    expect(useSystemStore.getState().presentationMode).toBe(true);
  });
});
