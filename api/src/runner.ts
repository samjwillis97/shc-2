export interface RunnerParams {
  plugins?: string[];
  hooks?: {
    'pre-request': string[];
  };
  endpoint: string;
  method: 'GET';
}

export const run = (params: RunnerParams) => {
  console.log(params);
};
