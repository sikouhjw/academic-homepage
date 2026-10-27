# Academic Homepage

Minimal academic website for GitHub Pages with BibTeX and Citation.js.

## Publish
1. Create a public GitHub repository named `academic-homepage` and initialize it with README.
2. Upload all files in this directory to the repository root (including `.nojekyll`).
3. Visit Settings > Pages > Build and deployment > Deploy from a branch, select `main`, `/(root)`, and Save.
4. Visit `https://YOUR-USERNAME.github.io/academic-homepage/`.

## Edit
- `index.html`: bio, name, affiliations, contacts, sections.
- `style.css`: fonts, colors, width, sizes.
- `publications.bib`: publication metadata, with stable BibTeX citekeys.
- `links.json`: PDF/code/project links, keyed by BibTeX citekey.
- `app.js`: reference style (`REFERENCE_STYLE`), grouping, sorting, button generation.

Sample DOIs and links are **fictional placeholders**, not real papers.

Citation.js uses a pinned CDN version: 0.7.20. It requires an internet connection to the CDN when the page is loaded. If blocked, download and host the bundle locally.

To preview locally, serve the directory using a static HTTP server; opening index.html via file:// will block fetch in many browsers. No local setup is needed to publish through GitHub.
