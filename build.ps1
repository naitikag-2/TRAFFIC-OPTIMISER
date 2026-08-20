# SIGNAL-IQ Static Production Build Script
# Produces a deployable dist/ folder with minified assets

$ErrorActionPreference = "Stop"
$src = $PSScriptRoot
if (-not $src) { $src = Get-Location }
$dist = Join-Path $src "dist"

Write-Host "`n=== SIGNAL-IQ Production Build ===" -ForegroundColor Cyan
Write-Host "Source : $src"
Write-Host "Output : $dist`n"

# ── Clean dist ──
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist | Out-Null
New-Item -ItemType Directory -Path (Join-Path $dist "assets") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $dist "fonts") -Force | Out-Null

Write-Host "[1/5] Minifying CSS..." -ForegroundColor Yellow
$css = Get-Content (Join-Path $src "styles.css") -Raw -Encoding UTF8
# Remove block comments
$css = [regex]::Replace($css, '/\*[\s\S]*?\*/', '')
# Collapse whitespace
$css = [regex]::Replace($css, '\s+', ' ')
# Tighten around braces, colons, semicolons
$css = [regex]::Replace($css, '\s*\{\s*', '{')
$css = [regex]::Replace($css, '\s*\}\s*', '}')
$css = [regex]::Replace($css, '\s*;\s*', ';')
$css = [regex]::Replace($css, '\s*:\s*', ':')
$css = [regex]::Replace($css, '\s*,\s*', ',')
# Remove trailing semicolons before closing brace
$css = $css -replace ';}', '}'
$css = $css.Trim()
[System.IO.File]::WriteAllText((Join-Path $dist "styles.css"), $css, [System.Text.UTF8Encoding]::new($false))
$origCSS = (Get-Item (Join-Path $src "styles.css")).Length
$minCSS  = (Get-Item (Join-Path $dist "styles.css")).Length
Write-Host "   styles.css: $origCSS -> $minCSS bytes ($([math]::Round((1 - $minCSS/$origCSS)*100, 1))% reduction)"

Write-Host "[2/5] Minifying JS..." -ForegroundColor Yellow
$js = Get-Content (Join-Path $src "main.js") -Raw -Encoding UTF8
# Remove block comments (but not inside strings - safe because our block comments are on their own lines)
$js = [regex]::Replace($js, '/\*[^*]*\*+(?:[^/*][^*]*\*+)*/', '')
# Remove single-line comments (only those at the start of a line or preceded by whitespace, not inside strings)
$js = [regex]::Replace($js, '(?m)^\s*//.*$', '')
$js = [regex]::Replace($js, '(?<=\s)//[^\n]*', '')
# Collapse blank lines
$js = [regex]::Replace($js, '(\r?\n){3,}', "`n")
# Trim lines
$jsLines = $js -split "`n" | ForEach-Object { $_.TrimEnd() } | Where-Object { $_ -ne '' }
$js = $jsLines -join "`n"
[System.IO.File]::WriteAllText((Join-Path $dist "main.js"), $js, [System.Text.UTF8Encoding]::new($false))
$origJS = (Get-Item (Join-Path $src "main.js")).Length
$minJS  = (Get-Item (Join-Path $dist "main.js")).Length
Write-Host "   main.js: $origJS -> $minJS bytes ($([math]::Round((1 - $minJS/$origJS)*100, 1))% reduction)"

Write-Host "[3/5] Processing HTML..." -ForegroundColor Yellow
$html = Get-Content (Join-Path $src "index.html") -Raw -Encoding UTF8
# Remove HTML comments (except conditional)
$html = [regex]::Replace($html, '<!--(?!\[)[\s\S]*?-->', '')
# Collapse blank lines
$html = [regex]::Replace($html, '(\r?\n){3,}', "`n`n")
[System.IO.File]::WriteAllText((Join-Path $dist "index.html"), $html, [System.Text.UTF8Encoding]::new($false))
$origHTML = (Get-Item (Join-Path $src "index.html")).Length
$minHTML  = (Get-Item (Join-Path $dist "index.html")).Length
Write-Host "   index.html: $origHTML -> $minHTML bytes ($([math]::Round((1 - $minHTML/$origHTML)*100, 1))% reduction)"

Write-Host "[4/5] Copying assets..." -ForegroundColor Yellow
$logoSrc = Join-Path $src "assets\logo.webp"
if (Test-Path $logoSrc) {
    Copy-Item $logoSrc (Join-Path $dist "assets\logo.webp")
    Write-Host "   Copied assets/logo.webp"
}
$fontSrc = Join-Path $src "fonts\GeistPixel-Circle.woff2"
if (Test-Path $fontSrc) {
    Copy-Item $fontSrc (Join-Path $dist "fonts\GeistPixel-Circle.woff2")
    Write-Host "   Copied fonts/GeistPixel-Circle.woff2"
} else {
    Write-Host "   fonts/GeistPixel-Circle.woff2 not found (optional fallback font)" -ForegroundColor DarkYellow
}

Write-Host "[5/5] Calculating totals..." -ForegroundColor Yellow
$totalOrig = $origHTML + $origCSS + $origJS
$totalMin  = $minHTML + $minCSS + $minJS
$assetSize = 0
Get-ChildItem (Join-Path $dist "assets") -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { $assetSize += $_.Length }
Get-ChildItem (Join-Path $dist "fonts") -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { $assetSize += $_.Length }
$totalDist = $totalMin + $assetSize

Write-Host "`n=== Build Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "  Code (HTML+CSS+JS):"
Write-Host "    Source : $([math]::Round($totalOrig/1024, 1)) KB"
Write-Host "    Dist   : $([math]::Round($totalMin/1024, 1)) KB ($([math]::Round((1 - $totalMin/$totalOrig)*100, 1))% smaller)"
Write-Host ""
Write-Host "  Total dist/ size  : $([math]::Round($totalDist/1024, 1)) KB (including assets)"
Write-Host ""
Write-Host "  Output: $dist" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Deploy this folder to any static host:" -ForegroundColor DarkGray
Write-Host "    - Netlify, Vercel, GitHub Pages, Cloudflare Pages" -ForegroundColor DarkGray
Write-Host "    - Or just open dist/index.html in a browser" -ForegroundColor DarkGray
Write-Host ""
