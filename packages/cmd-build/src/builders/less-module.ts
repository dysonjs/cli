import { createRequire } from 'module';

type LessModule = Record<string, unknown>;

const requireModule = createRequire(__filename) as (
  specifier: string,
) => LessModule | { default?: LessModule };

const loadedModule = requireModule('less');

const less =
  typeof loadedModule === 'function'
    ? (loadedModule as LessModule)
    : ((loadedModule.default ?? loadedModule) as LessModule);

export default less;
