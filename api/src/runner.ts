import {RunnerParams} from './types';

export const run = async (params: RunnerParams) => {
  console.log(params);

  // TODO: resolve hooks here.

  // const {hooks} = params;
  // if (hooks) {
  //   for (const preRequest of Object.keys(hooks['pre-request'])) {
  //     console.log(`Execute pre-request: ${preRequest}`);
  //     hooks['pre-request'][preRequest]();
  //   }
  // }
};
