export function reorderToIndex<T extends { id: string; position: number }>(
  items: readonly T[],
  itemId: string,
  targetIndex: number,
) {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const sourceIndex = sorted.findIndex((item) => item.id === itemId);
  if (sourceIndex < 0 || sorted.length === 0) return sorted;
  const boundedTarget = Math.max(0, Math.min(Math.round(targetIndex), sorted.length - 1));
  if (sourceIndex === boundedTarget) return sorted;
  const [moved] = sorted.splice(sourceIndex, 1);
  sorted.splice(boundedTarget, 0, moved);
  return sorted.map((item, position) => ({ ...item, position }));
}
