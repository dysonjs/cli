import { BaseCommandArgs, BaseCommandConfig } from '../base';
import { ProjectContext } from '../project';

export type BuildTarget = 'default' | 'types' | 'umd' | 'bin';

export interface BuildCommandUmdConfig {
  name?: string;
  externals?: string[];
  globals?: Record<string, string>;
}

export interface BuildCommandBinConfig {
  entry?: string;
  output?: string;
  banner?: string;
}

export interface BuildCommandExternalConfig {
  mode?: string;
  workspaceConcurrency?: number;
  umd?: Partial<BuildCommandUmdConfig>;
  bin?: Partial<BuildCommandBinConfig>;
}

export interface BuildCommandArgs extends BaseCommandArgs {
  mode?: string;
  types?: boolean;
  umd?: boolean;
  bin?: boolean;
  workspace?: boolean;
  name?: string;
  externals?: string;
  globals?: string;
}

export interface BuildCommandConfig extends BaseCommandConfig {
  target: BuildTarget;
  mode?: string;
  workspace: boolean;
  workspaceRoot?: string;
  workspaceConcurrency: number;
  name?: string;
  externals?: string[];
  globals?: Record<string, string>;
  bin?: BuildCommandBinConfig;
  projectContext: ProjectContext;
}
