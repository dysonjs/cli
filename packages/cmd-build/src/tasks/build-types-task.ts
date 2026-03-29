import { AbstractTask, BuildCommandConfig } from '@dysonic/dy-cli-core';

import { BuildTypesBuilder } from '../builders';

export class BuildTypesTask extends AbstractTask<BuildCommandConfig> {
  public async run(): Promise<void> {
    const builder = new BuildTypesBuilder(this.config.cwd ?? process.cwd());
    await builder.build();
  }

  protected getDefaultConfig(): BuildCommandConfig {
    return {
      cwd: process.cwd(),
      target: 'types',
      mode: undefined,
      name: undefined,
      externals: undefined,
      globals: undefined,
    };
  }
}
