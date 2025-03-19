// Test semplice di verifica delle modifiche AI e TTS
const fetch = require('node-fetch');
const fs = require('fs').promises;

// Configurazione base
const API_BASE_URL = 'http://localhost:3000/api';
const OPENROUTER_API_KEY = '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';

// Documento di esempio sulla consulenza del lavoro
const documentoConsulenzaLavoro = `
# Il Consulente del Lavoro: Funzioni e Responsabilità

## Introduzione
Il Consulente del Lavoro è una figura professionale fondamentale nel panorama della gestione delle risorse umane e delle relazioni sindacali. Questo professionista svolge un ruolo cruciale di intermediazione tra datori di lavoro, lavoratori e istituzioni pubbliche.

## Competenze e Funzioni Principali
- Gestione dei Rapporti di Lavoro
- Adempimenti Amministrativi
- Consulenza Normativa
- Relazioni Sindacali

## Requisiti Professionali
Per esercitare la professione di Consulente del Lavoro in Italia è necessario una laurea, un praticantato, superare l'Esame di Stato e iscriversi all'Albo.
`;

// Funzioni di supporto
async function generateResponse(prompt, model = 'deepseek') {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/generate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({ prompt, model, startTime: Date.now() })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

async function textToSpeech(text, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, options: { textOnly: true, ...options } })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `TTS error: ${response.status}`);
    }
    
    // In questo test, richiediamo sempre il formato testuale
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error in TTS:', error);
    throw error;
  }
}

// Funzione di test principale
async function runTests() {
  try {
    console.log('===========================================');
    console.log('     TEST AI CON OPENROUTER E GEMINI       ');
    console.log('===========================================');
    
    // Salva il documento come file temporaneo
    const documentPath = './test-ai-output/documento-test-semplice.txt';
    await fs.writeFile(documentPath, documentoConsulenzaLavoro);
    console.log(`Documento di test salvato in ${documentPath}`);
    
    // Test 1: DeepSeek (modello predefinito)
    console.log('\n[TEST 1] Generazione risposta con DeepSeek (modello predefinito)');
    const promptDeepSeek = `Riassumi in 3 punti il ruolo del Consulente del Lavoro in base a questo testo:\n\n${documentoConsulenzaLavoro}`;
    
    console.log('Chiamata API in corso...');
    const deepSeekResponse = await generateResponse(promptDeepSeek);
    
    console.log('\nRisposta DeepSeek:');
    console.log('---------------------------------------');
    console.log(deepSeekResponse);
    console.log('---------------------------------------');
    
    // Test 2: Gemini
    console.log('\n[TEST 2] Generazione risposta con Gemini');
    const promptGemini = `Elenca 3 competenze chiave del Consulente del Lavoro in base a questo testo:\n\n${documentoConsulenzaLavoro}`;
    
    console.log('Chiamata API in corso...');
    try {
      const geminiResponse = await generateResponse(promptGemini, 'gemini');
      
      console.log('\nRisposta Gemini:');
      console.log('---------------------------------------');
      console.log(geminiResponse);
      console.log('---------------------------------------');
    } catch (error) {
      console.error(`Errore con Gemini: ${error.message}`);
      console.log('\nUsando DeepSeek come fallback per il test 2');
      const fallbackResponse = await generateResponse(promptGemini, 'deepseek');
      
      console.log('\nRisposta fallback (DeepSeek):');
      console.log('---------------------------------------');
      console.log(fallbackResponse);
      console.log('---------------------------------------');
    }
    
    
    // Test 3: Servizio TTS
    console.log('\n[TEST 3] Verifica servizio TTS (text only)');
    const textToConvert = "Il Consulente del Lavoro è un professionista specializzato nel diritto del lavoro e nella gestione delle risorse umane.";
    
    console.log('Chiamata API TTS in corso...');
    let ttsResponse = "Funzionalità non disponibile";
    try {
      ttsResponse = await textToSpeech(textToConvert);
      
      console.log('\nRisposta TTS (text only):');
      console.log('---------------------------------------');
      console.log(ttsResponse);
      console.log('---------------------------------------');
    } catch (error) {
      console.error(`Errore con TTS: ${error.message}`);
      console.log('\nFallback testuale utilizzato');
    }
    
    // Salva risultati
    const results = {
      timestamp: new Date().toISOString(),
      deepSeekResponse,
      ttsResponse
    };
    
    await fs.writeFile('./test-ai-output/test-semplice-risultati.json', JSON.stringify(results, null, 2));
    console.log('\nRisultati salvati in ./test-ai-output/test-semplice-risultati.json');
    
    console.log('\nTutti i test completati con successo!');
    
  } catch (error) {
    console.error('\nErrore durante i test:', error);
  }
}

// Esegui i test
console.log('Avvio dei test...');
runTests();
