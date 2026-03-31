import { BaseCommandArgs, BaseCommandConfig } from '../base';
import { ProjectContext } from '../project';

export interface VersionCommandExternalConfig {
  betaTag?: string;
}

export interface VersionCommandArgs extends BaseCommandArgs {
  beta?: boolean;
  betaExit?: boolean;
  set?: string;
}

export interface VersionCommandConfig extends BaseCommandConfig {
  beta: boolean;
  betaExit: boolean;
  betaTag: string;
  set?: string;
  projectContext: ProjectContext;
}
