import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "fs";
import { dirname } from "path";
import { FileOps, setFileOps } from "shc-api";

export const defaultConfigFile = () =>
  isDev() ? "../example-configs/config.json" : "$HOME/.config/shc/config.json";

export const isDev = () => process.env["env"] === "DEV";

export const getCwd = () => dirname(require.main?.filename ?? ".");

export const initNodeJsFileOpts = () => {
  const fileOps: FileOps = {
    cp: (source, dest) =>
      cpSync(source, dest, { recursive: true, verbatimSymlinks: true }),
    rmrf: (p) => rmSync(p, { recursive: true, force: true }),
    exists: (p) => existsSync(p),
    isDir: (p) => statSync(p).isDirectory(),
    mkDirRecursive: (p) => mkdirSync(p, { recursive: true }),
    readDir: (p) => readdirSync(p),
    readFile: (p) => readFileSync(p, "utf8"),
  };
  setFileOps(fileOps);
  return fileOps;
};
