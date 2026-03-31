import fs from 'fs-extra';
import path from 'path';
import { register } from 'ts-node';

import { DyCliError } from '../errors/dy-cli-error';
import { ExternalRunCommandsConfig } from '../interfaces';
import { runManagedPackageScript } from './package-manager';
import { EXTERNAL_CONFIG_FILE_NAME } from './constants';

let isTsNodeRegistered = false;

export function getExternalConfigFilePath(cwd: string) {
  return getNearestExternalConfigFilePath(cwd, false);
}

export function getNearestFilePath(
  cwd: string,
  fileNames: string[],
  searchUp = true,
): string | null {
  let currentDir = path.resolve(cwd);

  while (true) {
    const matchedFilePath =
      fileNames
        .map((fileName) => path.join(currentDir, fileName))
        .find((filePath) => fs.existsSync(filePath)) ?? null;

    if (matchedFilePath || !searchUp) {
      return matchedFilePath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

export function getNearestExternalConfigFilePath(cwd: string, searchUp = true): string | null {
  return getNearestFilePath(
    cwd,
    ['.ts', '.js', '.json'].map((ext) => `${EXTERNAL_CONFIG_FILE_NAME}${ext}`),
    searchUp,
  );
}

export function getExternalConfigDir(cwd: string, searchUp = false) {
  const filePath = getNearestExternalConfigFilePath(cwd, searchUp);
  return filePath ? path.dirname(filePath) : null;
}

export function loadExternalRunCommandsConfig(cwd: string): Partial<ExternalRunCommandsConfig> {
  const filePath = getExternalConfigFilePath(cwd);

  if (!filePath) return {};

  if (filePath.endsWith('.ts')) {
    registerTSNode(cwd);
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(filePath);
  return (config.default ?? config) as Partial<ExternalRunCommandsConfig>;
}

export function loadNearestExternalRunCommandsConfig(
  cwd: string,
): Partial<ExternalRunCommandsConfig> {
  const filePath = getNearestExternalConfigFilePath(cwd, true);

  if (!filePath) return {};

  if (filePath.endsWith('.ts')) {
    registerTSNode(path.dirname(filePath));
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(filePath);
  return (config.default ?? config) as Partial<ExternalRunCommandsConfig>;
}

export async function runPackageScript(
  cwd: string,
  scriptName: string,
  env: NodeJS.ProcessEnv = {},
) {
  const packageJSONPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packageJSONPath)) {
    throw new DyCliError('CONFIG_NOT_FOUND', `No package.json found at '${cwd}'.`);
  }

  const packageJSON = await fs.readJSON(packageJSONPath);
  if (!packageJSON.scripts?.[scriptName]) {
    throw new DyCliError('SCRIPT_NOT_DEFINED', `Script '${scriptName}' is not defined.`);
  }

  await runManagedPackageScript(cwd, scriptName, [], env);
}

export function resolveTargetDir(cwd: string, targetDir: string) {
  return path.resolve(cwd, targetDir);
}

export function resolveProjectName(targetDir: string) {
  return path.basename(targetDir);
}

function registerTSNode(cwd: string) {
  if (isTsNodeRegistered) return;

  const tsconfigPath = path.join(cwd, 'tsconfig.json');

  register({
    project: fs.existsSync(tsconfigPath) ? tsconfigPath : undefined,
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs',
    },
  });

  isTsNodeRegistered = true;
}
