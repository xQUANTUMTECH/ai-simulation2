// Script per generare credenziali email di test usando Ethereal
import nodemailer from 'nodemailer';

async function createEtherealAccount() {
  try {
    console.log('Creazione account email di test...');
    
    // Crea un account di test su Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('✅ Account email di test creato con successo!');
    console.log('========================================');
    console.log('Username:', testAccount.user);
    console.log('Password:', testAccount.pass);
    console.log('SMTP Host:', testAccount.smtp.host);
    console.log('SMTP Port:', testAccount.smtp.port);
    console.log('========================================');
    console.log('Usa queste credenziali nel file server-express.mjs');
    
    // Crea un esempio di come usare queste credenziali nel file server
    console.log(`\nConfigura il server così:`);
    console.log(`
const emailTransporter = nodemailer.createTransport({
  host: "${testAccount.smtp.host}",
  port: ${testAccount.smtp.port},
  secure: ${testAccount.smtp.secure},
  auth: {
    user: "${testAccount.user}",
    pass: "${testAccount.pass}"
  }
});`);
    
    // Test email
    console.log('\nInvio email di prova...');
    
    // Crea un trasportatore Email
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    // Invia email di test
    const info = await transporter.sendMail({
      from: '"Test Cafasso" <test@cafasso.it>',
      to: testAccount.user,
      subject: 'Test Email',
      text: 'Se vedi questa email, la configurazione funziona correttamente.',
      html: '<b>Se vedi questa email, la configurazione funziona correttamente.</b>'
    });
    
    console.log('Email inviata:', info.messageId);
    console.log('Anteprima URL:', nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error('Errore nella creazione account:', error);
  }
}

// Esegui la funzione
createEtherealAccount();
