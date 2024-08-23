import {getPlugin} from './plugins';
import {getVariable} from './variables';

export const resolveTemplateInString = (str: string): string => {
  return str.replace(/{{(.*?)}}/g, (_, key: string) => {
    console.log(`Found: ${key}`);
    if (key.includes('.')) {
      console.log(`Resolve plugin: ${key}`);
      const [pluginName, methodName] = key.split('.');
      const plugin = getPlugin(pluginName);

      if (!plugin) throw new Error('Failed to get plugin or something');

      const method = plugin.module['template-handlers'][methodName];
      if (!method) throw new Error('Failed to find method or something');

      return method();
    }

    return getVariable(key) ?? '';
  });
};
