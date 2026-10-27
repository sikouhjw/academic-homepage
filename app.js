/* Academic homepage: BibTeX -> Citation.js -> formatted HTML.
   To change reference style, replace 'ieee' with 'apa', 'vancouver', etc.
   For your own CSL, register it with Cite.plugins.config.get('csl').templates.add(name, xml).
*/
const REFERENCE_STYLE = 'ieee';
const MY_NAME = 'Your Name';
const GROUP_NAMES = { journal: 'Journal Papers', conference: 'Conference Papers', preprint: 'Preprints', other: 'Other Publications' };

function getCite() {
  if (typeof require === 'function') return require('citation-js');
  if (typeof Cite !== 'undefined') return Cite;
  throw new Error('Citation.js failed to load from the CDN.');
}
function safeURL(raw) {
  try { const u = new URL(String(raw), location.href); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; }
  catch { return null; }
}
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function groupOf(item) {
  if (item.type === 'article-journal') return 'journal';
  if (item.type === 'paper-conference' || item.type === 'chapter' || item.type === 'entry') return 'conference';
  if (item.type === 'article' || item.type === 'manuscript' || item.type === 'report') return 'preprint';
  return 'other';
}
function yearOf(item) {
  const parts = item.issued && item.issued['date-parts'];
  return parts?.[0]?.[0] || 0;
}
function addLink(container, text, url) {
  const validated = safeURL(url);
  if (!validated) return;
  const anchor = el('a', '', text);
  anchor.href = validated;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  container.append(anchor);
}
function formatEntry(Cite, item) {
  const html = new Cite([item]).format('bibliography', {
    format: 'html', template: REFERENCE_STYLE, lang: 'en-US'
  });
  const node = el('div', 'pub-citation');
  node.innerHTML = html; // HTML produced by the citation formatter from the locally maintained BibTeX file.
  return node;
}
async function renderPublications() {
  const root = document.getElementById('publication-list');
  try {
    const [bibResponse, linkResponse] = await Promise.all([
      fetch('./publications.bib', { cache: 'no-cache' }),
      fetch('./links.json', { cache: 'no-cache' })
    ]);
    if (!bibResponse.ok) throw new Error('Cannot load publications.bib (HTTP ' + bibResponse.status + ').');
    if (!linkResponse.ok) throw new Error('Cannot load links.json (HTTP ' + linkResponse.status + ').');
    const bib = await bibResponse.text();
    const links = await linkResponse.json();
    const Cite = getCite();
    const entries = new Cite(bib).data;
    entries.sort((a,b) => yearOf(b) - yearOf(a) || String(a.title || '').localeCompare(String(b.title || '')));
    root.replaceChildren();
    if (!entries.length) { root.append(el('p', '', 'No publications yet.')); return; }
    for (const group of ['journal','conference','preprint','other']) {
      const items = entries.filter(x => groupOf(x) === group);
      if (!items.length) continue;
      root.append(el('h3', '', GROUP_NAMES[group]));
      for (const item of items) {
        const row = el('article', 'pub');
        const citation = formatEntry(Cite, item);
        const actions = el('div', 'pub-links');
        const more = links[item.id] || {};
        if (more.pdf) addLink(actions, 'PDF', more.pdf);
        if (item.DOI) addLink(actions, 'DOI', 'https://doi.org/' + item.DOI);
        else if (item.URL) addLink(actions, 'Paper', item.URL);
        if (more.code) addLink(actions, 'Code', more.code);
        if (more.project) addLink(actions, 'Project', more.project);
        const bibButton = el('button', '', 'BibTeX');
        bibButton.type = 'button';
        bibButton.addEventListener('click', async () => {
          const bibOutput = new Cite([item]).format('bibtex');
          try { await navigator.clipboard.writeText(bibOutput); bibButton.textContent = 'Copied'; }
          catch { window.prompt('Copy BibTeX:', bibOutput); }
        });
        actions.append(bibButton);
        row.append(citation, actions);
        root.append(row);
      }
    }
  } catch (error) {
    root.replaceChildren(el('p', 'error', 'Could not load publications: ' + error.message));
    console.error(error);
  }
}
document.addEventListener('DOMContentLoaded', renderPublications);
