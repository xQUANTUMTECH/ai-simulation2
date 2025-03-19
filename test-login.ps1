# Script PowerShell per testare l'API di login

# Parametri per il test
$apiUrl = "http://localhost:3000/api/auth/login"
$contentType = "application/json"

# Funzione per testare il login
function Test-Login {
    param (
        [string]$loginMethod,
        [string]$identifier,
        [string]$password
    )
    
    Write-Host "======================================================="
    Write-Host "Test login con $loginMethod" -ForegroundColor Cyan
    Write-Host "======================================================="
    
    # Crea il payload JSON appropriato
    if ($loginMethod -eq "email") {
        $body = @{
            email = $identifier
            password = $password
        } | ConvertTo-Json
    } else {
        $body = @{
            username = $identifier
            password = $password
        } | ConvertTo-Json
    }
    
    Write-Host "Richiesta:" -ForegroundColor Gray
    Write-Host "URL: $apiUrl" -ForegroundColor Gray
    Write-Host "Payload: $body" -ForegroundColor Gray
    Write-Host ""
    
    try {
        # Esegui la richiesta
        $response = Invoke-RestMethod -Method POST -Uri $apiUrl -ContentType $contentType -Body $body -ErrorAction Stop
        
        # Mostra la risposta di successo
        Write-Host "✅ Login effettuato con successo!" -ForegroundColor Green
        Write-Host "Risposta dal server:" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 4 | Write-Host
    } catch {
        # Gestisci errori
        Write-Host "❌ Login fallito!" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $reader.BaseStream.Position = 0
                $reader.DiscardBufferedData()
                $responseBody = $reader.ReadToEnd()
                
                Write-Host "Status code: $statusCode" -ForegroundColor Red
                Write-Host "Dettagli errore: $responseBody" -ForegroundColor Red
            } catch {
                Write-Host "Status code: $statusCode" -ForegroundColor Red
                Write-Host "Dettagli errore non disponibili" -ForegroundColor Red
            }
        } else {
            Write-Host "Errore: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "======================================================="
    Write-Host ""
}

# Test con credenziali utente admin (entrambi i metodi)
Test-Login -loginMethod "email" -identifier "direzione@cafasso.it" -password "Caf@sso2025!"
Test-Login -loginMethod "username" -identifier "direzione" -password "Caf@sso2025!"

# Test con credenziali utente standard (entrambi i metodi)
Test-Login -loginMethod "email" -identifier "utente@cafasso.it" -password "CafassoUser2025!"
Test-Login -loginMethod "username" -identifier "utente" -password "CafassoUser2025!"

# Test con password errata
Test-Login -loginMethod "email" -identifier "direzione@cafasso.it" -password "PasswordErrata123!"
