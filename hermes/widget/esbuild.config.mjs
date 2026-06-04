import esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const isWatch = process.argv.includes('--watch');

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, 'src');
const outDir = join(__dirname, 'public');

mkdirSync(outDir, { recursive: true });

copyFileSync(join(srcDir, 'styles', 'widget.css'), join(outDir, 'widget.css'));

const config = {
  entryPoints: [join(srcDir, 'index.ts')],
  bundle: true,
  minify: true,
  outfile: join(outDir, 'widget.js'),
  target: 'es2020',
  format: 'iife',
  globalName: 'HermesWidget',
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(config);
  console.log(`Widget built: ${join(outDir, 'widget.js')} + ${join(outDir, 'widget.css')}`);
}
