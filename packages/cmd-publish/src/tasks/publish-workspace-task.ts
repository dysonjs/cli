import {
  AbstractTask,
  PublishCommandConfig,
  runChangesetCommand,
  runProjectCommand,
} from '@dysonic/dy-cli-core';

export class PublishWorkspaceTask extends AbstractTask<PublishCommandConfig> {
  public async run(): Promise<void> {
    const cwd = this.config.projectContext.rootDir;

    await runProjectCommand(this.config.projectContext, 'build');
    await runProjectCommand(this.config.projectContext, 'test', [], {
      NODE_ENV: 'test',
    });

    const publishArgs = ['publish'];
    const tag = this.resolveTag();

    if (tag) {
      publishArgs.push('--tag', tag);
    }

    await runChangesetCommand(cwd, publishArgs);
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

  private resolveTag(): string | undefined {
    if (this.config.tag) {
      return this.config.tag;
    }

    if (this.config.beta) {
      return this.config.betaTag;
    }

    return undefined;
  }
}
