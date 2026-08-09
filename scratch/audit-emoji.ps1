$ErrorActionPreference = "Stop"
$root = "C:\Users\Xyryll-Laptop\Desktop\Codesphere"
$scratch = Join-Path $root "scratch"
$files = Get-ChildItem -Recurse -File (Join-Path $root "src") -Include *.ts,*.tsx,*.js,*.mjs,*.css | Where-Object {
  $_.FullName -notmatch 'node_modules|generated|\.next|scratch'
}
$out = New-Object System.Collections.Generic.List[string]
foreach ($f in $files) {
  $rel = $f.FullName.Substring($root.Length + 1)
  $lines = [System.IO.File]::ReadAllLines($f.FullName, [System.Text.Encoding]::UTF8)
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -match '[\uD800-\uDBFF]' -or $line -match '[\u2600-\u27BF\uFE0F\u200D\u2764\u2B00-\u2BFF\u00A9\u00AE]') {
      $txt = $line.Trim()
      if ($txt.Length -gt 90) { $txt = $txt.Substring(0, 90) + '...' }
      $out.Add("$rel :: $($i + 1) :: $txt")
    }
  }
}
$dest = Join-Path $scratch "emoji-audit.txt"
[System.IO.File]::WriteAllLines($dest, $out.ToArray(), [System.Text.Encoding]::UTF8)
Write-Output "written: $($out.Count) lines -> $dest"
