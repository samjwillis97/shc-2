import {readFileSync} from 'fs';
import {cleanPluginDir, installPlugin, loadPlugins} from './plugins';
import {cwd} from 'process';
import path from 'path';
import {ConfigImport, WorkspaceConfig, WorkspaceConfigSchema} from './types';
import {mergeConfigsToRunnerParams, resolveImports} from './config';
import {extractVariables} from './variables';
import {resolveTemplates} from './templates';
import {run as execute} from './runner';

const run = async () => {
  const configPath = path.join(cwd(), 'example-configs/workspace.json');
  const workspaceConfigFile = readFileSync(configPath, 'utf8');
  const workspaceConfigParsed = WorkspaceConfigSchema.safeParse(JSON.parse(workspaceConfigFile));
  if (workspaceConfigParsed.success === false) {
    throw new Error('Failed to read workspace config');
  }

  let workspaceConfig: ConfigImport | WorkspaceConfig = workspaceConfigParsed.data;
  workspaceConfig = resolveImports(configPath, workspaceConfig);
  extractVariables(workspaceConfig);

  // TODO: Maybe automate some of the plugin stuff when parsing the config?
  await cleanPluginDir();
  if (workspaceConfig.plugins) {
    for (const plugin of workspaceConfig.plugins) {
      await installPlugin(plugin);
    }
    await loadPlugins();
  }

  const selectedEndpoint = workspaceConfig.endpoints?.getSomething;

  if (!selectedEndpoint) {
    throw new Error('Missing endpoint');
  }

  const runParams = resolveTemplates(mergeConfigsToRunnerParams(workspaceConfig, selectedEndpoint));
  execute(runParams);

  // myPlugin.default();
};

run().then();
