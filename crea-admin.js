// Script semplificato per creare un utente admin
import { exec } from 'child_process';

const adminUser = {
  email: 'direzione@cafasso.it',
  username: 'direzione',
  fullName: 'Direttore Cafasso',
  role: 'ADMIN',
  password: 'Caf@sso2025!',
  isVerified: true,
  createdAt: new Date().toISOString()
};

// Formatta il comando curl
const curlCommand = `curl -X POST -H "Content-Type: application/json" ` + 
                    `-d "${JSON.stringify(adminUser).replace(/"/g, '\\"')}" ` +
                    `http://localhost:3000/api/users`;

console.log('Tentativo di creazione utente admin...');
console.log('Comando:', curlCommand);

// Esegui il comando
exec(curlCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Errore nell'esecuzione: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`❌ Errore: ${stderr}`);
    return;
  }
  console.log('✅ Risposta dal server:');
  console.log(stdout);
  
  // Verifica gli utenti esistenti
  verifyUsers();
});

function verifyUsers() {
  const getCommand = 'curl http://localhost:3000/api/users';
  
  console.log('\nVerifica degli utenti esistenti...');
  
  exec(getCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Errore nella verifica: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`❌ Errore: ${stderr}`);
      return;
    }
    
    try {
      const users = JSON.parse(stdout);
      console.log(`✅ Utenti nel database: ${users.length}`);
      
      // Verifica se l'utente admin esiste
      const adminExists = users.some(user => 
        user.email === adminUser.email && 
        user.role === adminUser.role
      );
      
      if (adminExists) {
        console.log('✅ Utente admin trovato nel database!');
      } else {
        console.log('❌ Utente admin non trovato nel database.');
      }
    } catch (e) {
      console.error('❌ Errore nel parsing della risposta:', e);
      console.log('Risposta originale:', stdout);
    }
  });
}
