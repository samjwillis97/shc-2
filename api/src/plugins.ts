import {tmpdir} from 'os';
import path from 'path';
import childProcess from 'child_process';
import {getConfig, getYarnPath} from './config';
import {Callbacks, ModuleJsonSchema, Plugin, ResolvedConfig, ShcPlugin, WorkspaceConfig} from './types';
import base from './extensions/base';
import {createModulesFromVariableGroups} from './variableGroups';
import {z} from 'zod';
import {resolveTemplates} from './templates';
import {getFileOps} from './files';

const pluginMap: Record<string, Plugin> | undefined = {};
let callbacks: Callbacks | undefined = undefined;

export const setCallbacks = (toSet: Callbacks) => {
  callbacks = toSet;
};

export const getCallbacks = (): Callbacks | undefined => {
  return callbacks;
};

const validateModuleJson = (moduleJson: string) => {
  try {
    const schema = z.object({
      shc: z.object({
        id: z.string(),
      }),
      name: z.string(),
      version: z.string(),
      dist: z.unknown(),
    });

    const parsed = schema.safeParse(JSON.parse(moduleJson));

    if (parsed.success === false) {
      throw new Error('Failed to parse module info');
    }

    // console.log(`[plugins] Detected SHC plugin ${parsed.data.name}`);

    return {
      shc: parsed.data.shc,
      name: parsed.data.name,
      version: parsed.data.version,
      dist: parsed.data.dist,
    };
  } catch (err) {
    throw new Error(`Failed to parse module info`);
  }
};

const isShcPlugin = async (pluginLookupName: string) => {
  const fileOperators = getFileOps();
  if (pluginLookupName.includes('@file:')) {
    // this is a file plugin, just return the local package json
    const pluginPath = pluginLookupName.split('@file:')[1];
    const jsonPath = path.join(pluginPath, 'package.json');
    return validateModuleJson(fileOperators.readFile(jsonPath));
  }
  return new Promise<ShcPlugin>((resolve, reject) => {
    // console.log('[plugins] Fetching module info from npm');

    childProcess.execFile(
      process.execPath,
      [
        '--no-deprecation', // Because Yarn still uses `new Buffer()`
        escape(getYarnPath()),
        'info',
        pluginLookupName,
        '--json',
      ],
      {
        timeout: 5 * 60 * 1000,
        maxBuffer: 1024 * 1024,
        shell: true, // Some package installs require a shell
        env: {
          NODE_ENV: 'production',
          // ELECTRON_RUN_AS_NODE: "true",
        },
      },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`npm error: ${err.message}`));
          return;
        }

        if (stderr) {
          reject(new Error(`Yarn error ${stderr.toString()}`));
          return;
        }

        try {
          const data = JSON.parse(stdout.toString()).data;
          // console.log(`[plugin data]`, data);

          if (!data) {
            reject(new Error('Failed to parse module info'));
            return;
          }

          // console.log(`[plugins] Detected SHC plugin ${data.shc.id}`);

          resolve({
            shc: data.shc,
            name: data.name,
            version: data.version,
            dist: data.dist,
          });
        } catch (ex) {
          // @ts-expect-error - unknown error, FIXME
          reject(new Error(`Failed to parse module info: ${ex.message}`));
        }
      },
    );
  });
};

const installPluginToTmpDir = async (pluginLookupName: string) => {
  const fileOperators = getFileOps();
  return new Promise<{tmpDir: string}>(async (resolve, reject) => {
    // console.log(`[plugins] Installing ${pluginLookupName} to tmp`);

    let pluginTmpPathName = pluginLookupName;
    if (!pluginLookupName.startsWith('@') && pluginLookupName.includes('@')) {
      pluginTmpPathName = pluginLookupName.split('@')[0];
    }

    const tmpDir = path.join(tmpdir(), escape(pluginTmpPathName));
    fileOperators.mkDirRecursive(tmpDir);
    // TODO: Work out what each flag actually does
    // Looks to make a package json at tmpdir and install plugin beneath
    return childProcess.execFile(
      process.execPath,
      [
        '--no-deprecation', // Because Yarn still uses `new Buffer()`
        escape(getYarnPath()),
        'add',
        pluginLookupName,
        '--modules-folder',
        escape(tmpDir),
        '--cwd',
        escape(tmpDir),
        '--no-lockfile',
        '--production',
        '--no-progress',
      ],
      {
        timeout: 5 * 60 * 1000,
        maxBuffer: 1024 * 1024,
        cwd: tmpDir,
        shell: true,
        // Some package installs require a shell
        env: {
          NODE_ENV: 'production',
          // ELECTRON_RUN_AS_NODE: "true",
        },
      },
      // third param is stderr
      (err, stdout) => {
        // console.log('[plugins] Install complete', {err, stdout, stderr});
        // Check yarn/electron process exit code.
        // In certain environments electron can exit with error even if the command was performed successfully.
        // Checking for success message in output is a workaround for false errors.
        if (err && !stdout.toString().includes('success')) {
          reject(new Error(`${pluginLookupName} install error: ${err.message}`));
          return;
        }

        // if (stderr) {
        //   reject(new Error(`Yarn error ${stderr.toString()}`));
        //   return;
        // }

        resolve({
          tmpDir,
        });
      },
    );
  });
};

/**
 * Recursively resolve plugins in given paths
 * Validation is done by making sure a `package.json` is included
 * and that it has a `shc` key within.
 *
 * The plugin map will use the `shc.name` as the key and the plugin object as the value.
 * When inserting in the pluginMap
 *
 */
const resolvePlugins = async (paths: string[], pluginConfigs: WorkspaceConfig['pluginConfig']) => {
  const fileOperators = getFileOps();

  for (const pluginPath of paths) {
    if (!fileOperators.exists(pluginPath)) {
      continue;
    }

    for (const filename of fileOperators.readDir(pluginPath)) {
      try {
        const modulePath = path.join(pluginPath, filename);
        const packageJsonPath = path.join(modulePath, 'package.json');

        if (!fileOperators.isDir(modulePath)) continue;

        if (filename.startsWith('@')) {
          await resolvePlugins([modulePath], pluginConfigs);
        }

        if (!fileOperators.readDir(modulePath).includes('package.json')) continue;

        // FIXME:
        // Delete `require` cache if plugin has been required before
        // for (const p of Object.keys(global.require.cache)) {
        //   if (p.indexOf(modulePath) === 0) {
        //     delete global.require.cache[p];
        //   }
        // }

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pluginJson = require(packageJsonPath);
        const parsedPluginJson = ModuleJsonSchema.safeParse(pluginJson);

        if (parsedPluginJson.success === false) {
          throw new Error(`Bad plugin detected: ${modulePath}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const module = require(modulePath);

        // TODO: Validate module

        if (Object.hasOwn(pluginMap, parsedPluginJson.data.shc.id))
          throw new Error(`Plugin has already been loaded called: ${parsedPluginJson.data.shc.id}`);
        pluginMap[parsedPluginJson.data.shc.id] = {
          module,
          directory: modulePath,
          config: pluginConfigs ? Object.assign({}, pluginConfigs[parsedPluginJson.data.shc.id]) : undefined,
        };

        // console.log(`[plugins] Loaded ${parsedPluginJson.data.name} from ${modulePath}`);
      } catch (err) {
        console.log(err);
        throw Error(`Failed to load plugin: ${filename}`);
      }
    }
  }

  return Object.keys(pluginMap).map((name) => pluginMap[name]);
};

const findAllPluginDirs = async () => {
  const config = getConfig();
  const fileOperators = getFileOps();
  fileOperators.mkDirRecursive(config.pluginDirectory);
  return [config.pluginDirectory];
};

// FIXME: Only install if missing or version is different
export const installPlugin = async (plugin: string) => {
  // console.log(`[plugins] Installing ${plugin}`);
  const config = getConfig();
  const fileOperators = getFileOps();

  const module = await isShcPlugin(plugin);

  const {tmpDir} = await installPluginToTmpDir(plugin);
  const pluginDir = path.join(config.pluginDirectory, module.name);

  // console.log(`[plugins] Moving plugin from ${tmpDir} to ${pluginDir}`);

  try {
    fileOperators.cp(path.join(tmpDir, module.name), pluginDir);
  } catch (err) {
    console.log(err);
    throw new Error(`Failed to move plugin, name in the package.json may be incorrect`);
  }
  // FIXME - IDK if this is necessary, because it should be happening anyway?
  // Move each dependency into node_modules folder
  // const pluginModulesDir = path.join(pluginDir, 'node_modules');
  // fileOperators.mkDirRecursive(pluginModulesDir);
  // console.log(fileOperators.readDir(tmpDir));
  // for (const filename of fileOperators.readDir(tmpDir)) {
  //   const src = path.join(tmpDir, filename);
  //   if (filename === plugin || !fileOperators.isDir(src)) {
  //     continue;
  //   }

  //   const dest = path.join(pluginModulesDir, filename);
  //   console.log(`cp ${src} ${dest}`);
  //   fileOperators.cp(src, dest);
  // }
};

const importExtensions = (pluginConfigs: WorkspaceConfig['pluginConfig']) => {
  if (Object.hasOwn(pluginMap, 'base')) throw new Error(`Plugin has already been loaded called: base`);
  pluginMap['base'] = {
    directory: '.',
    module: base,
    config: pluginConfigs ? Object.assign({}, pluginConfigs['base']) : undefined,
  };
};

// TODO: I think this should have the option of only loading required plugins
// TODO: Validate versions of plugins are correct if specified
export const loadPlugins = async (pluginConfigs: WorkspaceConfig['pluginConfig'], force?: boolean) => {
  if (Object.keys(pluginMap).length === 0 || force) {
    const dirs = await findAllPluginDirs();
    await resolvePlugins(dirs, pluginConfigs);
    importExtensions(pluginConfigs);
  }

  return pluginMap;
};

export const loadVariableGroups = (groups: ResolvedConfig['variableGroups']) => {
  if (!groups) return;
  const modules = createModulesFromVariableGroups(groups);
  for (const name of Object.keys(modules)) {
    if (Object.hasOwn(pluginMap, name)) throw new Error(`Plugin has already been loaded called: ${name}`);
    pluginMap[name] = modules[name];
  }
};

export const setPlugin = (name: string, plugin: Plugin) => {
  if (pluginMap[name]) console.warn(`plugin: ${name}, already exists - overwriting`);
  pluginMap[name] = plugin;
};

export const getPlugin = (name: string) => {
  if (!pluginMap[name]) throw new Error(`Unable to get plugin: ${name}`);
  const toReturn = pluginMap[name];
  let config: Record<string, unknown> = {};
  if (toReturn.config) {
    config = JSON.parse(JSON.stringify(toReturn.config));
    config = resolveTemplates(config);
  }
  return {
    ...toReturn,
    config,
  };
};

export const cleanPluginDir = async () => {
  const config = getConfig();
  const fileOperators = getFileOps();
  const contents = fileOperators.readDir(config.pluginDirectory);

  for (const item of contents) {
    const toDelete = path.join(config.pluginDirectory, item);
    if (!fileOperators.isDir(toDelete)) continue;
    fileOperators.rmrf(toDelete);
  }
};
