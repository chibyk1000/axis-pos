/**
 * Utility to generate the next incremental number for items
 * Looks for a position, number, or sequence field
 */
export function getNextNumber(items: any[]): number {
  if (!items || items.length === 0) return 1;

  // Try to find max from position field
  let maxNum = Math.max(
    ...items
      .map((item) => {
        if (typeof item?.position === "number") return item.position;
        if (typeof item?.number === "number") return item.number;
        if (typeof item?.sequence === "number") return item.sequence;
        return 0;
      })
      .filter((n) => n > 0),
  );

  return maxNum === -Infinity || maxNum < 1 ? 1 : maxNum + 1;
}

/**
 * Get the next position for an ordered list (e.g., payment types)
 */
export function getNextPosition(items: any[]): number {
  return getNextNumber(items);
}
