export const globalAutoCompleteHandler = (
  fragment: string,
  data: {
    before: string;
    fragement: string;
    line: string;
    reply: (answer: any) => void;
  },
) => {
  console.log(data);
  const { line, reply } = data;
  const argsLine = line.substring("shc-cli".length);
  const args = argsLine.match(/\S+/g) || [];
  const lineEndsWithWhitespaceChar = /\s{1}/.test(line.substring(-1, 1));
  console.log(args);
  console.log(lineEndsWithWhitespaceChar);
  data.reply([]);
};
