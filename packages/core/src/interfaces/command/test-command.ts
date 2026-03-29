import { BaseCommandArgs, BaseCommandConfig } from '../base';

export interface TestCommandExternalConfig {
  config?: string;
  coverage?: boolean;
  watch?: boolean;
  updateSnapshot?: boolean;
}

export interface TestCommandArgs extends BaseCommandArgs {
  config?: string;
  coverage?: boolean;
  watch?: boolean;
  updateSnapshot?: boolean;
}

export interface TestCommandConfig extends BaseCommandConfig {
  config: string;
  coverage: boolean;
  watch: boolean;
  updateSnapshot: boolean;
}
