import { Command } from "commander";
import { workspaceCompletionHandler } from "./completions/workspace";
import { endpointCompletionHandler } from "./completions/endpoint";
import { runHandler } from "./handlers/run";
const omelette = require("omelette");

const completion = omelette("shc run <workspace> <endpoint>");
completion.on("workspace", workspaceCompletionHandler);
completion.on("endpoint", endpointCompletionHandler);
completion.init();

const program = new Command();
program.name("shc").description("Sams HTTP client");
program.option("-c, --config <file>", "specify config json", "config.json");
program.command("run <workspace> <endpoint>").action(runHandler);
program.parse();
