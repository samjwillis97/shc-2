import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "fs";

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
  setFileOps,
  run,
  WorkspaceConfigSchema,
  getConfig,
  ShcApiConfig,
  getKnownWorkspaces,
} from "shc-api";
import { Command } from "commander";
import { resolve, dirname } from "path";
const omelette = require("omelette");

const program = new Command();

const initNodeJsFileOpts = () => {
  setFileOps({
    cp: (source, dest) =>
      cpSync(source, dest, { recursive: true, verbatimSymlinks: true }),
    rmrf: (p) => rmSync(p, { recursive: true, force: true }),
    exists: (p) => existsSync(p),
    isDir: (p) => statSync(p).isDirectory(),
    mkDirRecursive: (p) => mkdirSync(p, { recursive: true }),
    readDir: (p) => readdirSync(p),
    readFile: (p) => readFileSync(p, "utf8"),
  });
};

const getCwd = () => dirname(require.main?.filename ?? ".");

const runHandler = async (workspace: string, endpoint: string) => {
  const opts = program.opts();

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

  console.log(getKnownWorkspaces());

  const fileOperations = getFileOps();
  const workspaceConfigFile = fileOperations.readFile(workspace);
  const workspaceConfigParsed = WorkspaceConfigSchema.parse(
    JSON.parse(workspaceConfigFile),
  );

  // FIXME: need a first arg or something, like run, so then I can have a list command etc, I mean maybe just a `-l` flag

  if (program.args.length === 1) throw new Error("No args provided");

  const resolvedConfig = resolveImports(opts.workspace, workspaceConfigParsed);
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

program.name("shc").description("Sams HTTP client");

program.option("-c, --config <file>", "specify config json", "config.json");

const completion = omelette("shc run <workspace> <endpoint>");
// @ts-ignore
completion.on("workspace", ({ reply }) => {
  initNodeJsFileOpts();

  // TODO: Real config
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

  reply(Object.keys(getKnownWorkspaces()));
});
// @ts-ignore
completion.on("endpoint", ({ before, reply }) => {
  initNodeJsFileOpts();

  // TODO: Real config
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

  const workspace = getKnownWorkspaces()[before];

  if (!workspace) throw new Error(`Cannot find workspace: ${before}`);

  const fileOperations = getFileOps();
  const workspaceConfigFile = fileOperations.readFile(workspace);
  const workspaceConfigParsed = WorkspaceConfigSchema.parse(
    JSON.parse(workspaceConfigFile),
  );
  const resolvedConfig = resolveImports(workspace, workspaceConfigParsed);

  reply(Object.keys(resolvedConfig.endpoints));
});
completion.init();

program.command("run <workspace> <endpoint>").action(runHandler);
program.parse();
