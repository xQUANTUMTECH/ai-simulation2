# Script PowerShell per creare un utente admin

# Definizione delle informazioni utente
$adminUser = @{
  email = "direzione@cafasso.it"
  username = "direzione"
  fullName = "Direttore Cafasso"
  role = "ADMIN"
  password = "Caf@sso2025!"
  isVerified = $true
  createdAt = (Get-Date).ToString("o")
}

# Converti in JSON
$jsonBody = $adminUser | ConvertTo-Json -Compress

Write-Host "Tentativo di creazione utente admin..." -ForegroundColor Cyan
Write-Host "JSON: $jsonBody" -ForegroundColor Gray

# Esegui la chiamata API per creare l'utente
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/users" `
                                -Method Post `
                                -ContentType "application/json" `
                                -Body $jsonBody
    
    Write-Host "✅ Utente admin creato con successo!" -ForegroundColor Green
    Write-Host "Dettagli utente:" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "❌ Errore nella creazione dell'utente admin:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # Mostra dettagli aggiuntivi se disponibili
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Dettagli risposta:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
    
    exit 1
}

# Verifica che l'utente sia stato creato
Write-Host "`nVerifica che l'utente sia stato creato..." -ForegroundColor Cyan

try {
    $users = Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method Get
    
    Write-Host "Utenti nel database: $($users.Count)" -ForegroundColor Cyan
    
    $adminExists = $false
    foreach ($user in $users) {
        if ($user.email -eq $adminUser.email -and $user.role -eq $adminUser.role) {
            $adminExists = $true
            break
        }
    }
    
    if ($adminExists) {
        Write-Host "✅ Utente admin trovato nel database!" -ForegroundColor Green
    } else {
        Write-Host "❌ Utente admin non trovato nel database." -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Errore nella verifica dell'utente:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
