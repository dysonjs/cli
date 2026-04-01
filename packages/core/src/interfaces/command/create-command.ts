import { BaseCommandArgs, BaseCommandConfig } from '../base';

export type CreateTemplateType = 'monorepo' | 'single';

export interface CreateTemplateConfig {
  label: string;
  description: string;
}

export type CreateTemplates = Record<CreateTemplateType, CreateTemplateConfig>;

export interface CreateCommandExternalConfig {
  defaultTemplateType?: CreateTemplateType;
  templates?: Partial<CreateTemplates>;
}

export interface CreateCommandArgs extends BaseCommandArgs {
  destDir?: string;
  projectName?: string;
  project?: CreateTemplateType;
  force?: boolean;
}

export interface CreateCommandConfig extends BaseCommandConfig {
  destDir: string;
  projectName: string;
  templateType: CreateTemplateType;
  templates: CreateTemplates;
  force: boolean;
}
