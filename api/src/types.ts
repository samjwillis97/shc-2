import path, {dirname} from 'path';
import {z} from 'zod';

const appName = 'shc-2';

const getAppDir = () => {
  const dir = require.main?.filename;
  if (!dir) throw new Error('IDK something');
  return dirname(dir);
};
const HooksSchema = z
  .object({
    'pre-request': z.array(z.string()).default([]),
    'post-request': z.array(z.string()).default([]),
  })
  .default({
    'pre-request': [],
    'post-request': [],
  });
type Hooks = z.infer<typeof HooksSchema>;

const VariablesSchema = z.record(z.string(), z.string()).default({});
const QueryParameterSchema = z.record(z.string(), z.string()).default({});
const HeaderSchema = z.record(z.string(), z.string()).default({});

// Add custom validation to make sure default is one of the keys of values
const VariableGroupSchema = z.object({
  default: z.string(),
  values: z.record(z.string(), z.record(z.string(), z.string())),
});

const VariableGroupsSchema = z.record(z.string(), VariableGroupSchema).default({});

export const EndpointConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: HeaderSchema,
  hooks: HooksSchema,
  endpoint: z.string(),
  variables: VariablesSchema,
  'query-parameters': QueryParameterSchema,
  body: z.unknown().optional(),
});

export type EndpointConfig = z.infer<typeof EndpointConfigSchema>;

export interface RunnerParams {
  headers: {
    [key: string]: string;
  };
  hooks?: Hooks;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

export type VariableGroup = z.infer<typeof VariableGroupSchema>;

export const ConfigImportSchema = z.object({
  imports: z.array(z.string()).default([]),
  plugins: z.array(z.string()).default([]),
  pluginConfig: z.record(z.string(), z.unknown()).default({}),
  headers: HeaderSchema,
  hooks: HooksSchema,
  endpoints: z.record(z.string(), EndpointConfigSchema).default({}),
  variables: VariablesSchema,
  variableGroups: VariableGroupsSchema,
  'query-parameters': QueryParameterSchema,
});

export type ConfigImport = z.infer<typeof ConfigImportSchema>;

export const WorkspaceConfigSchema = ConfigImportSchema.and(
  z.object({
    name: z.string(),
  }),
);
export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;

export const ShcApiConfigSchema = z.object({
  imports: z.array(z.string()).default([]),
  workspaces: z.array(z.string()).default([]),
  variables: VariablesSchema,
  variableGroups: VariableGroupsSchema,
  yarnPath: z.string().default(path.resolve(getAppDir(), '../bin/yarn-standalone.js')),
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

export type ResolvedConfig = WorkspaceConfig | ConfigImport;

export const ModuleJsonSchema = z.object({
  shc: z.object({
    id: z.string(),
  }),
  name: z.string(),
});

export interface Module {
  'pre-request-hooks': {
    [key: string]: (ctx: RunnerContext, config: unknown) => Promise<void> | void;
  };
  'post-request-hooks': {
    [key: string]: (ctx: RunnerContext, config: unknown) => Promise<void> | void;
  };
  'template-handlers': {
    [key: string]: (config: unknown) => string;
  };
}

export interface Plugin {
  directory: string;
  module: Module;
  config?: unknown;
}

export interface ShcPlugin {
  name: string;
  shc: {
    displayName: string;
    description: string;
  };
  version: string;
  dist: unknown;
}

export type RunnerContext = {
  url: string;
  req: RequestInit;
  hooks: RunnerParams['hooks'];
  res?: Response;
};
