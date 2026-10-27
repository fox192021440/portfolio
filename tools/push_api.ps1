<#
  push_api.ps1 —— 通过 GitHub API 发布静态站点（github.com 的 git 端口在部分网络下不可用）
  用法：
    powershell -NoProfile -ExecutionPolicy Bypass -File tools\push_api.ps1 -Message "更新作品集"
#>
param(
  [string]$Repo   = 'fox192021440/portfolio',
  [string]$Root   = (Split-Path -Parent $PSScriptRoot),
  [string]$Branch = 'main',
  [string]$Message = ("update site " + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Get-GitHubToken {
  $gitCandidates = @(
    "$env:LOCALAPPDATA\GitHubDesktop\app-3.6.5\resources\app\git\cmd\git.exe"
  )
  $git = $gitCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $git) { $git = (Get-Command git -ErrorAction SilentlyContinue).Source }
  if (-not $git) { throw 'git.exe not found' }
  $env:GIT_TERMINAL_PROMPT = '0'
  $out = "protocol=https`nhost=github.com`n`n" | & $git credential fill 2>$null
  $tok = ($out | Where-Object { $_ -match '^password=' }) -replace '^password=', ''
  if (-not $tok) { throw 'no github token in credential manager' }
  return $tok
}

$Token = Get-GitHubToken
$Headers = @{
  Authorization          = "token $Token"
  'User-Agent'           = 'portfolio-publisher'
  Accept                 = 'application/vnd.github+json'
}
$Api = "https://api.github.com/repos/$Repo"

function Invoke-Api {
  param([string]$Method, [string]$Uri, $Body)
  $req = @{ Method = $Method; Uri = $Uri; Headers = $Headers; TimeoutSec = 60 }
  if ($null -ne $Body) {
    $req.Body = ($Body | ConvertTo-Json -Depth 12 -Compress)
    $req.ContentType = 'application/json; charset=utf-8'
  }
  Invoke-RestMethod @req
}

# 1) 收集文件
$skipDirs = @('.git', 'node_modules', '.obsidian')
$files = Get-ChildItem -Path $Root -Recurse -File -Force | Where-Object {
  $rel = $_.FullName.Substring($Root.Length + 1) -replace '\\', '/'
  $top = $rel.Split('/')[0]
  ($skipDirs -notcontains $top) -and ($rel -notlike '.git*')
}

"files: $($files.Count)"

# 2) 上传 blob
$entries = @()
$i = 0
foreach ($f in $files) {
  $i++
  $rel = ($f.FullName.Substring($Root.Length + 1) -replace '\\', '/')
  $b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($f.FullName))
  $blob = Invoke-Api -Method Post -Uri "$Api/git/blobs" -Body @{
    content  = $b64
    encoding = 'base64'
  }
  $mode = if ($rel -match '\.(ps1|sh|cmd|bat)$') { '100755' } else { '100644' }
  $entries += @{ path = $rel; mode = $mode; type = 'blob'; sha = $blob.sha }
  if ($i % 10 -eq 0 -or $i -eq $files.Count) { "  uploaded $i / $($files.Count)" }
}

# 3) 建 tree（不含 base_tree：远端文件集合与本地完全一致）
$tree = Invoke-Api -Method Post -Uri "$Api/git/trees" -Body @{ tree = $entries }

# 4) 取父提交（空仓时没有）
$parents = @()
try {
  $ref = Invoke-Api -Method Get -Uri "$Api/git/ref/heads/$Branch"
  if ($ref.object.sha) { $parents = @($ref.object.sha) }
} catch {
  "no existing branch $Branch (first publish)"
}

# 5) 建 commit
$commitBody = @{ message = $Message; tree = $tree.sha }
if ($parents.Count -gt 0) { $commitBody.parents = $parents }
$commit = Invoke-Api -Method Post -Uri "$Api/git/commits" -Body $commitBody
"commit: $($commit.sha)"

# 6) 更新 / 创建分支
if ($parents.Count -gt 0) {
  Invoke-Api -Method Patch -Uri "$Api/git/refs/heads/$Branch" -Body @{ sha = $commit.sha; force = $true } | Out-Null
  "branch $Branch updated"
} else {
  Invoke-Api -Method Post -Uri "$Api/git/refs" -Body @{ ref = "refs/heads/$Branch"; sha = $commit.sha } | Out-Null
  "branch $Branch created"
}
"done: https://github.com/$Repo/tree/$Branch"
