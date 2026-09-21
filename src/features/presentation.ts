import type { Category } from '../data';
const palette:Record<Category,string> = {Vivienda:'#839c86',Alimentación:'#b9a876',Transporte:'#a98c7b',Compras:'#b18b91',Ocio:'#8e96bb',Salud:'#85aba6',Suscripciones:'#b69dbe',Otros:'#aaa9a0'};
const symbols:Record<Category,string> = {Vivienda:'⌂',Alimentación:'◈',Transporte:'↗',Compras:'◇',Ocio:'✳',Salud:'✚',Suscripciones:'⊞',Otros:'••'};
const fallback=['#839c86','#b9a876','#a98c7b','#b18b91','#8e96bb','#85aba6','#b69dbe','#aaa9a0'];
export const colorFor=(category:string)=>palette[category]??fallback[[...category].reduce((a,c)=>a+c.charCodeAt(0),0)%fallback.length];
export const symbolFor=(category:string)=>symbols[category]??'◈';
