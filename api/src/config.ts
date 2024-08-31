import {z} from 'zod';
import merge from 'deepmerge';
import {ConfigImport, EndpointConfig, ShcApiConfigSchema, WorkspaceConfig, RunnerParams} from './types';
import {getFileOps} from './files';

let config: z.infer<typeof ShcApiConfigSchema> | undefined = undefined;

export const getYarnPath = () => {
  return getConfig().yarnPath;
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

export const getKnownWorkspaces = () => {
  const workspaceMap: Record<string, string> = {};
  if (!config) throw new Error('Config missing');
  const fileOperators = getFileOps();
  for (const workspacePath of config.workspaces) {
    const workspace = fileOperators.readFile(workspacePath);
    const parsedWorkspace = z.object({name: z.string()}).safeParse(JSON.parse(workspace));
    if (parsedWorkspace.success === false) throw new Error(`Workspace ${workspacePath} doesn't have a name`);
    workspaceMap[parsedWorkspace.data.name] = workspacePath;
  }

  return workspaceMap;
};

// TODO: Also allow root level config to be merged in
export const mergeWorkspaceAndEndpointConfig = (
  workspace: WorkspaceConfig | ConfigImport,
  endpoint: EndpointConfig,
) => {
  const merged = merge(workspace, endpoint);
  merged.headers = {...workspace.headers, ...endpoint.headers};
  merged.hooks = {
    'pre-request': [...workspace.hooks['pre-request'], ...endpoint.hooks['pre-request']],
    'post-request': [...workspace.hooks['post-request'], ...endpoint.hooks['post-request']],
  };
  merged['query-parameters'] = {...workspace['query-parameters'], ...endpoint['query-parameters']};
  return merged;
};

export const mergedConfigToRunnerParams = (config: (WorkspaceConfig | ConfigImport) & EndpointConfig): RunnerParams => {
  return {
    method: config.method,
    endpoint: config.endpoint,
    headers: config.headers,
    hooks: {
      'pre-request': config.hooks['pre-request'],
      'post-request': config.hooks['post-request'],
    },
  };
};
