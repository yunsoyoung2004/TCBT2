import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useJustFilled } from "@/components/runtime/worksheet-renderers/shared";

// useJustFilled backs the "quest complete" flourish (WorksheetCell in this
// file, WorksheetFieldRow in worksheet-pane.tsx) -- it must fire exactly
// once per real fill, not on every render/poll while a field stays filled,
// and never for a field that was already filled when the component mounted
// (e.g. reopening a session mid-way through).
describe("useJustFilled", () => {
  it("does not flag a field that is already filled on first mount", () => {
    const { result } = renderHook(() => useJustFilled(true, false));
    expect(result.current).toBe(false);
  });

  it("stays false while a field remains unfilled", () => {
    const { result, rerender } = renderHook(({ filled }: { filled: boolean }) => useJustFilled(filled, false), { initialProps: { filled: false } });
    expect(result.current).toBe(false);
    act(() => rerender({ filled: false }));
    expect(result.current).toBe(false);
  });

  it("flags a field on the false->true transition, then clears after the flourish duration", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(({ filled }: { filled: boolean }) => useJustFilled(filled, false), { initialProps: { filled: false } });
      expect(result.current).toBe(false);

      act(() => rerender({ filled: true }));
      expect(result.current).toBe(true);

      act(() => { vi.advanceTimersByTime(1300); });
      expect(result.current).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not re-flag on a later render once already filled", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(({ filled }: { filled: boolean }) => useJustFilled(filled, false), { initialProps: { filled: false } });
      act(() => rerender({ filled: true }));
      act(() => { vi.advanceTimersByTime(1300); });
      expect(result.current).toBe(false);

      // A poll/re-render that reports the same still-filled value must not
      // replay the flourish.
      act(() => rerender({ filled: true }));
      expect(result.current).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("never flags anything when reducedMotion is true, even on a real transition", () => {
    const { result, rerender } = renderHook(({ filled }: { filled: boolean }) => useJustFilled(filled, true), { initialProps: { filled: false } });
    act(() => rerender({ filled: true }));
    expect(result.current).toBe(false);
  });
});
