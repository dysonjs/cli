import { AbstractTask, BuildCommandConfig } from '@dysonic/dy-cli-core';

import { BuildPackageBuilder } from '../builders';

export class BuildPackageTask extends AbstractTask<BuildCommandConfig> {
  public async run(): Promise<void> {
    const builder = new BuildPackageBuilder(this.config.cwd ?? process.cwd());
    await builder.build();
  }

  protected getDefaultConfig(): BuildCommandConfig {
    return {
      cwd: process.cwd(),
      target: 'default',
      mode: undefined,
      name: undefined,
      externals: undefined,
      globals: undefined,
    };
  }
}
