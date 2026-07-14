import { describe, expect, it } from "vitest";

import { reorderToIndex } from "@/utils/training-position";

describe("position updates", () => {
  const items = [{ id: "a", position: 0 }, { id: "b", position: 1 }, { id: "c", position: 2 }];
  it("moves an exercise directly to a drag target and compacts positions", () => {
    expect(reorderToIndex(items, "a", 2)).toEqual([
      { id: "b", position: 0 },
      { id: "c", position: 1 },
      { id: "a", position: 2 },
    ]);
    expect(reorderToIndex(items, "c", -5).map((item) => item.id)).toEqual(["c", "a", "b"]);
  });
});
