import {Module, RunnerContext} from '../types';

export const base: Module = {
  'pre-context-hooks': {},
  'pre-request-hooks': {
    logConfig: (_: RunnerContext, config: unknown) => {
      console.log('Pre-request Config:');
      return console.log(config);
    },
    logContext: (ctx: RunnerContext) => {
      console.log('Pre-request Context:');
      return console.log(ctx);
    },
    logUrl: (ctx: RunnerContext) => {
      console.error(`${ctx.req.method}: ${ctx.url}`);
      return;
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
