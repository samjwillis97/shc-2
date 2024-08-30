import {type PathOrFileDescriptor, type PathLike} from 'fs';

export interface FileOps {
  exists: (path: PathLike) => boolean;

  readDir: (path: PathLike) => string[];

  isDir: (path: PathLike) => boolean;

  readFile: (path: PathOrFileDescriptor) => string;
}

let fileOperators: FileOps | undefined = undefined;

export const getFileOps = () => {
  if (!fileOperators) throw new Error('No file operators set');
  return fileOperators;
};

export const setFileOps = (ops: FileOps) => {
  fileOperators = ops;
};
