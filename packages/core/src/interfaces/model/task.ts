export interface ITask<R = any> {
  run(): Promise<R>;
}
