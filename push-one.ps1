# Daily push: publishes the next local commit to origin as a fresh copy dated today (random time).
# The copy has the same files, message and author; only the dates differ, so the local history
# (also pushed to dash-last) is never rewritten. Progress is kept in .git/daily-push-marker.
param([switch]$DryRun)
Set-Location $PSScriptRoot
$OutputEncoding = [Text.UTF8Encoding]::new($false)
git fetch -q origin
$gitDir = (Resolve-Path (git rev-parse --git-dir)).Path # absolute: .NET file APIs ignore Set-Location
$marker = Join-Path $gitDir 'daily-push-marker'
$last = if (Test-Path $marker) { (Get-Content $marker -Raw).Trim() } else { git rev-parse origin/main }
$next = git rev-list --reverse "$last..main" | Select-Object -First 1
if (-not $next) { 'nothing to push'; exit }

# random time today between 09:00 and now (within the last 30 min if it's earlier than ~09:30)
$now = Get-Date
$from = $now.Date.AddHours(9)
if ($now -lt $from.AddMinutes(30)) { $from = $now.AddMinutes(-30) }
$when = $from.AddSeconds((Get-Random -Minimum 0 -Maximum ([int]($now - $from).TotalSeconds)))
$date = $when.ToString('yyyy-MM-ddTHH:mm:ss') + (Get-Date -Format 'zzz').Replace(':', '')

$env:GIT_AUTHOR_NAME = git log -1 --format=%an $next
$env:GIT_AUTHOR_EMAIL = git log -1 --format=%ae $next
$env:GIT_AUTHOR_DATE = $date
$env:GIT_COMMITTER_DATE = $date
$msgFile = Join-Path $gitDir 'daily-push-msg'
[IO.File]::WriteAllText($msgFile, ((git log -1 --format=%B $next) -join "`n"), [Text.UTF8Encoding]::new($false))
$copy = git commit-tree "$next^{tree}" -p origin/main -F $msgFile
"$next -> $copy @ $date : $(git log -1 --format=%s $next)"
if ($DryRun) { exit }
git push origin "${copy}:refs/heads/main"
if ($LASTEXITCODE -eq 0) { Set-Content $marker $next }
