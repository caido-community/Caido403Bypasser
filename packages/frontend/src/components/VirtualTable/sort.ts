export type Sort<Field extends string> = {
  field: Field;
  direction: "asc" | "desc";
};

const compare = (a: unknown, b: unknown) => {
  if (a === b) {
    return 0;
  }
  if (a === undefined) {
    return 1;
  }
  if (b === undefined) {
    return -1;
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return typeof a === "string" && typeof b === "string"
    ? a.localeCompare(b)
    : 0;
};

export const sortRows = <Row, Field extends Extract<keyof Row, string>>(
  rows: Row[],
  sort: Sort<Field> | undefined,
) => {
  if (sort === undefined) {
    return rows;
  }
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => sign * compare(a[sort.field], b[sort.field]));
};

export const nextSort = <Field extends string>(
  current: Sort<Field> | undefined,
  field: Field,
): Sort<Field> | undefined => {
  if (current?.field !== field) {
    return { field, direction: "asc" };
  }
  return current.direction === "asc" ? { field, direction: "desc" } : undefined;
};
