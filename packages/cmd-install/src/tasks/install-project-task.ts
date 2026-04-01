import { AbstractTask, InstallCommandConfig, installDependencies } from '@dysonic/dy-cli-core';

export class InstallProjectTask extends AbstractTask<InstallCommandConfig> {
  public async run(): Promise<void> {
    await installDependencies(this.config.projectContext.rootDir);
  }

  protected getDefaultConfig(): InstallCommandConfig {
    return {
      cwd: process.cwd(),
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
}
