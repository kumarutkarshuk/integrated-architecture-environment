export const CANVAS_PAGE_ID = "page:page";
const LEGACY_PAGE_ID = "page:preview";
const INDEX_DIGITS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function normalizeCanvasRecords(
  records: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(records)) {
    if (key === LEGACY_PAGE_ID) {
      continue;
    }

    const record = value as Record<string, unknown>;

    if (record.typeName === "page" && key !== CANVAS_PAGE_ID) {
      continue;
    }

    if (record.typeName === "shape") {
      const parentId = record.parentId;
      if (
        parentId === LEGACY_PAGE_ID ||
        (typeof parentId === "string" &&
          parentId.startsWith("page:") &&
          parentId !== CANVAS_PAGE_ID)
      ) {
        normalized[key] = { ...record, parentId: CANVAS_PAGE_ID };
        continue;
      }
    }

    normalized[key] = value;
  }

  return repairShapeIndexes(normalized);
}

function repairShapeIndexes(
  records: Record<string, unknown>,
): Record<string, unknown> {
  const used = new Set<string>();

  for (const value of Object.values(records)) {
    if (!isShapeRecord(value) || !isValidTldrawIndexKey(value.index)) {
      continue;
    }
    used.add(value.index);
  }

  let next = 0;
  const repaired: Record<string, unknown> = { ...records };

  for (const [key, value] of Object.entries(records)) {
    if (!isShapeRecord(value) || isValidTldrawIndexKey(value.index)) {
      continue;
    }

    while (used.has(shapeIndexAt(next))) {
      next += 1;
    }

    const index = shapeIndexAt(next);
    used.add(index);
    next += 1;
    repaired[key] = { ...value, index };
  }

  return repaired;
}

function isShapeRecord(
  value: unknown,
): value is Record<string, unknown> & { index: unknown } {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { typeName?: unknown }).typeName === "shape",
  );
}

function isValidTldrawIndexKey(key: unknown): key is string {
  if (typeof key !== "string" || key.length < 2) {
    return false;
  }

  const head = key[0]!;
  let integerLength: number;
  if (head >= "a" && head <= "z") {
    integerLength = head.charCodeAt(0) - "a".charCodeAt(0) + 2;
  } else if (head >= "A" && head <= "Z") {
    integerLength = "Z".charCodeAt(0) - head.charCodeAt(0) + 2;
  } else {
    return false;
  }

  if (key.length < integerLength) {
    return false;
  }

  for (const character of key) {
    if (!INDEX_DIGITS.includes(character)) {
      return false;
    }
  }

  return !key.slice(integerLength).endsWith("0");
}

function shapeIndexAt(index: number): string {
  const n = index + 1;
  if (n < INDEX_DIGITS.length) {
    return `a${INDEX_DIGITS[n]}`;
  }

  const rest = n - INDEX_DIGITS.length;
  const high = Math.floor(rest / INDEX_DIGITS.length);
  const low = rest % INDEX_DIGITS.length;
  return `b${INDEX_DIGITS[high]}${INDEX_DIGITS[low]}`;
}
