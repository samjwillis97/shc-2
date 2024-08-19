import {cp, mkdir, readdir, stat} from 'node:fs/promises';
import childProcess from 'child_process';
import {tmpdir} from 'os';
import path from 'path';
import {dirname} from 'node:path';
import {existsSync, readdirSync, statSync} from 'node:fs';

console.log('Hello, World!');

export interface Module {
  default: () => void;
}

export interface Plugin {
  name: string;
  directory: string;
  module: Module;
}

const pluginMap: Record<string, Plugin> = {};

const pluginName = 'shc-plugin-test'; // FIXME: This should be derived
const pluginToInstall = '/Users/samwillis/code/github.com/samjwillis97/shc-2/plugins/shc-plugin-test';
// "/Users/samuel.willis/code/github.com/samjwillis97/shc-2/main/plugins/shc-plugin-test";

const getPluginDirectory = async () => {
  const dir = path.join(
    process.env.APPDATA ||
      (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.local/share'),
    'shc-2',
    'plugins',
  );

  await mkdir(dir, {recursive: true});

  return dir;
};

const installPluginToTmp = async (plugin: string) => {
  return new Promise<{tmpDir: string}>(async (resolve, reject) => {
    console.log(`[plugins] Installing ${plugin}`);

    const tmpDir = path.join(tmpdir(), `${plugin}`);
    await mkdir(tmpDir, {recursive: true});
    // TODO: Work out what each flag actually does
    // Looks to make a package json at tmpdir and install plugin beneath
    return childProcess.execFile(
      process.execPath,
      [
        '--no-deprecation', // Because Yarn still uses `new Buffer()`
        escape(getYarnPath()),
        'add',
        plugin,
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
          reject(new Error(`${plugin} install error: ${err.message}`));
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

// const loadPlugin = async (path: string) => {
//   console.log("loading plugin", path);

//   return "result";
// };

const getAppDir = () => {
  const dir = require.main?.filename;
  if (!dir) throw new Error('IDK something');
  return dirname(dir);
};

// NOTE: Might need to change this path depending on dev/prod
// dev/prod should be determined by app environment
// app environment denoted by SHC_ENV env variable
function getYarnPath() {
  return path.resolve(getAppDir(), '../bin/yarn-standalone.js');
}

const findAllPluginDirs = async () => {
  const pluginDir = await getPluginDirectory();
  await mkdir(pluginDir, {recursive: true});
  return [pluginDir];
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

        const pluginJson = require(packageJsonPath);

        if (!pluginJson.shc) continue;

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

// addPlugin(plugin).then((result) => console.log(result));
const installPlugin = async (plugin: string) => {
  const pluginDir = path.join(await getPluginDirectory(), pluginName);
  const {tmpDir} = await installPluginToTmp(plugin);

  console.log(`[plugins] Moving plugin from ${tmpDir} to ${pluginDir}`);
  await cp(path.join(tmpDir, pluginName), pluginDir, {
    recursive: true,
    verbatimSymlinks: true,
  });

  // Move each dependency into node_modules folder
  const pluginModulesDir = path.join(pluginDir, 'node_modules');
  await mkdir(pluginModulesDir, {recursive: true});
  for (const filename of await readdir(tmpDir)) {
    const src = path.join(tmpDir, filename);
    const file = await stat(src);
    if (filename === pluginName || !file.isDirectory()) {
      continue;
    }

    const dest = path.join(pluginModulesDir, filename);
    await cp(src, dest, {recursive: true, verbatimSymlinks: true});
  }
};

const run = async () => {
  await installPlugin(pluginToInstall);
  const pluginDirs = await findAllPluginDirs();
  await resolvePlugins(pluginDirs);

  const myPlugin = pluginMap['shc-plugin-test'].module;

  myPlugin.default();
};

run().then();
