import {type PathOrFileDescriptor, type PathLike} from 'fs';

export interface FileOps {
  cp: (source: string, destination: string) => void;
  rmrf: (path: PathLike) => void;
  isDir: (path: PathLike) => boolean;
  exists: (path: PathLike) => boolean;
  mkDirRecursive: (path: PathLike) => void;
  readDir: (path: PathLike) => string[];
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
