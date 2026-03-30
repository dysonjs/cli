import path from 'path';
import Rollup from 'rollup';
import dts from 'rollup-plugin-dts';

import { AbstractBuilder } from './abstract-builder';

export class BuildTypesBuilder extends AbstractBuilder {
  public async build() {
    const pkg = await this.loadPackageManifest();
    const input = await this.resolveInputTsEntry();
    const bundle = await Rollup.rollup({
      input,
      plugins: [dts()],
      output: {
        file: path.resolve(this.cwd, pkg.types ?? 'dist/index.d.ts'),
        format: 'es',
      },
      external: [
        /\.(less|scss|css)$/,
        ...this.getPeerDependencies(pkg),
        ...this.getDependencies(pkg),
        ...this.getNodeBuiltins(),
      ],
    });

    await bundle.write({
      file: path.resolve(this.cwd, pkg.types ?? 'dist/index.d.ts'),
      format: 'es',
    });
  }
}
