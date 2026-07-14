import type { WeightUnit } from "@/hooks/use-bodyweight";

const POUNDS_PER_KILOGRAM = 2.2046226218;

export function fromKilograms(value: number, unit: WeightUnit) {
  return unit === "lbs" ? value * POUNDS_PER_KILOGRAM : value;
}

export function toKilograms(value: number, unit: WeightUnit) {
  return unit === "lbs" ? value / POUNDS_PER_KILOGRAM : value;
}

export function formatWeight(value: number, unit: WeightUnit, digits = 1) {
  return `${fromKilograms(value, unit).toFixed(digits).replace(/\.0$/, "")} ${unit}`;
}
