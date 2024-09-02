import {mergedConfigToRunnerParams} from './config';
import {getCallbacks, getPlugin} from './plugins';
import {resolveTemplates} from './templates';
import {ConfigImport, EndpointConfig, RunnerContext, WorkspaceConfig} from './types';

const executeHooks = async (ctx: RunnerContext, hooks: string[] = []) => {
  for (const hook of hooks) {
    const [pluginName, methodName] = hook.split('.');
    const plugin = getPlugin(pluginName);
    const method = plugin.module['pre-request-hooks'][methodName];
    const callbacks = getCallbacks();
    if (!method) throw new Error(`Failed to find pre request hook or something: ${methodName}`);
    await method(ctx, plugin.config, callbacks ?? {});
  }
};

export const createRunnerContext = (config: (WorkspaceConfig | ConfigImport) & EndpointConfig): RunnerContext => {
  const resolvedConfig = resolveTemplates(config);
  const params = mergedConfigToRunnerParams(resolvedConfig);
  const request: RequestInit = {
    method: params.method,
    headers: params.headers,
  };

  if (resolvedConfig.body) {
    switch (typeof resolvedConfig.body) {
      case 'string':
      case 'number':
      case 'bigint':
      case 'boolean':
        request.body = resolvedConfig.body.toString();
        break;
      case 'object':
        request.body = JSON.stringify(resolvedConfig.body);
        break;
    }
  }

  const context = {
    hooks: params.hooks,
    url: params.endpoint,
    req: request,
  };

  const queryParamString = new URLSearchParams(resolvedConfig['query-parameters']).toString();
  if (queryParamString) {
    context.url = context.url + '?' + queryParamString;
  }

  return context;
};

export const run = async (ctx: RunnerContext) => {
  if (ctx.hooks) {
    await executeHooks(ctx, ctx.hooks['pre-request']);
  }

  let response: Response | undefined;
  try {
    response = await fetch(new Request(ctx.url, ctx.req));
    ctx.res = response;
    if (ctx.hooks) {
      await executeHooks(ctx, ctx.hooks['post-request']);
    }
    return response.json();
  } catch (err) {
    if (response) {
      throw new Error(`Request Failed - ${response.status}: ${response.statusText}`);
    }
    throw err;
  }
};
