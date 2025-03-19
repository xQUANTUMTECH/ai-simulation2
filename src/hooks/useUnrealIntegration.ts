import { useState, useEffect } from 'react';
import { aiService } from '../services/ai-service';
import { unrealService, UnrealScenario } from '../services/unreal-service';

export function useUnrealIntegration(scenarioId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<UnrealScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connectToUnreal = async () => {
      try {
        // Connessione a Unreal Engine
        await aiService.connectToUnreal(8080, scenarioId);
        
        // Inizializzazione scenario
        await unrealService.initializeScenario(scenarioId);
        
        setIsConnected(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore di connessione');
      }
    };

    connectToUnreal();
  }, [scenarioId]);

  const sendActionToUnreal = async (action: any) => {
    try {
      await unrealService.updateAvatarState(action.avatarId, action.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'invio dell\'azione');
    }
  };

  return {
    isConnected,
    currentScenario,
    error,
    sendActionToUnreal
  };
}