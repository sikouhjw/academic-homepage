'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { Cite } = require('@citation-js/core');
require('@citation-js/plugin-bibtex');
require('@citation-js/plugin-csl');

const SETTINGS = {
  citationStyle: 'ieee',
  citationMode: 'custom',
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
let items;

try {
  items = new Cite(bib).data;
} catch (error) {
  console.error(
    'Failed to parse publications.bib.'
  );
  console.error(error.message);
  process.exit(1);
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rawDate = item => item.issued?.['date-parts']?.[0] || [];
const sortDate = item => { const a=rawDate(item); return (+a[0]||0)*10000+(+a[1]||0)*100+(+a[2]||0); };

function person(p) {
  if (p.literal) return p.literal;

  const given = String(p.given || '').trim();
  const family = String(p.family || '').trim();

  // 中文姓名保持全名
  if (/[\u3400-\u9fff]/.test(given + family)) {
    return given + family;
  }

  // 英文名缩写：Junwei He -> J. He
  const initials = given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(s => s[0].toUpperCase() + '.')
    .join(' ');

  return [initials, family].filter(Boolean).join(' ');
}

function firstNames(item) {
  const names = (item.author || []).map(person);
  if (names.length <= 2) return names.join(' and ');
  return names.slice(0, -1).join(', ') +
    ', and ' + names[names.length - 1];
}

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


function customText(item, type) {
  const authors = esc(firstNames(item));
  const title = esc(item.title || '');
  const year = esc(rawDate(item)[0] || '');

  if (type === 'thesis') {
    const school = esc(
      item.publisher ||
      item['publisher-place'] ||
      ''
    );

    return `${authors}, “${title},” ` +
      `${school}${school ? ', ' : ''}${year}.`;
  }

  const venue = esc(item['container-title'] || '');

  const volume = item.volume || '';
  const issue = item.issue || '';
  const pages = item.page || '';

  let result = `${authors}, “${title},” `;

  if (type === 'conference') {
    result += `in <i>${venue}</i>`;
  } else {
    result += `<i>${venue}</i>`;
  }

  if (volume) {
    result += `, vol. ${esc(volume)}`;
  }
  if (issue) {
    result += `, no. ${esc(issue)}`;
  }
  if (pages) {
    const prefix = String(pages).includes('-')
      ? 'pp.' : 'p.';
    result += `, ${prefix} ${esc(pages)}`;
  }
  if (year) {
    result += `, ${year}`;
  }

  return result.replace(/[,\s]+$/, '') + '.';
}

function ieeeText(item) {
  const html = new Cite([item]).format('bibliography',{ format:'html',template:SETTINGS.citationStyle,lang:'en-US',nosort:true });
  return html.replace(/<div[^>]*class="[^"]*csl-left-margin[^"]*"[^>]*>[\s\S]*?<\/div>/g,'')
    .replace(/(<div[^>]*class="[^"]*csl-entry[^"]*"[^>]*>)\s*\[\s*1\s*\]/, '$1')
    .replace(/(<div[^>]*class="[^"]*csl-entry[^"]*"[^>]*>)\s*1\.\s*/, '$1');
}

function specialText(item, extra, type) {
  const title = esc(extra.title || item.title || '');
  const names = esc(
    extra.holders
      ? extra.holders
          .split(/\s+and\s+|[,，、]/i)
          .map(s => s.trim())
          .filter(Boolean)
          .join(', ')
      : firstNames(item)
  );

  const year = String(
    extra.year || rawDate(item)[0] || ''
  );

  const sourceDate = String(extra.date || '');
  const parts = sourceDate.match(/^(\d{4})-(\d{1,2})/);

  // 例如 2026-05-21 -> 2026年05月
  const date = parts
    ? `${parts[1]}年${parts[2].padStart(2, '0')}月`
    : sourceDate || year;

  const number = esc(extra.number || '');

  if (type === 'patent') {
    return `${names}, “${title},” ` +
      `${esc(date)}, 发明专利: ${number}.`;
  }

  if (type === 'software') {
    return `${names}, “${title},” ` +
      `${esc(date)}, 软件著作: ${number}.`;
  }

  return '';
}
function badges(item) {
  const list = meta[item.id]?.badges || [];

  if (!Array.isArray(list)) {
    throw new Error(
      `badges must be an array: ${item.id}`
    );
  }

  return list.map(label => {
    return `<span class="pub-badge">${esc(label)}</span>`;
  }).join('');
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
  const output=grouped.map(([kind,heading,subset])=>{
    if(!subset.length) return '';
    const rows=subset.map((item, index)=>{
      const n = subset.length - index;
      let text;

      if (['patent', 'software'].includes(kind)) {
        text = specialText(item, meta[item.id] || {}, kind);
      } else if (SETTINGS.citationMode === 'custom') {
        text = customText(item, kind);
      } else {
        text = ieeeText(item);
      }
      return `<article class="pub">
        <span class="pub-number">[${n}]</span>
        <div class="pub-body">
          <div class="pub-citation">${text}</div>
          <div class="pub-links">
            ${badges(item)}
            ${actions(item)}
          </div>
        </div>
      </article>`;
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
