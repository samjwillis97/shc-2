import path from 'path';
import {readFileSync} from 'fs';
import merge from 'deepmerge';
import {ConfigImport, ConfigImportSchema, WorkspaceConfig, ResolvedConfig} from './types';

export const resolveImports = (configPath: string, config: WorkspaceConfig | ConfigImport): ResolvedConfig => {
  const configDirectory = configPath.substring(0, configPath.lastIndexOf(path.sep));
  if (!config.imports) return config;
  for (const toImport of config.imports) {
    const importPath = path.join(configDirectory, toImport);
    const imported = readFileSync(importPath, 'utf8');
    const parsedImport = ConfigImportSchema.safeParse(JSON.parse(imported));
    if (parsedImport.success === false) {
      throw new Error('Failed to parse import');
    }

    let importConfig = parsedImport.data;

    if (importConfig.imports) {
      importConfig = resolveImports(importPath, importConfig);
    }
    delete importConfig.imports;

    config = merge(config, importConfig);
  }

  return config;
};
