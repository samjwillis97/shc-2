import {
  cleanPluginDir,
  createRunnerContext,
  extractVariables,
  installPlugin,
  loadPlugins,
  loadVariableGroups,
  mergeWorkspaceAndEndpointConfig,
  resolveImports,
  run,
  WorkspaceConfigSchema,
  getConfig,
  getKnownWorkspaces,
} from "shc-api";
import { defaultConfigFile, initNodeJsFileOpts } from "../utils";

export const runHandler = async (workspace: string, endpoint: string) => {
  const fileOperations = initNodeJsFileOpts();

  getConfig(defaultConfigFile());

  const workspaces = getKnownWorkspaces();
  if (!workspaces[workspace])
    throw new Error(`Cannot find worksapce ${workspace}`);

  const workspacePath = workspaces[workspace];

  const workspaceConfigFile = fileOperations.readFile(workspacePath);
  const workspaceConfigParsed = WorkspaceConfigSchema.parse(
    JSON.parse(workspaceConfigFile),
  );

  // FIXME: need a first arg or something, like run, so then I can have a list command etc, I mean maybe just a `-l` flag

  const resolvedConfig = resolveImports(workspacePath, workspaceConfigParsed);
  if (!resolvedConfig.endpoints?.[endpoint])
    throw new Error("Endpoints not found");

  const selectedEndpoint = resolvedConfig.endpoints[endpoint];
  const mergedConfig = mergeWorkspaceAndEndpointConfig(
    resolvedConfig,
    selectedEndpoint,
  );

  extractVariables(mergedConfig.variables);

  await cleanPluginDir();
  if (mergedConfig.plugins) {
    for (const plugin of mergedConfig.plugins) {
      await installPlugin(plugin);
    }
    await loadPlugins(mergedConfig.pluginConfig);
  }

  loadVariableGroups(mergedConfig.variableGroups);

  const runnerContext = createRunnerContext(mergedConfig);
  const response = await run(runnerContext);
  console.log(JSON.stringify(response, null, 2));
};
