import { getConfig, getKnownWorkspaces } from "shc-api";
import { initNodeJsFileOpts } from "../utils";
import { program } from "commander";

export const listHandler = async (object: string) => {
  const options = program.optsWithGlobals();

  initNodeJsFileOpts();
  getConfig(options.config);

  switch (object) {
    case "workspaces":
      Object.keys(getKnownWorkspaces()).forEach((v) => console.log(v + "\n"));
      break;
  }
};
