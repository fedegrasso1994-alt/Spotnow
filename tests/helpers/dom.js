export class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.attributes={};this.value='';this.textContent='';this.scrollTop=0;this.scrollHeight=500;this.clientHeight=200;this.classes=new Set();this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),contains:c=>this.classes.has(c),toggle:(c,on)=>{if(on===undefined)on=!this.classes.has(c);on?this.classes.add(c):this.classes.delete(c);}};}
  set className(v){this.classes=new Set(v.split(' '));} get className(){return [...this.classes].join(' ');}
  append(...items){for(const item of items){if(typeof item==='string')continue;item.remove();item.parentElement=this;this.children.push(item);}}
  prepend(item){this.insertBefore(item,this.children[0]||null);}
  remove(){if(this.parentElement){const parent=this.parentElement;parent.children=parent.children.filter(x=>x!==this);this.parentElement=null;}}
  insertBefore(item,ref){item.remove();item.parentElement=this;const i=this.children.indexOf(ref);this.children.splice(i<0?this.children.length:i,0,item);}
  replaceChildren(...items){this.replacements=(this.replacements||0)+1;for(const child of this.children)child.parentElement=null;this.children=[];this.append(...items);}
  setAttribute(k,v){this.attributes[k]=v;} getAttribute(k){return this.attributes[k];} removeAttribute(k){delete this.attributes[k];}
  matches(selector){if(selector.includes(','))return selector.split(',').some(part=>this.matches(part.trim()));return selector.startsWith('.')?selector.slice(1).split('.').every(c=>this.classes.has(c)):selector.startsWith('#')?this.id===selector.slice(1):selector.toLowerCase()===this.tagName.toLowerCase();}
  querySelectorAll(selector){return this.children.flatMap(c=>[...(c.matches(selector)?[c]:[]),...c.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  addEventListener(type,handler){(this.listeners??={})[type]=handler;} focus(){if(this.ownerDocument)this.ownerDocument.activeElement=this;}
}
export function dom(){
 const elements=new Map();
 const get=id=>{if(!elements.has(id)){const el=new Element();el.id=id;elements.set(id,el);}return elements.get(id);};
 const document={hidden:false,getElementById:get,createElement:tag=>{const el=new Element(tag);el.ownerDocument=document;return el;},querySelectorAll:selector=>Array.from(new Set([...elements.values()].flatMap(el=>[...(el.matches(selector)?[el]:[]),...el.querySelectorAll(selector)]))),querySelector:selector=>document.querySelectorAll(selector)[0]||null,addEventListener(type,handler){(this.listeners??={})[type]=handler;}};
 const screen=id=>{const el=get(id);el.className='screen';return el;};
 const activate=id=>{for(const el of elements.values())if(el.classes.has('screen'))el.classList.toggle('active',el.id===id);};
 return {document,get,screen,activate};
}
export const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
export const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
