import fs from 'fs-extra';
import path from 'path';
import execa from 'execa';

import { ProjectContext } from '../interfaces';

export type PackageManagerName = 'npm' | 'pnpm';

export function detectPackageManager(cwd: string): PackageManagerName {
  let currentDir = path.resolve(cwd);

  while (true) {
    const packageJSONPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJSONPath)) {
      const packageJSON = fs.readJSONSync(packageJSONPath) as { packageManager?: string };
      if (packageJSON.packageManager?.startsWith('pnpm@')) {
        return 'pnpm';
      }

      if (packageJSON.packageManager?.startsWith('npm@')) {
        return 'npm';
      }
    }

    if (fs.existsSync(path.join(currentDir, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return 'npm';
}

export async function installDependencies(
  cwd: string,
  packageManagerOverride?: PackageManagerName,
) {
  const packageManager = packageManagerOverride ?? detectPackageManager(cwd);
  const args = packageManager === 'npm' ? ['install', '--legacy-peer-deps'] : ['install'];

  await execa(packageManager, args, {
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
    const packageManager = detectPackageManager(packageDir);
    const commandArgs =
      packageManager === 'npm'
        ? ['exec', '--', 'dy-cli', commandName, ...args]
        : ['exec', 'dy-cli', commandName, ...args];

    await execa(packageManager, commandArgs, {
      cwd: packageDir,
      env: {
        ...process.env,
        ...env,
      },
    });
  }
}

export async function hasPublishedStableVersion(packageName: string) {
  const versions = await getPublishedPackageVersions(packageName);
  return versions.some((version) => !version.includes('-'));
}

async function getPublishedPackageVersions(packageName: string): Promise<string[]> {
  try {
    const result = await execa('npm', ['view', packageName, 'versions', '--json'], {
      stdio: 'pipe',
    });

    if (!result.stdout) {
      return [];
    }

    const parsed = JSON.parse(result.stdout) as string | string[];
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    const commandError = error as {
      stdout?: string;
      stderr?: string;
      shortMessage?: string;
    };
    const combinedOutput = [
      commandError.stdout ?? '',
      commandError.stderr ?? '',
      commandError.shortMessage ?? '',
    ].join('\n');

    if (combinedOutput.includes('E404') || combinedOutput.includes('404 Not Found')) {
      return [];
    }

    throw error;
  }
}
