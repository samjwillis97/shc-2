import { Command } from "commander";
const program = new Command();

program.name("shc").description("Sams HTTP client");

program.option("-c", "--collection <file>", "collection.json");
program.option("-w", "--workspace <file>", "workspace.json");

program.parse();

const opts = program.opts();
console.log(opts);
