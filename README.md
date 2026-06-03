# Alex Portfolio

A static personal portfolio for GitHub Pages, built with plain HTML, CSS, and JavaScript.

## Structure

- `index.html` - page content
- `work.html`, `projects.html`, `photography.html`, `contact.html` - static subpages
- `styles.css` - visual design
- `script.js` - gallery lightbox interaction
- `content.js` - editable portfolio content
- `admin.html` - static editing panel
- `assets/photos/` - optimized photography assets

## Editing Content

Open `admin.html` to edit text, project links, photo paths, and contact links.

The admin panel saves preview edits to your browser with `localStorage`. To publish the edits on GitHub Pages, export `content.js` from the admin panel and replace the repository's `content.js` file with it.

For new local images, add the image file to `assets/photos/` first, then use a path like `assets/photos/new-photo.jpg` in the admin panel.

## Publish On GitHub Pages

1. Push this folder to a GitHub repository.
2. Open the repository settings.
3. Go to Pages.
4. Publish from the `main` branch and the repository root.
