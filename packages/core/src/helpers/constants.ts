import { CreateTemplates } from '../interfaces';

export const EXTERNAL_CONFIG_FILE_NAME = 'dy.config';
export const PUBLISH_CHANNEL_ENV_NAME = 'DY_CLI_PUBLISH_CHANNEL';
export const DEFAULT_CREATE_TEMPLATE_TYPE = 'monorepo';
export const DEFAULT_CREATE_TEMPLATES: CreateTemplates = {
  monorepo: {
    label: 'Monorepo',
    description: 'Create a workspace-based project scaffold.',
  },
  single: {
    label: 'Single repo',
    description: 'Create a single-package project scaffold.',
  },
};
