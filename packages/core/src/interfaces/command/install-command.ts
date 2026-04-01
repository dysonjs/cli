import { BaseCommandArgs, BaseCommandConfig } from '../base';
import { ProjectContext } from '../project';

export interface InstallCommandExternalConfig {}

export interface InstallCommandArgs extends BaseCommandArgs {}

export interface InstallCommandConfig extends BaseCommandConfig {
  projectContext: ProjectContext;
}
