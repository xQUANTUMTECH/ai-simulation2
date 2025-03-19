import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Per ottenere l'equivalente di __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crea una connessione al database
const dbPath = path.join(__dirname, '../../database.sqlite');

// Verifica se il file database esiste già
const dbExists = fs.existsSync(dbPath);
if (dbExists) {
  console.log('Il database esiste già. Verrà aggiornato con le nuove tabelle se necessario.');
} else {
  console.log('Il database non esiste. Verrà creato un nuovo database con tutte le tabelle necessarie.');
}

// Crea una nuova connessione
const db = new (sqlite3.verbose().Database)(dbPath);

// Funzione per inizializzare TUTTE le tabelle del database
const initCompleteDatabaseSchema = () => {
  console.log('Creazione dello schema completo del database SQLite con TUTTE le tabelle...');
  
  db.serialize(() => {
    // Abilita foreign keys
    db.run('PRAGMA foreign_keys = ON;');
    
    // ===== TABELLE UTENTE E AUTENTICAZIONE =====
    console.log('1. Creazione tabelle utente e autenticazione...');
    
    // Tabella users
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        account_status TEXT DEFAULT 'active',
        role TEXT DEFAULT 'USER',
        locked_until DATETIME,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabella auth_sessions
    db.run(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        is_valid INTEGER DEFAULT 1,
        device_info TEXT DEFAULT '{}',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Tabella failed_login_attempts
    db.run(`
      CREATE TABLE IF NOT EXISTS failed_login_attempts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        user_id TEXT,
        ip_address TEXT,
        attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Tabella user_settings
    db.run(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        theme TEXT DEFAULT 'light',
        notifications_enabled INTEGER DEFAULT 1,
        email_notifications INTEGER DEFAULT 1,
        language TEXT DEFAULT 'it',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Tabella user_roles
    db.run(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role_name TEXT NOT NULL,
        assigned_by TEXT,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // ===== TABELLE DI CONTENUTO =====
    console.log('2. Creazione tabelle di contenuto...');
    
    // Tabella documents
    db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        document_type TEXT,
        status TEXT DEFAULT 'draft',
        created_by TEXT,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    // Tabella academy_videos
    db.run(`
      CREATE TABLE IF NOT EXISTS academy_videos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        url TEXT,
        duration INTEGER,
        thumbnail_url TEXT,
        status TEXT DEFAULT 'processing',
        category TEXT,
        tags TEXT,
        uploaded_by TEXT,
        view_count INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )
    `);
    
    // Tabella scenarios
    db.run(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        difficulty TEXT,
        created_by TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        scenario_type TEXT,
        content TEXT,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    // Tabella courses
    db.run(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        instructor_id TEXT,
        is_published INTEGER DEFAULT 0,
        duration INTEGER,
        level TEXT,
        cover_image TEXT,
        price REAL DEFAULT 0,
        category TEXT,
        tags TEXT,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users(id)
      )
    `);
    
    // Tabella course_modules
    db.run(`
      CREATE TABLE IF NOT EXISTS course_modules (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        position INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);
    
    // Tabella module_lessons
    db.run(`
      CREATE TABLE IF NOT EXISTS module_lessons (
        id TEXT PRIMARY KEY,
        module_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content_type TEXT NOT NULL,
        content_id TEXT,
        position INTEGER NOT NULL,
        duration INTEGER,
        is_required INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE
      )
    `);
    
    // Tabella quizzes
    db.run(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        created_by TEXT NOT NULL,
        time_limit INTEGER,
        pass_threshold INTEGER DEFAULT 70,
        is_published INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    // Tabella quiz_questions
    db.run(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id TEXT PRIMARY KEY,
        quiz_id TEXT NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        options TEXT,
        correct_answer TEXT,
        explanation TEXT,
        points INTEGER DEFAULT 1,
        position INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      )
    `);
    
    // Tabella certificates
    db.run(`
      CREATE TABLE IF NOT EXISTS certificates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        certificate_url TEXT,
        verified_hash TEXT,
        status TEXT DEFAULT 'issued',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);
    
    // ===== TABELLE DI PROGRESSO/ATTIVITÀ =====
    console.log('3. Creazione tabelle di progresso e attività...');
    
    // Tabella progress
    db.run(`
      CREATE TABLE IF NOT EXISTS progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        content_id TEXT NOT NULL,
        completion_percentage INTEGER DEFAULT 0,
        last_position TEXT,
        completed INTEGER DEFAULT 0,
        completed_at DATETIME,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Tabella quiz_attempts
    db.run(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        quiz_id TEXT NOT NULL,
        score INTEGER,
        max_score INTEGER,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        passed INTEGER,
        answers TEXT DEFAULT '{}',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      )
    `);
    
    // Tabella activities
    db.run(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('user', 'course', 'video', 'document', 'certificate', 'alert', 'admin', 'system')),
        message TEXT NOT NULL,
        details TEXT DEFAULT '{}',
        user_id TEXT,
        related_id TEXT,
        importance TEXT NOT NULL CHECK (importance IN ('low', 'medium', 'high')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // Tabella activity_reads
    db.run(`
      CREATE TABLE IF NOT EXISTS activity_reads (
        id TEXT PRIMARY KEY,
        activity_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        read_at DATETIME,
        UNIQUE(activity_id, user_id),
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Tabella system_alerts
    db.run(`
      CREATE TABLE IF NOT EXISTS system_alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
        message TEXT NOT NULL,
        details TEXT DEFAULT '{}',
        category TEXT NOT NULL CHECK (
          category IN (
            'system', 'security', 'performance', 'storage', 'network',
            'application', 'database', 'user', 'content', 'ai'
          )
        ),
        priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        resolved_by TEXT,
        auto_resolve INTEGER NOT NULL DEFAULT 0,
        resolve_by DATETIME,
        assigned_to TEXT,
        source TEXT,
        FOREIGN KEY (resolved_by) REFERENCES users(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id)
      )
    `);
    
    // ===== TABELLE DI AI E SIMULAZIONE =====
    console.log('4. Creazione tabelle AI e simulazione...');
    
    // Tabella ai_agents
    db.run(`
      CREATE TABLE IF NOT EXISTS ai_agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        system_prompt TEXT,
        model TEXT NOT NULL,
        created_by TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    // Tabella simulations
    db.run(`
      CREATE TABLE IF NOT EXISTS simulations (
        id TEXT PRIMARY KEY,
        scenario_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        agent_id TEXT,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        status TEXT DEFAULT 'in_progress',
        score INTEGER,
        feedback TEXT,
        session_data TEXT,
        FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
      )
    `);
    
    // Tabella ai_conversations
    db.run(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        agent_id TEXT,
        title TEXT,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
      )
    `);
    
    // Tabella ai_messages
    db.run(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens INTEGER,
        metadata TEXT DEFAULT '{}',
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
      )
    `);
    
    // ===== TABELLE DI STORAGE =====
    console.log('5. Creazione tabelle storage...');
    
    // Tabella storage_files
    db.run(`
      CREATE TABLE IF NOT EXISTS storage_files (
        id TEXT PRIMARY KEY,
        bucket_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        content_type TEXT,
        size INTEGER,
        owner_id TEXT,
        is_public INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);
    
    // Tabella storage_buckets
    db.run(`
      CREATE TABLE IF NOT EXISTS storage_buckets (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        public INTEGER DEFAULT 0,
        owner_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);
    
    // ===== INDICI =====
    console.log('6. Creazione indici per migliorare le performance...');
    
    // Indici per users
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    
    // Indici per auth_sessions
    db.run(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at)`);
    
    // Indici per documents
    db.run(`CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)`);
    
    // Indici per academy_videos
    db.run(`CREATE INDEX IF NOT EXISTS idx_academy_videos_uploaded_by ON academy_videos(uploaded_by)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_academy_videos_status ON academy_videos(status)`);
    
    // Indici per progress
    db.run(`CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_progress_content ON progress(content_type, content_id)`);
    
    // Indici per activities
    db.run(`CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activities_importance ON activities(importance)`);
    
    // Indici per storage
    db.run(`CREATE INDEX IF NOT EXISTS idx_storage_files_bucket ON storage_files(bucket_name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_storage_files_owner ON storage_files(owner_id)`);
    
    console.log('Schema del database creato con successo!');
    
    // Se il database è appena stato creato, inserisci alcuni dati di esempio
    if (!dbExists) {
      console.log('Inserimento dati di esempio...');
      
      // Utente admin di esempio
      db.run(`
        INSERT INTO users (id, email, username, account_status, role)
        VALUES ('admin_user_123', 'admin@example.com', 'admin', 'active', 'ADMIN')
      `);
      
      // Utente normale di esempio
      db.run(`
        INSERT INTO users (id, email, username, account_status, role)
        VALUES ('test_user_456', 'user@example.com', 'test_user', 'active', 'USER')
      `);
      
      // Documenti di esempio
      db.run(`
        INSERT INTO documents (id, user_id, title, content, document_type, status, created_by)
        VALUES (
          'doc_789', 
          'admin_user_123', 
          'Documento di benvenuto', 
          'Benvenuto alla Cafasso AI Academy! Questo è un documento di esempio.',
          'text',
          'published',
          'admin_user_123'
        )
      `);
      
      // Scenario di esempio
      db.run(`
        INSERT INTO scenarios (id, title, description, difficulty, created_by)
        VALUES (
          'scenario_101', 
          'Scenario di test', 
          'Uno scenario di esempio per testare le funzionalità',
          'principiante',
          'admin_user_123'
        )
      `);
      
      // Corso di esempio
      db.run(`
        INSERT INTO courses (id, title, description, instructor_id, is_published)
        VALUES (
          'course_202', 
          'Introduzione all\'AI Academy', 
          'Corso introduttivo per conoscere tutte le funzionalità dell\'accademia',
          'admin_user_123',
          1
        )
      `);
      
      // Video di esempio
      db.run(`
        INSERT INTO academy_videos (id, title, description, status, uploaded_by)
        VALUES (
          'video_303', 
          'Tutorial di benvenuto', 
          'Video tutorial introduttivo alla piattaforma',
          'published',
          'admin_user_123'
        )
      `);
      
      // Bucket di storage di esempio
      db.run(`
        INSERT INTO storage_buckets (id, name, public, owner_id)
        VALUES 
          ('bucket_1', 'documents', 0, 'admin_user_123'),
          ('bucket_2', 'videos', 0, 'admin_user_123'),
          ('bucket_3', 'images', 1, 'admin_user_123'),
          ('bucket_4', 'uploads', 0, 'admin_user_123')
      `);
      
      console.log('Dati di esempio inseriti con successo!');
    }
  });
};

// Funzione per chiudere la connessione
const closeDatabase = () => {
  db.close((err) => {
    if (err) {
      console.error('Errore durante la chiusura del database:', err);
    } else {
      console.log('Connessione al database chiusa');
    }
  });
};

// Esegui l'inizializzazione
initCompleteDatabaseSchema();

// Gestisci la chiusura pulita
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

export {
  db,
  closeDatabase
};
