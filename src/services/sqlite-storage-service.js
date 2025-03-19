import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import DatabaseOperations from '../database/db-operations.js';

/**
 * Servizio che emula le funzionalità di storage di Supabase ma utilizza SQLite e file system locale
 */
class SQLiteStorageService {
  constructor() {
    this.dbOps = new DatabaseOperations();
    this.storageBasePath = path.join(process.cwd(), 'storage');
    
    // Crea la directory base di storage se non esiste
    if (!fs.existsSync(this.storageBasePath)) {
      fs.mkdirSync(this.storageBasePath, { recursive: true });
    }
  }

  /**
   * Inizializza i bucket di storage
   */
  async initializeBuckets() {
    const buckets = [
      { id: 'bucket_documents', name: 'documents', public: false },
      { id: 'bucket_videos', name: 'videos', public: false },
      { id: 'bucket_images', name: 'images', public: true },
      { id: 'bucket_uploads', name: 'uploads', public: false },
      { id: 'bucket_avatars', name: 'avatars', public: true },
      { id: 'bucket_simulations', name: 'simulations', public: false },
    ];

    for (const bucket of buckets) {
      // Crea la directory del bucket se non esiste
      const bucketPath = path.join(this.storageBasePath, bucket.name);
      if (!fs.existsSync(bucketPath)) {
        fs.mkdirSync(bucketPath, { recursive: true });
      }

      // Inserisci il bucket nel database se non esiste
      try {
        await this.dbOps.runQuery(
          'INSERT OR IGNORE INTO storage_buckets (id, name, public) VALUES (?, ?, ?)',
          [bucket.id, bucket.name, bucket.public ? 1 : 0]
        );
      } catch (error) {
        console.error(`Errore nell'inizializzazione del bucket ${bucket.name}:`, error);
      }
    }

    console.log('Bucket di storage inizializzati con successo.');
  }

  /**
   * Carica un file in un bucket
   * @param {string} bucketName - Nome del bucket
   * @param {string} filePath - Percorso del file nel bucket
   * @param {Buffer|Blob|File} fileData - Dati del file
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Object>} - Risultato dell'operazione
   */
  async uploadFile(bucketName, filePath, fileData, options = {}) {
    try {
      // Controlla se il bucket esiste
      const bucket = await this.dbOps.getOne(
        'SELECT * FROM storage_buckets WHERE name = ?',
        [bucketName]
      );
      
      if (!bucket) {
        throw new Error(`Il bucket "${bucketName}" non esiste.`);
      }

      // Crea il percorso completo
      const fullPath = path.join(this.storageBasePath, bucketName, filePath);
      const dirPath = path.dirname(fullPath);
      
      // Crea le directory necessarie
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Scrivi il file
      let buffer;
      if (fileData instanceof Buffer) {
        buffer = fileData;
      } else if (fileData instanceof Blob || fileData.buffer) {
        buffer = Buffer.from(await fileData.arrayBuffer());
      } else {
        buffer = Buffer.from(fileData);
      }
      
      fs.writeFileSync(fullPath, buffer);
      
      // Ottieni informazioni sul file
      const stats = fs.statSync(fullPath);
      const fileId = uuidv4();
      const fileName = path.basename(filePath);
      
      // Inserisci i metadati nel database
      await this.dbOps.runQuery(
        `INSERT INTO storage_files 
         (id, bucket_name, file_path, file_name, content_type, size, owner_id, is_public)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileId,
          bucketName,
          filePath,
          fileName,
          options.contentType || this._getContentType(fileName),
          stats.size,
          options.userId || null,
          bucket.public ? 1 : 0
        ]
      );

      return {
        data: {
          id: fileId,
          path: filePath,
          fullPath: `/${bucketName}/${filePath}`,
          size: stats.size,
          lastModified: stats.mtime
        },
        error: null
      };
    } catch (error) {
      console.error('Errore durante l\'upload del file:', error);
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
   * Scarica un file da un bucket
   * @param {string} bucketName - Nome del bucket
   * @param {string} filePath - Percorso del file nel bucket
   * @returns {Promise<Object>} - Risultato dell'operazione
   */
  async downloadFile(bucketName, filePath) {
    try {
      // Controlla se il file esiste nel database
      const fileRecord = await this.dbOps.getOne(
        'SELECT * FROM storage_files WHERE bucket_name = ? AND file_path = ?',
        [bucketName, filePath]
      );
      
      if (!fileRecord) {
        throw new Error(`File "${filePath}" non trovato nel bucket "${bucketName}".`);
      }

      // Costruisci il percorso completo
      const fullPath = path.join(this.storageBasePath, bucketName, filePath);
      
      // Verifica se il file esiste
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File fisico non trovato: ${fullPath}`);
      }
      
      // Leggi il file
      const data = fs.readFileSync(fullPath);
      
      return {
        data: {
          data: data,
          size: fileRecord.size,
          contentType: fileRecord.content_type,
          name: fileRecord.file_name
        },
        error: null
      };
    } catch (error) {
      console.error('Errore durante il download del file:', error);
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
   * Restituisce l'URL pubblico di un file
   * @param {string} bucketName - Nome del bucket
   * @param {string} filePath - Percorso del file nel bucket
   * @returns {Promise<string>} - URL del file
   */
  async getPublicUrl(bucketName, filePath) {
    try {
      // Verifica se il bucket è pubblico
      const bucket = await this.dbOps.getOne(
        'SELECT * FROM storage_buckets WHERE name = ?',
        [bucketName]
      );
      
      if (!bucket) {
        throw new Error(`Il bucket "${bucketName}" non esiste.`);
      }

      // Verifica se il file esiste
      const fileRecord = await this.dbOps.getOne(
        'SELECT * FROM storage_files WHERE bucket_name = ? AND file_path = ?',
        [bucketName, filePath]
      );
      
      if (!fileRecord) {
        throw new Error(`File "${filePath}" non trovato nel bucket "${bucketName}".`);
      }

      // Per simulare un comportamento simile a Supabase, restituiamo un URL locale
      // In un'applicazione reale, questo sarebbe un URL completo
      return `/storage/${bucketName}/${filePath}`;
    } catch (error) {
      console.error('Errore durante la generazione dell\'URL pubblico:', error);
      return null;
    }
  }

  /**
   * Elenca i file in un bucket
   * @param {string} bucketName - Nome del bucket
   * @param {Object} options - Opzioni di listaggio
   * @returns {Promise<Object>} - Risultato dell'operazione
   */
  async listFiles(bucketName, options = {}) {
    try {
      // Costruisci la query base
      let query = 'SELECT * FROM storage_files WHERE bucket_name = ?';
      const params = [bucketName];
      
      // Aggiungi filtri per path se specificato
      if (options.path) {
        query += ' AND file_path LIKE ?';
        params.push(`${options.path}%`);
      }
      
      // Aggiungi ordinamento
      query += ' ORDER BY file_path ASC';
      
      // Esegui la query
      const files = await this.dbOps.getAll(query, params);
      
      return {
        data: files.map(file => ({
          id: file.id,
          name: file.file_name,
          path: file.file_path,
          bucket: file.bucket_name,
          contentType: file.content_type,
          size: file.size,
          isPublic: file.is_public === 1,
          createdAt: file.created_at,
          updatedAt: file.updated_at
        })),
        error: null
      };
    } catch (error) {
      console.error('Errore durante il listaggio dei file:', error);
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
   * Elimina un file da un bucket
   * @param {string} bucketName - Nome del bucket
   * @param {string} filePath - Percorso del file nel bucket
   * @returns {Promise<Object>} - Risultato dell'operazione
   */
  async deleteFile(bucketName, filePath) {
    try {
      // Verifica se il file esiste nel database
      const fileRecord = await this.dbOps.getOne(
        'SELECT * FROM storage_files WHERE bucket_name = ? AND file_path = ?',
        [bucketName, filePath]
      );
      
      if (!fileRecord) {
        throw new Error(`File "${filePath}" non trovato nel bucket "${bucketName}".`);
      }

      // Costruisci il percorso completo
      const fullPath = path.join(this.storageBasePath, bucketName, filePath);
      
      // Elimina il file se esiste
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      
      // Elimina il record dal database
      await this.dbOps.runQuery(
        'DELETE FROM storage_files WHERE bucket_name = ? AND file_path = ?',
        [bucketName, filePath]
      );
      
      return {
        data: {
          path: filePath,
          bucket: bucketName
        },
        error: null
      };
    } catch (error) {
      console.error('Errore durante l\'eliminazione del file:', error);
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
   * Ricava il content type dal nome del file
   * @private
   * @param {string} fileName - Nome del file
   * @returns {string} - Content type
   */
  _getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.zip': 'application/zip',
      '.rar': 'application/vnd.rar',
      '.7z': 'application/x-7z-compressed'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}

export default SQLiteStorageService;
