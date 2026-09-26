import {readdir, writeFile} from 'node:fs/promises';
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
await writeFile(join(root,'asset-manifest.json'),JSON.stringify(assets));
