import { mkdir } from "node:fs/promises";
import childProcess from "child_process";
import { tmpdir } from "os";
import path from "path";
import { dirname } from "node:path";

console.log("Hello, World!");

const pluginPath =
  "/Users/samwillis/code/github.com/samjwillis97/shc-2/plugins/";

const plugin = pluginPath + "shc-test-plugin";

const installPlugin = async (plugin: string) => {
  const tmpDir = path.join(tmpdir(), `${plugin}`);
  await mkdir(tmpDir, { recursive: true });
  console.log();
  console.log(process.execPath);
  console.log(getYarnPath());
  console.log(`installing: ${plugin}`);
  childProcess.execFile(process.execPath, []);
};

const loadPlugin = async (path: string) => {
  console.log("adding plugin", path);

  return "result";
};

const getAppDir = () => {
  const dir = require.main?.filename;
  if (!dir) throw new Error("IDK something");
  return dirname(dir);
};

// const getAppEnvironment = () => process.env.SHC_ENV || "production";
// const isDevelopment = () => getAppEnvironment() === "development";

function getYarnPath() {
  return path.resolve(getAppDir(), "../bin/yarn-standalone.js");
  //   // TODO: This is brittle. Make finding this more robust.
  //   if (isDevelopment()) {
  //     return path.resolve(app.getAppPath(), "./bin/yarn-standalone.js");
  //   } else {
  //     return path.resolve(app.getAppPath(), "../bin/yarn-standalone.js");
  //   }
}

// addPlugin(plugin).then((result) => console.log(result));

installPlugin(plugin).then(() => {
  loadPlugin(plugin);
});
