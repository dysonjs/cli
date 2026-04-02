import fs from 'fs-extra';
import path from 'path';

import { DyCliError } from '../errors/dy-cli-error';
import { ExternalRunCommandsConfig, ProjectContext, ProjectType } from '../interfaces';
import { getExternalConfigDir } from './utils';

const DEFAULT_PROJECT_PACKAGE_DIR = 'packages';

export function resolveProjectContext(
  cwd: string,
  config: Partial<ExternalRunCommandsConfig>,
): ProjectContext {
  const rootDir = getExternalConfigDir(cwd, true);

  if (!rootDir) {
    throw new DyCliError('CONFIG_NOT_FOUND', `No dy.config file found at '${cwd}'.`);
  }

  const rootPackageJSON = readPackageJSON(rootDir);
  const type = resolveProjectType(rootPackageJSON, config);
  const packageDir =
    config.project?.packageDir ?? config.commands?.add?.destDir ?? DEFAULT_PROJECT_PACKAGE_DIR;
  const packageDirs = type === 'monorepo' ? resolveWorkspacePackageDirs(rootDir, packageDir) : [];
  const normalizedCwd = path.resolve(cwd);
  const currentPackageDir =
    type === 'single'
      ? rootDir
      : packageDirs.find(
          (packageDirPath) =>
            normalizedCwd === packageDirPath ||
            normalizedCwd.startsWith(`${packageDirPath}${path.sep}`),
        );
  const isRoot = normalizedCwd === rootDir;

  return {
    cwd: normalizedCwd,
    rootDir,
    type,
    packageDir,
    versionStrategy: config.project?.versionStrategy ?? (type === 'monorepo' ? 'fixed' : undefined),
    packageDirs,
    targetPackageDirs:
      type === 'single'
        ? [rootDir]
        : currentPackageDir && !isRoot
        ? [currentPackageDir]
        : packageDirs,
    currentPackageDir,
    isRoot,
  };
}

function resolveProjectType(
  rootPackageJSON: Record<string, unknown> | null,
  config: Partial<ExternalRunCommandsConfig>,
): ProjectType {
  if (config.project?.type) {
    return config.project.type;
  }

  const workspaces = rootPackageJSON?.workspaces;
  if (Array.isArray(workspaces) && workspaces.length > 0) {
    return 'monorepo';
  }

  return 'single';
}

function resolveWorkspacePackageDirs(rootDir: string, packageDir: string): string[] {
  const packagesRoot = path.join(rootDir, packageDir);

  if (!fs.existsSync(packagesRoot)) {
    return [];
  }

  return fs
    .readdirSync(packagesRoot)
    .map((entry) => path.join(packagesRoot, entry))
    .filter((entryPath) => {
      try {
        return (
          fs.statSync(entryPath).isDirectory() &&
          fs.existsSync(path.join(entryPath, 'package.json'))
        );
      } catch {
        return false;
      }
    });
}

function readPackageJSON(dir: string): Record<string, unknown> | null {
  const packageJSONPath = path.join(dir, 'package.json');

  if (!fs.existsSync(packageJSONPath)) {
    return null;
  }

  return fs.readJSONSync(packageJSONPath) as Record<string, unknown>;
}
