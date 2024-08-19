import {cp, mkdir, readdir, stat} from 'fs/promises';
import {tmpdir} from 'os';
import path from 'path';
import childProcess from 'child_process';
import {getConfig, getYarnPath} from './config';
import {existsSync, readdirSync, statSync} from 'fs';

export interface Module {
  'template-handlers': () => string;
}

export interface Plugin {
  name: string;
  directory: string;
  module: Module;
}

const pluginMap: Record<string, Plugin> | undefined = {};

const installPluginToTmpDir = async (pluginLookupName: string) => {
  return new Promise<{tmpDir: string}>(async (resolve, reject) => {
    console.log(`[plugins] Installing ${pluginLookupName}`);

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

        pluginMap[pluginJson.name] = {
          module,
          name: pluginJson.name,
          directory: modulePath,
        };

        console.log(`[plugin] Loaded ${pluginJson.name} from ${modulePath}`);
      } catch (err) {
        console.log(err);
        throw Error(`Failed to load plugin: ${filename}`);
      }
    }
    // const folders = (await readdir(path)).filter((f) =>
    //   f.startsWith("shc-plugin-"),
    // );
    // console.log(
    //   "[plugin] Loading",
    //   folders.map((f) => f.replace("shc-plugin-", "")).join(", "),
    // );
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
  const config = getConfig();

  // TODO: Validate plugin which will get some info on it like moduleName - somehow
  let moduleName = plugin;
  if (!plugin.startsWith('@') && plugin.includes('@')) {
    moduleName = plugin.split('@')[0];
  }

  const {tmpDir} = await installPluginToTmpDir(plugin);

  const pluginDir = path.join(config.pluginDirectory, moduleName);
  console.log(`[plugins] Moving plugin from ${tmpDir} to ${pluginDir}`);
  await cp(path.join(tmpDir, moduleName), pluginDir, {
    recursive: true,
    verbatimSymlinks: true,
  });

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

export const loadPlugins = async (force?: boolean) => {
  if (Object.keys(pluginMap).length === 0 || force) {
    const dirs = await findAllPluginDirs();
    await resolvePlugins(dirs);
  }

  return pluginMap;
};
