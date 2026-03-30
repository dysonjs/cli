import { BaseCommandArgs, BaseCommandConfig } from '../base';

export interface AddCommandArgs extends BaseCommandArgs {
  destDir?: string;
  packageName?: string;
  description?: string;
  private?: boolean;
  sideEffects?: boolean;
}

export interface AddCommandConfig extends BaseCommandConfig {
  destDir: string;
  packageName?: string;
  description?: string;
  private?: boolean;
  sideEffects?: boolean;
}
