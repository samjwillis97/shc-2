// See: https://github.com/microsoft/appcenter-cli/blob/63721b0af8e9326c14149ea5c7c0d5ca243c3f1d/src/util/commandline/autocomplete.ts#L147

const autoCompleteTree: AutocompleteTree = {
  run: [
    { long: "--config", short: "-c" },
    { long: "--set", short: "-s" },
  ],
};

export const globalAutoCompleteHandler = (
  _: string,
  data: {
    before: string;
    fragement: string;
    line: string;
    reply: (answer: any) => void;
  },
) => {
  const { line, reply } = data;
  const argsLine = line.substring("shc-cli".length);
  const args = argsLine.match(/\S+/g) || [];
  const finalCharacter = line.charAt(line.length - 1);
  const lineEndsWithWhitespaceChar = /\s{1}/.test(finalCharacter);
  const getReply = getReplyHandler(lineEndsWithWhitespaceChar);
  reply(getReply(args, autoCompleteTree));
};

const getReplyHandler = (
  lineEndsWithWhitespaceChar: boolean,
): ((args: string[], autocompleteTree: AutocompleteTree) => string[]) => {
  return function getReply(
    args: string[],
    autocompleteTree: AutocompleteTree,
  ): string[] {
    const currentArg = args[0];
    const commandsAndCategories = Object.keys(autocompleteTree);

    if (currentArg === undefined) {
      // no more args - show all of the items at current level
      return commandsAndCategories;
    }

    const entity = autoCompleteTree[currentArg];
    if (entity) {
      // arg points to an existing command or category
      const restOfArgs = args.slice(1);
      if (restOfArgs.length || lineEndsWithWhitespaceChar) {
        if (Array.isArray(entity)) {
          const getCommandReply = getCommandReplyHandler(
            lineEndsWithWhitespaceChar,
          );
          return getCommandReply(restOfArgs, entity);
        } else {
          return getReply(restOfArgs, entity);
        }
      } else {
        // if last arg has no trailing whitespace, it should be added
        return [currentArg];
      }
    } else {
      // arg points to nothing specific - return commands and categories which start with arg
      return commandsAndCategories.filter((commandOrCategory) =>
        commandOrCategory.startsWith(currentArg),
      );
    }

    return [];
  };
};

const getCommandReplyHandler = (
  lineEndsWithWhitespaceChar: boolean,
): ((args: string[], optionNames: OptionNames[]) => string[]) => {
  return function getCommandReply(
    args: string[],
    optionNames: OptionNames[],
  ): string[] {
    const currentArg = args[0];
    if (currentArg === undefined) {
      // no more args, returning remaining option OptionNames
      return optionNames.map((option) => option.long ?? option.short ?? "");
    } else {
      const restOfArgs = args.slice(1);
      if (restOfArgs.length || lineEndsWithWhitespaceChar) {
        const filteredOptions = optionNames.filter(
          (option) => option.long !== currentArg && option.short !== currentArg,
        );
        return getCommandReply(restOfArgs, filteredOptions);
      } else {
        const candidates: string[] = [];
        for (const option of optionNames) {
          if (option.long && option.long.startsWith(currentArg)) {
            candidates.push(option.long);
          } else if (option.short && option.short.startsWith(currentArg)) {
            candidates.push(option.short);
          }
        }
        return candidates;
      }
    }
  };
};

interface OptionNames {
  short?: string;
  long?: string;
}

interface AutocompleteTree {
  [entity: string]: AutocompleteTree | OptionNames[];
}
