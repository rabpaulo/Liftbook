import { afterEach, describe, expect, it, vi } from "vitest";

import { EdgeAutoScroller } from "@/utils/edge-auto-scroller";

describe("edge auto-scrolling", () => {
  afterEach(() => vi.useRealTimers());

  it("adds applied scroll distance to the dragged item translation", () => {
    vi.useFakeTimers();
    const translations: number[] = [];
    const scrollBy = vi.fn((distance: number) => distance);
    const scroller = new EdgeAutoScroller(scrollBy, (distance) => translations.push(distance));

    scroller.begin();
    scroller.update(20, 1);
    vi.advanceTimersByTime(32);

    expect(scrollBy).toHaveBeenCalledTimes(2);
    expect(translations).toEqual([20, 32, 44]);
    expect(scroller.finish(25)).toBe(49);
  });
});
