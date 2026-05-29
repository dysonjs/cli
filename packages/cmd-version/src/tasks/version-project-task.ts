import fs from 'fs-extra';
import path from 'path';

import {
  AbstractTask,
  createDefaultProjectContext,
  DyCliError,
  enterPrereleaseMode,
  ensureReleaseState,
  exitPrereleaseMode,
  getGitReleaseNotes,
  ReleaseState,
  VersionCommandConfig,
  VersionReleaseType,
} from '@dysonic/dy-cli-core';

interface WorkspacePackageVersion {
  packageDir: string;
  packageJSONPath: string;
  packageJSON: Record<string, unknown>;
  name: string;
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
      projectContext: createDefaultProjectContext(),
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
      await exitPrereleaseMode(cwd);
      return;
    }

    if (!this.config.releaseType) {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        'Specify one of --patch, --minor, or --major for fixed monorepo versioning.',
      );
    }

    const releaseState = this.config.beta
      ? await enterPrereleaseMode(cwd, this.config.betaTag)
      : await ensureReleaseState(cwd);

    await this.applyMonorepoVersion(releaseState, this.config.releaseType);
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

  private async applyMonorepoVersion(releaseState: ReleaseState, releaseType: VersionReleaseType) {
    if (this.config.projectContext.versionStrategy !== 'fixed') {
      return;
    }

    const packages = await this.readWorkspacePackageVersions();
    if (packages.length === 0) {
      return;
    }

    const targetVersion = packages
      .map(({ version }) => version)
      .reduce((currentMax, version) =>
        compareSemver(version, currentMax) > 0 ? version : currentMax,
      );

    const nextVersion = getNextReleaseVersion(targetVersion, releaseType, releaseState);
    const workspacePackageNames = new Set(packages.map(({ name }) => name));
    const releaseNotes = await getGitReleaseNotes(this.config.projectContext.rootDir);

    await Promise.all(
      packages.map(async ({ packageDir, packageJSONPath, packageJSON, name }) => {
        const dependencyUpdates = updateInternalDependencyVersions(
          packageJSON,
          workspacePackageNames,
          nextVersion,
        );
        packageJSON.version = nextVersion;
        await fs.writeJSON(packageJSONPath, packageJSON, { spaces: 2 });
        await this.writeChangelogEntry(
          packageDir,
          name,
          nextVersion,
          releaseType,
          releaseNotes,
          dependencyUpdates,
        );
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
        if (typeof packageJSON.name !== 'string') {
          return null;
        }

        return {
          packageDir,
          packageJSONPath,
          packageJSON,
          name: packageJSON.name,
          version: packageJSON.version,
        } satisfies WorkspacePackageVersion;
      }),
    );

    return packages.filter((pkg): pkg is WorkspacePackageVersion => pkg !== null);
  }

  private async writeChangelogEntry(
    packageDir: string,
    packageName: string,
    version: string,
    releaseType: VersionReleaseType,
    releaseNotes: string[],
    dependencyUpdates: string[],
  ) {
    const changelogPath = path.join(packageDir, 'CHANGELOG.md');
    const existingContent = (await fs.pathExists(changelogPath))
      ? await fs.readFile(changelogPath, 'utf8')
      : `# ${packageName}\n`;
    const header = `# ${packageName}`;
    const entryLines = [
      `## ${version}`,
      '',
      `### ${capitalizeReleaseType(releaseType)} Changes`,
      '',
      ...formatReleaseNotes(releaseNotes),
    ];

    if (dependencyUpdates.length > 0) {
      entryLines.push('', '- Updated dependencies');
      for (const dependencyName of dependencyUpdates) {
        entryLines.push(`  - ${dependencyName}@${version}`);
      }
    }

    const normalizedExisting = existingContent.startsWith(header)
      ? existingContent.slice(header.length).replace(/^\s+/, '')
      : existingContent.trim();
    const nextContent = [
      header,
      '',
      ...entryLines,
      normalizedExisting ? '' : undefined,
      normalizedExisting || undefined,
    ]
      .filter((line): line is string => line !== undefined)
      .join('\n');

    await fs.writeFile(changelogPath, `${nextContent.trimEnd()}\n`);
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

function getNextReleaseVersion(
  version: string,
  releaseType: VersionReleaseType,
  releaseState: ReleaseState,
) {
  const parsedVersion = parseSemver(version);

  if (releaseState.mode === 'pre' && parsedVersion.prerelease[0] === releaseState.tag) {
    const prereleaseNumber = Number(parsedVersion.prerelease[1] ?? '0');
    if (Number.isFinite(prereleaseNumber)) {
      return `${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch}-${
        releaseState.tag
      }.${prereleaseNumber + 1}`;
    }
  }

  const bumpedStableVersion = bumpStableVersion(parsedVersion, releaseType);
  if (releaseState.mode === 'pre') {
    return `${bumpedStableVersion}-${releaseState.tag ?? 'beta'}.0`;
  }

  return bumpedStableVersion;
}

function bumpStableVersion(version: ParsedSemver, releaseType: VersionReleaseType) {
  if (releaseType === 'major') {
    return `${version.major + 1}.0.0`;
  }

  if (releaseType === 'minor') {
    return `${version.major}.${version.minor + 1}.0`;
  }

  return `${version.major}.${version.minor}.${version.patch + 1}`;
}

function updateInternalDependencyVersions(
  packageJSON: Record<string, unknown>,
  workspacePackageNames: Set<string>,
  nextVersion: string,
) {
  const dependencyKeys = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ] as const;
  const updatedDependencies: string[] = [];

  for (const dependencyKey of dependencyKeys) {
    const dependencyMap = packageJSON[dependencyKey];
    if (!dependencyMap || typeof dependencyMap !== 'object') {
      continue;
    }

    for (const [dependencyName, dependencyVersion] of Object.entries(
      dependencyMap as Record<string, string>,
    )) {
      if (!workspacePackageNames.has(dependencyName) || typeof dependencyVersion !== 'string') {
        continue;
      }

      (dependencyMap as Record<string, string>)[dependencyName] = preserveVersionPrefix(
        dependencyVersion,
        nextVersion,
      );
      updatedDependencies.push(dependencyName);
    }
  }

  return Array.from(new Set(updatedDependencies));
}

function preserveVersionPrefix(currentVersion: string, nextVersion: string) {
  if (currentVersion.startsWith('^') || currentVersion.startsWith('~')) {
    return `${currentVersion.charAt(0)}${nextVersion}`;
  }

  return nextVersion;
}

function capitalizeReleaseType(releaseType: VersionReleaseType) {
  return `${releaseType.charAt(0).toUpperCase()}${releaseType.slice(1)}`;
}

function formatReleaseNotes(releaseNotes: string[]) {
  if (releaseNotes.length === 0) {
    return ['- Release prepared by `dy-cli version`.'];
  }

  return releaseNotes.map((releaseNote) => `- ${releaseNote}`);
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
