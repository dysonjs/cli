export * from './errors/dy-cli-error';
export * from './commands';
export * from './helpers';
export * from './interfaces';
export * from './tasks';

import { ExternalRunCommandsConfig } from './interfaces';

/** 定义配置项（PS：用于 typescript 配置文件场景，可以为上层用户提供配置提示） */
export function defineConfig(config: ExternalRunCommandsConfig) {
  return config;
}
