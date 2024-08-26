import {Module, RunnerContext} from '../types';

export const base: Module = {
  'pre-request-hooks': {
    logConfig: (_: RunnerContext, config: unknown) => console.log(config),
    logContext: (ctx: RunnerContext) => console.log(ctx),
  },
  'post-request-hooks': {
    logContext: (ctx: RunnerContext) => console.log(ctx),
  },
  'template-handlers': {},
};

export default base;
