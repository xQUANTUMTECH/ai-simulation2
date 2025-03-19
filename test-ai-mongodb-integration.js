// Test di integrazione per le API AI e MongoDB
// Script per verificare la corretta connessione e funzionamento delle API

const API_URL = 'http://localhost:3000/api';

// Funzione per il test dell'API degli scenari
async function testScenariosAPI() {
  console.log('\n===== Test API Scenari =====');
  try {
    // Lista scenari
    const response = await fetch(`${API_URL}/scenarios`);
    
    if (!response.ok) {
      throw new Error(`Errore nella richiesta: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Lista scenari recuperata con successo`);
    console.log(`   Numero di scenari: ${data.data ? data.data.length : 'N/A'}`);
    
    // Restituisci i dati per l'uso in altri test
    return data;
  } catch (error) {
    console.error(`❌ Errore nel test dell'API degli scenari: ${error.message}`);
    return null;
  }
}

// Funzione per testare OpenAI API attraverso l'endpoint /ai/generate
async function testAIGenerate() {
  console.log('\n===== Test API AI Generate =====');
  try {
    const prompt = "Qual è il ruolo di un consulente del lavoro?";
    
    console.log(`Invio prompt: "${prompt}"`);
    
    const response = await fetch(`${API_URL}/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt,
        model: 'mistral',
        startTime: Date.now()
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Errore nella risposta: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Risposta AI generata con successo`);
    console.log(`   Risposta di ${data.text.length} caratteri`);
    console.log(`   Anteprima risposta: "${data.text.substring(0, 100)}..."`);
    
    return data;
  } catch (error) {
    console.error(`❌ Errore nel test dell'API AI Generate: ${error.message}`);
    return null;
  }
}

// Funzione per testare il TTS attraverso l'endpoint /ai/tts
async function testTTS() {
  console.log('\n===== Test API TTS =====');
  try {
    const text = "Benvenuto alla Cafasso AI Academy. Questo è un test del sistema Text-to-Speech.";
    
    console.log(`Invio testo per TTS: "${text}"`);
    
    const response = await fetch(`${API_URL}/ai/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        options: {
          voice: 'alloy',
          language: 'it'
        },
        startTime: Date.now()
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Errore nella risposta TTS: ${response.status} - ${errorText}`);
    }
    
    // Se è arrivato qui, il TTS ha funzionato
    console.log(`✅ Audio TTS generato con successo`);
    console.log(`   Content-Type: ${response.headers.get('Content-Type')}`);
    
    // Non consumiamo l'audio, verifichiamo solo che sia stato generato
    return true;
  } catch (error) {
    console.error(`❌ Errore nel test dell'API TTS: ${error.message}`);
    return null;
  }
}

// Funzione per testare la generazione di scenari
async function testScenarioGeneration() {
  console.log('\n===== Test Generazione Scenario =====');
  try {
    const messages = [
      { role: 'user', content: 'Ho bisogno di uno scenario formativo sul licenziamento per giusta causa.' },
      { role: 'assistant', content: 'Certamente, posso aiutarti a creare uno scenario formativo. Vuoi che includa aspetti specifici della procedura di licenziamento?' },
      { role: 'user', content: 'Sì, vorrei che includesse le procedure corrette, la documentazione necessaria e un esempio di colloquio.' }
    ];
    
    console.log(`Invio richiesta generazione scenario con ${messages.length} messaggi`);
    
    const response = await fetch(`${API_URL}/ai/scenario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        startTime: Date.now()
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Errore nella generazione scenario: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ Scenario generato con successo`);
    console.log(`   Titolo: ${data.title}`);
    console.log(`   Obiettivi: ${data.objectives ? data.objectives.length : 0}`);
    console.log(`   Avatar: ${data.avatars ? data.avatars.length : 0}`);
    console.log(`   ID generato: ${data.id}`);
    
    return data;
  } catch (error) {
    console.error(`❌ Errore nella generazione scenario: ${error.message}`);
    return null;
  }
}

// Funzione principale per eseguire tutti i test
async function runAllTests() {
  console.log('======================================================');
  console.log('     TEST INTEGRAZIONE API E MONGODB PER CAFASSO AI   ');
  console.log('======================================================');
  console.log(`Data e ora di inizio: ${new Date().toLocaleString()}`);
  
  // Verifica che il server sia in esecuzione
  try {
    const healthResponse = await fetch(`${API_URL}`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`✅ Server Express in esecuzione, stato: ${healthData.status}`);
      console.log(`   Versione: ${healthData.version}`);
      console.log(`   MongoDB: ${healthData.mongodb}`);
    } else {
      throw new Error(`Errore nella risposta: ${healthResponse.status}`);
    }
  } catch (error) {
    console.error(`❌ Il server Express non è in esecuzione o non è raggiungibile`);
    console.error(`   Errore: ${error.message}`);
    console.log('\nAssicurati che il server Express sia in esecuzione su http://localhost:3000 prima di eseguire i test.');
    return;
  }
  
  // Esegui i test
  await testScenariosAPI();
  await testAIGenerate();
  await testTTS();
  const scenario = await testScenarioGeneration();
  
  // Verifica che lo scenario generato sia stato salvato
  if (scenario && scenario.id) {
    console.log('\n===== Verifica Persistenza Scenario =====');
    try {
      const response = await fetch(`${API_URL}/scenarios/${scenario.id}`);
      
      if (!response.ok) {
        throw new Error(`Errore nel recupero dello scenario: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Scenario recuperato con successo dal database`);
      console.log(`   ID: ${data.id}`);
      console.log(`   Titolo: ${data.title}`);
      
      return data;
    } catch (error) {
      console.error(`❌ Errore nella verifica della persistenza: ${error.message}`);
    }
  }
  
  console.log('\n======================================================');
  console.log('     TEST COMPLETATI                                 ');
  console.log('======================================================');
  console.log(`Data e ora di fine: ${new Date().toLocaleString()}`);
}

// Esegui i test
runAllTests().catch(error => {
  console.error('Errore durante l\'esecuzione dei test:', error);
});
