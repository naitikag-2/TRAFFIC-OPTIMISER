/**
 * SIGNAL-IQ — Cross-Platform Production Build Script (Node.js)
 * Runs on Windows, Mac, Linux, and Vercel CI/CD
 */

const fs = require('fs');
const path = require('path');

const src = __dirname;
const dist = path.join(src, 'dist');

console.log('\n=== SIGNAL-IQ Production Build (Node.js) ===');
console.log(`Source : ${src}`);
console.log(`Output : ${dist}\n`);

// Clean dist
if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
fs.mkdirSync(path.join(dist, 'fonts'), { recursive: true });

// Minify CSS
function minifyCSS(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\{\s*/g, '{')
    .replace(/\s*\}\s*/g, '}')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*,\s*/g, ',')
    .replace(/;\}/g, '}')
    .trim();
}

// Minify JS
function minifyJS(content) {
  return content
    .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/(?<=\s)\/\/[^\n]*/g, '')
    .replace(/(\r?\n){3,}/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.length > 0)
    .join('\n');
}

// Process CSS files
console.log('[1/6] Minifying CSS files...');
const stylesCSS = fs.readFileSync(path.join(src, 'styles.css'), 'utf8');
fs.writeFileSync(path.join(dist, 'styles.css'), minifyCSS(stylesCSS));

if (fs.existsSync(path.join(src, 'animations.css'))) {
  const animCSS = fs.readFileSync(path.join(src, 'animations.css'), 'utf8');
  fs.writeFileSync(path.join(dist, 'animations.css'), minifyCSS(animCSS));
}

// Process JS files
console.log('[2/6] Minifying JS files...');
const mainJS = fs.readFileSync(path.join(src, 'main.js'), 'utf8');
fs.writeFileSync(path.join(dist, 'main.js'), minifyJS(mainJS));

if (fs.existsSync(path.join(src, 'animations.js'))) {
  const animJS = fs.readFileSync(path.join(src, 'animations.js'), 'utf8');
  fs.writeFileSync(path.join(dist, 'animations.js'), minifyJS(animJS));
}

// Process HTML
console.log('[3/6] Processing HTML...');
let indexHTML = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
indexHTML = indexHTML.replace(/<!--(?!\[)[\s\S]*?-->/g, '').replace(/(\r?\n){3,}/g, '\n\n');
fs.writeFileSync(path.join(dist, 'index.html'), indexHTML);

// Copy assets
console.log('[4/6] Copying static assets...');
const logoSrc = path.join(src, 'assets', 'logo.webp');
if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, path.join(dist, 'assets', 'logo.webp'));
  console.log('   Copied assets/logo.webp');
}

const fontSrc = path.join(src, 'fonts', 'GeistPixel-Circle.woff2');
if (fs.existsSync(fontSrc)) {
  fs.copyFileSync(fontSrc, path.join(dist, 'fonts', 'GeistPixel-Circle.woff2'));
  console.log('   Copied fonts/GeistPixel-Circle.woff2');
}

// Create Vercel Serverless / Node entrypoints in dist
console.log('[5/6] Generating Vercel server entrypoints (index.js, server.js, app.js)...');
const apiContent = fs.readFileSync(path.join(src, 'api', 'index.js'), 'utf8');
fs.writeFileSync(path.join(dist, 'index.js'), apiContent);
fs.writeFileSync(path.join(dist, 'server.js'), apiContent);
fs.writeFileSync(path.join(dist, 'app.js'), apiContent);

console.log('[6/6] Build Completed successfully for Vercel!\n');
