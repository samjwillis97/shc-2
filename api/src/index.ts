import {readFileSync} from 'fs';
// import {installPlugin, loadPlugins} from './plugins';
// import {mergeConfigsToRunnerParams, resolveImports, WorkspaceConfigSchema} from './config';
import {cwd} from 'process';
import path from 'path';
import {resolveImports, WorkspaceConfigSchema} from './config';

const run = async () => {
  const configPath = path.join(cwd(), 'example-configs/workspace.json');
  const workspaceConfigFile = readFileSync(configPath, 'utf8');
  const workspaceConfigParsed = WorkspaceConfigSchema.safeParse(JSON.parse(workspaceConfigFile));
  if (workspaceConfigParsed.success === false) {
    throw new Error('Failed to read workspace config');
  }

  const workspaceConfig = workspaceConfigParsed.data;

  resolveImports(configPath, workspaceConfig);

  return;

  // // TODO: Maybe automate some of the plugin stuff when parsing the config?
  // if (workspaceConfig.plugins) {
  //   for (const plugin of workspaceConfig.plugins) {
  //     await installPlugin(plugin);
  //   }
  //   // const plugins = await loadPlugins();
  //   await loadPlugins();
  // }

  // const selectedEndpoint = workspaceConfig.endpoints?.getSomething;

  // if (!selectedEndpoint) {
  //   throw new Error('Missing endpoint');
  // }

  // const runParams = mergeConfigsToRunnerParams(workspaceConfig, selectedEndpoint);
  // console.log(runParams);

  // // myPlugin.default();
};

run().then();
