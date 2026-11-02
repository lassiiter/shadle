$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$fontRoot = Join-Path $projectRoot 'dist\typography\fonts'
New-Item -ItemType Directory -Path $fontRoot -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $fontRoot 'licenses') -Force | Out-Null

$fontSpecs = @(
  'Space Grotesk:wght@400..700', 'DM Mono:wght@400;500',
  'Manrope:wght@400..700', 'IBM Plex Mono:wght@400;500',
  'DM Sans:wght@400..700', 'Sora:wght@400..700',
  'Geist Mono:wght@400;500', 'Plus Jakarta Sans:wght@400..700',
  'JetBrains Mono:wght@400;500', 'Inter:wght@400..700',
  'Work Sans:wght@400..700', 'Source Code Pro:wght@400;500',
  'Space Mono:wght@400;700', 'Atkinson Hyperlegible:wght@400;700',
  'Fira Mono:wght@400;500'
)
$query = ($fontSpecs | ForEach-Object { 'family=' + [Uri]::EscapeDataString($_) }) -join '&'
$fontCssUri = 'https://fonts.googleapis.com/css2?' + $query + '&display=swap'
$agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
$sourceCss = (Invoke-WebRequest -Uri $fontCssUri -UserAgent $agent -UseBasicParsing -TimeoutSec 45).Content
$sources = @()
$rules = @()
foreach ($face in [regex]::Matches($sourceCss, '(?s)@font-face\s*\{.*?\}')) {
  if ($face.Value -match 'unicode-range:' -and $face.Value -notmatch 'U\+0000-00FF') { continue }
  $family = [regex]::Match($face.Value, "font-family: '([^']+)'\;").Groups[1].Value
  $weight = [regex]::Match($face.Value, 'font-weight: ([^;]+)').Groups[1].Value
  $uri = [regex]::Match($face.Value, 'url\(([^)]+)\)').Groups[1].Value
  $extension = [IO.Path]::GetExtension(([Uri]$uri).AbsolutePath)
  $filename = ($family.ToLowerInvariant() -replace ' ', '-') + '-' + ($weight -replace ' ', '-') + $extension
  $sources += [pscustomobject]@{ Family = $family; Weight = $weight; Uri = $uri; File = $filename }
  $rules += $face.Value.Replace($uri, './' + $filename)
}
$families = @($sources.Family | Sort-Object -Unique)
if ($families.Count -ne 15) { throw "Expected 15 font families, found $($families.Count)" }
$downloads = @($sources | ForEach-Object { [pscustomobject]@{ Uri = $_.Uri; File = $_.File } })
foreach ($family in $families) {
  $folder = $family.ToLowerInvariant() -replace ' ', ''
  $downloads += [pscustomobject]@{ Uri = 'https://raw.githubusercontent.com/google/fonts/main/ofl/' + $folder + '/OFL.txt'; File = 'licenses\OFL-' + $folder + '.txt' }
}
$results = $downloads | ForEach-Object -Parallel {
  try {
    Invoke-WebRequest -Uri $_.Uri -OutFile (Join-Path $using:fontRoot $_.File) -UseBasicParsing -TimeoutSec 45 -ErrorAction Stop
    [pscustomobject]@{ Ok = $true; File = $_.File }
  } catch { [pscustomobject]@{ Ok = $false; File = $_.File; Error = $_.Exception.Message } }
} -ThrottleLimit 6
$failures = @($results | Where-Object { -not $_.Ok })
if ($failures.Count) { $failures | Format-Table | Out-String | Write-Output; throw 'Some typography assets could not be downloaded.' }
$rules -join "`n" | Set-Content -LiteralPath (Join-Path $fontRoot 'fonts.css') -Encoding utf8
$sources | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $fontRoot 'sources.json') -Encoding utf8
Write-Output "Downloaded $($sources.Count) font files across $($families.Count) families, with their licenses."
