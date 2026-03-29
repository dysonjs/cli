import path from 'path';
import Rollup from 'rollup';
import extensions from 'rollup-plugin-extensions';
import autoprefixer from 'autoprefixer';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';
import esbuild, { minify } from 'rollup-plugin-esbuild';
import dts from 'rollup-plugin-dts';
import progress from 'rollup-plugin-progress';
const LessPluginNpmImport = require('less-plugin-npm-import');

import {
  getPackageExternalDependencies,
  log,
  generateInputTsEntry,
  parseProcessArgv,
  time,
} from './utils';

type ProcessArgv = {};

const CWD = process.cwd();
const PKG = require(path.join(CWD, 'package.json'));
const DEST = path.join(CWD, 'dist');
const ARGS = parseProcessArgv<ProcessArgv>();
const TSCONFIG = path.join(CWD, 'tsconfig.json');
const EXTERNALS = getPackageExternalDependencies(PKG);

/**
 * 生成 esm&cjs 格式的产物
 */
async function build() {
  const output: Array<Rollup.OutputOptions | undefined> = [
    {
      file: PKG.module ? path.resolve(CWD, PKG.module) : undefined,
      format: 'es',
      exports: 'auto',
      sourcemap: false,
      inlineDynamicImports: true,
    },
    {
      file: PKG.main ? path.resolve(CWD, PKG.main) : undefined,
      format: 'cjs',
      exports: 'auto',
      sourcemap: false,
      inlineDynamicImports: true,
    },
  ];
  const filteredOutput = output.filter(Boolean) as Rollup.OutputOptions[];
  const options: Rollup.RollupOptions = {
    strictDeprecations: true,
    input: generateInputTsEntry(CWD),
    external: EXTERNALS,
    output: filteredOutput,
    plugins: [
      // 支持的索引文件后缀
      extensions({
        resolveIndex: true,
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs'],
      }),
      // 将 ts 编译为 js
      esbuild({
        sourceMap: false,
        minify: true,
        target: 'es2015',
        tsconfig: TSCONFIG,
      }),
      copy({
        targets: [
          {
            src: [path.resolve(CWD, 'src/templates')],
            dest: path.resolve(DEST, './'),
          },
        ],
      }),
      // 解析 JSON 文件
      json({
        exclude: 'node_modules/**',
        compact: true,
        namedExports: true,
      }),
      // 压缩 JS
      minify({
        legalComments: 'none',
      }),
      // 显示构建进度
      // progress({ clearLine: true }) as Rollup.Plugin,
    ],
  };
  const bundle = await Rollup.rollup(options);
  await Promise.all((options.output as Rollup.OutputOptions[]).map((o) => bundle.write(o)));
}

async function startup() {
  try {
    await build();
    log.success('Rollup all files successfully!');
  } catch (err) {
    log.error(err as Error);
    process.exit(1);
  }
}

time(startup)();
