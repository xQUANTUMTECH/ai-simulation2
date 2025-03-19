/**
 * Modulo isomorfico per fornire FormData, fetch e File sia in ambiente browser che Node.js
 */

import fs from 'fs';
import path from 'path';
import { Blob } from 'buffer';
import { fileURLToPath } from 'url';
import nodeFetch from 'node-fetch';
import { FormData as NodeFormData } from 'formdata-node';
import { File as NodeFile } from '@web-std/file';

// Determina se siamo in ambiente browser o Node.js
const isNode = typeof window === 'undefined' || typeof window.document === 'undefined';

/**
 * Classe personalizzata File compatibile con browser e Node.js
 */
export class IsomorphicFile {
  constructor(bits, name, options = {}) {
    if (isNode) {
      // In Node.js, utilizza NodeFile da formdata-node
      if (typeof bits === 'string') {
        // Se bits è un percorso del file
        if (fs.existsSync(bits)) {
          const buffer = fs.readFileSync(bits);
          this._file = new NodeFile([buffer], name, options);
        } else {
          // Se bits è una stringa di contenuto
          this._file = new NodeFile([bits], name, options);
        }
      } else if (bits instanceof Buffer) {
        // Se bits è un Buffer
        this._file = new NodeFile([bits], name, options);
      } else if (Array.isArray(bits)) {
        // Se bits è un array (di Buffer, Uint8Array, ecc.)
        this._file = new NodeFile(bits, name, options);
      } else {
        throw new Error('Formato dati non supportato per file in Node.js');
      }
      
      // Copia le proprietà di NodeFile per renderlo compatibile con File del browser
      Object.defineProperties(this, {
        name: { value: this._file.name, writable: false },
        lastModified: { value: options.lastModified || Date.now(), writable: false },
        size: { value: this._file.size, writable: false },
        type: { value: options.type || 'application/octet-stream', writable: false }
      });
    } else {
      // In browser, usa File API nativa
      return new File(bits, name, options);
    }
  }

  // Metodi proxy per compatibilità con File del browser
  slice(start, end, contentType) {
    if (isNode) {
      return this._file.slice(start, end, contentType);
    } else {
      return this.slice(start, end, contentType);
    }
  }

  stream() {
    if (isNode) {
      return this._file.stream();
    } else {
      return this.stream();
    }
  }

  arrayBuffer() {
    if (isNode) {
      return this._file.arrayBuffer();
    } else {
      return this.arrayBuffer();
    }
  }

  text() {
    if (isNode) {
      return this._file.text();
    } else {
      return this.text();
    }
  }
}

/**
 * Classe FormData isomorfica
 */
export class IsomorphicFormData {
  constructor() {
    if (isNode) {
      this._formData = new NodeFormData();
    } else {
      this._formData = new FormData();
    }
  }

  append(name, value, filename) {
    if (isNode) {
      // Gestione di tipi diversi in Node.js
      if (value instanceof IsomorphicFile) {
        // Se è un IsomorphicFile, usa il suo _file interno
        this._formData.append(name, value._file, filename);
      } else if (typeof value === 'object' && value !== null && !(value instanceof Blob)) {
        // Se è un oggetto ma non un Blob, lo stringifica
        this._formData.append(name, JSON.stringify(value));
      } else {
        // Altrimenti usa il valore direttamente
        this._formData.append(name, value, filename);
      }
    } else {
      // In browser, usa l'API nativa
      this._formData.append(name, value, filename);
    }
    return this;
  }

  delete(name) {
    this._formData.delete(name);
    return this;
  }

  get(name) {
    return this._formData.get(name);
  }

  getAll(name) {
    return this._formData.getAll(name);
  }

  has(name) {
    return this._formData.has(name);
  }

  set(name, value, filename) {
    if (isNode) {
      // In Node.js, delete e poi append
      this._formData.delete(name);
      this.append(name, value, filename);
    } else {
      this._formData.set(name, value, filename);
    }
    return this;
  }

  // Getter per accedere al FormData sottostante
  get formData() {
    return this._formData;
  }

  // Implementazione di Symbol.iterator
  *[Symbol.iterator]() {
    for (const pair of this._formData.entries()) {
      yield pair;
    }
  }

  // Aggiunge entries() e keys() per compatibilità con formdata-node
  entries() {
    return this._formData.entries();
  }

  keys() {
    return this._formData.keys();
  }

  values() {
    return this._formData.values();
  }
}

/**
 * Funzione fetch isomorfica
 * @param {string|Request} url - URL o oggetto Request
 * @param {Object} options - Opzioni di fetch
 * @returns {Promise<Response>} - Promise con Response
 */
export async function isomorphicFetch(url, options = {}) {
  if (isNode) {
    // In Node.js, usa node-fetch
    if (options && options.body instanceof IsomorphicFormData) {
      // Se il corpo è un IsomorphicFormData, usa il suo _formData interno
      options.body = options.body._formData;
    }
    return nodeFetch(url, options);
  } else {
    // In browser, usa fetch nativo
    return fetch(url, options);
  }
}

// Crea funzione per creare un File da un percorso (solo Node.js)
export function createFileFromPath(filePath, options = {}) {
  if (!isNode) {
    throw new Error('createFileFromPath è disponibile solo in Node.js');
  }
  
  // Ottieni nome e tipo del file
  const filename = options.filename || path.basename(filePath);
  const fileType = options.type || getMimeType(filePath);
  
  // Leggi il file come Buffer
  const buffer = fs.readFileSync(filePath);
  
  // Crea un IsomorphicFile
  return new IsomorphicFile([buffer], filename, {
    type: fileType,
    lastModified: options.lastModified || fs.statSync(filePath).mtimeMs
  });
}

// Funzione di supporto per ottenere il MIME type in base all'estensione
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.json': 'application/json'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

// Esporta le versioni isomorfiche
export const FormData = IsomorphicFormData;
export const File = IsomorphicFile;
export const fetch = isomorphicFetch;

// Esporta di default tutto
export default {
  FormData: IsomorphicFormData,
  File: IsomorphicFile,
  fetch: isomorphicFetch,
  createFileFromPath
};
