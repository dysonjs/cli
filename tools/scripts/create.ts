import * as path from 'path';
import * as fs from 'fs-extra';
import * as inquirer from 'inquirer';
import { TEMPLATE_DIR } from './utils';

type TPromptMeta = {
  type: string;
};

function prompt() {
  const dirs = fs.readdirSync(TEMPLATE_DIR);
  return inquirer.prompt<TPromptMeta>([
    {
      name: 'type',
      type: 'list',
      message: 'Which type would you like to create?',
      choices: dirs.map((d) => ({
        name: d,
        value: d,
      })),
      default: 'package',
    },
  ]);
}

async function startup() {
  // pre
  const meta = await prompt();
  // processing
  const { create } = require(`../__template__/${meta.type}/_inquirer`);
  const pkgPath = await create();
  // post
  await fs.remove(path.join(pkgPath, './inquirer.ts'));
}

startup();
