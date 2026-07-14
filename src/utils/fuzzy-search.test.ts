import { describe, expect, it } from "vitest";

import { fuzzySearch } from "@/utils/fuzzy-search";

describe("fuzzySearch", () => {
  const categories = ["Biceps", "Chest", "Shoulders", "Upper Back"];

  it("finds partial category names and ranks exact substrings first", () => {
    expect(fuzzySearch(categories, "back")[0]).toBe("Upper Back");
  });

  it("tolerates typing mistakes", () => {
    expect(fuzzySearch(categories, "sholders")).toContain("Shoulders");
  });

  it("matches category names without accents", () => {
    expect(fuzzySearch(["Peitoral", "Bíceps"], "biceps")).toEqual(["Bíceps"]);
  });

  it("returns every category for an empty search", () => {
    expect(fuzzySearch(categories, "")).toHaveLength(categories.length);
  });
});
