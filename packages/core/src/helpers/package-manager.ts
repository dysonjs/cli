import fs from 'fs-extra';
import path from 'path';
import execa from 'execa';

import { DyCliError } from '../errors/dy-cli-error';
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

// 会在子进程间相互冲突的诊断标志:调试端口会被重复占用、profile 文件会互相覆盖,转发它们没有意义
const DIAGNOSTIC_EXEC_ARG = /^--(inspect|debug|cpu-prof|heap-prof|prof|diagnostic-dir)/;

/**
 * Resolves the command needed to re-invoke the dy-cli process that is currently running.
 *
 * Workspace orchestration must re-enter the same entrypoint (compiled binary or ts-node source)
 * rather than resolving `dy-cli` from node_modules. A self-hosted repo pins an older `dy-cli` in
 * its dev dependencies, so resolving from PATH would run that stale binary for child commands.
 *
 * - The entry is resolved to an absolute path so re-invocation no longer depends on the child
 *   process inheriting the same working directory (e.g. CI passes a relative entry path).
 * - Diagnostic exec flags (debugger ports, profiler output) are dropped so they do not collide
 *   across the spawned child processes; loader flags such as `-r`/`--require` are preserved.
 */
export function resolveSelfCliInvocation(): { command: string; baseArgs: string[] } {
  const entry = process.argv[1];
  if (!entry) {
    throw new DyCliError('INVALID_ARGUMENT', 'Unable to resolve the dy-cli entry to re-invoke.');
  }

  const execArgv = process.execArgv.filter((flag) => !DIAGNOSTIC_EXEC_ARG.test(flag));

  return {
    command: process.execPath,
    baseArgs: [...execArgv, path.resolve(entry)],
  };
}

export async function runProjectCommand(
  projectContext: ProjectContext,
  commandName: string,
  args: string[] = [],
  env: NodeJS.ProcessEnv = {},
) {
  const { command, baseArgs } = resolveSelfCliInvocation();

  for (const packageDir of projectContext.targetPackageDirs) {
    // `--cwd` 前置在透传参数之前,避免将来 args 以 `--` 收尾时被透传吃掉;
    // 同时显式设置 execa 的 cwd 作为兜底,即使 `--cwd` 解析失败也仍指向正确的包目录
    await execa(command, [...baseArgs, commandName, '--cwd', packageDir, ...args], {
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
