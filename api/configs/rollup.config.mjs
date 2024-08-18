import typescript from '@rollup/plugin-typescript';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'lib/index.mjs',
        format: 'es',
        sourcemap: false,
        exports: 'named',
      },
      {
        file: 'lib/index.umd.js',
        name: 'Shc',
        format: 'umd',
        sourcemap: false,
        exports: 'named',
      },
    ],
    plugins: [
      typescript({
        tsconfig: './configs/tsconfig.esm.json',
        sourceMap: false,
      }),
    ],
  },
];
