export type Result<T> =
  { kind: "Ok"; value: T } | { kind: "Error"; error: string };

export function ok<T>(value: T): Result<T> {
  return { kind: "Ok", value };
}

export function err<T>(error: string): Result<T> {
  return { kind: "Error", error };
}
