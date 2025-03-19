import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Per ottenere l'equivalente di __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseOperations {
  constructor() {
    const dbPath = path.join(__dirname, '../../database.sqlite');
    this.db = new sqlite3.verbose().Database(dbPath);
  }

  // Operazioni Users
  async createUser(email) {
    return new Promise((resolve, reject) => {
      const id = `user_${Date.now()}`;
      this.db.run(
        'INSERT INTO users (id, email) VALUES (?, ?)',
        [id, email],
        (err) => {
          if (err) reject(err);
          else resolve(id);
        }
      );
    });
  }

  async getUser(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Operazioni Documents
  async createDocument(userId, content) {
    return new Promise((resolve, reject) => {
      const id = `doc_${Date.now()}`;
      this.db.run(
        'INSERT INTO documents (id, user_id, content) VALUES (?, ?, ?)',
        [id, userId, content],
        (err) => {
          if (err) reject(err);
          else resolve(id);
        }
      );
    });
  }

  async getDocument(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM documents WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getUserDocuments(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM documents WHERE user_id = ?',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Operazioni Courses
  async createCourse(title, description) {
    return new Promise((resolve, reject) => {
      const id = `course_${Date.now()}`;
      this.db.run(
        'INSERT INTO courses (id, title, description) VALUES (?, ?, ?)',
        [id, title, description],
        (err) => {
          if (err) reject(err);
          else resolve(id);
        }
      );
    });
  }

  async getCourse(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM courses WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getAllCourses() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM courses', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Operazioni di Ricerca
  async searchDocuments(searchTerm) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM documents WHERE content LIKE ?',
        [`%${searchTerm}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async searchCourses(searchTerm) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM courses WHERE title LIKE ? OR description LIKE ?',
        [`%${searchTerm}%`, `%${searchTerm}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Chiusura connessione
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export default DatabaseOperations;
