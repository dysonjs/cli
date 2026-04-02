import fs from 'fs-extra';
import path from 'path';

import {
  AbstractTask,
  DyCliError,
  runChangesetCommand,
  VersionCommandConfig,
} from '@dysonic/dy-cli-core';

interface WorkspacePackageVersion {
  packageJSONPath: string;
  packageJSON: Record<string, unknown>;
  version: string;
}

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
    await this.syncFixedMonorepoPackageVersions();
  }

  private async runSingleVersion() {
    if (!this.config.set) {
      throw new DyCliError('INVALID_ARGUMENT', '--set is required for single-package versioning.');
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

  private async syncFixedMonorepoPackageVersions() {
    if (this.config.projectContext.versionStrategy !== 'fixed') {
      return;
    }

    const packages = await this.readWorkspacePackageVersions();
    if (packages.length <= 1) {
      return;
    }

    const versions = Array.from(new Set(packages.map(({ version }) => version)));
    if (versions.length <= 1) {
      return;
    }

    const targetVersion = versions.reduce((currentMax, version) =>
      compareSemver(version, currentMax) > 0 ? version : currentMax,
    );

    await Promise.all(
      packages.map(async ({ packageJSONPath, packageJSON, version }) => {
        if (version === targetVersion) {
          return;
        }

        packageJSON.version = targetVersion;
        await fs.writeJSON(packageJSONPath, packageJSON, { spaces: 2 });
      }),
    );
  }

  private async readWorkspacePackageVersions(): Promise<WorkspacePackageVersion[]> {
    const packages = await Promise.all(
      this.config.projectContext.packageDirs.map(async (packageDir) => {
        const packageJSONPath = path.join(packageDir, 'package.json');
        if (!(await fs.pathExists(packageJSONPath))) {
          return null;
        }

        const packageJSON = (await fs.readJSON(packageJSONPath)) as Record<string, unknown>;
        if (typeof packageJSON.version !== 'string') {
          return null;
        }

        return {
          packageJSONPath,
          packageJSON,
          version: packageJSON.version,
        } satisfies WorkspacePackageVersion;
      }),
    );

    return packages.filter((pkg): pkg is WorkspacePackageVersion => pkg !== null);
  }
}

interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

function compareSemver(left: string, right: string): number {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);

  if (parsedLeft.major !== parsedRight.major) {
    return parsedLeft.major - parsedRight.major;
  }

  if (parsedLeft.minor !== parsedRight.minor) {
    return parsedLeft.minor - parsedRight.minor;
  }

  if (parsedLeft.patch !== parsedRight.patch) {
    return parsedLeft.patch - parsedRight.patch;
  }

  return comparePrerelease(parsedLeft.prerelease, parsedRight.prerelease);
}

function parseSemver(version: string): ParsedSemver {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!match) {
    throw new DyCliError(
      'INVALID_ARGUMENT',
      `Unsupported package version '${version}' in fixed monorepo versioning.`,
    );
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

function comparePrerelease(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) {
    return 0;
  }

  if (left.length === 0) {
    return 1;
  }

  if (right.length === 0) {
    return -1;
  }

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = left[index];
    const rightIdentifier = right[index];

    if (leftIdentifier === undefined) {
      return -1;
    }

    if (rightIdentifier === undefined) {
      return 1;
    }

    const comparison = comparePrereleaseIdentifier(leftIdentifier, rightIdentifier);
    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
}

function comparePrereleaseIdentifier(left: string, right: string): number {
  const numericPattern = /^\d+$/;
  const leftIsNumeric = numericPattern.test(left);
  const rightIsNumeric = numericPattern.test(right);

  if (leftIsNumeric && rightIsNumeric) {
    return Number(left) - Number(right);
  }

  if (leftIsNumeric) {
    return -1;
  }

  if (rightIsNumeric) {
    return 1;
  }

  return left.localeCompare(right);
}
