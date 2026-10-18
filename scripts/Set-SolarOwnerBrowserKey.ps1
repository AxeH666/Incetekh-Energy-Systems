param([switch]$Check)

# Local hidden input only. No Google requests; never print the key.
$ErrorActionPreference = 'Stop'
$solarOwnerFolder = Join-Path $env:USERPROFILE '.codex\secrets\incetekh-solar-owner-preview'
$solarOwnerPath = Join-Path $solarOwnerFolder 'browser-key.dpapi'
if ($Check) {
    if (-not (Test-Path -LiteralPath $solarOwnerPath -PathType Leaf)) { Write-Host 'Browser key not installed.'; exit 2 }
    $solarOwnerSecret = ConvertTo-SecureString ([IO.File]::ReadAllText($solarOwnerPath))
    if ($solarOwnerSecret.Length -lt 20) { throw 'Invalid protected key.' }
    Write-Host 'Protected browser key readable. Google restrictions and validity are not verified by this check.'
    exit 0
}
if (Test-Path -LiteralPath $solarOwnerPath) { Write-Host 'Existing browser key retained. Nothing overwritten.'; exit 0 }
Write-Host 'Use a SEPARATE browser key: Website restriction http://127.0.0.1:4333/*; API restriction Maps JavaScript API only.'
Write-Host 'Do not use the existing Solar server key. Do not paste any key into chat.'
$solarOwnerConfirmed = Read-Host 'Have you verified those restrictions in Google Cloud? Type YES'
if ($solarOwnerConfirmed -cne 'YES') { Write-Host 'Cancelled. No credential saved.'; exit 1 }
$solarOwnerSecret = Read-Host 'Paste the separate browser key here (hidden)' -AsSecureString
if ($solarOwnerSecret.Length -lt 20 -or $solarOwnerSecret.Length -gt 200) { throw 'Unexpected key length.' }
$solarServerPath = Join-Path $env:USERPROFILE '.codex\secrets\incetekh-solar-feasibility\key.dpapi'
if (Test-Path -LiteralPath $solarServerPath) {
    $solarServerSecret = ConvertTo-SecureString ([IO.File]::ReadAllText($solarServerPath))
    if ([Net.NetworkCredential]::new('', $solarOwnerSecret).Password -ceq [Net.NetworkCredential]::new('', $solarServerSecret).Password) {
        throw 'This is the existing Solar server key. A separate browser key is required; nothing saved.'
    }
}
[IO.Directory]::CreateDirectory($solarOwnerFolder) | Out-Null
$solarOwnerAcl = New-Object Security.AccessControl.DirectorySecurity
$solarOwnerAcl.SetAccessRuleProtection($true, $false)
$solarOwnerIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().User
$solarOwnerAcl.SetOwner($solarOwnerIdentity)
$solarOwnerRule = New-Object Security.AccessControl.FileSystemAccessRule($solarOwnerIdentity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$solarOwnerAcl.AddAccessRule($solarOwnerRule)
Set-Acl -LiteralPath $solarOwnerFolder -AclObject $solarOwnerAcl
$solarOwnerEncrypted = ConvertFrom-SecureString $solarOwnerSecret
$solarOwnerStream = [IO.File]::Open($solarOwnerPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
try {
    $solarOwnerBytes = [Text.Encoding]::UTF8.GetBytes($solarOwnerEncrypted)
    $solarOwnerStream.Write($solarOwnerBytes, 0, $solarOwnerBytes.Length)
} finally { $solarOwnerStream.Dispose() }
Write-Host 'Saved with Windows-user encryption and restricted folder access. No API calls made. Reply Ready in chat.'
