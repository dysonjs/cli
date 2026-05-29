import {
  AbstractTask,
  createDefaultProjectContext,
  DyCliError,
  PublishCommandConfig,
} from '@dysonic/dy-cli-core';
import execa from 'execa';
import fs from 'fs-extra';
import path from 'path';

const NPM_PUBLISH_LIFECYCLE_EVENTS = new Set(['prepublishOnly', 'publish', 'postpublish']);

type PublishPackageManifest = {
  name?: string;
  private?: boolean;
  main?: string;
  module?: string;
  types?: string;
  browser?: string | Record<string, string | false>;
  bin?: string | Record<string, string>;
};

type DeclaredPackageFile = {
  field: string;
  filePath: string;
};

export class PublishProjectTask extends AbstractTask<PublishCommandConfig> {
  public async run(): Promise<void> {
    const cwd = this.resolveExecutionDir();
    const packageJSONPath = path.join(cwd, 'package.json');

    if (!(await fs.pathExists(packageJSONPath))) {
      throw new DyCliError('CONFIG_NOT_FOUND', `No package.json found at '${cwd}'.`);
    }

    const packageJSON = (await fs.readJSON(packageJSONPath)) as PublishPackageManifest;

    if (packageJSON.private) {
      throw new DyCliError(
        'PACKAGE_PRIVATE',
        `Package '${packageJSON.name ?? path.basename(cwd)}' is private and cannot be published.`,
      );
    }

    if (NPM_PUBLISH_LIFECYCLE_EVENTS.has(process.env.npm_lifecycle_event ?? '')) {
      throw new DyCliError(
        'INVALID_ARGUMENT',
        "dy-cli publish cannot run from npm publish lifecycle scripts because it recursively invokes 'npm publish'. Rename the script to 'release' and run that instead.",
      );
    }

    await this.assertDeclaredPackageFilesExist(cwd, packageJSON);

    await execa('npm', this.buildPublishArgs(), {
      cwd,
      stdio: 'inherit',
    });
  }

  protected getDefaultConfig(): PublishCommandConfig {
    return {
      cwd: process.cwd(),
      dryRun: false,
      tag: undefined,
      access: undefined,
      otp: undefined,
      registry: undefined,
      beta: false,
      workspace: false,
      betaTag: 'beta',
      workspaceRoot: undefined,
      workspaceConcurrency: 8,
      projectContext: createDefaultProjectContext(),
    };
  }

  private buildPublishArgs() {
    const args = ['publish'];

    if (this.config.dryRun) {
      args.push('--dry-run');
    }

    if (this.config.tag) {
      args.push('--tag', this.config.tag);
    }

    if (this.config.access) {
      args.push('--access', this.config.access);
    }

    if (this.config.otp) {
      args.push('--otp', this.config.otp);
    }

    if (this.config.registry) {
      args.push('--registry', this.config.registry);
    }

    return args;
  }

  private resolveExecutionDir() {
    if (this.config.projectContext.type === 'single') {
      return this.config.projectContext.rootDir;
    }

    return this.config.projectContext.currentPackageDir ?? this.config.cwd ?? process.cwd();
  }

  private async assertDeclaredPackageFilesExist(cwd: string, packageJSON: PublishPackageManifest) {
    const missingFiles: string[] = [];

    for (const item of this.resolveDeclaredPackageFiles(packageJSON)) {
      if (!(await fs.pathExists(path.resolve(cwd, item.filePath)))) {
        missingFiles.push(`${item.field}: ${item.filePath}`);
      }
    }

    if (missingFiles.length === 0) {
      return;
    }

    throw new DyCliError(
      'INVALID_ARGUMENT',
      [
        `Package '${
          packageJSON.name ?? path.basename(cwd)
        }' declares publish entry files that do not exist.`,
        `Missing files: ${missingFiles.join(', ')}.`,
        'Run the matching dy-cli build target before publishing.',
      ].join(' '),
    );
  }

  private resolveDeclaredPackageFiles(packageJSON: PublishPackageManifest): DeclaredPackageFile[] {
    const files: DeclaredPackageFile[] = [];

    this.addDeclaredPackageFile(files, 'main', packageJSON.main);
    this.addDeclaredPackageFile(files, 'module', packageJSON.module);
    this.addDeclaredPackageFile(files, 'types', packageJSON.types);

    if (typeof packageJSON.browser === 'string') {
      this.addDeclaredPackageFile(files, 'browser', packageJSON.browser);
    }

    if (typeof packageJSON.bin === 'string') {
      this.addDeclaredPackageFile(files, 'bin', packageJSON.bin);
    } else if (packageJSON.bin) {
      for (const [binName, binPath] of Object.entries(packageJSON.bin)) {
        this.addDeclaredPackageFile(files, `bin.${binName}`, binPath);
      }
    }

    return files;
  }

  private addDeclaredPackageFile(
    files: DeclaredPackageFile[],
    field: string,
    filePath?: string | false,
  ) {
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      return;
    }

    files.push({
      field,
      filePath,
    });
  }
}
