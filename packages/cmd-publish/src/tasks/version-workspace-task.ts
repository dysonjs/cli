import execa from 'execa';

import { AbstractTask, PublishCommandConfig } from '@dysonic/dy-cli-core';

export class VersionWorkspaceTask extends AbstractTask<PublishCommandConfig> {
  public async run(): Promise<void> {
    const cwd = this.config.workspaceRoot ?? this.config.cwd ?? process.cwd();

    if (this.config.betaExit) {
      await execa('pnpm', ['changeset', 'pre', 'exit'], { cwd });
      return;
    }

    if (this.config.beta) {
      await execa('pnpm', ['changeset', 'pre', 'enter', this.config.betaTag], { cwd });
    }

    await execa('pnpm', ['changeset', 'version'], { cwd });
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
}
