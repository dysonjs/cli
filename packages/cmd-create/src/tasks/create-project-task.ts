import fs from 'fs-extra';
import path from 'path';

import {
  AbstractTask,
  CreateCommandConfig,
  CreateTemplateType,
  DEFAULT_CREATE_TEMPLATE_TYPE,
  DEFAULT_CREATE_TEMPLATES,
  DyCliError,
  resolveTargetDir,
} from '@dysonic/dy-cli-core';

export class CreateProjectTask extends AbstractTask<CreateCommandConfig> {
  public async run(): Promise<void> {
    const targetDir = resolveTargetDir(this.config.cwd ?? process.cwd(), this.config.destDir);

    await this.prepareTargetDir(targetDir);
    await this.renderTemplate(targetDir);
  }

  protected getDefaultConfig(): CreateCommandConfig {
    return {
      cwd: process.cwd(),
      destDir: '.',
      projectName: 'dy-cli-app',
      templateType: DEFAULT_CREATE_TEMPLATE_TYPE,
      templates: DEFAULT_CREATE_TEMPLATES,
      force: false,
    };
  }

  private async prepareTargetDir(targetDir: string) {
    if (await fs.pathExists(targetDir)) {
      const files = await fs.readdir(targetDir);
      if (files.length) {
        if (!this.config.force) {
          throw new DyCliError(
            'TARGET_DIR_NOT_EMPTY',
            `Target directory '${path.basename(targetDir)}' is not empty.`,
          );
        }

        await fs.emptyDir(targetDir);
        return;
      }
    }

    await fs.ensureDir(targetDir);
  }

  private async renderTemplate(targetDir: string) {
    const templateDir = await this.resolveTemplateTypeDir();
    const filePaths = await this.getTemplateFilePaths(templateDir);
    const renderContext = this.getRenderContext();

    await Promise.all(
      filePaths.map(async (filePath) => {
        const relativePath = path.relative(templateDir, filePath);
        const outputPath = path.join(targetDir, this.normalizeOutputPath(relativePath));
        const source = await fs.readFile(filePath, 'utf8');
        const content = this.renderContent(source, renderContext);
        const stat = await fs.stat(filePath);

        await fs.outputFile(outputPath, content);
        await fs.chmod(outputPath, stat.mode);
      }),
    );
  }

  private getRenderContext() {
    return {
      projectName: this.config.projectName,
      scopedPackageName: `@dysonic/${this.config.projectName}`,
      defaultTemplateType: this.config.templateType,
      templatesBlock: this.serializeTemplates().join('\n'),
      buildMode: 'production',
      umdName: this.getUmdName(),
    };
  }

  private serializeTemplates() {
    return (
      Object.entries(this.config.templates) as [
        CreateTemplateType,
        CreateCommandConfig['templates'][CreateTemplateType],
      ][]
    ).flatMap(([templateType, templateConfig]) => [
      `      ${templateType}: {`,
      `        label: '${templateConfig.label}',`,
      `        description: '${templateConfig.description}',`,
      '      },',
    ]);
  }

  /**
   * Supports both the published bundle layout (`dist/templates`) and the source/build task layout
   * (`src/tasks` or `dist/tasks` + `../templates`).
   */
  private async resolveTemplateTypeDir(runtimeDir = __dirname) {
    const candidates = [
      path.join(runtimeDir, 'templates', this.config.templateType),
      path.join(runtimeDir, '..', 'templates', this.config.templateType),
    ];

    for (const templateDir of candidates) {
      if (await fs.pathExists(templateDir)) {
        return templateDir;
      }
    }

    throw new DyCliError(
      'TEMPLATE_NOT_FOUND',
      `Template directory '${this.config.templateType}' does not exist.`,
    );
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

  private normalizeOutputPath(relativePath: string) {
    return relativePath
      .split(path.sep)
      .map((segment) => {
        const segmentWithoutExtension = this.renderContent(
          segment.endsWith('.hbs')
            ? segment.slice(0, -4)
            : segment.endsWith('.tpl')
            ? segment.slice(0, -4)
            : segment,
          this.getRenderContext(),
        );

        if (segmentWithoutExtension.startsWith('__')) {
          return `.${segmentWithoutExtension.slice(2)}`;
        }

        if (segmentWithoutExtension.startsWith('_')) {
          return segmentWithoutExtension.slice(1);
        }

        return segmentWithoutExtension;
      })
      .join(path.sep);
  }

  private renderContent(content: string, context: Record<string, string>) {
    return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(context, key) ? context[key] : match,
    );
  }

  private getUmdName() {
    return this.config.projectName
      .split(/[^a-zA-Z0-9]/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join('');
  }
}
