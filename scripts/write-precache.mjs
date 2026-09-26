import {readdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join, relative, sep} from 'node:path';

const root = 'dist';
async function files(directory){
  const entries = await readdir(directory,{withFileTypes:true});
  const result = [];
  for(const entry of entries){
    const path=join(directory,entry.name);
    if(entry.isDirectory())result.push(...await files(path));
    else if(entry.isFile()&&/\.(js|css)$/.test(entry.name))result.push('/'+relative(root,path).split(sep).join('/'));
  }
  return result;
}
const assets=(await files(join(root,'assets'))).sort();
const manifest=JSON.stringify(assets);
await writeFile(join(root,'asset-manifest.json'),manifest);
const version=createHash('sha256').update(manifest).digest('hex').slice(0,12);
const worker=await readFile(join(root,'sw.js'),'utf8');
if(!worker.includes('__ASSET_MANIFEST_VERSION__'))throw Error('Falta el marcador de versión de la PWA.');
await writeFile(join(root,'sw.js'),worker.replaceAll('__ASSET_MANIFEST_VERSION__',version));
