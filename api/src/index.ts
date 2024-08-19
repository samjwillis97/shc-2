import {installPlugin, loadPlugins} from './plugins';

const pluginMap: Record<string, Plugin> = {};

const pluginName = 'shc-plugin-test'; // FIXME: This should be derived
const pluginToInstall = '/Users/samwillis/code/github.com/samjwillis97/shc-2/plugins/shc-plugin-test';
// "/Users/samuel.willis/code/github.com/samjwillis97/shc-2/main/plugins/shc-plugin-test";

// addPlugin(plugin).then((result) => console.log(result));
const run = async () => {
  await installPlugin(pluginToInstall);

  const plugins = await loadPlugins();

  const myPlugin = plugins['shc-plugin-test'].module;

  myPlugin.default();
};

run().then();
