[CmdletBinding()]
param(
    [switch]$Codex,
    [switch]$OpenCode,
    [switch]$Claude,
    [switch]$Force,
    [switch]$Uninstall,
    [string[]]$Skill
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$skillsRoot = Join-Path $repoRoot 'skills'
$userRoot = [Environment]::GetFolderPath('UserProfile')

$targets = [System.Collections.Generic.List[object]]::new()
if ($Codex) {
    $targets.Add([pscustomobject]@{ Name = 'Codex'; Path = Join-Path $userRoot '.codex\skills' })
}
if ($OpenCode) {
    $targets.Add([pscustomobject]@{ Name = 'OpenCode'; Path = Join-Path $userRoot '.config\opencode\skills' })
}
if ($Claude) {
    $targets.Add([pscustomobject]@{ Name = 'Claude Code'; Path = Join-Path $userRoot '.claude\skills' })
}

if ($targets.Count -eq 0) {
    $detected = @(
        [pscustomobject]@{ Name = 'Codex'; Root = Join-Path $userRoot '.codex'; Skills = Join-Path $userRoot '.codex\skills' },
        [pscustomobject]@{ Name = 'OpenCode'; Root = Join-Path $userRoot '.config\opencode'; Skills = Join-Path $userRoot '.config\opencode\skills' },
        [pscustomobject]@{ Name = 'Claude Code'; Root = Join-Path $userRoot '.claude'; Skills = Join-Path $userRoot '.claude\skills' }
    )
    foreach ($candidate in $detected) {
        if (Test-Path -LiteralPath $candidate.Root) {
            $targets.Add([pscustomobject]@{ Name = $candidate.Name; Path = $candidate.Skills })
        }
    }
}

if ($targets.Count -eq 0) {
    throw '找不到支援的客戶端。請指定 -Codex、-OpenCode 或 -Claude。'
}

if (-not $Skill -or $Skill.Count -eq 0) {
    $Skill = Get-ChildItem -LiteralPath $skillsRoot -Directory |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') } |
        Select-Object -ExpandProperty Name
}

function Get-TreeHash {
    param([Parameter(Mandatory)][string]$Root)

    $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $result = @{}
    foreach ($file in Get-ChildItem -LiteralPath $rootFull -File -Recurse) {
        $relative = $file.FullName.Substring($rootFull.Length).TrimStart([char[]]@('\', '/'))
        $result[$relative] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    }
    return $result
}

function Assert-TreeParity {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string]$Destination
    )

    $sourceHashes = Get-TreeHash -Root $Source
    $destinationHashes = Get-TreeHash -Root $Destination
    $missing = @($sourceHashes.Keys | Where-Object { -not $destinationHashes.ContainsKey($_) })
    $extra = @($destinationHashes.Keys | Where-Object { -not $sourceHashes.ContainsKey($_) })
    $changed = @($sourceHashes.Keys | Where-Object {
        $destinationHashes.ContainsKey($_) -and $destinationHashes[$_] -ne $sourceHashes[$_]
    })

    if ($missing.Count -or $extra.Count -or $changed.Count) {
        throw "安裝內容雜湊不一致：missing=$($missing.Count), extra=$($extra.Count), changed=$($changed.Count)"
    }
    return $sourceHashes.Count
}

foreach ($target in $targets) {
    $targetRoot = [IO.Path]::GetFullPath($target.Path)
    New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
    $markerRoot = Join-Path $targetRoot '.shuohao-skills'

    foreach ($name in $Skill) {
        if ($name -notmatch '^[a-z0-9-]+$') {
            throw "技能名稱不合法：$name"
        }

        $source = [IO.Path]::GetFullPath((Join-Path $skillsRoot $name))
        $destination = [IO.Path]::GetFullPath((Join-Path $targetRoot $name))
        $marker = Join-Path $markerRoot "$name.json"
        $expectedPrefix = $targetRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
        if (-not $destination.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
            throw "拒絕處理目標根目錄外的路徑：$destination"
        }
        if (-not (Test-Path -LiteralPath (Join-Path $source 'SKILL.md'))) {
            throw "$name 不是有效技能：缺少 SKILL.md"
        }

        if ($Uninstall) {
            if (Test-Path -LiteralPath $destination) {
                if (-not (Test-Path -LiteralPath $marker) -and -not $Force) {
                    throw "拒絕移除 $destination：找不到本安裝器的來源標記。確認要刪除時請加上 -Force。"
                }
                Remove-Item -LiteralPath $destination -Recurse -Force
                if (Test-Path -LiteralPath $marker) { Remove-Item -LiteralPath $marker -Force }
                Write-Host "− [$($target.Name)] 已移除 $destination"
            }
            continue
        }

        if (Test-Path -LiteralPath $destination) {
            if (-not $Force) {
                throw "$destination 已存在；確認要更新時請加上 -Force。"
            }
            Remove-Item -LiteralPath $destination -Recurse -Force
        }

        Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
        $fileCount = Assert-TreeParity -Source $source -Destination $destination
        New-Item -ItemType Directory -Path $markerRoot -Force | Out-Null
        [pscustomobject]@{
            repository = 'stevenke1981/shuohao-skills-zh-tw'
            skill = $name
            source = $source
            installed_at = [DateTimeOffset]::Now.ToString('o')
        } | ConvertTo-Json | Set-Content -LiteralPath $marker -Encoding UTF8
        Write-Host "✓ [$($target.Name)] $name：已安裝並驗證 $fileCount 個檔案"
    }
}
