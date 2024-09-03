import { program } from "commander";
// import { workspaceCompletionHandler } from "./completions/workspace";
// import { endpointCompletionHandler } from "./completions/endpoint";
import { runHandler } from "./handlers/run";
import { listHandler } from "./handlers/list";
import { defaultConfigFile } from "./utils";
import { globalAutoCompleteHandler } from "./completions";
const omelette = require("omelette");

// TODO: only do completion if called for completion have a look
// at appcenter-cli
const completion = omelette("shc-cli");
completion.on("complete", globalAutoCompleteHandler);

// const completion = omelette("shc-cli run <workspace> <endpoint>");
// completion.on("workspace", workspaceCompletionHandler);
// completion.on("endpoint", endpointCompletionHandler);
completion.init();

// TODO: OVerride flag for variables/templates/etc
program.name("shc-cli").description("Sams HTTP client");
program.option(
  "-c, --config <file>",
  "specify config json",
  defaultConfigFile(),
);
program.option(
  "-s, --set <key=value...>",
  "override a variable",
  defaultConfigFile(),
);
program.command("run <workspace> <endpoint>").action(runHandler);
program.command("list <object>").action(listHandler);
program.parse();
