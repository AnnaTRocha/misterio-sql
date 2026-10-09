import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build, transform } from 'esbuild';

const output = 'public';
await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'assets'), { recursive: true });

for (const name of (await readdir('.')).filter(name => name.endsWith('.html'))) {
  await writeFile(join(output, name), await readFile(name));
}

for (const name of (await readdir('assets')).filter(name => name.endsWith('.css'))) {
  const source = await readFile(join('assets', name), 'utf8');
  const minified = await transform(source, { loader: 'css', minify: true });
  await writeFile(join(output, 'assets', name), minified.code);
}
await writeFile(join(output, 'assets', 'favicon.svg'), await readFile(join('assets', 'favicon.svg')));
await mkdir(join(output, 'js'), { recursive: true });
await writeFile(join(output, 'js', 'accessibility.js'), await readFile(join('js', 'accessibility.js')));

await build({
  entryPoints: ['js/auth-page.js', 'js/dashboard.js', 'js/phase-router.js', 'js/teacher.js', 'js/change-password.js'],
  outdir: join(output, 'js'),
  entryNames: '[name]',
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  sourcemap: false,
  target: 'es2022',
  logLevel: 'warning'
});

await writeFile(join(output, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
