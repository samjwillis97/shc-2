import {
  getConfig,
  getFileOps,
  getKnownWorkspaces,
  resolveImports,
  ShcApiConfig,
  WorkspaceConfigSchema,
} from "shc-api";
import { getCwd, initNodeJsFileOpts } from "../utils";
import { resolve } from "path";

export const endpointCompletionHandler = ({
  before,
  reply,
}: {
  before: string;
  reply: (arg: string[]) => void;
}) => {
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
};
