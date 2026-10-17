# tools/read

`read_gen.py` builds the site. The site is the repository root: it copies the repository as authored, except `vercel.json`, `_site/` and hidden files and directories, and adds the pages it generates under `read/`: one reading page per declared document, pattern contract and record, and a documents index.

The site root keeps the authored `index.html`, which `declared.json` names as the home page, and every generated page's breadcrumb links it.

The Markdown stays the only source. The generated pages are build output: they are written to the directory the build is given and never committed. Editing a Markdown file is enough to change its page at the next build, with three exceptions, each of which needs `declared.json` changed in the same commit: a new Markdown file anywhere in the repository needs a declared place; a new blockquote needs a declared role; and changing the opening words of a declared passage or block needs its declaration changed to match. Until then the build fails and nothing new is deployed.

The pages are static files. Each loads same-site stylesheets, fonts, icons and two scripts, `surface-shell.js` and `surface-document-overflow.js`; the shell script builds the responsive navigation panel from the page's own markup. No content is generated or fetched at runtime, and the site runs no server-side code.

GitHub stays the source of record. Every reading page links its file on GitHub at `main` and its raw file. Every file the repository serves today is still served at its own path, and the style guide, the pattern previews and the keys are unchanged.

## Provenance

`read_gen.py`, `vercel-build.sh` and `requirements.txt` are adapted from [`apexSolarKiss/method-ASK`](https://github.com/apexSolarKiss/method-ASK) at `5e3a332164b2973d9eea2337ddeed825ae56ad4d` (`tools/read/`). The renderer, the gates and the page markup are method-ASK's. What differed by repository is declared in `declared.json` instead of written into the code: the repository's name and index copy, the stylesheet, script and wordmark paths, the site directory, the home page, the front doors, the document collections and their output names, and default holds. Three behaviours were added: a link to a directory inside the site with no `index.html` of its own, or to a Markdown file in the site that is not rendered, opens on GitHub rather than as a raw file or a missing listing; hidden files are not copied into the site; and a word too long for its line breaks rather than widen the page at narrow widths. `requirements.txt` is method-ASK's, unchanged.

## The front doors

Two authored pages are composed on their way into the site, and no other authored file changes.

- **`patterns/index.html`** links each pattern's README and each semantic primitive's Markdown. Opened from a clone it opens those raw files; in the composed site each of those links opens the file's reading page. A query or `#fragment` on the link is kept.
- **`index.html`** gains a documents route. It sits in a `<template data-read-build>` element, whose content is inert, so a clone shows no dead link; the build removes the template tags, each with its line where it stands alone on one, so the route renders.

Apart from the mapped `href` values and those template tags, each composed copy is the authored bytes.

## Deployment

`vercel.json` runs the build. Vercel runs `sh tools/read/vercel-build.sh` at the repository root and serves `_site`. The script:

1. picks a Python 3.10 or later on the build machine, or stops;
2. installs the exact renderer pin into a temporary virtual environment, by hash, from wheels only;
3. runs `read_gen.py build --out _site` at the repository root.

A failed gate fails the build, so a broken document is never deployed. `vercel.json` also carries the site's headers, redirects and rewrites; the build changes none of them, and `/styleguide/` and `/patterns/` resolve as before.

## Setup

For local builds you need Python 3.10 or later, with the exact renderer pin installed in a virtual environment outside the repository:

```text
python3 -m venv <venv>
<venv>/bin/python -m pip install --require-hashes --only-binary=:all: -r tools/read/requirements.txt
```

Every mode checks the installed versions first. It exits 2, running nothing, unless they are exactly markdown-it-py 4.2.0, mdit-py-plugins 0.6.1 and mdurl 0.1.2.

## Use

From the repository root:

```text
<venv>/bin/python tools/read/read_gen.py build --out _site
<venv>/bin/python tools/read/read_gen.py check
<venv>/bin/python tools/read/read_gen.py links --site _site
```

- **build** writes the composed site to `--out`. That directory must not exist yet, or must be empty. It may not be the repository, sit inside the repository or `.git` (except `_site/`, which the declaration excludes from the site), or contain the repository. These are judged by where `--out` physically lands: every symlink in the path, and any `..` after one, is followed first, and when the check fails nothing is staged. Serve `_site/` and open `/read/index.html` to read the result. `--report <file>` writes the pages, link classes, headings and the front-door mapping after a successful build. It may not land inside the repository or `.git`, and it may not be `--out`, lie inside it or contain it, judged the same way. That holds whether `--out` exists yet or not: when it does not, the build creates its missing directories for the comparison, so the volume itself decides which spellings name the same directory, and removes them again before anything is staged.
- **check** runs the same build into a temporary directory, prints the digest and removes the directory.
- **links** runs the link check alone over a composed site.

Each successful build prints a digest of the composed tree. Identical inputs give identical digests.

## Gates

The build renders every page in memory first. It publishes nothing when any of these fails:

**The declaration.**
- `declared.json` is malformed: a path not normalized, with a `..` segment, or outside its place; two outputs on one path; a passage or block declaration on a file that is not rendered; an identity string, a chrome path or a front door missing; or an authored home page that is missing, is not the site's root `index.html`, or is declared beside a generated one.
- `read/` exists in the source tree.
- A Markdown file anywhere in the repository, outside hidden directories and `_site/`, has no declared place: rendered, a redirect, or held with a reason.

**Each document.**
- It does not have exactly one top-level H1, coming first.
- A relative link, anchor or image does not resolve in the source tree, or a link is root-absolute. A path resolves only if every segment matches its directory entry exactly, case included: a clone on a case-insensitive volume would otherwise accept a link the deployment serves as 404.
- An image names a remote file.
- Raw HTML is anything but the allowlisted image markup: lowercase `<img>` tags whose only attributes are a double-quoted `src` naming a hosted `.png` file in the site and a double-quoted `alt`, each at most once, separated only by spaces, tabs or newlines.
  - Every other element, end tag and attribute fails, `style` and `on*` event handlers included.
  - So do comments, CDATA sections, declarations, processing instructions, a `src` with a URL scheme, and raw text containing `<!`, `<?` or `</script` in any case.
  - HTML written inside a code span or a fenced block is literal text, not raw HTML.
- A blockquote has no declared role, or a passage or block declaration does not name exactly one blockquote or block.
- A declared structured block does not fit its shape.
- A table header holds a link, an image or raw HTML. At narrow widths the header row is hidden, so it would hold an interaction the reader cannot see.

**The front doors and the carriers.**
- An authored front door does not open from a clone. Outside a build-only fragment, a relative link (`<a>`, `<area>`) or resource reference (`href`, `src`, `srcset`) does not resolve, case-exactly, in the source tree, or a link is root-absolute. A root-absolute resource, such as the deployment-root icons, is the site's and is not checked here. A build-only fragment that opens inside another or never closes fails too.
- The front doors' source links, together, do not name exactly the declared source files: a declared source is not linked, or a `.js` file is linked that is not declared.
- The composed front doors do not link each declared source through its source view (`read/source/<file>.html`), link a page in that directory that maps to no declared source, or link a `.js` file directly, as a raw link in a build-only fragment would. A root-absolute link is resolved from the site root for this check. The raw file and GitHub are reached from the view.
- A composed front door leaves a link unclosed, or opens one inside another: a build-only fragment that keeps only one of a link's two tags would do this.
- A carrier a reading page loads does not match its declared sha256.

**After composing.** It then composes the site in a staging directory beside `--out`. It re-reads every written file against its source, and each front door against its composed bytes, and runs the link check over the staging tree:
- every relative `href`, `src` and `srcset` on a generated page, or a composed front door that stays inside the site must exist, case-exactly. One on a generated page that leaves the site is reported as a warning; one on a composed front door fails, because the deployment would not serve it;
- every `#fragment` must name an id in its target page;
- a GitHub fragment must name a heading of that file;
- no link may claim a fragment in a raw Markdown file;
- a composed front door may not link a rendered document as raw `.md`.

Only then does the staging tree become `--out`.

## The declaration

`declared.json` lists:

- `identity` — the repository's name in the breadcrumb and page titles, the documents index's copy, and the front link the pages' footers and navigation name (the pattern previews);
- `chrome` — the stylesheets and scripts every generated page loads, in order, and the wordmark pair: the owner files themselves, at their own paths;
- `documents`, the `patterns` collection and `records` — what is rendered: the README, `CONSUMERS.md`, the four semantic primitives, each pattern's contract and hard-fail checklist, and the tests README. A pattern's page sits under `read/patterns/`, under the output name its entry declares;
- `redirects` and `held` — what is not rendered, each with its target or reason;
- `source_views` — empty: no front door links a source file;
- `site_exclude` — what the repository root holds that is not site: `vercel.json`, and `_site/`, where the build writes;
- `front_doors` — the authored pages the build composes: `index.html` and `patterns/index.html`;
- `home_page` — the authored `index.html`, which the build serves as the home page;
- `passages` — the role of each blockquote: the README's foundation statement and each status or provenance note are callouts;
- `blocks` — the shape of each structured preformatted block.

**Passages.** A blockquote carries no signal of whose words it holds, so each one is declared by the words it starts with, which must start exactly one blockquote in its document:

| role | meaning | markup |
| --- | --- | --- |
| `quotation` | represented voice: someone's words, quoted or introduced | `blockquote.doc-quote` |
| `callout` | the document's own thesis, question or contrast, set apart | `p.doc-body.surface-emphasis-rail`, or `div.doc-group.surface-emphasis-rail` around several blocks |
| `framing` | the statement that opens a whole part before its sections | the flat panel with a magenta-bordered chip, its word in `chip` |
| `synthesis` | the closing compression of a part | the same panel, its word in `chip` |

**Blocks.** Every fenced block is a plain `.doc-pre`, its text as written, unless `blocks` declares it a grouped diagram. Such a block is declared by the start of its first line, which must start exactly one block in its document, and by its shape:

- **`groups-rail`** — peer groups between blank lines. The unindented lines open each group, and the indented lines beneath them sit one hierarchy rail in, with their shared indentation removed. Any further indentation stays as written.
- **`groups-aligned`** — peer groups between blank lines, each opening on its first line. The lines after it keep every space, because their indentation aligns columns rather than marking a level.

Successive groups sit one line apart. A shape is never inferred from blank lines or capitals: an undeclared block stays plain.

## Links

| link in a rendered document | on the page |
| --- | --- |
| a rendered document, collection entry or record, with or without `#fragment` | its page, fragment kept |
| a `#fragment` into a Markdown file that is not rendered | the file on GitHub at `main`, with the anchor |
| a Markdown file in the site that is not rendered | the file on GitHub at `main`; its raw route stays served |
| another file in the site (a figure, a raster, a source file) | a relative link to that file |
| a directory in the site with no `index.html` | the directory on GitHub at `main` |
| a repository file or directory outside the site that is not rendered | the file or directory on GitHub at `main` |
| an external URL | unchanged |

Emitted paths are percent-encoded. Heading ids follow GitHub's slugs. Headings move down one level so the Markdown H1 sits under the page's breadcrumb title: H1 to H4 render as `h2` to `h5`, and H5 and H6 both render as `h6`. An image is contained to the column, keeps its aspect ratio and links to its full-resolution file, unless it already sits inside a link. A Markdown file's raw route is its own path on this site.

## Carriers

The reading pages load the owner's own files by same-repo reference — `colors_and_type.css`, `surface-panel.css`, `surface-action.css`, `surface-text-link.css`, `surface-document.css`, `surface-treatments.css`, `surface-document-overflow.js`, `patterns/surface-shell/` and the wordmark pair under `assets/` — so there is no vendored copy, no pin and no declared hash: `carriers` is empty. An owner change reaches the pages at the next deployment.
