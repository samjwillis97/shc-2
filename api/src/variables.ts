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
  console.log(`Getting var: ${variable}`);
  variable = variables[variable];
  if (!variable) {
    return '';
  }
  return resolveTemplateInString(variable);
};
