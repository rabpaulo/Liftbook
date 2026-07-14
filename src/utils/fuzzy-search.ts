function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function subsequenceGap(candidate: string, query: string) {
  let candidateIndex = 0;
  let firstMatch = -1;
  let lastMatch = -1;
  for (const character of query) {
    const match = candidate.indexOf(character, candidateIndex);
    if (match === -1) return null;
    if (firstMatch === -1) firstMatch = match;
    lastMatch = match;
    candidateIndex = match + 1;
  }
  return lastMatch - firstMatch + 1 - query.length;
}

export function fuzzySearchScore(candidateValue: string, queryValue: string) {
  const candidate = normalizeSearchText(candidateValue);
  const query = normalizeSearchText(queryValue);
  if (!query) return 0;
  if (candidate === query) return 0;

  const substringIndex = candidate.indexOf(query);
  if (substringIndex >= 0) return 10 + substringIndex;

  const words = candidate.split(/\s+/);
  const distances = [candidate, ...words].map((part) => ({
    distance: editDistance(part, query),
    length: Math.max(part.length, query.length),
  }));
  const closest = distances.sort((left, right) => left.distance - right.distance)[0];
  if (closest.distance <= Math.max(1, Math.ceil(closest.length * 0.34))) {
    return 20 + closest.distance;
  }

  const gap = subsequenceGap(candidate, query);
  return gap === null ? null : 40 + gap;
}

export function fuzzySearch(values: readonly string[], query: string) {
  return values
    .map((value) => ({ value, score: fuzzySearchScore(value, query) }))
    .filter((result): result is { value: string; score: number } => result.score !== null)
    .sort((left, right) => left.score - right.score || left.value.localeCompare(right.value))
    .map((result) => result.value);
}
