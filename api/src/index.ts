import {existsSync, readdirSync, readFileSync, statSync} from 'fs';
import {cleanPluginDir, installPlugin, loadPlugins, loadVariableGroups} from './plugins';
import {cwd} from 'process';
import path from 'path';
import {ConfigImport, WorkspaceConfig, WorkspaceConfigSchema} from './types';
import {mergeWorkspaceAndEndpointConfig} from './config';
import {extractVariables} from './variables';
import {createRunnerContext, run as execute} from './runner';
import {resolveImports} from './imports';
import {getFileOps, setFileOps} from './files';

const initNodeJsFileOpts = () => {
  setFileOps({
    exists: (p) => existsSync(p),
    isDir: (p) => statSync(p).isDirectory(),
    readFile: (p) => readFileSync(p, 'utf8'),
    readDir: (p) => readdirSync(p),
  });
};

const run = async () => {
  initNodeJsFileOpts();
  const fileOperators = getFileOps();

  const configPath = path.join(cwd(), './example-configs/workspace.json');
  const workspaceConfigFile = fileOperators.readFile(configPath);
  const workspaceConfigParsed = WorkspaceConfigSchema.safeParse(JSON.parse(workspaceConfigFile));
  if (workspaceConfigParsed.success === false) {
    throw new Error('Failed to read workspace config');
  }

  let workspaceConfig: ConfigImport | WorkspaceConfig = workspaceConfigParsed.data;
  workspaceConfig = resolveImports(configPath, workspaceConfig);
  const selectedEndpoint = workspaceConfig.endpoints?.queryParamTest;
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
  const response = await execute(runnerContext);
  console.log(JSON.stringify(response, null, 2));
};

run().then();
