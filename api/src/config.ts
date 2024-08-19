import path, {dirname} from 'path';
import {z} from 'zod';

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

export const CollectionConfigSchema = {
  workspaces: z.array(z.string()),
};

export const WorkspaceConfigSchema = {
  name: z.string(),
  plugins: z.array(z.string()),
  baseUri: z.string(),
};

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
