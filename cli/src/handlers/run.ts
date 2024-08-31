import {
  cleanPluginDir,
  createRunnerContext,
  extractVariables,
  getFileOps,
  installPlugin,
  loadPlugins,
  loadVariableGroups,
  mergeWorkspaceAndEndpointConfig,
  resolveImports,
  run,
  WorkspaceConfigSchema,
  getConfig,
  ShcApiConfig,
  getKnownWorkspaces,
} from "shc-api";
import { resolve } from "path";
import { getCwd, initNodeJsFileOpts } from "../utils";

export const runHandler = async (workspace: string, endpoint: string) => {
  initNodeJsFileOpts();

  // TODO: Real config
  // This will also set config
  getConfig(
    JSON.stringify({
      workspaces: [
        resolve(getCwd(), "../../api/example-configs/workspace.json"),
      ],
      yarnPath: resolve(
        getCwd(),
        "../node_modules/shc-api/bin/yarn-standalone.js",
      ),
    } as ShcApiConfig),
  );

  const workspaces = getKnownWorkspaces();
  if (!workspaces[workspace])
    throw new Error(`Cannot find worksapce ${workspace}`);

  const workspacePath = workspaces[workspace];

  const fileOperations = getFileOps();
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
