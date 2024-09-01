import { getConfig, getKnownWorkspaces } from "shc-api";
import { defaultConfigFile, initNodeJsFileOpts } from "../utils";

export const workspaceCompletionHandler = ({
  reply,
}: {
  reply: (arg: string[]) => void;
}) => {
  initNodeJsFileOpts();
  getConfig(defaultConfigFile());
  reply(Object.keys(getKnownWorkspaces()));
};
