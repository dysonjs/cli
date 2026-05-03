import fs from 'fs-extra';
import { createRequire } from 'module';
import path from 'path';
import Rollup from 'rollup';
import extensions from 'rollup-plugin-extensions';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';

import { BuildCommandBinConfig, DyCliError } from '@dysonic/dy-cli-core';

import { AbstractBuilder } from './abstract-builder';

export class BuildBinBuilder extends AbstractBuilder {
  constructor(cwd: string, private readonly config: BuildCommandBinConfig = {}) {
    super(cwd);
  }

  public async build() {
    type EsbuildModule = {
      default: (options: Record<string, unknown>) => unknown;
    };
    const requireModule = createRequire(__filename) as (specifier: string) => EsbuildModule;
    const importModule = new Function('specifier', 'return import(specifier)') as (
      specifier: string,
    ) => Promise<EsbuildModule>;
    const esbuild =
      typeof process.env.JEST_WORKER_ID === 'string'
        ? requireModule('rollup-plugin-esbuild').default
        : (await importModule('rollup-plugin-esbuild')).default;
    const pkg = await this.loadPackageManifest();
    const input = await this.resolveInputEntry();
    const output = this.resolveOutputFile(pkg);

    await fs.remove(path.join(this.cwd, 'dist', 'templates'));

    const bundle = await Rollup.rollup({
      strictDeprecations: true,
      input,
      external: this.createExternalPredicate(pkg),
      plugins: [
        extensions({
          resolveIndex: true,
          extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs'],
        }),
        esbuild({
          target: 'es2018',
          sourceMap: false,
          tsconfig: this.resolveTsConfigPath(),
        }) as Rollup.Plugin,
        copy({
          targets: await this.getCopyTargets(),
        }),
        json({
          exclude: 'node_modules/**',
          compact: true,
          namedExports: true,
        }),
      ],
    });

    await bundle.write({
      format: 'cjs',
      file: output,
      interop: 'auto',
      banner: this.config.banner ?? '#!/usr/bin/env node',
    });

    await fs.chmod(output, 0o755);
  }

  private async resolveInputEntry() {
    if (this.config.entry) {
      const entry = path.resolve(this.cwd, this.config.entry);
      if (await fs.pathExists(entry)) {
        return entry;
      }

      throw new DyCliError('CONFIG_NOT_FOUND', `No bin entry found at '${entry}'.`);
    }

    const defaultEntry = path.join(this.cwd, 'src/cli.ts');
    if (await fs.pathExists(defaultEntry)) {
      return defaultEntry;
    }

    throw new DyCliError('CONFIG_NOT_FOUND', `No bin entry found at '${defaultEntry}'.`);
  }

  private resolveOutputFile(pkg: { bin?: string | Record<string, string> }) {
    const output = this.config.output ?? this.resolvePackageBinOutput(pkg) ?? 'dist/cli.js';
    return path.resolve(this.cwd, output);
  }

  private async getCopyTargets() {
    const distDir = path.join(this.cwd, 'dist');
    const targets: Array<{ src: string[]; dest: string }> = [];

    if (await fs.pathExists(path.resolve(this.cwd, 'src/templates'))) {
      targets.push({
        src: [path.resolve(this.cwd, 'src/templates')],
        dest: path.resolve(distDir, './'),
      });
    }

    return targets;
  }
}
