export enum OrderBy {
  Asc = 'asc',
  Desc = 'desc',
}

export interface Order {
  field: string;
  order: OrderBy;
}
