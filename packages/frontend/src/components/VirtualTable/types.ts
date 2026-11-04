export type VirtualColumn<Row> = {
  field: Extract<keyof Row, string>;
  label: string;
  width?: number;
};
