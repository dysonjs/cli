import * as path from 'path';
import execa from 'execa';
import * as inquirer from 'inquirer';
import {
  BASE_DIR,
  PKG_MAIN,
  PKG_MODULE,
  PKG_TYPES,
  validateProjectExist,
  log,
  render,
} from '../../scripts/utils';

function prompt() {
  return inquirer.prompt<any>([
    {
      name: 'name',
      type: 'input',
      message: 'Input the name of the package',
      validate(input: string, answers: unknown) {
        if (!answers) return false;

        if (validateProjectExist('packages', input)) {
          return 'Folder is existing!';
        }

        return true;
      },
    },
    {
      name: 'private',
      type: 'confirm',
      message: 'Is a private package?',
      default: false,
    },
    {
      name: 'desc',
      type: 'input',
      message: 'Input the description of the package',
      default: '',
    },
    {
      name: 'sideEffects',
      type: 'confirm',
      message: 'Has sideEffects?',
      default: false,
    },
  ]);
}

export async function create() {
  const meta = await prompt();
  const { name } = meta;
  const pkgPath = path.join(BASE_DIR, 'packages', name);

  await render(process.cwd(), __dirname, pkgPath, {
    PKG_MAIN,
    PKG_MODULE,
    PKG_TYPES,
    ...meta,
  });

  log.info('Format new files');

  await execa('prettier', ['--write', pkgPath]);

  log.success('Add package successfully!');

  return pkgPath;
}
