import {Module, RunnerContext} from '../types';

export const base: Module = {
  'pre-request-hooks': {
    logConfig: (_: RunnerContext, config: unknown) => {
      console.log('Pre-request Config:');
      return console.log(config);
    },
    logContext: (ctx: RunnerContext) => {
      console.log('Pre-request Context:');
      return console.log(ctx);
    },
  },
  'post-request-hooks': {
    logContext: (ctx: RunnerContext) => {
      console.log('Post-request Context:');
      return console.log(ctx);
    },
  },
  'template-handlers': {},
};

export default base;
