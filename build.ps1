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

function Minify-CSSFile($filePath, $outPath) {
    $css = Get-Content $filePath -Raw -Encoding UTF8
    $css = [regex]::Replace($css, '/\*[\s\S]*?\*/', '')
    $css = [regex]::Replace($css, '\s+', ' ')
    $css = [regex]::Replace($css, '\s*\{\s*', '{')
    $css = [regex]::Replace($css, '\s*\}\s*', '}')
    $css = [regex]::Replace($css, '\s*;\s*', ';')
    $css = [regex]::Replace($css, '\s*:\s*', ':')
    $css = [regex]::Replace($css, '\s*,\s*', ',')
    $css = $css -replace ';}', '}'
    $css = $css.Trim()
    [System.IO.File]::WriteAllText($outPath, $css, [System.Text.UTF8Encoding]::new($false))
}

function Minify-JSFile($filePath, $outPath) {
    $js = Get-Content $filePath -Raw -Encoding UTF8
    $js = [regex]::Replace($js, '/\*[^*]*\*+(?:[^/*][^*]*\*+)*/', '')
    $js = [regex]::Replace($js, '(?m)^\s*//.*$', '')
    $js = [regex]::Replace($js, '(?<=\s)//[^\n]*', '')
    $js = [regex]::Replace($js, '(\r?\n){3,}', "`n")
    $jsLines = $js -split "`n" | ForEach-Object { $_.TrimEnd() } | Where-Object { $_ -ne '' }
    $js = $jsLines -join "`n"
    [System.IO.File]::WriteAllText($outPath, $js, [System.Text.UTF8Encoding]::new($false))
}

Write-Host "[1/5] Minifying CSS files..." -ForegroundColor Yellow
Minify-CSSFile (Join-Path $src "styles.css") (Join-Path $dist "styles.css")
if (Test-Path (Join-Path $src "animations.css")) {
    Minify-CSSFile (Join-Path $src "animations.css") (Join-Path $dist "animations.css")
}
$origCSS = (Get-Item (Join-Path $src "styles.css")).Length
$minCSS  = (Get-Item (Join-Path $dist "styles.css")).Length
Write-Host "   styles.css: $origCSS -> $minCSS bytes"

Write-Host "[2/5] Minifying JS files..." -ForegroundColor Yellow
Minify-JSFile (Join-Path $src "main.js") (Join-Path $dist "main.js")
if (Test-Path (Join-Path $src "animations.js")) {
    Minify-JSFile (Join-Path $src "animations.js") (Join-Path $dist "animations.js")
}
$origJS = (Get-Item (Join-Path $src "main.js")).Length
$minJS  = (Get-Item (Join-Path $dist "main.js")).Length
Write-Host "   main.js: $origJS -> $minJS bytes"

Write-Host "[3/5] Processing HTML..." -ForegroundColor Yellow
$html = Get-Content (Join-Path $src "index.html") -Raw -Encoding UTF8
$html = [regex]::Replace($html, '<!--(?!\[)[\s\S]*?-->', '')
$html = [regex]::Replace($html, '(\r?\n){3,}', "`n`n")
[System.IO.File]::WriteAllText((Join-Path $dist "index.html"), $html, [System.Text.UTF8Encoding]::new($false))
$origHTML = (Get-Item (Join-Path $src "index.html")).Length
$minHTML  = (Get-Item (Join-Path $dist "index.html")).Length
Write-Host "   index.html: $origHTML -> $minHTML bytes"

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
}

Write-Host "[5/5] Calculating totals..." -ForegroundColor Yellow
$totalOrig = $origHTML + $origCSS + $origJS
$totalMin  = $minHTML + $minCSS + $minJS
$assetSize = 0
Get-ChildItem (Join-Path $dist "assets") -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { $assetSize += $_.Length }
Get-ChildItem (Join-Path $dist "fonts") -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { $assetSize += $_.Length }
$totalDist = $totalMin + $assetSize

Write-Host "`n=== Build Complete ===" -ForegroundColor Green
Write-Host "  Dist Folder: $dist" -ForegroundColor Cyan
Write-Host "  Ready for production deployment!`n"
