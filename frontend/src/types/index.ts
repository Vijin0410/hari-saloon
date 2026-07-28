export interface ApiResponse<T> {
  code: string;
  msg: string;
  data: T;
}

export interface PageData<T> {
  list: T[];
  total: number;
}

export type PageResult<T> = ApiResponse<PageData<T>>;

export interface PageParams {
  pageNum: number;
  pageSize: number;
}

export interface OptionNode<TValue extends string | number = number> {
  value: TValue;
  label: string;
  children?: OptionNode<TValue>[];
}
