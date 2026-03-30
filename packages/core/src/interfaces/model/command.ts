export type CommandOption = [string, string, (string | boolean)?];

export interface ICommand {
  execute(): Promise<void>;
  getOptions(): CommandOption[];
}
