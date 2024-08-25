import path, {dirname} from 'path';
import {z} from 'zod';
import {readFileSync} from 'fs';
import merge from 'deepmerge';
import {
  ConfigImport,
  ConfigImportSchema,
  EndpointConfig,
  ShcApiConfigSchema,
  WorkspaceConfig,
  RunnerParams,
  ResolvedConfig,
} from './types';

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
    console.log('[config] Parsing config JSON');
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

// TODO: Type for config post import
export const resolveImports = (configPath: string, config: WorkspaceConfig | ConfigImport): ResolvedConfig => {
  const configDirectory = configPath.substring(0, configPath.lastIndexOf(path.sep));
  if (!config.imports) return config;
  for (const toImport of config.imports) {
    const importPath = path.join(configDirectory, toImport);
    const imported = readFileSync(importPath, 'utf8');
    const parsedImport = ConfigImportSchema.safeParse(JSON.parse(imported));
    if (parsedImport.success === false) {
      throw new Error('Failed to parse import');
    }

    let importConfig = parsedImport.data;

    if (importConfig.imports) {
      importConfig = resolveImports(importPath, importConfig);
    }
    delete importConfig.imports;

    config = merge(config, importConfig);
  }

  return config;
};

export const mergeConfigsToRunnerParams = (
  workspace: WorkspaceConfig | ConfigImport,
  endpoint: EndpointConfig,
): RunnerParams => {
  return {
    method: endpoint.method,
    endpoint: endpoint.endpoint,
    headers: {...(workspace.headers ?? {}), ...(endpoint.headers ?? {})},
    hooks: {
      'pre-request': [...(workspace.hooks?.['pre-request'] ?? []), ...(endpoint.hooks?.['pre-request'] ?? [])],
      'post-request': [...(workspace.hooks?.['post-request'] ?? []), ...(endpoint.hooks?.['post-request'] ?? [])],
    },
  };
};
