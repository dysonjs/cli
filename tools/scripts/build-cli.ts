import path from 'path';
import Rollup from 'rollup';
import extensions from 'rollup-plugin-extensions';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';
import esbuild, { minify } from 'rollup-plugin-esbuild';

import { log, parseProcessArgv, time } from './utils';

type ProcessArgv = {
  /** 入口文件地址 */
  src: string;
  /** 命令入口地址 */
  destFile: string;
};

const CWD = process.cwd();
const PKG = require(path.join(CWD, 'package.json'));
const DEST = path.join(CWD, 'dist');
const ARGS = parseProcessArgv<ProcessArgv>();
const TSCONFIG = path.join(CWD, 'tsconfig.json');
const DEPS = Object.keys(PKG.dependencies || {});
const PEER_DEPS = Object.keys(PKG.peerDependencies || {});

async function startup() {
  try {
    const options: Rollup.RollupOptions = {
      strictDeprecations: true,
      input: ARGS.src,
      external: [...DEPS, ...PEER_DEPS],
      output: {
        format: 'cjs',
        banner: '#!/usr/bin/env node',
        file: ARGS.destFile,
      },
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
        // 用于复制模板文件
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
    await bundle.write(options.output as Rollup.OutputOptions);
    log.success('Rollup all files for node-cli successfully!');
  } catch (err) {
    log.error(err);
    console.error(err);
    process.exit(1);
  }
}

time(startup)();
