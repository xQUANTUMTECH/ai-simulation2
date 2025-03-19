// Test di connessione OpenRouter
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_API_URL
});

async function testOpenRouter() {
  try {
    console.log('Testing OpenRouter connection...');
    console.log('API Key:', process.env.OPENROUTER_API_KEY ? 'Available' : 'Missing');
    console.log('API URL:', process.env.OPENROUTER_API_URL);
    
    console.log('\nInviando richiesta a DeepSeek...');
    console.log('Attendere, potrebbe richiedere 30-60 secondi...');
    
    // Test con modello DeepSeek R1 Zero
    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-r1-zero:free',
      messages: [{ role: 'user', content: 'Qual è il ruolo di un consulente del lavoro? Rispondi brevemente in italiano.' }],
      timeout: 60000 // Timeout di 60 secondi
    });
    
    console.log('\nRisposta ricevuta da modello:');
    console.log(response.choices[0].message.content);
    console.log('\nTest completato con successo!');
  } catch (error) {
    console.error('Errore test OpenRouter:', error);
    console.error('Dettagli errore:', JSON.stringify(error, null, 2));
  }
}

console.log('===========================================');
console.log('      TEST DI CONNESSIONE OPENROUTER      ');
console.log('===========================================');

testOpenRouter();
