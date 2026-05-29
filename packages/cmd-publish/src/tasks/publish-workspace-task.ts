import {
  AbstractTask,
  createDefaultProjectContext,
  DyCliError,
  ensureReleaseState,
  PublishCommandConfig,
  hasPublishedStableVersion,
  ReleaseState,
  runProjectCommand,
} from '@dysonic/dy-cli-core';
import fs from 'fs-extra';
import path from 'path';

import { PublishProjectTask } from './publish-project-task';

export class PublishWorkspaceTask extends AbstractTask<PublishCommandConfig> {
  public async run(): Promise<void> {
    const cwd = this.config.projectContext.rootDir;
    const releaseState = await ensureReleaseState(cwd);

    await this.assertPrereleasePackagesHaveStableReleases(releaseState);
    await runProjectCommand(this.config.projectContext, 'build');
    await this.runWorkspaceArtifactBuilds();
    await runProjectCommand(this.config.projectContext, 'test', [], {
      NODE_ENV: 'test',
    });

    const tag = this.resolveTag(releaseState);

    if (this.config.dryRun) {
      await this.runWorkspacePublish(tag, true);
      return;
    }

    await this.runWorkspacePublish(tag, false);
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
      projectContext: createDefaultProjectContext(),
    };
  }

  private resolveTag(releaseState: ReleaseState): string | undefined {
    if (this.config.tag) {
      return this.config.tag;
    }

    if (this.config.beta) {
      return this.config.betaTag;
    }

    if (releaseState.mode === 'pre') {
      return releaseState.tag;
    }

    return undefined;
  }

  private async assertPrereleasePackagesHaveStableReleases(releaseState: ReleaseState) {
    if (releaseState.mode !== 'pre') {
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

  private async runWorkspacePublish(tag: string | undefined, dryRun: boolean) {
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
        dryRun,
        tag,
        projectContext: {
          ...this.config.projectContext,
          currentPackageDir: packageDir,
          isRoot: false,
        },
      }).run();
    }
  }

  private async runWorkspaceArtifactBuilds() {
    const typePackageDirs = await this.resolvePublishablePackageDirs((packageJSON) =>
      this.isNonEmptyString(packageJSON.types),
    );
    const browserPackageDirs = await this.resolvePublishablePackageDirs(
      (packageJSON) =>
        typeof packageJSON.browser === 'string' && this.isNonEmptyString(packageJSON.browser),
    );

    if (typePackageDirs.length > 0) {
      await runProjectCommand(
        {
          ...this.config.projectContext,
          targetPackageDirs: typePackageDirs,
        },
        'build',
        ['--types'],
      );
    }

    if (browserPackageDirs.length > 0) {
      await runProjectCommand(
        {
          ...this.config.projectContext,
          targetPackageDirs: browserPackageDirs,
        },
        'build',
        ['--umd'],
      );
    }
  }

  private async resolvePublishablePackageDirs(
    predicate: (packageJSON: { private?: boolean; types?: string; browser?: unknown }) => boolean,
  ) {
    const packageDirs: string[] = [];

    for (const packageDir of this.config.projectContext.targetPackageDirs) {
      const packageJSONPath = path.join(packageDir, 'package.json');

      if (!(await fs.pathExists(packageJSONPath))) {
        continue;
      }

      const packageJSON = (await fs.readJSON(packageJSONPath)) as {
        private?: boolean;
        types?: string;
        browser?: unknown;
      };

      if (packageJSON.private || !predicate(packageJSON)) {
        continue;
      }

      packageDirs.push(packageDir);
    }

    return packageDirs;
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
