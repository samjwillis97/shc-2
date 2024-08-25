// So I think I could actually treat these like a module.. that is just templates?

import {Module, ResolvedConfig} from './types';

export const createModuleFromVariableGroups = (groups: ResolvedConfig['variableGroups']) => {
  const modules: Module[] = [];

  if (!groups) return;
  console.log('Trying to load variable groups');
  for (const group of Object.keys(groups)) {
    const value = groups[group];
    const resolvedGroupValue = value.values[value.default];
    console.log(resolvedGroupValue);

    modules.push({
      'pre-request-hooks': {},
      'post-request-hooks': {},
      'template-handlers': {
        '': () => '',
      },
    });
  }
};
