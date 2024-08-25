import {Module, RunnerContext} from '../types';

export const base: Module = {
  'pre-request-hooks': {
    logContext: (ctx: RunnerContext) => console.log(ctx),
  },
  'post-request-hooks': {
    logContext: (ctx: RunnerContext) => console.log(ctx),
  },
  'template-handlers': {},
};

export default base;
