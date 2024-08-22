import path, {dirname} from 'path';
import {z} from 'zod';
import {RunnerParams} from './runner';
import {readFileSync} from 'fs';
import merge from 'deepmerge';

const appName = 'shc-2';

let config: z.infer<typeof ShcApiConfigSchema> | undefined = undefined;

export const ShcApiConfigSchema = z.object({
  pluginDirectory: z
    .string()
    .default(
      path.join(
        process.env.APPDATA ||
          (process.platform == 'darwin'
            ? process.env.HOME + '/Library/Preferences'
            : process.env.HOME + '/.local/share'),
        appName,
        'plugins',
      ),
    ),
});

export const EndpointConfigSchema = z.object({
  method: z.enum(['GET']),
  hooks: z
    .object({
      'pre-request': z.array(z.string()).optional(),
    })
    .optional(),
  endpoint: z.string(),
});

export type EndpointConfig = z.infer<typeof EndpointConfigSchema>;

export const WorkspaceConfigSchema = z.object({
  imports: z.array(z.string()).optional(),
  name: z.string(),
  plugins: z.array(z.string()).optional(),
  hooks: z
    .object({
      'pre-request': z.array(z.string()).optional(),
    })
    .optional(),
  endpoints: z.record(z.string(), EndpointConfigSchema).optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;

export const ConfigImportSchema = z.object({
  imports: z.array(z.string()).optional(),
  plugins: z.array(z.string()).optional(),
  hooks: z
    .object({
      'pre-request': z.array(z.string()).optional(),
    })
    .optional(),
  endpoints: z.record(z.string(), EndpointConfigSchema).optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

export type ConfigImport = z.infer<typeof ConfigImportSchema>;

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
export const resolveImports = (
  configPath: string,
  config: WorkspaceConfig | ConfigImport,
): WorkspaceConfig | ConfigImport => {
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

// const mergeImport = (config: WorkspaceConfig, imported: WorkspaceConfig) => {};

export const mergeConfigsToRunnerParams = (
  workspace: WorkspaceConfig | ConfigImport,
  endpoint: EndpointConfig,
): RunnerParams => {
  return {
    method: endpoint.method,
    endpoint: endpoint.endpoint,
    hooks: {
      'pre-request': [...(workspace.hooks?.['pre-request'] ?? []), ...(endpoint.hooks?.['pre-request'] ?? [])],
    },
    plugins: workspace.plugins ?? [],
  };
};
