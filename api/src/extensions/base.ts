import {Module, RunnerContext} from '../types';

export const base: Module = {
  'pre-request-hooks': {
    logContext: (ctx: RunnerContext) => {
      console.log('Base ext');
      console.log(ctx);
      return ctx;
    },
  },
  'template-handlers': {},
};

export default base;
