// So I think I could actually treat these like a module.. that is just templates?

import {Plugin, VariableGroup} from './types';

const createModuleFromVariableGroup = (group: VariableGroup) => {
  const resolvedGroupValue = group.values[group.default];
  const handlers: Record<string, () => string> = {};

  for (const key of Object.keys(resolvedGroupValue)) {
    const value = resolvedGroupValue[key];
    handlers[key] = () => value;
  }

  return {
    'pre-request-hooks': {},
    'post-request-hooks': {},
    'template-handlers': handlers,
  };
};

export const createModulesFromVariableGroups = (groups: Record<string, VariableGroup>) => {
  const moduleMap: Record<string, Plugin> = {};
  for (const name of Object.keys(groups)) {
    const value = groups[name];
    if (!value) continue;
    const module = createModuleFromVariableGroup(value);
    moduleMap[name] = {
      directory: 'variable-group',
      module,
    };
  }

  return moduleMap;
};
