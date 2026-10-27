# Academic Homepage v3: static, GitHub Actions build

No browser-side Citation.js or CDN. GitHub Actions installs the build dependencies at deploy time, generates a static `dist/index.html`, and deploys that folder.

## Deployment
1. Upload the **contents of this folder** to the root of your GitHub Pages repository, including `.github/workflows/pages.yml`. The hidden `.github` directory must be preserved.
2. Go to **Settings → Pages → Build and deployment → Source → GitHub Actions** (not Deploy from a branch).
3. Open **Actions** and inspect `Build and deploy academic homepage` for success. Open your Pages URL.

## Maintenance
- `publications.bib`: BibTeX records. `@article` -> Journal Papers, `@inproceedings` -> Conference Papers, `@phdthesis` or `@mastersthesis` -> Theses.
- `categories.json`: override type by BibTeX key. Required for patents and software: use `@misc{Key,...}` with type `patent` or `software`. Optional `number`, `date`, `holders`, `title`, `year` fields for those types.
- `links.json`: optional buttons, with labels as JSON keys. DOI can be a bare DOI string. Match BibTeX keys exactly.
- Order is grouped journal/conference/patent/thesis/software; newest first *within each category*. Global numbers descend from N to 1 in display order.
- `build.cjs`: customize the output style: CSL IEEE for articles, proceedings, and theses, dedicated formatters for patents and software; edit `specialText` to change those styles. For custom CSL styles, register a CSL template with Citation.js build-side plugin and select it in `SETTINGS`.
- `index.html` and `style.css`: layout/fonts. Never remove the `PUBLICATIONS_START` and `PUBLICATIONS_END` markers.

## Caveats
- All sample BibTeX data, codes, and links are fictional: replace before publishing.
- GitHub Actions still needs npm network availability **during builds only**; visitors need no Citation.js CDN.
- `@misc` without category override intentionally fails the build so achievements aren't silently mislabeled.
- Patent and software entries do not use IEEE CSL. They use an editable manual formatter.
- This archive hasn't been end-to-end tested against npm/GitHub because package-registry access is not available in the build environment used to prepare it.
