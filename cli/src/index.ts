import { program } from "commander";
import { workspaceCompletionHandler } from "./completions/workspace";
import { endpointCompletionHandler } from "./completions/endpoint";
import { runHandler } from "./handlers/run";
import { listHandler } from "./handlers/list";
import { defaultConfigFile } from "./utils";
const omelette = require("omelette");

const completion = omelette("shc-cli run <workspace> <endpoint>");
completion.on("workspace", workspaceCompletionHandler);
completion.on("endpoint", endpointCompletionHandler);
completion.init();

// TODO: OVerride flag for variables/templates/etc
program.name("shc-cli").description("Sams HTTP client");
program.option(
  "-c, --config <file>",
  "specify config json",
  defaultConfigFile(),
);
program.command("run <workspace> <endpoint>").action(runHandler);
program.command("list <object>").action(listHandler);
program.parse();
