/**
 * Classe Logger per il logging degli errori
 */
class Logger {
  constructor(private name: string) {}

  error(message: string, data?: any) {
    console.error(`[${this.name}] ${message}`, data);
  }

  warn(message: string, data?: any) {
    console.warn(`[${this.name}] ${message}`, data);
  }

  info(message: string, data?: any) {
    console.info(`[${this.name}] ${message}`, data);
  }

  debug(message: string, data?: any) {
    console.debug(`[${this.name}] ${message}`, data);
  }
}

/**
 * Tipo di errore API
 */
export enum ApiErrorType {
  NETWORK = 'NETWORK',           // Errori di rete (offline, timeout, etc.)
  AUTHENTICATION = 'AUTH',       // Errori di autenticazione (token invalido, scaduto, etc.)
  PERMISSION = 'PERMISSION',     // Errori di permessi (non autorizzato)
  VALIDATION = 'VALIDATION',     // Errori di validazione (input invalido)
  RATE_LIMIT = 'RATE_LIMIT',     // Errori di limiti di rate (troppe richieste)
  QUOTA = 'QUOTA',               // Errori di quota (limite di utilizzo superato)
  RESOURCE = 'RESOURCE',         // Errori di risorse (risorsa non trovata, già esistente, etc.)
  SERVICE = 'SERVICE',           // Errori del servizio (errore interno del server)
  UNKNOWN = 'UNKNOWN'            // Errori sconosciuti
}

/**
 * Interfaccia per la gestione degli errori API
 */
export interface ApiErrorOptions {
  message: string;               // Messaggio di errore
  type: ApiErrorType;            // Tipo di errore
  status?: number;               // Codice di stato HTTP (se disponibile)
  originalError?: any;           // Errore originale
  endpoint?: string;             // Endpoint che ha generato l'errore
  service?: string;              // Servizio che ha generato l'errore
  request?: any;                 // Dati della richiesta
  retryable?: boolean;           // Se l'errore può essere ritentato
  retryDelay?: number;           // Ritardo prima di ritentare (ms)
  retryCount?: number;           // Numero di tentativi effettuati
  maxRetries?: number;           // Numero massimo di tentativi
}

/**
 * Classe per la gestione degli errori API
 */
export class ApiError extends Error {
  readonly type: ApiErrorType;
  readonly status?: number;
  readonly originalError?: any;
  readonly endpoint?: string;
  readonly service?: string;
  readonly request?: any;
  readonly retryable: boolean;
  readonly retryDelay: number;
  retryCount: number; // Non readonly per permettere aggiornamenti
  readonly maxRetries: number;
  readonly timestamp: Date;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.type = options.type;
    this.status = options.status;
    this.originalError = options.originalError;
    this.endpoint = options.endpoint;
    this.service = options.service;
    this.request = options.request;
    this.retryable = options.retryable ?? this.isRetryableByDefault(options.type, options.status);
    this.retryCount = options.retryCount ?? 0;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? this.calculateRetryDelay(this.retryCount);
    this.timestamp = new Date();

    // Cattura stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Verifica se un errore è ritentabile in base al tipo e codice di stato
   */
  private isRetryableByDefault(type: ApiErrorType, status?: number): boolean {
    // Errori di rete sono generalmente ritentabili
    if (type === ApiErrorType.NETWORK) return true;
    
    // Errori di servizio temporanei (5xx) sono ritentabili
    if (type === ApiErrorType.SERVICE && status && status >= 500 && status < 600) return true;
    
    // Errori di rate limit sono ritentabili dopo un certo tempo
    if (type === ApiErrorType.RATE_LIMIT) return true;
    
    // Altri tipi di errori non sono ritentabili di default
    return false;
  }

  /**
   * Calcola il ritardo prima di ritentare con backoff esponenziale
   */
  private calculateRetryDelay(retryCount: number): number {
    // Implementazione del backoff esponenziale
    // Base: 200ms * 2^retryCount + random jitter
    const baseDelay = 200;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * baseDelay; // Jitter to prevent thundering herd
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  /**
   * Crea un nuovo oggetto ApiError per il prossimo tentativo
   */
  withRetry(): ApiError {
    return new ApiError({
      ...this,
      retryCount: this.retryCount + 1,
      retryDelay: this.calculateRetryDelay(this.retryCount + 1)
    });
  }

  /**
   * Indica se è possibile ritentare la richiesta
   */
  canRetry(): boolean {
    return this.retryable && this.retryCount < this.maxRetries;
  }

  /**
   * Converte l'errore in un oggetto JSON
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      status: this.status,
      endpoint: this.endpoint,
      service: this.service,
      retryable: this.retryable,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      timestamp: this.timestamp.toISOString()
    };
  }
}

/**
 * Service per la gestione unificata degli errori API
 */
class ApiErrorService {
  private readonly logger = new Logger('ApiErrorService');

  /**
   * Analizza un errore e lo converte in un ApiError
   */
  parseError(error: any, endpoint?: string, service?: string, request?: any): ApiError {
    // Se è già un ApiError, aggiorna solo i campi mancanti
    if (error instanceof ApiError) {
      return new ApiError({
        ...error,
        endpoint: endpoint || error.endpoint,
        service: service || error.service,
        request: request || error.request
      });
    }

    // Se è un errore di rete fetch
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new ApiError({
        message: 'Errore di connessione al server',
        type: ApiErrorType.NETWORK,
        originalError: error,
        endpoint,
        service,
        request
      });
    }

    // Se è un errore di Axios
    if (error.isAxiosError) {
      return this.parseAxiosError(error, endpoint, service, request);
    }

    // Se è un errore del browser Response con status
    if (error instanceof Response || (error.status && error.statusText)) {
      return this.parseResponseError(error, endpoint, service, request);
    }

    // Errore sconosciuto
    return new ApiError({
      message: error.message || 'Errore sconosciuto',
      type: ApiErrorType.UNKNOWN,
      originalError: error,
      endpoint,
      service,
      request,
      retryable: false
    });
  }

  /**
   * Analizza un errore Axios
   */
  private parseAxiosError(error: any, endpoint?: string, service?: string, request?: any): ApiError {
    const status = error.response?.status;
    let type = ApiErrorType.UNKNOWN;
    let message = error.message || 'Errore sconosciuto';

    // Determina il tipo di errore in base al codice di stato
    if (!error.response) {
      type = ApiErrorType.NETWORK;
      message = 'Errore di connessione al server';
    } else if (status === 401) {
      type = ApiErrorType.AUTHENTICATION;
      message = 'Autenticazione non valida';
    } else if (status === 403) {
      type = ApiErrorType.PERMISSION;
      message = 'Non autorizzato ad accedere a questa risorsa';
    } else if (status === 404) {
      type = ApiErrorType.RESOURCE;
      message = 'Risorsa non trovata';
    } else if (status === 422 || status === 400) {
      type = ApiErrorType.VALIDATION;
      message = 'Dati di richiesta non validi';
    } else if (status === 429) {
      type = ApiErrorType.RATE_LIMIT;
      message = 'Troppe richieste. Riprova più tardi';
    } else if (status >= 500) {
      type = ApiErrorType.SERVICE;
      message = 'Errore del servizio';
    }

    // Utilizza il messaggio dalla risposta del server se disponibile
    if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.response?.data?.error) {
      message = error.response.data.error;
    }

    return new ApiError({
      message,
      type,
      status,
      originalError: error,
      endpoint: endpoint || error.config?.url,
      service,
      request: request || error.config?.data
    });
  }

  /**
   * Analizza un errore Response
   */
  private parseResponseError(error: any, endpoint?: string, service?: string, request?: any): ApiError {
    const status = error.status;
    let type = ApiErrorType.UNKNOWN;
    let message = error.statusText || 'Errore sconosciuto';

    // Determina il tipo di errore in base al codice di stato
    if (status === 401) {
      type = ApiErrorType.AUTHENTICATION;
      message = 'Autenticazione non valida';
    } else if (status === 403) {
      type = ApiErrorType.PERMISSION;
      message = 'Non autorizzato ad accedere a questa risorsa';
    } else if (status === 404) {
      type = ApiErrorType.RESOURCE;
      message = 'Risorsa non trovata';
    } else if (status === 422 || status === 400) {
      type = ApiErrorType.VALIDATION;
      message = 'Dati di richiesta non validi';
    } else if (status === 429) {
      type = ApiErrorType.RATE_LIMIT;
      message = 'Troppe richieste. Riprova più tardi';
    } else if (status >= 500) {
      type = ApiErrorType.SERVICE;
      message = 'Errore del servizio';
    }

    return new ApiError({
      message,
      type,
      status,
      originalError: error,
      endpoint,
      service,
      request
    });
  }

  /**
   * Gestisce un errore API in modo appropriato
   */
  handleError(error: any, endpoint?: string, service?: string, request?: any): never {
    const apiError = this.parseError(error, endpoint, service, request);
    
    // Log dell'errore
    this.logError(apiError);
    
    throw apiError;
  }

  /**
   * Esegue una richiesta API con gestione degli errori e retry automatico
   */
  async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    options: {
      endpoint?: string;
      service?: string;
      request?: any;
      maxRetries?: number;
      onRetry?: (error: ApiError, retryCount: number, delay: number) => void;
    } = {}
  ): Promise<T> {
    let lastError: ApiError | null = null;
    let retryCount = 0;
    const maxRetries = options.maxRetries ?? 3;

    while (retryCount <= maxRetries) {
      try {
        return await requestFn();
      } catch (error: any) {
        const apiError = this.parseError(
          error,
          options.endpoint,
          options.service,
          options.request
        );

        // Imposta il conteggio dei tentativi
        apiError.retryCount = retryCount;
        
        // Log dell'errore
        this.logError(apiError);
        
        // Verifica se è possibile ritentare
        if (!apiError.retryable || retryCount >= maxRetries) {
          throw apiError;
        }
        
        // Calcola il ritardo prima di ritentare
        const delay = apiError.retryDelay;
        
        // Notifica callback di retry
        if (options.onRetry) {
          options.onRetry(apiError, retryCount, delay);
        }
        
        // Attendi prima di ritentare
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Incrementa il conteggio dei tentativi
        retryCount++;
        lastError = apiError;
      }
    }

    // Non dovremmo mai arrivare qui ma TypeScript richiede un valore di ritorno
    throw lastError || new Error('Errore sconosciuto');
  }

  /**
   * Registra un errore API
   */
  private logError(error: ApiError): void {
    // Log dell'errore
    this.logger.error(
      `API Error [${error.type}] ${error.status ? `(${error.status})` : ''}: ${error.message}`,
      {
        ...error.toJSON(),
        originalError: error.originalError
      }
    );
  }
}


// Esporta un'istanza singleton del servizio
export const apiErrorService = new ApiErrorService();
