import {mergeConfigsToRunnerParams} from './config';
import {getPlugin} from './plugins';
import {resolveTemplates} from './templates';
import {ConfigImport, EndpointConfig, RunnerContext, WorkspaceConfig} from './types';

const executeHooks = (ctx: RunnerContext, hooks: string[]) => {
  for (const hook of hooks) {
    const [pluginName, methodName] = hook.split('.');
    const plugin = getPlugin(pluginName);
    const method = plugin.module['pre-request-hooks'][methodName];
    if (!method) throw new Error(`Failed to find pre request hook or something: ${methodName}`);
    method(ctx);
  }
};

export const createRunnerContext = (
  config: WorkspaceConfig | ConfigImport,
  endpoint: EndpointConfig,
): RunnerContext => {
  const resolvedConfig = resolveTemplates(config);
  const resolvedEndpoint = resolveTemplates(endpoint);
  const params = mergeConfigsToRunnerParams(resolvedConfig, resolvedEndpoint);
  return {
    hooks: params.hooks,
    url: params.endpoint,
    req: {
      method: params.method,
      headers: params.headers,
    },
  };
};

export const run = async (ctx: RunnerContext) => {
  if (ctx.hooks) {
    executeHooks(ctx, ctx.hooks['pre-request']);
  }

  try {
    const response = await fetch(new Request(ctx.url, ctx.req));
    ctx.res = response;
    if (ctx.hooks) {
      executeHooks(ctx, ctx.hooks['post-request']);
    }
    console.log(await response.json());
  } catch (err) {
    console.log('Request Failed');
    console.error(err);
  }
};
