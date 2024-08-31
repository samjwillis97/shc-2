import { getConfig, getKnownWorkspaces, ShcApiConfig } from "shc-api";
import { getCwd, initNodeJsFileOpts } from "../utils";
import { resolve } from "path";

export const workspaceCompletionHandler = ({
  reply,
}: {
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

  reply(Object.keys(getKnownWorkspaces()));
};
