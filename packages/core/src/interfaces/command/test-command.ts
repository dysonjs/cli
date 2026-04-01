import { BaseCommandArgs, BaseCommandConfig } from '../base';
import { ProjectContext } from '../project';

export interface TestCommandExternalConfig {
  config?: string;
  coverage?: boolean;
  watch?: boolean;
  updateSnapshot?: boolean;
  workspaceConcurrency?: number;
}

export interface TestCommandArgs extends BaseCommandArgs {
  config?: string;
  coverage?: boolean;
  watch?: boolean;
  updateSnapshot?: boolean;
  workspace?: boolean;
}

export interface TestCommandConfig extends BaseCommandConfig {
  config: string;
  coverage: boolean;
  watch: boolean;
  updateSnapshot: boolean;
  workspace: boolean;
  workspaceRoot?: string;
  workspaceConcurrency: number;
  projectContext: ProjectContext;
}
