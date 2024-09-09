import {getConfig} from './config';
import {getCallbacks, getPlugin, setPlugin} from './plugins';
import {Hooks, PluginBaseMethods, PreContextMethods, RunnerContext} from './types';
import {createModuleFromVariableGroup} from './variableGroups';
import {performance} from 'perf_hooks';

const pluginBaseMethods: PluginBaseMethods = {
  log: (msg) => {
    if (getConfig().logLevel === 'debug') console.log(msg);
  },
};

const preContextMethods: PreContextMethods = {
  ...pluginBaseMethods,
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

  const config = getConfig();

  const hooks = ctx.hooks?.[hooksCtxName] ?? [];
  for (const hook of hooks) {
    const [pluginName, methodName] = hook.split('.');
    const plugin = getPlugin(pluginName);
    const method = plugin.module[hookName][methodName];
    const callbacks = getCallbacks();
    if (!method) throw new Error(`Failed to find pre request hook or something: ${methodName}`);
    let startTime;
    if (config.logLevel === 'debug') {
      startTime = performance.now();
      console.log(`[hooks] starting execution: ${hook}`);
    }
    await method(ctx, plugin.config, pluginBaseMethods, callbacks ?? {});
    if (config.logLevel === 'debug')
      console.log(`[hooks] finished execution: ${hook} in ${(performance.now() - (startTime ?? 0)).toFixed(2)}ms`);
  }
};

export const executePreContextHooks = async (hooks: Hooks['pre-context']) => {
  const config = getConfig();

  for (const hook of hooks) {
    const [pluginName, methodName] = hook.split('.');
    const plugin = getPlugin(pluginName);
    const method = plugin.module['pre-context-hooks'][methodName];
    const callbacks = getCallbacks();
    if (!method) throw new Error(`Failed to find pre request hook or something: ${methodName}`);
    let startTime;
    if (config.logLevel === 'debug') {
      startTime = performance.now();
      console.log(`[hooks] starting execution: ${hook}`);
    }
    await method(plugin.config, callbacks ?? {}, preContextMethods);
    if (config.logLevel === 'debug')
      console.log(`[hooks] finished execution: ${hook} in ${(performance.now() - (startTime ?? 0)).toFixed(2)}ms`);
  }
};
