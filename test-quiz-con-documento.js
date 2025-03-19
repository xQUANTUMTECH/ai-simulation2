// Test di generazione quiz da documento reale
// Utilizza i nuovi modelli AI configurati (DeepSeek e Gemini)
import { promises as fs } from 'fs';
import { aiService } from './src/services/ai-service.ts';
import { quizAIService } from './src/services/quiz-ai-service.ts';

// Documento di esempio sulla consulenza del lavoro
const documentoConsulenzaLavoro = `
# Il Consulente del Lavoro: Funzioni e Responsabilità

## Introduzione
Il Consulente del Lavoro è una figura professionale fondamentale nel panorama della gestione delle risorse umane e delle relazioni sindacali. Questo professionista svolge un ruolo cruciale di intermediazione tra datori di lavoro, lavoratori e istituzioni pubbliche, garantendo il rispetto delle normative e ottimizzando la gestione dei rapporti di lavoro.

## Competenze e Funzioni Principali

### 1. Gestione dei Rapporti di Lavoro
- Predisposizione e redazione di contratti di lavoro
- Gestione delle procedure di assunzione e licenziamento
- Consulenza sull'inquadramento contrattuale più idoneo
- Assistenza nelle controversie individuali di lavoro

### 2. Adempimenti Amministrativi
- Elaborazione delle buste paga
- Gestione dei contributi previdenziali e assistenziali
- Tenuta dei libri obbligatori (Libro Unico del Lavoro)
- Adempimenti fiscali legati al personale

### 3. Consulenza Normativa
- Interpretazione della legislazione lavoristica
- Aggiornamento sulle novità legislative e giurisprudenziali
- Supporto nell'applicazione dei Contratti Collettivi Nazionali di Lavoro (CCNL)
- Consulenza in materia di sicurezza sul lavoro (D.Lgs. 81/2008)

### 4. Relazioni Sindacali
- Assistenza nella contrattazione collettiva aziendale
- Supporto nelle relazioni con rappresentanze sindacali
- Gestione di procedure di mobilità e cassa integrazione
- Conciliazione delle controversie collettive

## Requisiti Professionali
Per esercitare la professione di Consulente del Lavoro in Italia è necessario:
1. Possedere una laurea in giurisprudenza, economia o scienze politiche (o titoli equipollenti)
2. Svolgere un periodo di praticantato di 18 mesi presso uno studio di consulenza del lavoro
3. Superare l'Esame di Stato per l'abilitazione professionale
4. Iscriversi all'Albo dei Consulenti del Lavoro

## Responsabilità e Deontologia
Il Consulente del Lavoro è tenuto a:
- Agire con diligenza, probità e correttezza professionale
- Rispettare il segreto professionale
- Mantenere un costante aggiornamento professionale
- Stipulare un'assicurazione per la responsabilità civile professionale

## Evoluzione della Professione
Negli ultimi anni, la figura del Consulente del Lavoro ha ampliato il proprio ambito di competenza, assumendo un ruolo sempre più strategico all'interno delle aziende. Oltre alle tradizionali funzioni amministrative, oggi il consulente:
- Fornisce consulenza in materia di welfare aziendale
- Supporta le aziende nei processi di digital transformation dell'HR
- Offre servizi di consulenza per l'internazionalizzazione delle imprese
- Assiste nella pianificazione e gestione delle politiche retributive

## Conclusioni
Il Consulente del Lavoro rappresenta una risorsa indispensabile per imprese e lavoratori, fungendo da garante della corretta applicazione delle norme e da facilitatore nelle relazioni industriali. La sua expertise multidisciplinare lo rende un partner strategico per lo sviluppo sostenibile del capitale umano nelle organizzazioni moderne.
`;

// Funzione di test per la generazione di quiz
async function testGenerazioneQuiz() {
  try {
    console.log('===========================================');
    console.log('  TEST GENERAZIONE QUIZ DA DOCUMENTO REALE  ');
    console.log('===========================================');
    
    // Salva il documento come file temporaneo
    const documentPath = './test-ai-output/documento-test.txt';
    await fs.writeFile(documentPath, documentoConsulenzaLavoro);
    console.log(`Documento di test salvato in ${documentPath}`);
    
    // 1. Test con DeepSeek (modello predefinito)
    console.log('\n[TEST 1] Generazione quiz con DeepSeek (modello predefinito)\n');
    console.log('Elaborazione documento...');
    
    // Estrai concetti chiave dal documento
    const keyPoints = await aiService.generateResponse(
      `Estrai e sintetizza i concetti principali da questo testo sul ruolo del consulente del lavoro:\n\n${documentoConsulenzaLavoro}`
    );
    
    console.log('\nConcetti chiave estratti:');
    console.log('---------------------------------------');
    console.log(keyPoints.substring(0, 400) + '...');
    console.log('---------------------------------------');
    
    // Genera quiz con DeepSeek
    console.log('\nGenerazione quiz...');
    const quizDeepSeek = await quizAIService.generateQuizFromText(documentoConsulenzaLavoro, {
      questionCount: 3,
      difficulty: 'medium',
      questionTypes: ['multiple_choice', 'true_false'],
      topic: 'Consulenza del Lavoro'
    });
    
    console.log('\nQuiz generato con DeepSeek:');
    console.log('---------------------------------------');
    console.log(JSON.stringify(quizDeepSeek, null, 2));
    console.log('---------------------------------------');
    
    // 2. Test con Gemini
    console.log('\n[TEST 2] Generazione quiz con Gemini\n');
    
    // Genera quiz con Gemini
    console.log('Generazione quiz con Gemini...');
    const promptGemini = `
    Genera un quiz di 3 domande basato sul seguente testo sul ruolo del consulente del lavoro.
    Includi 2 domande a scelta multipla e 1 domanda vero/falso.
    Per ogni domanda, fornisci la risposta corretta e una breve spiegazione.
    
    ${documentoConsulenzaLavoro}
    
    Restituisci il quiz in formato JSON con la seguente struttura:
    {
      "title": "Titolo del quiz",
      "description": "Descrizione breve del quiz",
      "questions": [
        {
          "text": "Testo della domanda",
          "type": "multiple_choice",
          "options": ["opzione1", "opzione2", "opzione3", "opzione4"],
          "correctAnswer": "opzione corretta",
          "explanation": "Spiegazione della risposta"
        },
        ...
      ]
    }
    `;
    
    const quizGemini = await aiService.generateResponse(promptGemini, 'gemini');
    
    // Parsing del risultato (che potrebbe essere un JSON o testo con JSON)
    let parsedQuizGemini;
    try {
      // Cerca di estrarre il JSON dalla risposta
      const jsonMatch = quizGemini.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : quizGemini.trim().replace(/```json|```/g, '').trim();
      parsedQuizGemini = JSON.parse(jsonStr);
      
      console.log('\nQuiz generato con Gemini:');
      console.log('---------------------------------------');
      console.log(JSON.stringify(parsedQuizGemini, null, 2));
      console.log('---------------------------------------');
    } catch (parseError) {
      console.error('Errore nel parsing del JSON restituito da Gemini:', parseError);
      console.log('Risposta Gemini:', quizGemini);
    }
    
    console.log('\nTest completato con successo!');
    
    // Salva i risultati per confronto
    await fs.writeFile('./test-ai-output/quiz-deepseek.json', JSON.stringify(quizDeepSeek, null, 2));
    await fs.writeFile('./test-ai-output/quiz-gemini.json', JSON.stringify(parsedQuizGemini || { error: 'Parsing error', raw: quizGemini }, null, 2));
    
    console.log('\nFile di risultati salvati in:');
    console.log('- ./test-ai-output/quiz-deepseek.json');
    console.log('- ./test-ai-output/quiz-gemini.json');
    
  } catch (error) {
    console.error('Errore durante il test:', error);
  }
}

// Esegui il test
testGenerazioneQuiz();
