import path from 'path';
import {z} from 'zod';

const appName = 'shc-2';

export interface RunnerParams {
  hooks?: {
    'pre-request': string[];
    'post-request': string[];
  };
  endpoint: string;
  method: 'GET';
}

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
      'post-request': z.array(z.string()).optional(),
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
      'post-request': z.array(z.string()).optional(),
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
      'post-request': z.array(z.string()).optional(),
    })
    .optional(),
  endpoints: z.record(z.string(), EndpointConfigSchema).optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

export type ConfigImport = z.infer<typeof ConfigImportSchema>;

export type ResolvedConfig = WorkspaceConfig | ConfigImport;

export interface Module {
  'pre-request-hooks': {
    [key: string]: (ctx: RunnerContext) => void;
  };
  'post-request-hooks': {
    [key: string]: (ctx: RunnerContext) => void;
  };
  'template-handlers': {
    [key: string]: () => string;
  };
}

export interface Plugin {
  directory: string;
  module: Module;
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
  req: Request;
  res?: Response;
};
