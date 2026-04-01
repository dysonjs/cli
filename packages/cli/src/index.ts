import { Command } from 'commander';

import { DyCliError, log } from '@dysonic/dy-cli-core';
import { add } from '@dysonic/dy-cli-cmd-add';
import { build } from '@dysonic/dy-cli-cmd-build';
import { create } from '@dysonic/dy-cli-cmd-create';
import { install } from '@dysonic/dy-cli-cmd-install';
import { publish } from '@dysonic/dy-cli-cmd-publish';
import { test } from '@dysonic/dy-cli-cmd-test';
import { version } from '@dysonic/dy-cli-cmd-version';

import pkg from '../package.json';

export function createProgram() {
  const program = new Command();

  program
    .name('dy-cli')
    .version(pkg.version)
    .addCommand(create)
    .addCommand(install)
    .addCommand(add)
    .addCommand(build)
    .addCommand(test)
    .addCommand(version)
    .addCommand(publish);

  return program;
}

export async function runCLI(argv = process.argv) {
  return createProgram().parseAsync(argv);
}

/** 顶层入口（如 `dist/cli.js`）在失败时使用的统一错误出口，便于单测覆盖 */
export function reportCliFailure(error: unknown): void {
  if (error instanceof DyCliError) {
    log.error(error.message);
  } else {
    console.error(error);
  }

  process.exit(1);
}
