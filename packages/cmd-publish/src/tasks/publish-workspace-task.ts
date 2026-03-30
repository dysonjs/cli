import execa from 'execa';

import { AbstractTask, PublishCommandConfig, runWorkspaceScript } from '@dysonic/dy-cli-core';

export class PublishWorkspaceTask extends AbstractTask<PublishCommandConfig> {
  public async run(): Promise<void> {
    const cwd = this.config.workspaceRoot ?? this.config.cwd ?? process.cwd();

    await runWorkspaceScript(cwd, 'build', [], this.config.workspaceConcurrency);
    await runWorkspaceScript(cwd, 'test', [], this.config.workspaceConcurrency, {
      NODE_ENV: 'test',
    });

    const publishArgs = ['changeset', 'publish'];
    const tag = this.resolveTag();

    if (tag) {
      publishArgs.push('--tag', tag);
    }

    await execa('pnpm', publishArgs, { cwd });
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
      betaExit: false,
      workspace: false,
      version: false,
      betaTag: 'beta',
      workspaceRoot: undefined,
      workspaceConcurrency: 8,
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
