import { describe, expect, it } from "vitest";

import { nextSort, sortRows } from "./sort";

type Row = { id: number; code?: number; name: string };

const rows: Row[] = [
  { id: 1, code: 403, name: "b" },
  { id: 2, name: "a" },
  { id: 3, code: 200, name: "c" },
];

describe("sortRows", () => {
  it("keeps the original order without a sort", () => {
    expect(sortRows(rows, undefined)).toBe(rows);
  });

  it("sorts numbers and strings in both directions", () => {
    expect(
      sortRows(rows, { field: "name", direction: "asc" }).map((r) => r.id),
    ).toEqual([2, 1, 3]);
    expect(
      sortRows(rows, { field: "id", direction: "desc" }).map((r) => r.id),
    ).toEqual([3, 2, 1]);
  });

  it("puts missing values last when ascending", () => {
    expect(
      sortRows(rows, { field: "code", direction: "asc" }).map((r) => r.id),
    ).toEqual([3, 1, 2]);
  });
});

describe("nextSort", () => {
  it("cycles ascending, descending, then off", () => {
    const asc = nextSort<keyof Row>(undefined, "id");
    const desc = nextSort(asc, "id");
    expect(asc).toEqual({ field: "id", direction: "asc" });
    expect(desc).toEqual({ field: "id", direction: "desc" });
    expect(nextSort(desc, "id")).toBeUndefined();
    expect(nextSort(desc, "name")).toEqual({ field: "name", direction: "asc" });
  });
});
