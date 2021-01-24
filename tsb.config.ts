import { Config } from '@jakesidsmith/tsb';

const config: Config = {
  main: 'examples/src/index.tsx',
  outDir: 'examples/build',
  indexHTMLPath: 'examples/src/index.html',
  tsconfigPath: 'tsconfig.examples.json',
  clearOutDirBefore: ['build'],
};

export default config;
