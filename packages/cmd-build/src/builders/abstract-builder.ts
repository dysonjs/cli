import fs from 'fs-extra';
import path from 'path';
import { builtinModules } from 'module';
import { camelCase, upperFirst } from 'lodash';

import { DyCliError } from '@dysonic/dy-cli-core';

export interface BuildPackageManifest {
  name?: string;
  version?: string;
  main?: string;
  module?: string;
  types?: string;
  browser?: string;
  bin?: string | Record<string, string>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function resolveBarePackageName(moduleId: string) {
  if (moduleId.startsWith('@')) {
    return moduleId.split('/').slice(0, 2).join('/');
  }

  return moduleId.split('/')[0];
}

export function shouldExternalizeModuleId(moduleId: string) {
  if (
    !moduleId ||
    moduleId.startsWith('.') ||
    moduleId.startsWith('\0') ||
    path.isAbsolute(moduleId)
  ) {
    return false;
  }

  const packageName = resolveBarePackageName(moduleId);
  return packageName === '@dysonic/dy-cli' || packageName.startsWith('@dysonic/dy-cli-');
}

export abstract class AbstractBuilder {
  constructor(protected readonly cwd: string) {}

  protected async loadPackageManifest(): Promise<BuildPackageManifest> {
    const packageJSONPath = path.join(this.cwd, 'package.json');

    if (!(await fs.pathExists(packageJSONPath))) {
      throw new DyCliError('CONFIG_NOT_FOUND', `No package.json found at '${this.cwd}'.`);
    }

    return fs.readJSON(packageJSONPath);
  }

  protected async resolveInputTsEntry() {
    const inputTsx = path.join(this.cwd, 'src/index.tsx');
    const inputTs = path.join(this.cwd, 'src/index.ts');

    if (await fs.pathExists(inputTsx)) {
      return inputTsx;
    }

    if (await fs.pathExists(inputTs)) {
      return inputTs;
    }

    throw new DyCliError(
      'CONFIG_NOT_FOUND',
      `No build entry found at '${inputTs}' or '${inputTsx}'.`,
    );
  }

  protected resolveTsConfigPath() {
    let currentDir = this.cwd;

    while (true) {
      const tsconfigPath = path.join(currentDir, 'tsconfig.json');

      if (fs.existsSync(tsconfigPath)) {
        return tsconfigPath;
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        return path.join(this.cwd, 'tsconfig.json');
      }

      currentDir = parentDir;
    }
  }

  protected getDependencies(pkg: BuildPackageManifest) {
    return Object.keys(pkg.dependencies || {});
  }

  protected getPeerDependencies(pkg: BuildPackageManifest) {
    return Object.keys(pkg.peerDependencies || {});
  }

  protected getNodeBuiltins() {
    return builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]);
  }

  protected createExternalPredicate(pkg: BuildPackageManifest) {
    const externalPackages = new Set([
      ...this.getDependencies(pkg),
      ...this.getPeerDependencies(pkg),
      ...this.getNodeBuiltins(),
    ]);

    return (moduleId: string) => {
      const packageName = resolveBarePackageName(moduleId);

      return externalPackages.has(packageName) || shouldExternalizeModuleId(moduleId);
    };
  }

  protected resolveOutputPath(outputPath: string | undefined, fallback: string) {
    return path.resolve(this.cwd, outputPath ?? fallback);
  }

  protected resolvePackageBinOutput(pkg: BuildPackageManifest) {
    if (!pkg.bin) {
      return null;
    }

    if (typeof pkg.bin === 'string') {
      return pkg.bin;
    }

    const output = Object.values(pkg.bin)[0];
    return output ?? null;
  }

  protected resolveUmdName(pkg: BuildPackageManifest, name?: string) {
    if (name) {
      return name;
    }

    const packageName = (pkg.name ?? 'dyPackage').split('/').pop() ?? 'dyPackage';
    return upperFirst(camelCase(packageName));
  }
}
