import {readFileSync} from 'fs';
import {cleanPluginDir, installPlugin, loadPlugins, loadVariableGroups} from './plugins';
import {cwd} from 'process';
import path from 'path';
import {ConfigImport, WorkspaceConfig, WorkspaceConfigSchema} from './types';
import {mergeWorkspaceAndEndpointConfig, resolveImports} from './config';
import {extractVariables} from './variables';
import {createRunnerContext, run as execute} from './runner';

const run = async () => {
  const configPath = path.join(cwd(), 'example-configs/workspace.json');
  const workspaceConfigFile = readFileSync(configPath, 'utf8');
  const workspaceConfigParsed = WorkspaceConfigSchema.safeParse(JSON.parse(workspaceConfigFile));
  if (workspaceConfigParsed.success === false) {
    throw new Error('Failed to read workspace config');
  }

  let workspaceConfig: ConfigImport | WorkspaceConfig = workspaceConfigParsed.data;
  workspaceConfig = resolveImports(configPath, workspaceConfig);
  const selectedEndpoint = workspaceConfig.endpoints?.getSomething;
  if (!selectedEndpoint) {
    throw new Error('Missing endpoint');
  }
  const mergedConfig = mergeWorkspaceAndEndpointConfig(workspaceConfig, selectedEndpoint);
  extractVariables(mergedConfig.variables);

  // TODO: Maybe automate some of the plugin stuff when parsing the config?
  await cleanPluginDir();
  if (workspaceConfig.plugins) {
    for (const plugin of workspaceConfig.plugins) {
      await installPlugin(plugin);
    }
    await loadPlugins(workspaceConfig.pluginConfig);
  }

  loadVariableGroups(workspaceConfig.variableGroups);

  const runnerContext = createRunnerContext(mergedConfig);
  execute(runnerContext);

  // myPlugin.default();
};

run().then();
