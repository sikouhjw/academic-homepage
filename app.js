/* Academic Homepage v2. Citation.js 0.7.20 browser build. */
const CONFIG = {
  displayMode: 'chronological', // 'chronological' or 'grouped'
  citationMode: 'ieee',         // 'ieee' or 'custom'
  cslStyle: 'ieee',
  myNames: ['Junwei He', 'J. He', '何骏炜'],
  // Settings for custom formatter; this is not the official IEEE CSL format.
  custom: { boldTitle: false, italicVenue: true, showDOI: false }
};
const GROUP_NAMES = {
  journal: 'Journal Papers', conference: 'Conference Papers',
  preprint: 'Preprints', thesis: 'Theses', other: 'Other Publications'
};
function E(tag, cls, value) {
  const n=document.createElement(tag);
  if(cls) n.className=cls;
  if(value!==undefined) n.textContent=value;
  return n;
}
function safeUrl(value) {
  if(!value) return null;
  try { const u=new URL(String(value), location.href); return /^(https?:)$/.test(u.protocol)?u.href:null; }
  catch { return null; }
}
function doiUrl(value) {
  if(!value) return null;
  const v=String(value).trim();
  const doi=v.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').replace(/^doi:\s*/i,'');
  return safeUrl('https://doi.org/'+encodeURI(doi));
}
function year(item) { return Number(item.issued?.['date-parts']?.[0]?.[0] || 0); }
function dateKey(item) {
  const d=item.issued?.['date-parts']?.[0] || [];
  return (Number(d[0])||0)*10000 + (Number(d[1])||0)*100+(Number(d[2])||0);
}
function group(item) {
  if(item.type==='article-journal') return 'journal';
  if(item.type==='paper-conference') return 'conference';
  if(item.type==='thesis') return 'thesis';
  if(['article','manuscript','report','posted-content'].includes(item.type)) return 'preprint';
  return 'other';
}
function addAction(root,label,raw) {
  const url=label.toLowerCase()==='doi' ? doiUrl(raw) : safeUrl(raw);
  if(!url) return;
  const a=E('a','',label); a.href=url; a.target='_blank'; a.rel='noopener noreferrer';
  root.append(a);
}
function renderIeee(Cite,item) {
  const wrapper=E('div','pub-citation');
  const rendered=new Cite([item]).format('bibliography', {
    format:'html',template:CONFIG.cslStyle,lang:'en-US',nosort:true
  });
  wrapper.innerHTML=rendered;
  // Citation.js treats each single-item bibliography as [1]. Remove CSL numbering;
  // the global descending number is rendered separately by the site.
  wrapper.querySelectorAll('.csl-left-margin').forEach(x=>x.remove());
  const entry=wrapper.querySelector('.csl-entry');
  if(entry) {
    entry.innerHTML=entry.innerHTML.replace(/^\s*(?:\[\s*1\s*\]\s*|<span[^>]*>\s*\[\s*1\s*\]\s*<\/span>\s*)/i,'');
  }
  return wrapper;
}
function personName(p) {
  if(p.literal) return p.literal;
  return [p.given,p.family].filter(Boolean).join(' ');
}
function renderCustom(item) {
  const root=E('div','pub-citation');
  const authors=(item.author||[]).map(personName);
  const names=authors.map(name=>{
    const n=E(CONFIG.myNames.some(s=>s.toLowerCase()===name.toLowerCase())?'strong':'span','',name);
    return n;
  });
  names.forEach((n,i)=>{
    if(i) root.append(document.createTextNode(i===names.length-1 ? (names.length===2?' and ':', and ') : ', '));
    root.append(n);
  });
  if(names.length) root.append(document.createTextNode(', '));
  const title=E(CONFIG.custom.boldTitle?'strong':'span','', '“'+(item.title||'Untitled')+'”');
  root.append(title);
  const venue=item['container-title'] || item.publisher || '';
  if(venue) {
    root.append(document.createTextNode(', '));
    root.append(E(CONFIG.custom.italicVenue?'em':'span','',Array.isArray(venue)?venue.join(', '):venue));
  }
  const details=[];
  if(item.volume) details.push('vol. '+item.volume);
  if(item.issue) details.push('no. '+item.issue);
  if(item.page) details.push('pp. '+String(item.page).replace(/--/g,'–'));
  if(year(item)) details.push(String(year(item)));
  if(details.length) root.append(document.createTextNode(', '+details.join(', ')));
  if(CONFIG.custom.showDOI && item.DOI) root.append(document.createTextNode(', doi: '+item.DOI));
  root.append(document.createTextNode('.'));
  return root;
}
function createRow(Cite,item,index,links){
  const row=E('article','pub');
  const num=E('span','pub-number','['+index+']');
  const citation=CONFIG.citationMode==='custom'?renderCustom(item):renderIeee(Cite,item);
  const actions=E('div','pub-links');
  const more=links[item.id] || {};
  // Extra link labels in links.json are fully dynamic, case-insensitive, including arXiv/WOS.
  const combined={...more};
  const hasDOI=Object.keys(combined).some(k=>k.toLowerCase()==='doi');
  if(item.DOI && !hasDOI) combined.DOI=item.DOI;
  if(item.URL && !Object.keys(combined).some(k=>k.toLowerCase()==='paper')) combined.Paper=item.URL;
  Object.entries(combined).forEach(([label,url])=>addAction(actions,label,url));
  const copy=E('button','','BibTeX'); copy.type='button';
  copy.addEventListener('click',async()=>{
    const b=new Cite([item]).format('bibtex');
    try { await navigator.clipboard.writeText(b); copy.textContent='Copied'; }
    catch { window.prompt('Copy BibTeX:',b); }
  });
  actions.append(copy);
  const body=E('div','pub-body'); body.append(citation,actions);
  row.append(num,body);
  return row;
}
async function main(){
  const root=document.getElementById('publication-list');
  try {
    const [br,lr]=await Promise.all([
      fetch('./publications.bib',{cache:'no-store'}),
      fetch('./links.json',{cache:'no-store'})
    ]);
    if(!br.ok) throw Error('publications.bib HTTP '+br.status);
    if(!lr.ok) throw Error('links.json HTTP '+lr.status);
    const [bib,links]=await Promise.all([br.text(),lr.json()]);
    const Cite=window.Cite;
    if(!Cite) throw Error('Citation.js not available. Check the CDN.');
    const entries=new Cite(bib).data;
    entries.sort((a,b)=>dateKey(b)-dateKey(a)||String(a.title||'').localeCompare(String(b.title||'')));
    root.replaceChildren();
    const numbered=new Map(entries.map((e,i)=>[e.id,entries.length-i]));
    if(CONFIG.displayMode==='grouped') {
      for(const type of Object.keys(GROUP_NAMES)) {
        const subset=entries.filter(e=>group(e)===type);
        if(!subset.length) continue;
        root.append(E('h3','',GROUP_NAMES[type]));
        subset.forEach(e=>root.append(createRow(Cite,e,numbered.get(e.id),links)));
      }
    } else {
      entries.forEach(e=>root.append(createRow(Cite,e,numbered.get(e.id),links)));
    }
    if(!entries.length) root.append(E('p','','No publications found.'));
  } catch(err) {
    root.replaceChildren(E('p','error','Cannot display publications: '+err.message));
    console.error(err);
  }
}
document.addEventListener('DOMContentLoaded',main);
