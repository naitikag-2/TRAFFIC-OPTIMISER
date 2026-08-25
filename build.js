
const fs = require("fs");
const path = require("path");

const src = __dirname;
const dist = path.join(src, "dist");

console.log("\n=== SIGNAL-IQ Production Build (Node.js) ===");
console.log("Source : " + src);
console.log("Output : " + dist + "\n");

if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });
fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
fs.mkdirSync(path.join(dist, "fonts"), { recursive: true });

function minifyCSS(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\{\s*/g, "{")
    .replace(/\s*\}\s*/g, "}")
    .replace(/\s*;\s*/g, ";")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*,\s*/g, ",")
    .replace(/;\}/g, "}")
    .trim();
}

function minifyJS(content) {
  return content
    .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/(?<=\s)\/\/[^\n]*/g, "")
    .replace(/(\r?\n){3,}/g, "\n")
    .split("\n")
    .map(line => line.trimEnd())
    .filter(line => line.length > 0)
    .join("\n");
}

console.log("[1/6] Minifying CSS files...");
const cssFiles = ["styles.css", "animations.css", "features.css", "arch-story.css"];
cssFiles.forEach(file => {
  if (fs.existsSync(path.join(src, file))) {
    const content = fs.readFileSync(path.join(src, file), "utf8");
    fs.writeFileSync(path.join(dist, file), minifyCSS(content));
    console.log("   Minified " + file);
  }
});

console.log("[2/6] Minifying JS files...");
const jsFiles = ["main.js", "animations.js", "judge-mode.js", "walkthrough.js", "simulator-enhancements.js", "sound-design.js", "corridors.js"];
jsFiles.forEach(file => {
  if (fs.existsSync(path.join(src, file))) {
    const content = fs.readFileSync(path.join(src, file), "utf8");
    fs.writeFileSync(path.join(dist, file), minifyJS(content));
    console.log("   Minified " + file);
  }
});

console.log("[3/6] Processing HTML...");
let indexHTML = fs.readFileSync(path.join(src, "index.html"), "utf8");
fs.writeFileSync(path.join(dist, "index.html"), indexHTML);

console.log("[4/6] Copying static assets...");
const logoSrc = path.join(src, "assets", "logo.webp");
if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, path.join(dist, "assets", "logo.webp"));
}

const fontSrc = path.join(src, "fonts", "GeistPixel-Circle.woff2");
if (fs.existsSync(fontSrc)) {
  fs.copyFileSync(fontSrc, path.join(dist, "fonts", "GeistPixel-Circle.woff2"));
}

console.log("[5/6] Generating Vercel server entrypoints...");
const apiContent = fs.readFileSync(path.join(src, "api", "index.js"), "utf8");
fs.writeFileSync(path.join(dist, "index.js"), apiContent);
fs.writeFileSync(path.join(dist, "server.js"), apiContent);
fs.writeFileSync(path.join(dist, "app.js"), apiContent);

console.log("[6/6] Build Completed successfully for Vercel!\n");

