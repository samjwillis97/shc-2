import { getConfig, getKnownWorkspaces } from "shc-api";
import {
  defaultConfigFile,
  initNodeJsFileOpts,
  tryGetConfigFromCmd,
} from "../utils";
import { program } from "commander";

export const workspaceCompletionHandler = ({
  line,
  reply,
}: {
  line: string;
  reply: (arg: string[]) => void;
}) => {
  initNodeJsFileOpts();
  // MAYBE commander can do some of this parsing for me?
  getConfig(tryGetConfigFromCmd(line) ?? defaultConfigFile());
  reply(Object.keys(getKnownWorkspaces()));
};
