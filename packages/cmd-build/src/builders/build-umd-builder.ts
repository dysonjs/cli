import Rollup from 'rollup';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import extensions from 'rollup-plugin-extensions';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import ts from 'rollup-plugin-typescript2';
import less from 'less';
import LessPluginNpmImport from 'less-plugin-npm-import';

import { BuildCommandConfig } from '@dysonic/dy-cli-core';

import { AbstractBuilder } from './abstract-builder';

export class BuildUmdBuilder extends AbstractBuilder {
  constructor(
    cwd: string,
    private readonly config: Pick<BuildCommandConfig, 'externals' | 'globals' | 'name'>,
  ) {
    super(cwd);
  }

  public async build() {
    const pkg = await this.loadPackageManifest();
    const input = await this.resolveInputTsEntry();
    const bundle = await Rollup.rollup({
      strictDeprecations: true,
      input,
      external: this.config.externals?.length
        ? this.config.externals
        : [...this.getPeerDependencies(pkg)],
      plugins: [
        resolve({ browser: true }),
        commonjs(),
        nodePolyfills(),
        extensions({
          resolveIndex: true,
          extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs'],
        }),
        postcss({
          plugins: [autoprefixer],
          minimize: true,
          sourceMap: false,
          extract: 'index.umd.css',
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
        json({
          exclude: 'node_modules/**',
          compact: true,
          namedExports: true,
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
        replace({
          preventAssignment: true,
          values: {
            'process.env.NODE_ENV': JSON.stringify('production'),
          },
        }),
      ],
    });

    await bundle.write({
      file: this.resolveOutputPath(pkg.browser, 'dist/index.umd.js'),
      format: 'umd',
      name: this.resolveUmdName(pkg, this.config.name),
      sourcemap: true,
      inlineDynamicImports: true,
      globals: this.resolveGlobals(),
    });
  }

  private resolveGlobals() {
    return {
      vue: 'Vue',
      react: 'React',
      'react-dom': 'ReactDOM',
      ...(this.config.globals ?? {}),
    };
  }
}
