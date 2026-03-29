/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs-extra');
const config = require('./jest.config.js');
const pkg = require('./package.json');

const BASE_DIR = path.join(__dirname, './');
const PACKAGES_DIR = pkg.workspaces.map((p) => p.replace('/*', ''));

function getAllPkgPath() {
  PACKAGES_DIR.map((pkg) => {
    const pkgBase = path.join(BASE_DIR, pkg);
    return fs.readdirSync(pkgBase).map((it) => path.join(pkgBase, it));
  });

  return PACKAGES_DIR.reduce((cur, prev) => {
    const pkgBase = path.resolve(BASE_DIR, prev);

    fs.readdirSync(pkgBase)
      .filter((it) => {
        const itemPath = path.resolve(pkgBase, it);
        return fs.existsSync(`${itemPath}/package.json`);
      })
      .map((it) => {
        const itemPath = path.resolve(pkgBase, it);
        const pkgName = require(`${itemPath}/package.json`).name;

        return [pkgName, path.join(itemPath, 'src')];
      })
      .forEach(([pkgName, pkgPath]) => {
        cur[pkgName] = pkgPath;
      });

    return cur;
  }, {});
}

module.exports = {
  ...config,
  testMatch: undefined,
  moduleNameMapper: {
    ...getAllPkgPath(),
  },
  testRegex: '.+\\.test\\.tsx?$',
  globals: {
    'ts-jest': {
      tsconfig: './jest-tsconfig.json',
    },
  },
};
