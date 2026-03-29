import path from 'path';
import { builtinModules } from 'module';
import fs from 'fs-extra';
import Metalsmith from 'metalsmith';
import Handlebars from 'handlebars';
import { set } from 'lodash';

import pkg from '../../package.json';

export const BASE_DIR = path.join(__dirname, '../../');
export const TEMPLATE_DIR = path.join(__dirname, '../__template__');
export const TEMPLATE_DIR_PKG = path.join(TEMPLATE_DIR, 'package');

export const PACKAGES_DIR = pkg.workspaces.map((p) => p.replace('/*', ''));

export const PKG_MAIN = 'dist/index.cjs.js';
export const PKG_MODULE = 'dist/index.esm.js';
export const PKG_TYPES = 'dist/index.d.ts';

export const log = {
  info: (...messages: unknown[]) => {
    console.info('❕', '\x1b[36m', ...messages, '\x1b[0m');
  },
  success: (...messages: unknown[]) => {
    console.log('🎉', '\x1b[32m', ...messages, '\x1b[0m');
  },
  warn: (...messages: unknown[]) => {
    console.warn('❗️', '\x1b[33m', ...messages, '\x1b[0m');
  },
  error: (...messages: unknown[]) => {
    console.error('❌', '\x1b[31m', ...messages, '\x1b[0m');
  },
};

export function getAllPkgPath() {
  return PACKAGES_DIR.reduce((cur, prev) => {
    const pkgBase = path.resolve(BASE_DIR, prev);

    fs.readdirSync(pkgBase)
      .filter((it) => fs.existsSync(path.resolve(pkgBase, it, 'package.json')))
      .map((it) => {
        const itemPath = path.resolve(pkgBase, it);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkgName = require(`${itemPath}/package.json`).name as string;

        return [pkgName, path.join(itemPath, 'src')];
      })
      .forEach((item) => {
        const [pkgName, pkgPath] = item;
        cur.set(pkgName, pkgPath);
      });

    return cur;
  }, new Map<string, string>());
}

export function validateProjectExist(pkg: string, name: string) {
  return fs.existsSync(path.join(BASE_DIR, pkg, name));
}

export function render<T extends {}>(
  directory: string,
  source: string,
  destination: string,
  metadata: T,
) {
  return new Promise<void>((resolve, reject) => {
    Metalsmith(directory)
      .metadata(metadata)
      .clean(true)
      .source(source)
      .destination(destination)
      .use((files, metalsmith) => {
        Object.keys(files).forEach((fileName) => {
          const fileContentsString = files[fileName].contents.toString();
          files[fileName].contents = Buffer.from(
            Handlebars.compile(fileContentsString)(metalsmith.metadata()),
          );

          const destFileName = ((name: string) => {
            if (name.startsWith('__')) return `.${name.slice(2)}`;
            if (name.startsWith('_')) return `${name.slice(1)}`;
            if (name.endsWith('.tpl')) return `${name.slice(0, name.length - 4)}`;
            return name;
          })(fileName);
          files[destFileName] = files[fileName];

          if (destFileName !== fileName) {
            delete files[fileName];
          }
        });
      })
      .build((err) => {
        if (err) {
          log.error(`Metalsmith build error: ${err}`);
          reject(err);
        } else {
          resolve();
        }
      });
  });
}
export function generateInputDtsEntry(cwd: string) {
  const list = cwd.split('/');
  const len = list.length;
  const currentDir = list.splice(len - 2, len).join('/');
  return path.join(cwd, 'dist', currentDir, 'src/index.d.ts');
}

export function generateInputTsEntry(cwd: string) {
  const inputTsx = path.join(cwd, 'src/index.tsx');
  const inputTs = path.join(cwd, 'src/index.ts');

  return fs.existsSync(inputTsx) ? inputTsx : inputTs;
}

export function getPackageExternalDependencies(pkg: {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}) {
  const deps = Object.keys(pkg.dependencies || {});
  const peerDeps = Object.keys(pkg.peerDependencies || {});
  const nodeBuiltins = builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]);

  return Array.from(new Set([...deps, ...peerDeps, ...nodeBuiltins]));
}

export async function readFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    log.error(`No File at '${filePath}'!`);
    return false;
  }
  const data = await fs.readFile(filePath, 'utf-8');
  return data.toString();
}

export function readFileJSON(filePath: string) {
  return fs.readJSONSync(filePath);
}

export function writeFileJSON(filePath: string, content: any) {
  return fs.writeJSONSync(filePath, content);
}

/** 解析命令进程参数 */
export function parseProcessArgv<R extends Record<string, any>>(): R {
  const argv = process.argv.slice(2);
  const params = {} as R;
  for (let i = 0; i < argv.length; ) {
    const key = argv[i]
      .replace(/^\-\-/g, '')
      .replace(/\-([a-z])/g, (_, char) => char.toUpperCase());
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      set(params, key, true);
      i = i + 1;
      continue;
    }
    set(params, key, value);
    i = i + 2;
  }
  return params;
}

/** 移除构建时产生的冗余文件（PS：这些文件是由于 tsconfig 的 path 被魔改导致的） */
export async function removeRedundantFiles(dist: string) {
  await Promise.all(
    PACKAGES_DIR.map((it) => {
      fs.remove(path.join(dist, it));
    }),
  );
}

/** 统计任务执行时间 */
export function time(task: Function) {
  return async () => {
    const start = performance.now();
    await task();
    const end = performance.now();
    console.log(`\x1b[36m It takes ${Math.round(end - start)}ms. \x1b[0m`);
  };
}
