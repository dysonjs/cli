import { BaseCommandArgs, BaseCommandConfig } from '../base';

export type PublishAccess = 'public' | 'restricted';

export interface PublishCommandExternalConfig {
  dryRun?: boolean;
  tag?: string;
  access?: PublishAccess;
  otp?: string;
  registry?: string;
}

export interface PublishCommandArgs extends BaseCommandArgs {
  dryRun?: boolean;
  tag?: string;
  access?: string;
  otp?: string;
  registry?: string;
}

export interface PublishCommandConfig extends BaseCommandConfig {
  dryRun: boolean;
  tag?: string;
  access?: PublishAccess;
  otp?: string;
  registry?: string;
}
