import { createRequire } from 'module';

type LessPluginNpmImportOptions = {
  prefix: string;
};

type LessPluginNpmImportConstructor = new (options: LessPluginNpmImportOptions) => unknown;

const requireModule = createRequire(__filename) as (specifier: string) =>
  | LessPluginNpmImportConstructor
  | {
      default?: LessPluginNpmImportConstructor;
    };

const loadedModule = requireModule('less-plugin-npm-import');

const LessPluginNpmImport =
  typeof loadedModule === 'function'
    ? loadedModule
    : (loadedModule.default as LessPluginNpmImportConstructor);

export default LessPluginNpmImport;
