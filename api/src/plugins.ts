import {cp, mkdir, readdir, readFile, rm, stat} from 'fs/promises';
import {tmpdir} from 'os';
import path from 'path';
import childProcess from 'child_process';
import {getConfig, getYarnPath} from './config';
import {existsSync, readdirSync, statSync} from 'fs';
import {Plugin, ResolvedConfig, ShcPlugin} from './types';
import base from './extensions/base';
import {createModulesFromVariableGroups} from './variableGroups';

// TODO: I think i need some plugin config of some description
// like arguments to pass to the plugin when it is loaded or when it is calling functions
// or atleast where it should be looking

// TODO: Handle clashes by throwing error!
const pluginMap: Record<string, Plugin> | undefined = {};

const validateModuleJson = (moduleJson: string) => {
  try {
    // TODO: zodify
    const data = JSON.parse(moduleJson);

    if (!data || !data.shc) {
      throw new Error('Failed to parse module info');
    }

    console.log(`[plugins] Detected SHC plugin ${data.name}`);

    return {
      shc: data.shc,
      name: data.name,
      version: data.version,
      dist: data.dist,
    };
  } catch (err) {
    throw new Error(`Failed to parse module info`);
  }
};

const isShcPlugin = async (pluginLookupName: string) => {
  if (pluginLookupName.includes('@file:')) {
    // this is a file plugin, just return the local package json
    const pluginPath = pluginLookupName.split('@file:')[1];
    const jsonPath = path.join(pluginPath, 'package.json');
    return validateModuleJson(await readFile(jsonPath, 'utf8'));
  }
  return new Promise<ShcPlugin>((resolve, reject) => {
    console.log('[plugins] Fetching module info from npm');

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
          console.log(`[plugin data]`, data);

          if (!data) {
            reject(new Error('Failed to parse module info'));
            return;
          }

          console.log(`[plugins] Detected SHC plugin ${data.shc.id}`);

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
  return new Promise<{tmpDir: string}>(async (resolve, reject) => {
    console.log(`[plugins] Installing ${pluginLookupName} to tmp`);

    let pluginTmpPathName = pluginLookupName;
    if (!pluginLookupName.startsWith('@') && pluginLookupName.includes('@')) {
      pluginTmpPathName = pluginLookupName.split('@')[0];
    }

    const tmpDir = path.join(tmpdir(), escape(pluginTmpPathName));
    await mkdir(tmpDir, {recursive: true});
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
      (err, stdout, stderr) => {
        console.log('[plugins] Install complete', {err, stdout, stderr});
        // Check yarn/electron process exit code.
        // In certain environments electron can exit with error even if the command was performed successfully.
        // Checking for success message in output is a workaround for false errors.
        if (err && !stdout.toString().includes('success')) {
          reject(new Error(`${pluginLookupName} install error: ${err.message}`));
          return;
        }

        // if (stderr && !containsOnlyDeprecationWarnings(stderr)) {
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
const resolvePlugins = async (paths: string[]) => {
  for (const pluginPath of paths) {
    if (!existsSync(pluginPath)) {
      continue;
    }

    for (const filename of readdirSync(pluginPath)) {
      try {
        const modulePath = path.join(pluginPath, filename);
        const packageJsonPath = path.join(modulePath, 'package.json');

        if (!statSync(modulePath).isDirectory()) continue;

        if (filename.startsWith('@')) {
          await resolvePlugins([modulePath]);
        }

        if (!readdirSync(modulePath).includes('package.json')) continue;

        // FIXME:
        // Delete `require` cache if plugin has been required before
        // for (const p of Object.keys(global.require.cache)) {
        //   if (p.indexOf(modulePath) === 0) {
        //     delete global.require.cache[p];
        //   }
        // }

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pluginJson = require(packageJsonPath);

        if (!pluginJson.shc) continue;

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const module = require(modulePath);

        // TODO: Validate module

        pluginMap[pluginJson.shc.id] = {
          module,
          directory: modulePath,
        };

        console.log(`[plugins] Loaded ${pluginJson.name} from ${modulePath}`);
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
  await mkdir(config.pluginDirectory, {recursive: true});
  return [config.pluginDirectory];
};

// FIXME: Only install if missing or version is different
export const installPlugin = async (plugin: string) => {
  console.log(`[plugins] Installing ${plugin}`);
  const config = getConfig();

  const module = await isShcPlugin(plugin);

  const {tmpDir} = await installPluginToTmpDir(plugin);
  const pluginDir = path.join(config.pluginDirectory, module.name);

  console.log(`[plugins] Moving plugin from ${tmpDir} to ${pluginDir}`);

  try {
    await cp(path.join(tmpDir, module.name), pluginDir, {
      recursive: true,
      verbatimSymlinks: true,
    });
  } catch (err) {
    console.log(err);
    throw new Error(`Failed to move plugin, name in the package.json may be incorrect`);
  }
  // Move each dependency into node_modules folder
  const pluginModulesDir = path.join(pluginDir, 'node_modules');
  await mkdir(pluginModulesDir, {recursive: true});
  for (const filename of await readdir(tmpDir)) {
    const src = path.join(tmpDir, filename);
    const file = await stat(src);
    if (filename === plugin || !file.isDirectory()) {
      continue;
    }

    const dest = path.join(pluginModulesDir, filename);
    await cp(src, dest, {recursive: true, verbatimSymlinks: true});
  }
};

const importExtensions = () => {
  pluginMap['base'] = {
    directory: '.',
    module: base,
  };
};

// TODO: I think this should have the option of only loading required plugins
// TODO: Validate versions of plugins are correct if specified
export const loadPlugins = async (force?: boolean) => {
  if (Object.keys(pluginMap).length === 0 || force) {
    const dirs = await findAllPluginDirs();
    await resolvePlugins(dirs);
    importExtensions();
  }

  return pluginMap;
};

export const loadVariableGroups = (groups: ResolvedConfig['variableGroups']) => {
  if (!groups) return;
  const modules = createModulesFromVariableGroups(groups);
  for (const name of Object.keys(modules)) {
    pluginMap[name] = modules[name];
  }
};

export const getPlugin = (name: string) => {
  if (!pluginMap[name]) throw new Error(`Unable to get plugin: ${name}`);
  return pluginMap[name];
};

export const cleanPluginDir = async () => {
  const config = getConfig();
  const contents = await readdir(config.pluginDirectory);

  for (const item of contents) {
    const toDelete = path.join(config.pluginDirectory, item);
    const info = await stat(toDelete);
    if (!info.isDirectory()) continue;
    await rm(toDelete, {
      recursive: true,
      force: true,
    });
  }
};
