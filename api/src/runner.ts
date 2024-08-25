import {getPlugin} from './plugins';
import {RunnerContext, RunnerParams} from './types';

const executeHooks = (ctx: RunnerContext, hooks: string[]) => {
  for (const hook of hooks) {
    const [pluginName, methodName] = hook.split('.');
    const plugin = getPlugin(pluginName);
    const method = plugin.module['pre-request-hooks'][methodName];
    if (!method) throw new Error(`Failed to find pre request hook or something: ${methodName}`);
    method(ctx);
  }
};

export const run = async (params: RunnerParams) => {
  const ctx: RunnerContext = {
    url: params.endpoint,
    req: {
      method: params.method,
    },
  };

  const {hooks} = params;
  if (hooks) {
    executeHooks(ctx, hooks['pre-request']);
  }

  try {
    const response = await fetch(new Request(ctx.url, ctx.req));
    ctx.res = response;
    if (hooks) {
      executeHooks(ctx, hooks['post-request']);
    }
  } catch (err) {
    console.log('Request Failed');
    console.error(err);
  }
};
