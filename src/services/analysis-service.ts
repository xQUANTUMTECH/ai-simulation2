/**
 * File di compatibilità per l'analysis-service
 * Reindirizza all'implementazione modulare
 */

import { analysisService } from './analysis';

// Ri-esporta l'istanza principale del servizio
export { analysisService };

// Rendi questo servizio l'export di default per mantenere la compatibilità
export default analysisService;
