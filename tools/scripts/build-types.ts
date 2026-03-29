import path from 'path';
import Rollup from 'rollup';
import dts from 'rollup-plugin-dts';

import { log, generateInputTsEntry, parseProcessArgv, time } from './utils';

type ProcessArgv = {};

const CWD = process.cwd();
const PKG = require(path.join(CWD, 'package.json'));
const DEST = path.join(CWD, 'dist');
const ARGS = parseProcessArgv<ProcessArgv>();
const TSCONFIG = path.join(CWD, 'tsconfig.json');
const DEPS = Object.keys(PKG.dependencies || {});
const PEER_DEPS = Object.keys(PKG.peerDependencies || {});

async function startup() {
  try {
    const dtsOptions: Rollup.RollupOptions = {
      input: generateInputTsEntry(CWD),
      plugins: [dts()],
      output: {
        file: path.resolve(CWD, PKG.types),
        format: 'es',
      },
      external: [/\.(less|scss|css)$/, ...PEER_DEPS, ...DEPS],
    };
    const bundle = await Rollup.rollup(dtsOptions);
    await bundle.write(dtsOptions.output as Rollup.OutputOptions);
    log.success('Rollup all dts files successfully!');
  } catch (err) {
    log.error(err as Error);
    process.exit(1);
  }
}

time(startup)();
