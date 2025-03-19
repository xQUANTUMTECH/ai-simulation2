import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Per ottenere l'equivalente di __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directory delle migrazioni
const migrationsDir = path.join(__dirname, '../supabase/migrations');

// Funzione per estrarre le definizioni di tabelle dai file di migrazione
async function extractTableDefinitions() {
  // Verifica se la directory esiste
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Directory non trovata: ${migrationsDir}`);
    return;
  }

  console.log('===== ESTRAZIONE TABELLE DA MIGRAZIONI SUPABASE =====\n');
  
  // Ottieni tutti i file di migrazione
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql') && !fs.statSync(path.join(migrationsDir, file)).isDirectory());
  
  console.log(`Analisi di ${files.length} file di migrazione...\n`);
  
  const tableDefinitions = [];
  const tableNames = new Set();
  const alterTableStatements = [];
  const createIndexStatements = [];
  const functionDefinitions = [];
  
  // Regex per identificare le definizioni di tabelle, gli indici, le funzioni e gli alter table
  const createTableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gi;
  const alterTableRegex = /ALTER\s+TABLE(?:\s+IF\s+EXISTS)?\s+(?:public\.)?(\w+)([\s\S]*?);/gi;
  const createIndexRegex = /CREATE\s+INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+\w+\s+ON\s+(?:public\.)?(\w+)/gi;
  const createFunctionRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)/gi;
  
  // Analizza ogni file
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Trova definizioni CREATE TABLE
    let tableMatch;
    const createTableRegexInstance = new RegExp(createTableRegex);
    while ((tableMatch = createTableRegexInstance.exec(content)) !== null) {
      const tableName = tableMatch[1];
      const tableDefinition = tableMatch[0];
      
      if (!tableNames.has(tableName)) {
        tableNames.add(tableName);
        tableDefinitions.push({ tableName, definition: tableDefinition, file });
      }
    }
    
    // Trova statements ALTER TABLE
    let alterMatch;
    const alterTableRegexInstance = new RegExp(alterTableRegex);
    while ((alterMatch = alterTableRegexInstance.exec(content)) !== null) {
      const tableName = alterMatch[1];
      const alterDefinition = alterMatch[0];
      alterTableStatements.push({ tableName, definition: alterDefinition, file });
    }
    
    // Trova statements CREATE INDEX
    let indexMatch;
    const createIndexRegexInstance = new RegExp(createIndexRegex);
    while ((indexMatch = createIndexRegexInstance.exec(content)) !== null) {
      const tableName = indexMatch[1];
      const indexDefinition = indexMatch[0];
      createIndexStatements.push({ tableName, definition: indexDefinition, file });
    }
    
    // Trova definizioni di funzioni
    let functionMatch;
    const createFunctionRegexInstance = new RegExp(createFunctionRegex);
    while ((functionMatch = createFunctionRegexInstance.exec(content)) !== null) {
      const functionName = functionMatch[1];
      functionDefinitions.push({ functionName, file });
    }
  }
  
  // Ordina alfabeticamente per nome tabella
  tableDefinitions.sort((a, b) => a.tableName.localeCompare(b.tableName));
  
  // Stampa i risultati
  console.log(`=== TABELLE TROVATE (${tableNames.size}) ===`);
  tableNames.forEach(tableName => {
    console.log(` - ${tableName}`);
  });
  
  console.log(`\n=== DEFINIZIONI CREATE TABLE (${tableDefinitions.length}) ===`);
  tableDefinitions.forEach(({ tableName, file }) => {
    console.log(`   ${tableName} (${file})`);
  });
  
  console.log(`\n=== ALTER TABLE STATEMENTS (${alterTableStatements.length}) ===`);
  alterTableStatements.forEach(({ tableName, file }) => {
    console.log(`   ${tableName} (${file})`);
  });
  
  console.log(`\n=== CREATE INDEX STATEMENTS (${createIndexStatements.length}) ===`);
  createIndexStatements.forEach(({ tableName, file }) => {
    console.log(`   ${tableName} (${file})`);
  });
  
  console.log(`\n=== FUNZIONI DEFINITE (${functionDefinitions.length}) ===`);
  
  console.log('\n=== GENERAZIONE SQL PER SQLITE ===');
  
  // Genera un file SQL di tutte le tabelle trovate
  let sqlOutput = '-- Tabelle estratte da migrazioni Supabase\n';
  sqlOutput += '-- Convertite per SQLite\n\n';
  
  tableDefinitions.forEach(({ tableName, definition }) => {
    // Converti la definizione per SQLite
    let sqliteDefinition = definition
      // Rimuovi IF NOT EXISTS se presente (SQLite lo supporta, ma per uniformità)
      .replace(/IF\s+NOT\s+EXISTS/i, '')
      // Rimuovi i namespace (public.)
      .replace(/public\./g, '')
      // Cambia SERIAL a INTEGER PRIMARY KEY per SQLite
      .replace(/SERIAL/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      // Cambia UUID a TEXT
      .replace(/UUID/g, 'TEXT')
      // Cambia TIMESTAMP* a DATETIME
      .replace(/TIMESTAMP(?:\s+WITH\s+TIME\s+ZONE)?/g, 'DATETIME')
      // Cambia JSONB a TEXT
      .replace(/JSONB/g, 'TEXT')
      // Rimuovi DEFAULT now() e sostituisci con CURRENT_TIMESTAMP
      .replace(/DEFAULT\s+now\(\)/g, 'DEFAULT CURRENT_TIMESTAMP')
      // Cambia BOOLEAN a INTEGER
      .replace(/BOOLEAN/g, 'INTEGER');
    
    sqlOutput += `-- Tabella: ${tableName}\n`;
    sqlOutput += `${sqliteDefinition}\n\n`;
  });
  
  // Scrivi il file SQL
  const outputFile = path.join(__dirname, '../all_supabase_tables.sql');
  fs.writeFileSync(outputFile, sqlOutput);
  
  console.log(`File SQL generato: ${outputFile}`);
  console.log('===== ESTRAZIONE COMPLETATA =====');
}

// Esegui la funzione
extractTableDefinitions();
