import { BaseCommandArgs, BaseCommandConfig } from '../base';
import { ProjectContext } from '../project';

export type InstallPackageManagerName = 'npm' | 'pnpm';

export interface InstallCommandExternalConfig {
  npmClient?: InstallPackageManagerName;
}

export interface InstallCommandArgs extends BaseCommandArgs {}

export interface InstallCommandConfig extends BaseCommandConfig {
  npmClient?: InstallPackageManagerName;
  projectContext: ProjectContext;
}
