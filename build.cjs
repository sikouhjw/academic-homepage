'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { Cite } = require('@citation-js/core');
require('@citation-js/plugin-bibtex');
require('@citation-js/plugin-csl');

const SETTINGS = {
  citationStyle: 'ieee', // Standard CSL style for journal/conference/thesis
  myNames: ['Junwei He', 'J. He', '何骏炜'],
  showAutomaticDOILink: true,
  includeBibtexButton: true
};
const GROUPS = [
  ['journal', 'Journal Papers'],
  ['conference', 'Conference Papers'],
  ['patent', 'Patents'],
  ['thesis', 'Theses'],
  ['software', 'Software Copyrights']
];
const bib = fs.readFileSync('publications.bib', 'utf8');
const links = JSON.parse(fs.readFileSync('links.json','utf8'));
const meta = JSON.parse(fs.readFileSync('categories.json','utf8'));
const items = new Cite(bib).data;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rawDate = item => item.issued?.['date-parts']?.[0] || [];
const sortDate = item => { const a=rawDate(item); return (+a[0]||0)*10000+(+a[1]||0)*100+(+a[2]||0); };
const person = p => p.literal || [p.given,p.family].filter(Boolean).join(' ');
const firstNames = i => (i.author||[]).map(person).join(', ');
const cleanDOI = raw => String(raw||'').trim().replace(/^doi:\s*/i,'').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'');
function validLink(label, value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const v = label.toLowerCase() === 'doi' ? 'https://doi.org/'+cleanDOI(value) : value;
  try { const u = new URL(v); return ['https:','http:'].includes(u.protocol) ? u.href : null; } catch { return null; }
}
function cat(i) {
  const override = meta[i.id]?.type;
  if (override) {
    if (!GROUPS.some(([t]) => t === override)) throw Error('Invalid category '+override+' for '+i.id);
    return override;
  }
  const type = i.type;
  if (type==='article-journal') return 'journal';
  if (type==='paper-conference') return 'conference';
  if (type==='thesis') return 'thesis';
  throw Error('Please set a category in categories.json for '+i.id+' (CSL type '+type+')');
}
function ieeeText(item) {
  const html = new Cite([item]).format('bibliography',{ format:'html',template:SETTINGS.citationStyle,lang:'en-US',nosort:true });
  return html.replace(/<div[^>]*class="[^"]*csl-left-margin[^"]*"[^>]*>[\s\S]*?<\/div>/g,'')
    .replace(/(<div[^>]*class="[^"]*csl-entry[^"]*"[^>]*>)\s*\[\s*1\s*\]/, '$1')
    .replace(/(<div[^>]*class="[^"]*csl-entry[^"]*"[^>]*>)\s*1\.\s*/, '$1');
}
function specialText(item, extra, type) {
  // Patents and software entries are commonly stored as @misc with type specified in categories.json.
  const names = esc(extra.holders || firstNames(item));
  const title = esc(extra.title || item.title || 'Untitled');
  const year = esc(extra.year || rawDate(item)[0] || '');
  if (type==='patent') {
    const id = extra.number ? `, ${esc(extra.number)}` : '';
    const date = extra.date ? `, ${esc(extra.date)}` : (year ? `, ${year}` : '');
    return `${names ? names+', ' : ''}“${title}”${id}${date}.`;
  }
  const id = extra.number ? `, Registration No. ${esc(extra.number)}` : '';
  return `${names ? names+', ' : ''}“${title},” Software Copyright${id}${year ? ', '+year : ''}.`;
}
function actions(item) {
  const entry=links[item.id] || {};
  const more={...entry};
  if (item.DOI && SETTINGS.showAutomaticDOILink && !Object.keys(more).some(k=>k.toLowerCase()==='doi')) more.DOI=item.DOI;
  return Object.entries(more).map(([label,value])=>{
    const href=validLink(label,value);
    if (!href) { console.warn('Skipped invalid link:',item.id,label);return ''; }
    return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  }).join('');
}
function build() {
  const grouped = GROUPS.map(([kind,heading])=>[kind,heading,items.filter(i=>cat(i)===kind).sort((a,b)=>sortDate(b)-sortDate(a)||String(a.title||'').localeCompare(String(b.title||'')))]);
  let n=items.length;
  const output=grouped.map(([kind,heading,subset])=>{
    if(!subset.length) return '';
    const rows=subset.map(item=>{
      const text = ['patent','software'].includes(kind) ? specialText(item,meta[item.id]||{},kind):ieeeText(item);
      return `<article class="pub"><span class="pub-number">[${n--}]</span><div class="pub-body"><div class="pub-citation">${text}</div><div class="pub-links">${actions(item)}</div></div></article>`;
    }).join('\n');
    return `<h3>${esc(heading)}</h3>\n${rows}`;
  }).join('\n');
  if (!items.length) console.warn('No publications found.');
  const src=fs.readFileSync('index.html','utf8');
  const begin='<!-- PUBLICATIONS_START -->',end='<!-- PUBLICATIONS_END -->';
  if(!src.includes(begin)||!src.includes(end)) throw Error('index.html missing publication markers');
  const built=src.replace(new RegExp(begin+'[\\s\\S]*?'+end),`${begin}\n${output}\n${end}`);
  const dest='dist';fs.mkdirSync(dest,{recursive:true});
  fs.writeFileSync(path.join(dest,'index.html'),built);
  fs.copyFileSync('style.css',path.join(dest,'style.css'));
  fs.writeFileSync(path.join(dest,'.nojekyll'),'');
  console.log(`Built ${items.length} entries into ${dest}/index.html`);
}
build();
