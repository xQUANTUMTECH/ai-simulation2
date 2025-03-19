import { createClient } from '@supabase/supabase-js';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dirname } from 'path';

// Configurazione dotenv
dotenv.config();

// Per ottenere l'equivalente di __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurazione Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configurazione SQLite
const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new (sqlite3.verbose().Database)(dbPath);

async function migrateData() {
  try {
    console.log('Inizio migrazione dati da Supabase a SQLite...');

    // Migrazione users
    console.log('Migrazione tabella users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) throw usersError;

    for (const user of users) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR REPLACE INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)',
          [user.id, user.email, user.created_at, user.updated_at],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Migrazione documents
    console.log('Migrazione tabella documents...');
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*');
    
    if (documentsError) throw documentsError;

    for (const doc of documents) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR REPLACE INTO documents (id, user_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          [doc.id, doc.user_id, doc.content, doc.created_at, doc.updated_at],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Migrazione courses
    console.log('Migrazione tabella courses...');
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*');
    
    if (coursesError) throw coursesError;

    for (const course of courses) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR REPLACE INTO courses (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          [course.id, course.title, course.description, course.created_at, course.updated_at],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log('Migrazione completata con successo!');
  } catch (error) {
    console.error('Errore durante la migrazione:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Errore durante la chiusura del database:', err);
      } else {
        console.log('Connessione al database chiusa');
      }
    });
  }
}

// Esegui la migrazione
migrateData();
