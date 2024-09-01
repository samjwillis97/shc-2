import {
  getConfig,
  getFileOps,
  getKnownWorkspaces,
  resolveImports,
  WorkspaceConfigSchema,
} from "shc-api";
import { defaultConfigFile, initNodeJsFileOpts } from "../utils";

export const endpointCompletionHandler = ({
  before,
  reply,
}: {
  before: string;
  reply: (arg: string[]) => void;
}) => {
  initNodeJsFileOpts();

  getConfig(defaultConfigFile());

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
