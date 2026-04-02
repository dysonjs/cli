import { createRequire } from 'module';
import Rollup from 'rollup';

export type PostcssPluginOptions = {
  plugins?: unknown[];
  minimize?: boolean;
  sourceMap?: boolean;
  extract?: boolean | string;
  extensions?: string[];
  use?: {
    less?: {
      implementation?: unknown;
      javascriptEnabled?: boolean;
      plugins?: unknown[];
    };
    sass?: unknown;
    stylus?: unknown;
  };
};

type PostcssPluginFactory = (options?: PostcssPluginOptions) => Rollup.Plugin;

const requireModule = createRequire(__filename) as (
  specifier: string,
) => PostcssPluginFactory | { default?: PostcssPluginFactory };

const loadedModule = requireModule('rollup-plugin-postcss');

const postcss =
  typeof loadedModule === 'function'
    ? loadedModule
    : (loadedModule.default as PostcssPluginFactory);

export default postcss;
