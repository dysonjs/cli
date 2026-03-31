import {
  AbstractTask,
  DyCliError,
  PublishCommandConfig,
  hasPublishedStableVersion,
  runChangesetCommand,
  runProjectCommand,
} from '@dysonic/dy-cli-core';
import fs from 'fs-extra';
import path from 'path';

import { PublishProjectTask } from './publish-project-task';

export class PublishWorkspaceTask extends AbstractTask<PublishCommandConfig> {
  public async run(): Promise<void> {
    const cwd = this.config.projectContext.rootDir;

    await this.assertPrereleasePackagesHaveStableReleases(cwd);
    await runProjectCommand(this.config.projectContext, 'build');
    await runProjectCommand(this.config.projectContext, 'test', [], {
      NODE_ENV: 'test',
    });

    const publishArgs = ['publish'];
    const tag = this.resolveTag();

    if (tag) {
      publishArgs.push('--tag', tag);
    }

    if (this.config.dryRun) {
      await this.runWorkspaceDryRun();
      return;
    }

    await runChangesetCommand(cwd, publishArgs);
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

  private resolveTag(): string | undefined {
    if (this.config.tag) {
      return this.config.tag;
    }

    if (this.config.beta) {
      return this.config.betaTag;
    }

    return undefined;
  }

  private async assertPrereleasePackagesHaveStableReleases(cwd: string) {
    if (!(await fs.pathExists(path.join(cwd, '.changeset/pre.json')))) {
      return;
    }

    const packagesWithoutStableRelease: string[] = [];

    for (const packageDir of this.config.projectContext.targetPackageDirs) {
      const packageJSONPath = path.join(packageDir, 'package.json');

      if (!(await fs.pathExists(packageJSONPath))) {
        continue;
      }

      const packageJSON = (await fs.readJSON(packageJSONPath)) as {
        name?: string;
        private?: boolean;
      };

      if (packageJSON.private || !packageJSON.name) {
        continue;
      }

      if (!(await hasPublishedStableVersion(packageJSON.name))) {
        packagesWithoutStableRelease.push(packageJSON.name);
      }
    }

    if (packagesWithoutStableRelease.length === 0) {
      return;
    }

    throw new DyCliError(
      'INVALID_ARGUMENT',
      [
        'Prerelease publishing is only allowed for packages that already have a stable release.',
        `Missing stable releases: ${packagesWithoutStableRelease.join(', ')}.`,
        'Publish a stable version first or exclude these packages from the prerelease batch.',
      ].join(' '),
    );
  }

  private async runWorkspaceDryRun() {
    for (const packageDir of this.config.projectContext.targetPackageDirs) {
      const packageJSONPath = path.join(packageDir, 'package.json');

      if (!(await fs.pathExists(packageJSONPath))) {
        continue;
      }

      const packageJSON = (await fs.readJSON(packageJSONPath)) as {
        private?: boolean;
      };

      if (packageJSON.private) {
        continue;
      }

      await new PublishProjectTask({
        ...this.config,
        cwd: packageDir,
        dryRun: true,
        projectContext: {
          ...this.config.projectContext,
          currentPackageDir: packageDir,
          isRoot: false,
        },
      }).run();
    }
  }
}
