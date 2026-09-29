// Render icons/*.svg to PNGs with headless Chrome. usage: node tools/render_icons.js
const puppeteer = require('/workspace/tools/shot/node_modules/puppeteer-core');
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'icons');
const jobs = [['icon.svg','icon-512.png',512],['icon.svg','icon-192.png',192],['icon.svg','apple-touch-icon.png',180],['icon.svg','favicon-32.png',32],
  ['icon-maskable.svg','icon-maskable-512.png',512],['icon-maskable.svg','icon-maskable-192.png',192],['icon-maskable.svg','apple-touch-icon-full.png',180]];
(async () => {
  const b = await puppeteer.launch({executablePath:'/usr/bin/google-chrome', headless:true, args:['--no-sandbox','--disable-gpu']});
  const p = await b.newPage();
  for (const [src,out,size] of jobs) {
    const svg = fs.readFileSync(path.join(dir,src),'utf8');
    await p.setViewport({width:size,height:size,deviceScaleFactor:1});
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ','<svg width="'+size+'" height="'+size+'" ')}</body></html>`);
    await p.screenshot({path:path.join(dir,out), omitBackground:true, clip:{x:0,y:0,width:size,height:size}});
    console.log(out);
  }
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
