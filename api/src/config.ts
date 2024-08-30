import path, {dirname} from 'path';
import {z} from 'zod';
import merge from 'deepmerge';
import {ConfigImport, EndpointConfig, ShcApiConfigSchema, WorkspaceConfig, RunnerParams} from './types';

let config: z.infer<typeof ShcApiConfigSchema> | undefined = undefined;

// const getConfigDefaultPath = () => {
//   if (!process.env.HOME) throw new Error('Unsupported system');
//   return path.join(process.env.HOME, '.config', appName);
// };

const getAppDir = () => {
  const dir = require.main?.filename;
  if (!dir) throw new Error('IDK something');
  return dirname(dir);
};

// NOTE: Should also think about making this configurable, then you could bring your own yarn instead
// NOTE: Might need to change this path depending on dev/prod
// dev/prod should be determined by app environment
// app environment denoted by SHC_ENV env variable
export const getYarnPath = () => {
  return path.resolve(getAppDir(), '../bin/yarn-standalone.js');
};

export const getConfig = (configJson: string = '{}', force?: boolean) => {
  if (force || !config) {
    // console.log('[config] Parsing config JSON');
    const parsedConfig = ShcApiConfigSchema.safeParse(JSON.parse(configJson));
    if (parsedConfig.success === false) {
      console.log('[config] Failed to parse config');
      console.log(parsedConfig.error);
      throw new Error('Invalid config');
    }
    config = parsedConfig.data;
  }

  if (!config) {
    console.log('[config] Missing config');
    throw new Error('Config missing');
  }

  return config;
};

export const mergeWorkspaceAndEndpointConfig = (
  workspace: WorkspaceConfig | ConfigImport,
  endpoint: EndpointConfig,
) => {
  const merged = merge(workspace, endpoint);
  merged.headers = {...(workspace.headers ?? {}), ...(endpoint.headers ?? {})};
  merged.hooks = {
    'pre-request': [...(workspace.hooks?.['pre-request'] ?? []), ...(endpoint.hooks?.['pre-request'] ?? [])],
    'post-request': [...(workspace.hooks?.['post-request'] ?? []), ...(endpoint.hooks?.['post-request'] ?? [])],
  };
  merged['query-parameters'] = {...(workspace['query-parameters'] ?? {}), ...(endpoint['query-parameters'] ?? {})};
  return merged;
};

export const mergedConfigToRunnerParams = (config: (WorkspaceConfig | ConfigImport) & EndpointConfig): RunnerParams => {
  return {
    method: config.method,
    endpoint: config.endpoint,
    headers: config.headers ?? {},
    hooks: {
      'pre-request': config.hooks?.['pre-request'] ?? [],
      'post-request': config.hooks?.['post-request'] ?? [],
    },
  };
};
