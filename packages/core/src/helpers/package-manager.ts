import fs from 'fs-extra';
import path from 'path';
import execa from 'execa';

import { ProjectContext } from '../interfaces';

export type PackageManagerName = 'npm' | 'pnpm';

export function detectPackageManager(cwd: string): PackageManagerName {
  const packageJSONPath = path.join(cwd, 'package.json');
  if (fs.existsSync(packageJSONPath)) {
    const packageJSON = fs.readJSONSync(packageJSONPath) as { packageManager?: string };
    if (packageJSON.packageManager?.startsWith('pnpm@')) {
      return 'pnpm';
    }
  }

  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  return 'npm';
}

export async function installDependencies(cwd: string) {
  const packageManager = detectPackageManager(cwd);
  await execa(packageManager, ['install'], {
    cwd,
    stdio: 'inherit',
  });
}

export async function runManagedPackageScript(
  cwd: string,
  scriptName: string,
  args: string[] = [],
  env: NodeJS.ProcessEnv = {},
) {
  const packageJSONPath = path.join(cwd, 'package.json');
  const packageJSON = fs.existsSync(packageJSONPath)
    ? ((await fs.readJSON(packageJSONPath)) as { scripts?: Record<string, string> })
    : null;

  if (!packageJSON) {
    throw new Error(`No package.json found at '${cwd}'.`);
  }

  if (!packageJSON.scripts?.[scriptName]) {
    throw new Error(`Script '${scriptName}' is not defined at '${cwd}'.`);
  }

  const packageManager = detectPackageManager(cwd);
  const commandArgs = ['run', scriptName];

  if (args.length > 0) {
    commandArgs.push('--', ...args);
  }

  await execa(packageManager, commandArgs, {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
  });
}

export async function runProjectScript(
  projectContext: ProjectContext,
  scriptName: string,
  args: string[] = [],
  env: NodeJS.ProcessEnv = {},
) {
  for (const packageDir of projectContext.targetPackageDirs) {
    await runManagedPackageScript(packageDir, scriptName, args, env);
  }
}

export async function runProjectCommand(
  projectContext: ProjectContext,
  commandName: string,
  args: string[] = [],
  env: NodeJS.ProcessEnv = {},
) {
  for (const packageDir of projectContext.targetPackageDirs) {
    await execa('dy-cli', [commandName, ...args], {
      cwd: packageDir,
      env: {
        ...process.env,
        ...env,
      },
    });
  }
}

export async function runChangesetCommand(cwd: string, args: string[]) {
  const packageManager = detectPackageManager(cwd);

  if (packageManager === 'pnpm') {
    await execa('pnpm', ['changeset', ...args], { cwd });
    return;
  }

  await execa('npx', ['changeset', ...args], { cwd });
}
