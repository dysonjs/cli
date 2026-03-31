import { AbstractTask, DyCliError, PublishCommandConfig } from '@dysonic/dy-cli-core';
import execa from 'execa';
import fs from 'fs-extra';
import path from 'path';

const NPM_PUBLISH_LIFECYCLE_EVENTS = new Set(['prepublishOnly', 'publish', 'postpublish']);

export class PublishProjectTask extends AbstractTask<PublishCommandConfig> {
  public async run(): Promise<void> {
    const cwd = this.resolveExecutionDir();
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

    if (NPM_PUBLISH_LIFECYCLE_EVENTS.has(process.env.npm_lifecycle_event ?? '')) {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        "dy-cli publish cannot run from npm publish lifecycle scripts because it recursively invokes 'npm publish'. Rename the script to 'release' and run that instead.",
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
      beta: false,
      workspace: false,
      betaTag: 'beta',
      workspaceRoot: undefined,
      workspaceConcurrency: 8,
      projectContext: {
        cwd: process.cwd(),
        rootDir: process.cwd(),
        type: 'single',
        packageDir: 'packages',
        versionStrategy: undefined,
        packageDirs: [],
        targetPackageDirs: [process.cwd()],
        currentPackageDir: process.cwd(),
        isRoot: true,
      },
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

  private resolveExecutionDir() {
    if (this.config.projectContext.type === 'single') {
      return this.config.projectContext.rootDir;
    }

    return this.config.projectContext.currentPackageDir ?? this.config.cwd ?? process.cwd();
  }
}
