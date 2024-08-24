import {getPlugin} from './plugins';
import {getVariable} from './variables';

export const resolveTemplates = <T extends object | string>(thing: T): T => {
  if (thing === undefined || thing === null) return thing;
  switch (typeof thing) {
    case 'string':
      // @ts-expect-error - IDK this is so painful
      thing = resolveTemplateInString(thing);
      break;
    case 'object':
      if (Array.isArray(thing)) {
        // @ts-expect-error - IDK this is so painful
        thing = thing.map((v) => resolveTemplates(v));
      } else {
        for (const key of Object.keys(thing) as Array<keyof typeof thing>) {
          // @ts-expect-error - IDK this is so painful
          thing[key] = resolveTemplates(thing[key]);
        }
      }
      break;
  }

  return thing;
};

export const resolveTemplateInString = (str: string): string => {
  return str.replace(/{{(.*?)}}/g, (_, key: string) => {
    if (key.includes('.')) {
      const [pluginName, methodName] = key.split('.');
      const plugin = getPlugin(pluginName);

      const method = plugin.module['template-handlers'][methodName];
      if (!method) throw new Error(`Failed to find method or something: ${methodName}`);

      return method();
    }

    return getVariable(key) ?? '';
  });
};
