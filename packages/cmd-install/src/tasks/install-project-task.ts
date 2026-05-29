import {
  AbstractTask,
  createDefaultProjectContext,
  InstallCommandConfig,
  installDependencies,
} from '@dysonic/dy-cli-core';

export class InstallProjectTask extends AbstractTask<InstallCommandConfig> {
  public async run(): Promise<void> {
    await installDependencies(this.config.projectContext.rootDir, this.config.npmClient);
  }

  protected getDefaultConfig(): InstallCommandConfig {
    return {
      cwd: process.cwd(),
      projectContext: createDefaultProjectContext(),
    };
  }
}
