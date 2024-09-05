import {cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync} from 'fs';
import {cleanPluginDir, installPlugin, loadPlugins, loadVariableGroups, setCallbacks} from './plugins';
import {ConfigImport, WorkspaceConfig, WorkspaceConfigSchema} from './types';
import {getConfig, getKnownWorkspaces, mergeWorkspaceAndEndpointConfig} from './config';
import {extractVariables} from './variables';
import {createRunnerContext, run as execute} from './runner';
import {resolveImports} from './imports';
import {getFileOps, setFileOps} from './files';

const initNodeJsFileOpts = () => {
  setFileOps({
    cp: (source, dest) => cpSync(source, dest, {recursive: true, verbatimSymlinks: true}),
    rmrf: (p) => rmSync(p, {recursive: true, force: true}),
    exists: (p) => existsSync(p),
    isDir: (p) => statSync(p).isDirectory(),
    mkDirRecursive: (p) => mkdirSync(p, {recursive: true}),
    readDir: (p) => readdirSync(p),
    readFile: (p) => readFileSync(p, 'utf8'),
  });
};

const run = async () => {
  initNodeJsFileOpts();
  const fileOperators = getFileOps();
  setCallbacks({
    stringInput: async () => 'not implemented properly',
  });

  getConfig('../example-configs/config.json');
  const workspaces = getKnownWorkspaces();
  const workspaceConfigPath = workspaces['example-workspace-config'];
  const workspaceConfigFile = fileOperators.readFile(workspaceConfigPath);
  const workspaceConfigParsed = WorkspaceConfigSchema.safeParse(JSON.parse(workspaceConfigFile));
  if (workspaceConfigParsed.success === false) {
    console.error(workspaceConfigParsed.error);
    throw new Error('Failed to read workspace config');
  }

  let workspaceConfig: ConfigImport | WorkspaceConfig = workspaceConfigParsed.data;
  workspaceConfig = resolveImports(workspaceConfigPath, workspaceConfig);
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

  const runnerContext = await createRunnerContext(mergedConfig);
  const response = await execute(runnerContext);
  console.log(JSON.stringify(response, null, 2));
};

run().then();
