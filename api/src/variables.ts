import {resolveTemplateInString} from './templates';

let variables: Record<string, string> = {};

export const extractVariables = (configVariables?: Record<string, string>) => {
  if (configVariables) {
    variables = configVariables;
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
