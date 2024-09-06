import {getCallbacks, getPlugin, setPlugin} from './plugins';
import {Hooks, PreContextMethods, RunnerContext} from './types';
import {createModuleFromVariableGroup} from './variableGroups';

const preContextMethods: PreContextMethods = {
  setVariableGroup: (group, value) => {
    const module = createModuleFromVariableGroup({
      default: 'default',
      values: {
        default: value,
      },
    });

    setPlugin(group, {
      directory: 'pre-context-hook-variable-group',
      module,
    });
  },
};

export const executePostContextHooks = async (
  ctx: RunnerContext,
  hookName: 'pre-request-hooks' | 'post-request-hooks',
) => {
  let hooksCtxName: keyof Hooks | undefined;
  switch (hookName) {
    case 'pre-request-hooks':
      hooksCtxName = 'pre-request';
      break;
    case 'post-request-hooks':
      hooksCtxName = 'post-request';
      break;
  }

  if (!hooksCtxName) throw new Error(`Failed to find hooks context name: ${hookName}`);

  const hooks = ctx.hooks?.[hooksCtxName] ?? [];
  for (const hook of hooks) {
    const [pluginName, methodName] = hook.split('.');
    const plugin = getPlugin(pluginName);
    const method = plugin.module[hookName][methodName];
    const callbacks = getCallbacks();
    if (!method) throw new Error(`Failed to find pre request hook or something: ${methodName}`);
    await method(ctx, plugin.config, callbacks ?? {});
  }
};

export const executePreContextHooks = async (hooks: Hooks['pre-context']) => {
  for (const hook of hooks) {
    const [pluginName, methodName] = hook.split('.');
    const plugin = getPlugin(pluginName);
    const method = plugin.module['pre-context-hooks'][methodName];
    const callbacks = getCallbacks();
    if (!method) throw new Error(`Failed to find pre request hook or something: ${methodName}`);
    await method(plugin.config, callbacks ?? {}, preContextMethods);
  }
};
