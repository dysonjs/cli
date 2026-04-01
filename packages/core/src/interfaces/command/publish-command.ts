import { BaseCommandArgs, BaseCommandConfig } from '../base';
import { ProjectContext } from '../project';

export type PublishAccess = 'public' | 'restricted';

export interface PublishCommandExternalConfig {
  dryRun?: boolean;
  tag?: string;
  access?: PublishAccess;
  otp?: string;
  registry?: string;
  betaTag?: string;
  workspaceConcurrency?: number;
}

export interface PublishCommandArgs extends BaseCommandArgs {
  dryRun?: boolean;
  tag?: string;
  access?: string;
  otp?: string;
  registry?: string;
  beta?: boolean;
  workspace?: boolean;
}

export interface PublishCommandConfig extends BaseCommandConfig {
  dryRun: boolean;
  tag?: string;
  access?: PublishAccess;
  otp?: string;
  registry?: string;
  beta: boolean;
  workspace: boolean;
  betaTag: string;
  workspaceRoot?: string;
  workspaceConcurrency: number;
  projectContext: ProjectContext;
}
