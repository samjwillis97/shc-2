import {readFileSync} from 'fs';
import {installPlugin} from './plugins';
import {WorkspaceConfigSchema} from './config';

// const pluginMap: Record<string, Plugin> = {};

// const pluginName = 'shc-plugin-test'; // FIXME: This should be derived
// const pluginToInstall = '/Users/samwillis/code/github.com/samjwillis97/shc-2/plugins/shc-plugin-test';
// "/Users/samuel.willis/code/github.com/samjwillis97/shc-2/main/plugins/shc-plugin-test";

// addPlugin(plugin).then((result) => console.log(result));
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

  // await installPlugin(pluginToInstall);

  // const plugins = await loadPlugins();

  // const myPlugin = plugins['shc-plugin-test'].module;

  // myPlugin.default();
};

run().then();
