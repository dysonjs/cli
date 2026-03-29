import { AbstractTask, BuildCommandConfig } from '@dysonic/dy-cli-core';

import { BuildUmdBuilder } from '../builders';

export class BuildUmdTask extends AbstractTask<BuildCommandConfig> {
  public async run(): Promise<void> {
    const builder = new BuildUmdBuilder(this.config.cwd ?? process.cwd(), {
      externals: this.config.externals,
      globals: this.config.globals,
      name: this.config.name,
    });
    await builder.build();
  }

  protected getDefaultConfig(): BuildCommandConfig {
    return {
      cwd: process.cwd(),
      target: 'umd',
      mode: undefined,
      name: undefined,
      externals: undefined,
      globals: undefined,
    };
  }
}
