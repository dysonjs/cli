import fs from 'fs-extra';
import path from 'path';
import Rollup from 'rollup';
import extensions from 'rollup-plugin-extensions';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';
import ts from 'rollup-plugin-typescript2';
import less from 'less';
import LessPluginNpmImport from 'less-plugin-npm-import';

import { AbstractBuilder } from './abstract-builder';

export class BuildPackageBuilder extends AbstractBuilder {
  public async build() {
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
        ts({
          check: true,
          clean: true,
          verbosity: 0,
          tsconfig: this.resolveTsConfigPath(),
          tsconfigOverride: {
            compilerOptions: {
              sourceMap: false,
              declaration: false,
              declarationMap: false,
              target: 'es2015',
              module: 'esnext',
            },
            exclude: ['**/test'],
          },
        }),
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
