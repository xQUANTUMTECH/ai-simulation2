// API Express per gestione scenari
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

// Configurazione del router
const router = express.Router();

// Numero massimo di tentativi per operazioni database
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Funzione di utilità per eseguire un'operazione con retry
 * @param {Function} operation - Funzione da eseguire
 * @param {number} maxAttempts - Numero massimo di tentativi
 * @returns {Promise<any>} - Risultato dell'operazione
 */
async function withRetry(operation, maxAttempts = MAX_RETRY_ATTEMPTS) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Tentativo ${attempt}/${maxAttempts} fallito:`, error);
      lastError = error;
      
      if (attempt < maxAttempts) {
        // Attesa esponenziale tra i tentativi
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Tutti i tentativi falliti: ${lastError.message}`);
}

/**
 * Funzione di validazione per uno scenario
 * @param {Object} scenario - Lo scenario da validare
 * @returns {Object} - Errori di validazione o null se valido
 */
function validateScenario(scenario) {
  const errors = {};
  
  if (!scenario.title) {
    errors.title = 'Il titolo è obbligatorio';
  }
  
  if (!scenario.description) {
    errors.description = 'La descrizione è obbligatoria';
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * @api {post} /api/scenarios Crea un nuovo scenario
 */
router.post('/', async (req, res) => {
  try {
    // Validazione input
    const validationErrors = validateScenario(req.body);
    if (validationErrors) {
      return res.status(400).json({ 
        error: 'Dati scenario non validi', 
        details: validationErrors 
      });
    }
    
    const scenario = {
      id: uuidv4(),
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Salva in MongoDB con retry
    const result = await withRetry(async () => {
      const result = await req.app.locals.db.collection('scenarios').insertOne(scenario);
      
      if (!result.acknowledged) {
        throw new Error('Operazione non confermata dal database');
      }
      
      return result;
    });

    console.log(`Scenario creato con successo, ID: ${scenario.id}`);
    res.status(201).json(scenario);
  } catch (error) {
    console.error('Errore nella creazione dello scenario:', error);
    res.status(500).json({ 
      error: `Errore nella creazione dello scenario`,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {get} /api/scenarios Lista di tutti gli scenari
 */
router.get('/', async (req, res) => {
  try {
    // Applica paginazione
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Usa la funzione withRetry per rendere l'operazione più robusta
    const scenarios = await withRetry(async () => {
      return await req.app.locals.db.collection('scenarios')
        .find()
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
    });
    
    // Ottieni anche il conteggio totale per la paginazione
    const total = await withRetry(async () => {
      return await req.app.locals.db.collection('scenarios').countDocuments();
    });
    
    res.json({ 
      data: scenarios,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Errore nel recupero degli scenari:', error);
    res.status(500).json({ 
      error: 'Errore nel recupero degli scenari',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {get} /api/scenarios/:id Ottieni un singolo scenario
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica che l'ID non sia vuoto
    if (!id) {
      return res.status(400).json({ error: 'ID scenario richiesto' });
    }
    
    // Utilizza withRetry per una maggiore robustezza
    const scenario = await withRetry(async () => {
      return await req.app.locals.db.collection('scenarios').findOne({ id });
    });
    
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario non trovato' });
    }
    
    // Ottieni anche gli avatar associati con withRetry
    const avatars = await withRetry(async () => {
      return await req.app.locals.db.collection('avatars')
        .find({ scenario_id: id })
        .toArray();
    });
    
    // Aggiungi gli avatar al risultato
    scenario.avatars = avatars;
    
    // Aggiungi timestamp per cache control
    res.set('Last-Modified', new Date(scenario.updated_at).toUTCString());
    res.json(scenario);
  } catch (error) {
    console.error('Errore nel recupero dello scenario:', error);
    res.status(500).json({ 
      error: 'Errore nel recupero dello scenario',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {put} /api/scenarios/:id Aggiorna uno scenario
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validazione input
    if (!id) {
      return res.status(400).json({ error: 'ID scenario richiesto' });
    }
    
    // Verifica prima che lo scenario esista
    const existingScenario = await withRetry(async () => {
      return await req.app.locals.db.collection('scenarios').findOne({ id });
    });
    
    if (!existingScenario) {
      return res.status(404).json({ error: 'Scenario non trovato' });
    }
    
    // Prepara i dati da aggiornare
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };
    
    // Rimuovi l'id dall'oggetto di aggiornamento per sicurezza
    delete updateData.id;
    
    // Validazione dei dati
    const validationErrors = validateScenario({
      title: updateData.title || existingScenario.title,
      description: updateData.description || existingScenario.description
    });
    
    if (validationErrors) {
      return res.status(400).json({ 
        error: 'Dati scenario non validi', 
        details: validationErrors 
      });
    }
    
    // Aggiorna lo scenario con retry
    const result = await withRetry(async () => {
      const result = await req.app.locals.db.collection('scenarios')
        .updateOne(
          { id },
          { $set: updateData }
        );
      
      if (!result.acknowledged) {
        throw new Error('Operazione non confermata dal database');
      }
      
      return result;
    });
    
    console.log(`Scenario aggiornato con successo, ID: ${id}`);
    res.json({ 
      success: true, 
      message: 'Scenario aggiornato con successo',
      updated_at: updateData.updated_at
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento dello scenario:', error);
    res.status(500).json({ 
      error: 'Errore nell\'aggiornamento dello scenario',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {delete} /api/scenarios/:id Elimina uno scenario
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validazione input
    if (!id) {
      return res.status(400).json({ error: 'ID scenario richiesto' });
    }
    
    // Verifica prima che lo scenario esista
    const existingScenario = await withRetry(async () => {
      return await req.app.locals.db.collection('scenarios').findOne({ id });
    });
    
    if (!existingScenario) {
      return res.status(404).json({ error: 'Scenario non trovato' });
    }
    
    // Utilizziamo una transazione per garantire l'atomicità dell'operazione
    const client = req.app.locals.db.client;
    const session = client.startSession();
    
    try {
      // Inizia la transazione
      session.startTransaction();
      
      // Elimina gli avatar associati
      await withRetry(async () => {
        const result = await req.app.locals.db.collection('avatars')
          .deleteMany({ scenario_id: id }, { session });
        
        if (!result.acknowledged) {
          throw new Error('Eliminazione avatar non confermata dal database');
        }
        
        return result;
      });
      
      // Elimina lo scenario
      const result = await withRetry(async () => {
        const result = await req.app.locals.db.collection('scenarios')
          .deleteOne({ id }, { session });
        
        if (!result.acknowledged) {
          throw new Error('Eliminazione scenario non confermata dal database');
        }
        
        return result;
      });
      
      // Controlla se lo scenario è stato effettivamente eliminato
      if (result.deletedCount === 0) {
        await session.abortTransaction();
        return res.status(404).json({ error: 'Scenario non trovato' });
      }
      
      // Commit della transazione
      await session.commitTransaction();
      
      console.log(`Scenario eliminato con successo, ID: ${id}`);
      res.json({ 
        success: true, 
        message: 'Scenario eliminato con successo',
        timestamp: new Date().toISOString()
      });
    } catch (transactionError) {
      // In caso di errore, annulla la transazione
      await session.abortTransaction();
      throw transactionError;
    } finally {
      // Chiudi la sessione in ogni caso
      session.endSession();
    }
  } catch (error) {
    console.error('Errore nell\'eliminazione dello scenario:', error);
    res.status(500).json({ 
      error: 'Errore nell\'eliminazione dello scenario',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export { router };
