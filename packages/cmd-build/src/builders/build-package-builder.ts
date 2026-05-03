import fs from 'fs-extra';
import { createRequire } from 'module';
import path from 'path';
import Rollup from 'rollup';
import extensions from 'rollup-plugin-extensions';
import autoprefixer from 'autoprefixer';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';

import { AbstractBuilder } from './abstract-builder';
import less from './less-module';
import LessPluginNpmImport from './less-plugin-npm-import';
import postcss from './postcss-plugin';

export class BuildPackageBuilder extends AbstractBuilder {
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
    const input = await this.resolveInputTsEntry();
    const output = [
      {
        file: this.resolveOutputPath(pkg.module, 'dist/index.esm.js'),
        format: 'es' as const,
        exports: 'auto' as const,
        sourcemap: false,
        inlineDynamicImports: true,
      },
      {
        file: this.resolveOutputPath(pkg.main, 'dist/index.cjs.js'),
        format: 'cjs' as const,
        exports: 'auto' as const,
        interop: 'auto' as const,
        sourcemap: false,
        inlineDynamicImports: true,
      },
    ];

    await this.clearCopiedAssetDirs();

    const bundle = await Rollup.rollup({
      strictDeprecations: true,
      input,
      external: this.createExternalPredicate(pkg),
      output,
      plugins: [
        extensions({
          resolveIndex: true,
          extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs'],
        }),
        esbuild({
          target: 'es2015',
          sourceMap: false,
          tsconfig: this.resolveTsConfigPath(),
        }) as Rollup.Plugin,
        postcss({
          plugins: [autoprefixer],
          minimize: true,
          sourceMap: false,
          extract: false,
          extensions: ['.less', '.scss', '.css'],
          use: {
            less: {
              implementation: less,
              javascriptEnabled: true,
              plugins: [new LessPluginNpmImport({ prefix: '~' })],
            },
            sass: null,
            stylus: null,
          },
        }),
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

    await Promise.all(output.map((item) => bundle.write(item)));
  }

  private async clearCopiedAssetDirs() {
    const distDir = path.join(this.cwd, 'dist');

    await Promise.all(
      ['themes', 'locales', 'templates'].map((dirName) => fs.remove(path.join(distDir, dirName))),
    );
  }

  private async getCopyTargets() {
    const distDir = path.join(this.cwd, 'dist');
    const targets: Array<{ src: string[]; dest: string }> = [];

    if (await fs.pathExists(path.resolve(this.cwd, 'src/themes'))) {
      targets.push({
        src: [path.resolve(this.cwd, 'src/themes/**/*.css')],
        dest: path.resolve(distDir, 'themes'),
      });
    }

    if (await fs.pathExists(path.resolve(this.cwd, 'src/locales'))) {
      targets.push({
        src: [path.resolve(this.cwd, 'src/locales/**/*.json')],
        dest: path.resolve(distDir, 'locales'),
      });
    }

    if (await fs.pathExists(path.resolve(this.cwd, 'src/templates'))) {
      targets.push({
        src: [path.resolve(this.cwd, 'src/templates')],
        dest: path.resolve(distDir, './'),
      });
    }

    return targets;
  }
}
