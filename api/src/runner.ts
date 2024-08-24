import {getPlugin} from './plugins';
import {RunnerParams} from './types';

const executeHooks = (hooks: string[]) => {
  for (const hook of hooks) {
    const [pluginName, methodName] = hook.split('.');
    const plugin = getPlugin(pluginName);
    const method = plugin.module['pre-request-hooks'][methodName];
    if (!method) throw new Error(`Failed to find pre request hook or something: ${methodName}`);
    method();
  }
};

export const run = async (params: RunnerParams) => {
  const {hooks} = params;
  if (hooks) {
    executeHooks(hooks['pre-request']);
  }
};
