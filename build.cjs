const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const work = __dirname;
const out = __dirname;
(async () => {
  const result = await esbuild.build({
    absWorkingDir: work,
    entryPoints: ['source/main.mjs','source/catalog.mjs','source/gallery.mjs'],
    outdir: path.join(out,'assets/js'),
    bundle: true, splitting: true, format: 'esm', minify: true,
    target: ['es2020'], entryNames: '[name]-[hash]', chunkNames: 'shared-[hash]', metafile: true,
    legalComments: 'linked'
  });
  for (const [output, metadata] of Object.entries(result.metafile.outputs)) {
    if (!metadata.entryPoint || !output.endsWith('.js')) continue;
    const name = path.basename(metadata.entryPoint, '.mjs');
    const htmlPath = path.join(out, name === 'main' ? 'index.html' : 'pages/' + name + '.html');
    const source = fs.readFileSync(htmlPath, 'utf8');
    const pattern = new RegExp('((?:\\.\\./)?assets/js/)' + name + '(?:-[A-Z0-9]+)?\\.js', 'g');
    fs.writeFileSync(htmlPath, source.replace(pattern, '$1' + path.basename(output)));
  }
  for (const file of fs.readdirSync(path.join(work,'source')).filter(x=>x.endsWith('.js'))) {
    const result = await esbuild.transform(fs.readFileSync(path.join(work,'source',file),'utf8'),{loader:'js',minify:true,target:'es2020'});
    fs.writeFileSync(path.join(out,'assets/js',file),result.code);
  }
  for (const file of fs.readdirSync(path.join(out,'assets/css'))) {
    const result = await esbuild.transform(fs.readFileSync(path.join(out,'assets/css',file),'utf8'),{loader:'css',minify:true});
    fs.writeFileSync(path.join(out,'assets/css',file),result.code);
  }
  fs.writeFileSync(path.join(work,'build-meta.json'),JSON.stringify(result.metafile,null,2));
  const jsDir = path.join(out,'assets/js');
  const keep = new Set(Object.keys(result.metafile.outputs).map((file) => path.basename(file)));
  keep.add('main-init-1.js');
  keep.add('catalog-init-1.js');
  keep.add('gallery-init-1.js');
  for (const file of fs.readdirSync(jsDir)) {
    if (!/^(main|catalog|gallery|shared)-[A-Z0-9]+\.js(?:\.map)?$/.test(file)) continue;
    if (!keep.has(file) && !keep.has(file.replace(/\.map$/, ''))) fs.unlinkSync(path.join(jsDir, file));
  }
  console.log('Built three shared 3D modules, initialization scripts, and static CSS.');
})();
