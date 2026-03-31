import fs from 'fs-extra';
import path from 'path';

import {
  AbstractTask,
  DyCliError,
  runChangesetCommand,
  VersionCommandConfig,
} from '@dysonic/dy-cli-core';

export class VersionProjectTask extends AbstractTask<VersionCommandConfig> {
  public async run(): Promise<void> {
    if (this.config.projectContext.type === 'monorepo') {
      await this.runMonorepoVersion();
      return;
    }

    await this.runSingleVersion();
  }

  protected getDefaultConfig(): VersionCommandConfig {
    return {
      cwd: process.cwd(),
      beta: false,
      betaExit: false,
      betaTag: 'beta',
      set: undefined,
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

  private async runMonorepoVersion() {
    const cwd = this.config.projectContext.rootDir;

    if (this.config.set) {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        '--set is not supported for fixed monorepo versioning.',
      );
    }

    if (this.config.betaExit) {
      await runChangesetCommand(cwd, ['pre', 'exit']);
      return;
    }

    if (this.config.beta) {
      await runChangesetCommand(cwd, ['pre', 'enter', this.config.betaTag]);
    }

    await runChangesetCommand(cwd, ['version']);
  }

  private async runSingleVersion() {
    if (!this.config.set) {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        '--set is required for single-package versioning.',
      );
    }

    const cwd = this.config.projectContext.rootDir;
    const packageJSONPath = path.join(cwd, 'package.json');

    if (!(await fs.pathExists(packageJSONPath))) {
      throw new DyCliError('CONFIG_NOT_FOUND', `No package.json found at '${cwd}'.`);
    }

    const packageJSON = (await fs.readJSON(packageJSONPath)) as Record<string, unknown>;
    packageJSON.version = this.config.set;
    await fs.writeJSON(packageJSONPath, packageJSON, { spaces: 2 });
  }
}
