import DatabaseOperations from '../database/db-operations.js';
import SQLiteStorageService from './sqlite-storage-service.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Adattatore SQLite che emula l'API di Supabase
 * Può essere utilizzato come sostituto diretto di Supabase nei componenti esistenti
 */
class SQLiteAdapter {
  constructor() {
    this.db = new DatabaseOperations();
    this.storageService = new SQLiteStorageService();
    
    // Inizializza i bucket di storage
    this.storageService.initializeBuckets().catch(error => {
      console.error('Errore durante l\'inizializzazione dei bucket:', error);
    });
  }

  /**
   * Emula la funzione Supabase 'auth.signUp'
   * @param {Object} credentials - Credenziali dell'utente (email, password)
   * @returns {Promise<Object>} - Risultato dell'operazione
   */
  async signUp({ email, password }) {
    try {
      // Genera un ID utente
      const userId = `user_${uuidv4()}`;
      
      // Inserisci l'utente nel database
      await this.db.runQuery(
        `INSERT INTO users (id, email, role, account_status) 
         VALUES (?, ?, ?, ?)`,
        [userId, email, 'USER', 'pending_confirmation']
      );
      
      // Crea le impostazioni utente
      await this.db.runQuery(
        `INSERT INTO user_settings (user_id) VALUES (?)`,
        [userId]
      );
      
      return {
        data: {
          user: {
            id: userId,
            email,
            role: 'USER',
            account_status: 'pending_confirmation'
          },
          session: null
        },
        error: null
      };
    } catch (error) {
      console.error('Errore durante la registrazione:', error);
      return {
        data: null,
        error: {
          message: error.message,
          details: error.stack
        }
      };
    }
  }

  /**
   * Emula la funzione Supabase 'auth.signIn'
   * @param {Object} credentials - Credenziali dell'utente (email, password)
   * @returns {Promise<Object>} - Risultato dell'operazione
   */
  async signIn({ email, password }) {
    try {
      // Cerca l'utente nel database
      const user = await this.db.getOne(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      if (!user) {
        throw new Error('Utente non trovato');
      }
      
      // Verifica lo stato dell'account
      if (user.account_status !== 'active') {
        throw new Error('Account non attivo');
      }
      
      // Crea una sessione
      const sessionId = `session_${uuidv4()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Scade dopo 7 giorni
      
      await this.db.runQuery(
        `INSERT INTO auth_sessions (id, user_id, expires_at) 
         VALUES (?, ?, ?)`,
        [sessionId, user.id, expiresAt.toISOString()]
      );
      
      // Aggiorna l'ultimo accesso
      await this.db.runQuery(
        `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`,
        [user.id]
      );
      
      return {
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            username: user.username
          },
          session: {
            id: sessionId,
            user_id: user.id,
            expires_at: expiresAt.toISOString()
          }
        },
        error: null
      };
    } catch (error) {
      console.error('Errore durante l\'accesso:', error);
      
      // Registra il tentativo fallito
      try {
        await this.db.runQuery(
          `INSERT INTO failed_login_attempts (id, email) 
           VALUES (?, ?)`,
          [`fail_${uuidv4()}`, email]
        );
      } catch (err) {
        console.error('Errore durante la registrazione del tentativo fallito:', err);
      }
      
      return {
        data: null,
        error: {
          message: error.message,
          details: error.stack
        }
      };
    }
  }

  /**
   * Emula la funzione Supabase 'auth.signOut'
   * @param {string} sessionId - ID della sessione
   * @returns {Promise<Object>} - Risultato dell'operazione
   */
  async signOut(sessionId) {
    try {
      if (!sessionId) {
        return { error: null };
      }
      
      // Invalida la sessione
      await this.db.runQuery(
        `UPDATE auth_sessions SET is_valid = 0 WHERE id = ?`,
        [sessionId]
      );
      
      return { error: null };
    } catch (error) {
      console.error('Errore durante il logout:', error);
      return {
        error: {
          message: error.message,
          details: error.stack
        }
      };
    }
  }

  /**
   * Emula la funzione Supabase 'from().select()'
   * @param {string} tableName - Nome della tabella
   * @returns {Object} - Oggetto query builder
   */
  from(tableName) {
    let queryBuilder = {
      _table: tableName,
      _columns: '*',
      _where: [],
      _order: null,
      _limit: null,
      _offset: null,
      
      /**
       * Seleziona colonne specifiche
       * @param {string} columns - Colonne da selezionare
       * @returns {Object} - Query builder
       */
      select: function(columns = '*') {
        this._columns = columns;
        return this;
      },
      
      /**
       * Filtro di uguaglianza
       * @param {string} column - Colonna
       * @param {*} value - Valore
       * @returns {Object} - Query builder
       */
      eq: function(column, value) {
        this._where.push({ column, operator: '=', value });
        return this;
      },
      
      /**
       * Filtro di disuguaglianza
       * @param {string} column - Colonna
       * @param {*} value - Valore
       * @returns {Object} - Query builder
       */
      neq: function(column, value) {
        this._where.push({ column, operator: '!=', value });
        return this;
      },
      
      /**
       * Filtro maggiore di
       * @param {string} column - Colonna
       * @param {*} value - Valore
       * @returns {Object} - Query builder
       */
      gt: function(column, value) {
        this._where.push({ column, operator: '>', value });
        return this;
      },
      
      /**
       * Filtro minore di
       * @param {string} column - Colonna
       * @param {*} value - Valore
       * @returns {Object} - Query builder
       */
      lt: function(column, value) {
        this._where.push({ column, operator: '<', value });
        return this;
      },
      
      /**
       * Ordina i risultati
       * @param {string} column - Colonna
       * @param {Object} options - Opzioni
       * @returns {Object} - Query builder
       */
      order: function(column, { ascending = true } = {}) {
        this._order = { column, ascending };
        return this;
      },
      
      /**
       * Limita il numero di risultati
       * @param {number} count - Numero massimo di risultati
       * @returns {Object} - Query builder
       */
      limit: function(count) {
        this._limit = count;
        return this;
      },
      
      /**
       * Salta un numero di risultati
       * @param {number} count - Numero di risultati da saltare
       * @returns {Object} - Query builder
       */
      offset: function(count) {
        this._offset = count;
        return this;
      },
      
      /**
       * Esegue la query
       * @returns {Promise<Object>} - Risultato dell'operazione
       */
      execute: async function() {
        try {
          // Costruisci la query SQL
          let query = `SELECT ${this._columns} FROM ${this._table}`;
          const params = [];
          
          // Aggiungi le condizioni WHERE
          if (this._where.length > 0) {
            query += ' WHERE ';
            const conditions = this._where.map(condition => {
              params.push(condition.value);
              return `${condition.column} ${condition.operator} ?`;
            });
            query += conditions.join(' AND ');
          }
          
          // Aggiungi l'ordinamento
          if (this._order) {
            query += ` ORDER BY ${this._order.column} ${this._order.ascending ? 'ASC' : 'DESC'}`;
          }
          
          // Aggiungi il limite
          if (this._limit !== null) {
            query += ` LIMIT ?`;
            params.push(this._limit);
          }
          
          // Aggiungi l'offset
          if (this._offset !== null) {
            query += ` OFFSET ?`;
            params.push(this._offset);
          }
          
          // Esegui la query
          const adapter = dbAdapter;
          const results = await adapter.db.getAll(query, params);
          
          return {
            data: results,
            error: null
          };
        } catch (error) {
          console.error('Errore durante l\'esecuzione della query:', error);
          return {
            data: null,
            error: {
              message: error.message,
              details: error.stack
            }
          };
        }
      }
    };
    
    // Alias per execute
    queryBuilder.then = function(callback) {
      return this.execute().then(callback);
    };
    
    return queryBuilder;
  }

  /**
   * Emula la funzione Supabase 'from().insert()'
   * @param {string} tableName - Nome della tabella
   * @returns {Object} - Oggetto insertion builder
   */
  insert(tableName) {
    return {
      values: async (data) => {
        try {
          if (!Array.isArray(data)) {
            data = [data];
          }
          
          const results = [];
          
          for (const item of data) {
            // Se non c'è un ID, genera un UUID
            if (!item.id) {
              item.id = uuidv4();
            }
            
            const columns = Object.keys(item);
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map(col => item[col]);
            
            const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
            
            await this.db.runQuery(query, values);
            results.push(item);
          }
          
          return {
            data: results,
            error: null
          };
        } catch (error) {
          console.error('Errore durante l\'inserimento:', error);
          return {
            data: null,
            error: {
              message: error.message,
              details: error.stack
            }
          };
        }
      }
    };
  }

  /**
   * Emula la funzione Supabase 'from().update()'
   * @param {string} tableName - Nome della tabella
   * @returns {Object} - Oggetto update builder
   */
  update(tableName) {
    return {
      _where: [],
      
      /**
       * Filtro di uguaglianza
       * @param {string} column - Colonna
       * @param {*} value - Valore
       * @returns {Object} - Update builder
       */
      eq: function(column, value) {
        this._where.push({ column, operator: '=', value });
        return this;
      },
      
      /**
       * Esegue l'aggiornamento
       * @param {Object} data - Dati da aggiornare
       * @returns {Promise<Object>} - Risultato dell'operazione
       */
      set: async function(data) {
        try {
          const columns = Object.keys(data);
          const setClauses = columns.map(col => `${col} = ?`).join(', ');
          const values = [...columns.map(col => data[col])];
          
          let query = `UPDATE ${tableName} SET ${setClauses}`;
          
          // Aggiungi le condizioni WHERE
          if (this._where.length > 0) {
            query += ' WHERE ';
            const conditions = this._where.map(condition => {
              values.push(condition.value);
              return `${condition.column} ${condition.operator} ?`;
            });
            query += conditions.join(' AND ');
          }
          
          // Esegui la query
          const adapter = dbAdapter;
          await adapter.db.runQuery(query, values);
          
          return {
            data: { success: true },
            error: null
          };
        } catch (error) {
          console.error('Errore durante l\'aggiornamento:', error);
          return {
            data: null,
            error: {
              message: error.message,
              details: error.stack
            }
          };
        }
      }
    };
  }

  /**
   * Emula la funzione Supabase 'from().delete()'
   * @param {string} tableName - Nome della tabella
   * @returns {Object} - Oggetto delete builder
   */
  delete(tableName) {
    return {
      _where: [],
      
      /**
       * Filtro di uguaglianza
       * @param {string} column - Colonna
       * @param {*} value - Valore
       * @returns {Object} - Delete builder
       */
      eq: function(column, value) {
        this._where.push({ column, operator: '=', value });
        return this;
      },
      
      /**
       * Esegue l'eliminazione
       * @returns {Promise<Object>} - Risultato dell'operazione
       */
      execute: async function() {
        try {
          let query = `DELETE FROM ${tableName}`;
          const values = [];
          
          // Aggiungi le condizioni WHERE
          if (this._where.length > 0) {
            query += ' WHERE ';
            const conditions = this._where.map(condition => {
              values.push(condition.value);
              return `${condition.column} ${condition.operator} ?`;
            });
            query += conditions.join(' AND ');
          }
          
          // Esegui la query
          const adapter = dbAdapter;
          await adapter.db.runQuery(query, values);
          
          return {
            data: { success: true },
            error: null
          };
        } catch (error) {
          console.error('Errore durante l\'eliminazione:', error);
          return {
            data: null,
            error: {
              message: error.message,
              details: error.stack
            }
          };
        }
      }
    };
  }

  /**
   * Emula la funzione Supabase 'storage.from()'
   * @param {string} bucketName - Nome del bucket
   * @returns {Object} - Interfaccia storage
   */
  storage = {
    from: (bucketName) => ({
      /**
       * Carica un file
       * @param {string} path - Percorso del file
       * @param {File|Blob|Buffer} file - File da caricare
       * @param {Object} options - Opzioni di caricamento
       * @returns {Promise<Object>} - Risultato dell'operazione
       */
      upload: (path, file, options) => {
        return this.storageService.uploadFile(bucketName, path, file, options);
      },
      
      /**
       * Scarica un file
       * @param {string} path - Percorso del file
       * @returns {Promise<Object>} - Risultato dell'operazione
       */
      download: (path) => {
        return this.storageService.downloadFile(bucketName, path);
      },
      
      /**
       * Ottiene l'URL pubblico di un file
       * @param {string} path - Percorso del file
       * @returns {Promise<string>} - URL del file
       */
      getPublicUrl: (path) => {
        return this.storageService.getPublicUrl(bucketName, path);
      },
      
      /**
       * Elenca i file in un bucket
       * @param {Object} options - Opzioni di listaggio
       * @returns {Promise<Object>} - Risultato dell'operazione
       */
      list: (options) => {
        return this.storageService.listFiles(bucketName, options);
      },
      
      /**
       * Elimina un file
       * @param {string} path - Percorso del file
       * @returns {Promise<Object>} - Risultato dell'operazione
       */
      remove: (path) => {
        return this.storageService.deleteFile(bucketName, path);
      }
    })
  };
}

// Crea un'istanza globale dell'adattatore
const dbAdapter = new SQLiteAdapter();

// Export principale
export default dbAdapter;

// Export di funzioni helper che emulano l'API di Supabase
export const supabase = {
  from: (tableName) => dbAdapter.from(tableName),
  auth: {
    signUp: (credentials) => dbAdapter.signUp(credentials),
    signIn: (credentials) => dbAdapter.signIn(credentials),
    signOut: (sessionId) => dbAdapter.signOut(sessionId)
  },
  storage: dbAdapter.storage
};
