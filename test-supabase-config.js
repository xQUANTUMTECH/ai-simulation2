/**
 * Script per verificare la corretta configurazione di Supabase e testare l'importazione dati
 * Esegue test reali sulle tabelle e sulla connessione
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Ottieni il percorso corrente del modulo in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Credenziali Supabase da SUPABASE_CREDENTIALS.md
const SUPABASE_URL = 'https://twusehwykpemphqtxlrx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNjE1NTAsImV4cCI6MjA1NjgzNzU1MH0.iku26hL5irHYwIxOPKNjUlTrTvlvw0a-ZU-uPgepoNk';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg';

// Crea un client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log(`# VERIFICA CONFIGURAZIONE SUPABASE #\n`);
console.log(`URL Supabase: ${SUPABASE_URL}`);
console.log(`\nInizio verifica della configurazione...\n`);

// Tabelle core da verificare
const CORE_TABLES = [
  'users',
  'documents',
  'courses',
  'course_modules',
  'course_enrollments',
  'quiz_questions',
  'quiz_responses'
];

// Schemi da verificare
const SCHEMAS = [
  'public',
  'auth',
  'storage'
];

// Funzione per stampare i risultati in modo leggibile
function printResults(results) {
  console.log("\n======================================");
  
  let totalTests = results.length;
  let passedTests = results.filter(test => test.status === 'PASS').length;
  let failedTests = results.filter(test => test.status === 'FAIL').length;
  
  console.log(`Risultati: ${passedTests}/${totalTests} test superati\n`);
  
  results.forEach((result, index) => {
    console.log(`[${result.status}] ${index + 1}. ${result.name}`);
    if (result.status === 'FAIL') {
      console.log(`   ❌ Errore: ${result.error}`);
    } else if (result.data) {
      console.log(`   ✅ ${result.data}`);
    }
  });
  
  console.log("\n======================================");
  
  if (passedTests === totalTests) {
    console.log("✅ SUPERATO: Tutti i test sono stati completati con successo!");
  } else {
    console.log(`❌ FALLITO: ${failedTests} test non riusciti. Verifica i dettagli sopra.`);
  }
}

// Esegue tutti i test e salva i risultati
async function runTests() {
  const startTime = Date.now();
  const results = [];
  
  try {
    // Test 1: Connessione DB con token anonimo
    try {
      const { data, error } = await supabaseAnon.from('users').select('count');
      
      if (error) throw error;
      
      results.push({
        name: 'Connessione database con token anonimo',
        status: 'PASS',
        data: `Connessione riuscita`
      });
    } catch (error) {
      results.push({
        name: 'Connessione database con token anonimo',
        status: 'FAIL',
        error: error.message
      });
    }
    
    // Test 2: Connessione DB con service role
    try {
      const { data, error } = await supabase.from('users').select('count');
      
      if (error) throw error;
      
      results.push({
        name: 'Connessione database con service role',
        status: 'PASS',
        data: `Connessione riuscita`
      });
    } catch (error) {
      results.push({
        name: 'Connessione database con service role',
        status: 'FAIL',
        error: error.message
      });
    }
    
    // Test 3: Verifica schemi
    try {
      const { data, error } = await supabase
        .from('information_schema.schemata')
        .select('schema_name')
        .in('schema_name', SCHEMAS);
      
      if (error) throw error;
      
      const foundSchemas = data.map(row => row.schema_name);
      const missingSchemas = SCHEMAS.filter(schema => !foundSchemas.includes(schema));
      
      if (missingSchemas.length > 0) {
        throw new Error(`Schemi mancanti: ${missingSchemas.join(', ')}`);
      }
      
      results.push({
        name: 'Verifica presenza schemi',
        status: 'PASS',
        data: `Schemi trovati: ${foundSchemas.join(', ')}`
      });
    } catch (error) {
      results.push({
        name: 'Verifica presenza schemi',
        status: 'FAIL',
        error: error.message
      });
    }
    
    // Test 4: Verifica tabelle core
    for (const tableName of CORE_TABLES) {
      try {
        // Verifica se la tabella esiste
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_name', tableName);
        
        if (error) throw error;
        
        if (data.length === 0) {
          throw new Error(`Tabella '${tableName}' non trovata`);
        }
        
        // Conta le righe nella tabella
        const { data: countData, error: countError } = await supabase
          .from(tableName)
          .select('count');
          
        if (countError) throw countError;
        
        const rowCount = countData[0]?.count || 0;
        
        results.push({
          name: `Verifica tabella ${tableName}`,
          status: 'PASS',
          data: `Tabella trovata con ${rowCount} righe`
        });
      } catch (error) {
        results.push({
          name: `Verifica tabella ${tableName}`,
          status: 'FAIL',
          error: error.message
        });
      }
    }
    
    // Test 5: Verifica policy RLS
    try {
      const { data, error } = await supabase
        .from('pg_catalog.pg_policies')
        .select('*')
        .eq('schemaname', 'public');
      
      if (error) throw error;
      
      if (data.length === 0) {
        throw new Error(`Nessuna policy RLS trovata nello schema public`);
      }
      
      const policies = data.map(p => p.policyname);
      
      results.push({
        name: 'Verifica policy Row Level Security',
        status: 'PASS',
        data: `${data.length} policy trovate`
      });
    } catch (error) {
      results.push({
        name: 'Verifica policy Row Level Security',
        status: 'FAIL',
        error: error.message
      });
    }
    
    // Test 6: Verifica bucket storage
    try {
      const { data, error } = await supabase
        .storage
        .listBuckets();
      
      if (error) throw error;
      
      if (data.length === 0) {
        throw new Error(`Nessun bucket storage trovato`);
      }
      
      const bucketNames = data.map(bucket => bucket.name);
      
      results.push({
        name: 'Verifica bucket storage',
        status: 'PASS',
        data: `${data.length} bucket trovati: ${bucketNames.join(', ')}`
      });
    } catch (error) {
      results.push({
        name: 'Verifica bucket storage',
        status: 'FAIL',
        error: error.message
      });
    }
    
    // Test 7: Test importazione dati
    try {
      // Creare una tabella temporanea per il test
      const testTableName = `test_import_${Date.now()}`;
      
      // Crea tabella temporanea
      const { error: createError } = await supabase.rpc('pgclient_execute', {
        sql: `CREATE TABLE IF NOT EXISTS ${testTableName} (id SERIAL PRIMARY KEY, name TEXT, value INTEGER)`
      });
      
      if (createError) throw createError;
      
      // Inserisci dati di test
      const testData = [
        { name: 'Test 1', value: 100 },
        { name: 'Test 2', value: 200 },
        { name: 'Test 3', value: 300 }
      ];
      
      const { error: insertError } = await supabase
        .from(testTableName)
        .insert(testData);
      
      if (insertError) throw insertError;
      
      // Verifica dati inseriti
      const { data: verifyData, error: verifyError } = await supabase
        .from(testTableName)
        .select('*')
        .order('id', { ascending: true });
      
      if (verifyError) throw verifyError;
      
      if (verifyData.length !== testData.length) {
        throw new Error(`Dati importati non corrispondono: trovati ${verifyData.length} anziché ${testData.length}`);
      }
      
      // Pulisci dopo il test
      const { error: dropError } = await supabase.rpc('pgclient_execute', {
        sql: `DROP TABLE ${testTableName}`
      });
      
      if (dropError) throw dropError;
      
      results.push({
        name: 'Test importazione dati',
        status: 'PASS',
        data: `${testData.length} righe importate correttamente`
      });
    } catch (error) {
      results.push({
        name: 'Test importazione dati',
        status: 'FAIL',
        error: error.message
      });
    }
    
    // Test 8: Verifica impostazioni RLS nelle tabelle
    try {
      const { data, error } = await supabase.rpc('pgclient_execute', {
        sql: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
      });
      
      if (error) throw error;
      
      const tablesWithoutRLS = data.rows
        .filter(row => row.rowsecurity === false)
        .map(row => row.tablename);
      
      if (tablesWithoutRLS.length > 0) {
        throw new Error(`Le seguenti tabelle pubbliche non hanno RLS attivo: ${tablesWithoutRLS.join(', ')}`);
      }
      
      results.push({
        name: 'Verifica impostazioni RLS sulle tabelle',
        status: 'PASS',
        data: `RLS attivo su tutte le tabelle pubbliche`
      });
    } catch (error) {
      results.push({
        name: 'Verifica impostazioni RLS sulle tabelle',
        status: 'FAIL',
        error: error.message
      });
    }
    
  } catch (error) {
    console.error('Errore durante l\'esecuzione dei test:', error);
  }
  
  const endTime = Date.now();
  const executionTime = (endTime - startTime) / 1000;
  
  console.log(`\nTempo di esecuzione: ${executionTime.toFixed(2)} secondi`);
  
  return results;
}

// Esporta i dati di test in un file JSON
function exportResults(results) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const exportPath = path.join(__dirname, `supabase-config-test-${timestamp}.json`);
  
  const exportData = {
    timestamp: new Date().toISOString(),
    url: SUPABASE_URL, 
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length
    }
  };
  
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  console.log(`\nRisultati esportati in: ${exportPath}`);
  
  return exportPath;
}

// Esegue i test di importazione ed esportazione dei dati
async function testDataImport() {
  console.log("\n# TEST IMPORTAZIONE DATI #\n");
  
  try {
    // 1. Crea una tabella di test 
    const testTableName = 'import_test_table';
    console.log(`Creazione tabella ${testTableName}...`);
    
    const { error: createError } = await supabase.rpc('pgclient_execute', {
      sql: `
        DROP TABLE IF EXISTS ${testTableName};
        CREATE TABLE ${testTableName} (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          age INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (createError) {
      console.error(`Errore nella creazione della tabella: ${createError.message}`);
      return false;
    }
    
    console.log(`✅ Tabella ${testTableName} creata con successo`);
    
    // 2. Importa dati tramite INSERT
    console.log("\nTest importazione tramite INSERT...");
    const testData = [
      { name: 'Mario Rossi', email: 'mario@example.com', age: 35 },
      { name: 'Anna Bianchi', email: 'anna@example.com', age: 28 },
      { name: 'Giuseppe Verdi', email: 'giuseppe@example.com', age: 42 }
    ];
    
    const { error: insertError } = await supabase
      .from(testTableName)
      .insert(testData);
    
    if (insertError) {
      console.error(`Errore nell'inserimento dati: ${insertError.message}`);
      return false;
    }
    
    console.log(`✅ Importati ${testData.length} record tramite INSERT`);
    
    // 3. Verifica i dati importati
    console.log("\nVerifica dati importati...");
    const { data: verifyData, error: verifyError } = await supabase
      .from(testTableName)
      .select('*')
      .order('id', { ascending: true });
    
    if (verifyError) {
      console.error(`Errore nella verifica dei dati: ${verifyError.message}`);
      return false;
    }
    
    console.log(`✅ Trovati ${verifyData.length} record nella tabella`);
    console.log("Primi 3 record:");
    console.table(verifyData.slice(0, 3).map(r => ({ id: r.id, name: r.name, email: r.email, age: r.age })));
    
    // 4. Esporta dati in formato JSON
    console.log("\nEsportazione dati in formato JSON...");
    const exportPath = path.join(__dirname, `${testTableName}_export.json`);
    fs.writeFileSync(exportPath, JSON.stringify(verifyData, null, 2));
    console.log(`✅ Dati esportati in: ${exportPath}`);
    
    // 5. Pulisci dopo il test
    console.log("\nPulizia tabella di test...");
    const { error: dropError } = await supabase.rpc('pgclient_execute', {
      sql: `DROP TABLE ${testTableName}`
    });
    
    if (dropError) {
      console.error(`Errore nella pulizia: ${dropError.message}`);
      return false;
    }
    
    console.log(`✅ Tabella ${testTableName} eliminata con successo`);
    console.log("\n✅ TEST IMPORTAZIONE DATI COMPLETATO CON SUCCESSO");
    
    return true;
  } catch (error) {
    console.error('Errore durante il test di importazione dati:', error);
    return false;
  }
}

// Funzione principale
async function main() {
  console.log("Inizio verifica configurazione Supabase...\n");
  
  try {
    // Parte 1: Verifica configurazione
    const results = await runTests();
    printResults(results);
    exportResults(results);
    
    // Parte 2: Test importazione dati
    await testDataImport();
    
    console.log("\n===========================================");
    console.log("VERIFICA COMPLETA DELLA CONFIGURAZIONE SUPABASE");
    console.log("===========================================\n");
    
  } catch (error) {
    console.error('Errore durante la verifica:', error);
  }
}

// Esecuzione
main()
  .catch(error => {
    console.error('Errore fatale:', error);
    process.exit(1);
  });
