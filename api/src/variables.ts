import {resolveTemplateInString} from './templates';
import {ResolvedConfig} from './types';

let variables: Record<string, string> = {};

export const extractVariables = (config: ResolvedConfig) => {
  if (config.variables) {
    variables = config.variables;
  }

  return variables;
};

export const getVariable = (variable: string) => {
  const value = variables[variable];
  if (!value) {
    throw new Error(`Unable to get variable: ${variable}`);
  }

  return resolveTemplateInString(value);
};
