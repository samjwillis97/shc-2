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
} from "shc-api";
import { Command } from "commander";
import { resolve, dirname } from "path";

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

const runHandler = async () => {
  const opts = program.opts();

  const fileOperations = getFileOps();
  const workspaceConfigFile = fileOperations.readFile(opts.workspace);
  const workspaceConfigParsed = WorkspaceConfigSchema.parse(
    JSON.parse(workspaceConfigFile),
  );

  // FIXME: need a first arg or something, like run, so then I can have a list command etc, I mean maybe just a `-l` flag
  // NOTE: If workspace is provided, the arg should be the endpoint to be ran

  if (program.args.length === 1) throw new Error("No args provided");
  const endpoint = program.args[1];

  // This will also set config
  getConfig(
    JSON.stringify({
      yarnPath: resolve(
        dirname(require.main?.filename ?? "."),
        "../node_modules/shc-api/bin/yarn-standalone.js",
      ),
    }),
  );

  const resolvedConfig = resolveImports(opts.workspace, workspaceConfigParsed);
  if (!resolvedConfig.endpoints) throw new Error("No endpoints found");

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

initNodeJsFileOpts();

program.name("shc").description("Sams HTTP client");

program.option(
  "-c, --collection <file>",
  "specify collection json",
  "collection.json",
);
program.option(
  "-w, --workspace <file>",
  "specify workspace json",
  "workspace.json",
);

program.command("run").action(runHandler);
program.parse();
