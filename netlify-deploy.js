const { execSync } = require('child_process');

// Funzione per eseguire comandi e ottenere l'output
function runCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(`✅ Comando eseguito: ${command}`);
    return output;
  } catch (error) {
    console.error(`❌ Errore nell'esecuzione di: ${command}`);
    console.error(error.message);
    return null;
  }
}

// Verifica se ci sono modifiche non salvate
console.log('🔍 Verifico modifiche non salvate...');
const status = runCommand('git status --porcelain');

if (status && status.trim() !== '') {
  console.log('⚠️ Ci sono modifiche non salvate:');
  console.log(status);
}

// Costruisci l'applicazione
console.log('\n🔨 Costruzione dell\'applicazione in corso...');
const buildOutput = runCommand('npm run build');

if (!buildOutput) {
  console.error('❌ Errore nella build dell\'applicazione. Deploy annullato.');
  process.exit(1);
}

// Esegui il deploy su Netlify
console.log('\n🚀 Esecuzione del deploy su Netlify...');
console.log('➡️ Eseguendo deploy in ambiente di anteprima...');
const draftDeployOutput = runCommand('npx netlify deploy');

if (!draftDeployOutput) {
  console.error('❌ Errore nel deploy di anteprima. Deploy in produzione annullato.');
  process.exit(1);
}

console.log('\n🌐 URL di anteprima:');
const draftUrlMatch = draftDeployOutput.match(/Website draft URL:\s+([^\s]+)/);
if (draftUrlMatch) {
  console.log(`🔗 ${draftUrlMatch[1]}`);
}

// Chiedi conferma per il deploy in produzione
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\n✋ Vuoi procedere con il deploy in produzione? (s/N): ', (answer) => {
  if (answer.toLowerCase() === 's') {
    console.log('\n🚀 Esecuzione del deploy in produzione...');
    const prodDeployOutput = runCommand('npx netlify deploy --prod');
    
    if (prodDeployOutput) {
      console.log('\n🎉 Deploy in produzione completato!');
      
      // Estrai l'URL di produzione
      const prodUrlMatch = prodDeployOutput.match(/Website URL:\s+([^\s]+)/);
      if (prodUrlMatch) {
        console.log(`🔗 URL Sito: ${prodUrlMatch[1]}`);
      }
    } else {
      console.error('❌ Errore nel deploy in produzione.');
    }
  } else {
    console.log('\n❌ Deploy in produzione annullato.');
  }
  
  rl.close();
});

rl.on('close', () => {
  console.log('\n👋 Deploy completato. Verifica i log per ulteriori dettagli.');
});
