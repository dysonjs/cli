import fs from 'fs-extra';
import path from 'path';
import execa from 'execa';
import * as inquirer from 'inquirer';

import { AbstractTask, AddCommandConfig, DyCliError } from '@dysonic/dy-cli-core';

export class AddPackageTask extends AbstractTask<AddCommandConfig> {
  public async run(): Promise<void> {
    const workspaceRoot = this.config.projectContext.rootDir;

    if (this.config.projectContext.type !== 'monorepo') {
      throw new DyCliError(
        'CONFIG_NOT_FOUND',
        `Project '${workspaceRoot}' is not a monorepo, add only supports monorepo projects.`,
      );
    }

    const packageMeta = await this.resolvePackageMeta(workspaceRoot);
    const targetDir = path.join(workspaceRoot, this.config.destDir, packageMeta.packageName);

    await this.prepareTargetDir(targetDir);
    await this.renderTemplate(targetDir, packageMeta);
    await execa('prettier', ['--write', targetDir], {
      cwd: workspaceRoot,
      localDir: workspaceRoot,
      preferLocal: true,
    });
  }

  protected getDefaultConfig(): AddCommandConfig {
    return {
      cwd: process.cwd(),
      destDir: 'packages',
      packageName: undefined,
      description: undefined,
      private: undefined,
      sideEffects: undefined,
      projectContext: {
        cwd: process.cwd(),
        rootDir: process.cwd(),
        type: 'single',
        packageDir: 'packages',
        versionStrategy: undefined,
        packageDirs: [],
        targetPackageDirs: [process.cwd()],
        currentPackageDir: process.cwd(),
        isRoot: true,
      },
    };
  }

  private async prepareTargetDir(targetDir: string) {
    if (await fs.pathExists(targetDir)) {
      throw new DyCliError(
        'TARGET_DIR_NOT_EMPTY',
        `Target directory '${path.basename(targetDir)}' already exists.`,
      );
    }

    await fs.ensureDir(targetDir);
  }

  private async renderTemplate(
    targetDir: string,
    packageMeta: {
      packageName: string;
      description: string;
      private: boolean;
      sideEffects: boolean;
    },
  ) {
    const templateDir = await this.resolveTemplateDir();
    const filePaths = await this.getTemplateFilePaths(templateDir);
    const renderContext = this.getRenderContext(packageMeta);

    await Promise.all(
      filePaths.map(async (filePath) => {
        const relativePath = path.relative(templateDir, filePath);
        const outputPath = path.join(targetDir, relativePath.replace(/\.hbs$/, ''));
        const source = await fs.readFile(filePath, 'utf8');
        const content = this.renderContent(source, renderContext);
        const stat = await fs.stat(filePath);

        await fs.outputFile(outputPath, content);
        await fs.chmod(outputPath, stat.mode);
      }),
    );
  }

  /**
   * Supports both the published bundle layout (`dist/templates`) and the source/build task layout
   * (`src/tasks` or `dist/tasks` + `../templates`).
   */
  private async resolveTemplateDir(runtimeDir = __dirname) {
    const candidates = [
      path.join(runtimeDir, 'templates/package'),
      path.join(runtimeDir, '../templates/package'),
    ];

    for (const templateDir of candidates) {
      if (await fs.pathExists(templateDir)) {
        return templateDir;
      }
    }

    throw new DyCliError('TEMPLATE_NOT_FOUND', "Template directory 'package' does not exist.");
  }

  private async getTemplateFilePaths(templateDir: string): Promise<string[]> {
    const entries = await fs.readdir(templateDir);
    const filePaths = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(templateDir, entry);
        const stat = await fs.stat(entryPath);

        if (stat.isDirectory()) {
          return this.getTemplateFilePaths(entryPath);
        }

        return [entryPath];
      }),
    );

    return filePaths.flat();
  }

  private getRenderContext(packageMeta: {
    packageName: string;
    description: string;
    private: boolean;
    sideEffects: boolean;
  }) {
    return {
      packageName: packageMeta.packageName,
      scopedPackageName: `@dysonic/${packageMeta.packageName}`,
      description: packageMeta.description,
      private: String(packageMeta.private),
      sideEffects: String(packageMeta.sideEffects),
    };
  }

  private renderContent(content: string, context: Record<string, string>) {
    return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(context, key) ? context[key] : match,
    );
  }

  private async resolvePackageMeta(workspaceRoot: string) {
    const answers = this.shouldPrompt()
      ? (await inquirer.prompt<Record<string, string | boolean>>(
          this.getQuestions(workspaceRoot),
        )) ?? {}
      : {};

    const packageName = this.normalizePackageName(
      (this.config.packageName ?? answers.packageName) as string | undefined,
    );

    if (!packageName) {
      throw new DyCliError('INVALID_ARGUMENT', 'Package name is required.');
    }

    return {
      packageName,
      description: String(this.config.description ?? answers.description ?? ''),
      private: Boolean(this.config.private ?? answers.private ?? false),
      sideEffects: Boolean(this.config.sideEffects ?? answers.sideEffects ?? false),
    };
  }

  private shouldPrompt() {
    return (
      !this.config.packageName ||
      typeof this.config.description === 'undefined' ||
      typeof this.config.private === 'undefined' ||
      typeof this.config.sideEffects === 'undefined'
    );
  }

  private getQuestions(workspaceRoot: string) {
    const questions: inquirer.QuestionCollection[] = [];

    if (!this.config.packageName) {
      questions.push({
        name: 'packageName',
        type: 'input',
        message: 'Input the name of the package',
        validate: (input: string) => this.validatePackageName(workspaceRoot, input),
      });
    }

    if (typeof this.config.private === 'undefined') {
      questions.push({
        name: 'private',
        type: 'confirm',
        message: 'Is a private package?',
        default: false,
      });
    }

    if (typeof this.config.description === 'undefined') {
      questions.push({
        name: 'description',
        type: 'input',
        message: 'Input the description of the package',
        default: '',
      });
    }

    if (typeof this.config.sideEffects === 'undefined') {
      questions.push({
        name: 'sideEffects',
        type: 'confirm',
        message: 'Has sideEffects?',
        default: false,
      });
    }

    return questions;
  }

  private validatePackageName(workspaceRoot: string, packageName: string) {
    const normalizedPackageName = this.normalizePackageName(packageName);

    if (!normalizedPackageName) {
      return 'Package name is required.';
    }

    const packageDir = path.join(workspaceRoot, this.config.destDir, normalizedPackageName);
    if (fs.existsSync(packageDir)) {
      return 'Folder is existing!';
    }

    return true;
  }

  private normalizePackageName(packageName?: string) {
    if (!packageName) {
      return undefined;
    }

    return packageName.split('/').pop() ?? packageName;
  }
}
