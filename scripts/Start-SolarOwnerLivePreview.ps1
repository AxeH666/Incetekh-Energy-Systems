# Start only the already approved local test. Keys travel over a private stdin pipe.
$ErrorActionPreference = 'Stop'
$solarOwnerRoot = Split-Path -Parent $PSScriptRoot
$solarOwnerKeyPath = Join-Path $env:USERPROFILE '.codex\secrets\incetekh-solar-owner-preview\browser-key.dpapi'
$solarServerKeyPath = Join-Path $env:USERPROFILE '.codex\secrets\incetekh-solar-feasibility\key.dpapi'
if (-not (Test-Path -LiteralPath $solarOwnerKeyPath)) { throw 'Separate protected browser key missing. Run Set-SolarOwnerBrowserKey.ps1 first.' }
if (-not (Test-Path -LiteralPath $solarServerKeyPath)) { throw 'Protected Solar server key missing.' }
if (Get-NetTCPConnection -LocalPort 4333 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 4333 is occupied. Stop only the known local demo process before starting live mode.' }
$solarBrowserKey = [Net.NetworkCredential]::new('', (ConvertTo-SecureString ([IO.File]::ReadAllText($solarOwnerKeyPath)))).Password
$solarServerKey = [Net.NetworkCredential]::new('', (ConvertTo-SecureString ([IO.File]::ReadAllText($solarServerKeyPath)))).Password
if ($solarBrowserKey -ceq $solarServerKey) { throw 'Browser and server keys must be separate.' }
$solarOwnerStart = New-Object Diagnostics.ProcessStartInfo
$solarOwnerStart.FileName = (Get-Command node).Source
$solarOwnerStart.Arguments = 'scripts/solar-owner-preview.mjs'
$solarOwnerStart.WorkingDirectory = $solarOwnerRoot
$solarOwnerStart.UseShellExecute = $false
$solarOwnerStart.CreateNoWindow = $true
$solarOwnerStart.RedirectStandardInput = $true
$solarOwnerStart.EnvironmentVariables['SOLAR_OWNER_LIVE'] = 'approved-2026-10-18'
$solarOwnerStart.EnvironmentVariables['SOLAR_OWNER_PORT'] = '4333'
$solarOwnerProcess = [Diagnostics.Process]::Start($solarOwnerStart)
try {
    $solarOwnerProcess.StandardInput.WriteLine((@{browserKey=$solarBrowserKey;serverKey=$solarServerKey} | ConvertTo-Json -Compress))
    $solarOwnerProcess.StandardInput.Close()
} finally { $solarBrowserKey=$null; $solarServerKey=$null }
$solarOwnerProcess.Id | Set-Content (Join-Path $solarOwnerRoot '.wrangler\solar-preview-planning\owner-live-server.pid')
Write-Host "Private live preview starting on http://127.0.0.1:4333/#solar-planner (PID $($solarOwnerProcess.Id)). Persistent cap: 3 map loads, 1 Solar attempt. No enquiry or email writes."
$solarOwnerProcess.WaitForExit()
exit $solarOwnerProcess.ExitCode
