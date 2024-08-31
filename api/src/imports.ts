import path from 'path';
import merge from 'deepmerge';
import {ConfigImport, ConfigImportSchema, WorkspaceConfig, ResolvedConfig} from './types';
import {getFileOps} from './files';

// TODO: Seperate Import type for root level
export const resolveImports = (configPath: string, config: WorkspaceConfig | ConfigImport): ResolvedConfig => {
  const fileOperators = getFileOps();
  const configDirectory = configPath.substring(0, configPath.lastIndexOf(path.sep));
  if (!config.imports) return config;
  for (const toImport of config.imports) {
    // FIXME: This will break, it assumes relative path only..
    const importPath = path.join(configDirectory, toImport);
    const imported = fileOperators.readFile(importPath);
    const parsedImport = ConfigImportSchema.safeParse(JSON.parse(imported));
    if (parsedImport.success === false) {
      throw new Error('Failed to parse import');
    }

    let importConfig = parsedImport.data;

    if (importConfig.imports) {
      importConfig = resolveImports(importPath, importConfig);
    }

    importConfig.imports = [];

    config = merge(config, importConfig);
  }

  return config;
};
