# Script PowerShell per creare un utente standard

# Definizione delle informazioni utente
$normalUser = @{
  email = "utente@cafasso.it"
  username = "utente"
  fullName = "Utente Standard"
  role = "USER"
  password = "CafassoUser2025!"
  isVerified = $true
  createdAt = (Get-Date).ToString("o")
}

# Converti in JSON
$jsonBody = $normalUser | ConvertTo-Json -Compress

Write-Host "Tentativo di creazione utente standard..." -ForegroundColor Cyan
Write-Host "JSON: $jsonBody" -ForegroundColor Gray

# Esegui la chiamata API per creare l'utente
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/users" `
                                -Method Post `
                                -ContentType "application/json" `
                                -Body $jsonBody
    
    Write-Host "✅ Utente standard creato con successo!" -ForegroundColor Green
    Write-Host "Dettagli utente:" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "❌ Errore nella creazione dell'utente standard:" -ForegroundColor Red
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
    
    $userExists = $false
    foreach ($user in $users) {
        if ($user.email -eq $normalUser.email -and $user.role -eq $normalUser.role) {
            $userExists = $true
            break
        }
    }
    
    if ($userExists) {
        Write-Host "✅ Utente standard trovato nel database!" -ForegroundColor Green
    } else {
        Write-Host "❌ Utente standard non trovato nel database." -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Errore nella verifica dell'utente:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
