import fs from 'fs-extra';
import path from 'path';
import { camelCase, upperFirst } from 'lodash';

import { DyCliError } from '@dysonic/dy-cli-core';

export interface BuildPackageManifest {
  name?: string;
  version?: string;
  main?: string;
  module?: string;
  types?: string;
  browser?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
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
    return path.join(this.cwd, 'tsconfig.json');
  }

  protected getDependencies(pkg: BuildPackageManifest) {
    return Object.keys(pkg.dependencies || {});
  }

  protected getPeerDependencies(pkg: BuildPackageManifest) {
    return Object.keys(pkg.peerDependencies || {});
  }

  protected resolveOutputPath(outputPath: string | undefined, fallback: string) {
    return path.resolve(this.cwd, outputPath ?? fallback);
  }

  protected resolveUmdName(pkg: BuildPackageManifest, name?: string) {
    if (name) {
      return name;
    }

    const packageName = (pkg.name ?? 'dyPackage').split('/').pop() ?? 'dyPackage';
    return upperFirst(camelCase(packageName));
  }
}
