import {readFileSync} from 'fs';
import {installPlugin, loadPlugins} from './plugins';
import {WorkspaceConfigSchema} from './config';

const run = async () => {
  const workspaceConfigFile = readFileSync('./example-configs/workspace.json', 'utf8');
  const workspaceConfigParsed = WorkspaceConfigSchema.safeParse(JSON.parse(workspaceConfigFile));
  if (workspaceConfigParsed.success === false) {
    throw new Error('Failed to read workspace config');
  }

  const workspaceConfig = workspaceConfigParsed.data;

  for (const plugin of workspaceConfig.plugins) {
    await installPlugin(plugin);
  }

  const plugins = await loadPlugins();
  console.log(plugins);
  const myPlugin = plugins['url-builder'].module;
  console.log(myPlugin);

  // myPlugin.default();
};

run().then();
