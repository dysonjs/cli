import { BaseCommandArgs, BaseCommandConfig } from '../base';

export type BuildTarget = 'default' | 'types' | 'umd';

export interface BuildCommandUmdConfig {
  name?: string;
  externals?: string[];
  globals?: Record<string, string>;
}

export interface BuildCommandExternalConfig {
  mode?: string;
  umd?: Partial<BuildCommandUmdConfig>;
}

export interface BuildCommandArgs extends BaseCommandArgs {
  mode?: string;
  types?: boolean;
  umd?: boolean;
  name?: string;
  externals?: string;
  globals?: string;
}

export interface BuildCommandConfig extends BaseCommandConfig {
  target: BuildTarget;
  mode?: string;
  name?: string;
  externals?: string[];
  globals?: Record<string, string>;
}
