import { AbstractTask, DyCliError, PublishCommandConfig } from '@dysonic/dy-cli-core';
import execa from 'execa';
import fs from 'fs-extra';
import path from 'path';

export class PublishProjectTask extends AbstractTask<PublishCommandConfig> {
  public async run(): Promise<void> {
    const cwd = this.config.cwd ?? process.cwd();
    const packageJSONPath = path.join(cwd, 'package.json');

    if (!(await fs.pathExists(packageJSONPath))) {
      throw new DyCliError('CONFIG_NOT_FOUND', `No package.json found at '${cwd}'.`);
    }

    const packageJSON = await fs.readJSON(packageJSONPath);

    if (packageJSON.private) {
      throw new DyCliError(
        'PACKAGE_PRIVATE',
        `Package '${packageJSON.name ?? path.basename(cwd)}' is private and cannot be published.`,
      );
    }

    await execa('npm', this.buildPublishArgs(), {
      cwd,
      stdio: 'inherit',
    });
  }

  protected getDefaultConfig(): PublishCommandConfig {
    return {
      cwd: process.cwd(),
      dryRun: false,
      tag: undefined,
      access: undefined,
      otp: undefined,
      registry: undefined,
    };
  }

  private buildPublishArgs() {
    const args = ['publish'];

    if (this.config.dryRun) {
      args.push('--dry-run');
    }

    if (this.config.tag) {
      args.push('--tag', this.config.tag);
    }

    if (this.config.access) {
      args.push('--access', this.config.access);
    }

    if (this.config.otp) {
      args.push('--otp', this.config.otp);
    }

    if (this.config.registry) {
      args.push('--registry', this.config.registry);
    }

    return args;
  }
}
