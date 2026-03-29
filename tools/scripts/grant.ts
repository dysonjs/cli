import execa from 'execa';

import { getAllPkgPath, log } from './utils';

const OWNER_NAME = 'yuanhongboo@gmail.com';

async function startup() {
  const packagePaths = getAllPkgPath();
  const packageNames = packagePaths.keys();
  try {
    for (const name of packageNames) {
      log.info(`npm owner add ${OWNER_NAME} ${name}`);
      const res = await execa('npm', ['owner', 'add', OWNER_NAME, name]);
      log.info(res.stdout);
    }
  } catch (err) {
    log.error(err as Error);
  }
}

startup();
