import { BaseCommandArgs, BaseCommandConfig } from '../base';
import { ProjectContext } from '../project';

export interface VersionCommandExternalConfig {
  betaTag?: string;
}

export type VersionReleaseType = 'patch' | 'minor' | 'major';

export interface VersionCommandArgs extends BaseCommandArgs {
  beta?: boolean;
  betaExit?: boolean;
  major?: boolean;
  minor?: boolean;
  patch?: boolean;
  set?: string;
}

export interface VersionCommandConfig extends BaseCommandConfig {
  beta: boolean;
  betaExit: boolean;
  betaTag: string;
  releaseType?: VersionReleaseType;
  set?: string;
  projectContext: ProjectContext;
}
