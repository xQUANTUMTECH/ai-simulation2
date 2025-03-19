import { aiService } from './ai-service';
import { voiceService } from './voice-service';
import { supabase } from './supabase';
import { ttsQueueService } from './tts-queue-service';

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  personality: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  knowledge: {
    topics: string[];
    context: string;
    sources: string[];
  };
  voice: {
    profile: string;
    emotion: 'neutral' | 'happy' | 'sad' | 'angry';
    language: string;
  };
  behavior: {
    responseStyle: string;
    interactionPatterns: string[];
    decisionMaking: string[];
  };
}

export interface AgentResponse {
  text: string;
  emotion: 'neutral' | 'happy' | 'sad' | 'angry';
  confidence: number;
  context?: any;
}

class AIAgentService {
  private agents: Map<string, AIAgent> = new Map();
  private readonly CHUNK_SIZE = 2000; // Characters per chunk for processing

  constructor() {
    // Registra gli agenti esistenti nel sistema di coda TTS all'avvio
    this.loadAgentsFromDatabase();
  }

  private async loadAgentsFromDatabase(): Promise<void> {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      
      const { data, error } = await supabase
        .from('avatar_instances')
        .select('*')
        .eq('status', 'active');
        
      if (error) throw error;
      
      // Carica e registra gli agenti nel sistema TTS
      if (data && data.length > 0) {
        for (const agentData of data) {
          const agent: AIAgent = {
            id: agentData.template_id,
            name: agentData.name,
            role: agentData.learning_data?.role || 'Assistente',
            personality: agentData.learning_data?.personality || this.getDefaultPersonality(),
            knowledge: agentData.learning_data?.knowledge || { topics: [], context: '', sources: [] },
            voice: agentData.learning_data?.voice || { profile: 'default', emotion: 'neutral', language: 'it-IT' },
            behavior: agentData.learning_data?.behavior || { 
              responseStyle: '', 
              interactionPatterns: [], 
              decisionMaking: [] 
            }
          };
          
          this.agents.set(agent.id, agent);
          
          // Registra il profilo vocale dell'agente nel sistema di coda TTS
          this.registerAgentToTTSQueue(agent);
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento degli agenti:', error);
    }
  }
  
  private getDefaultPersonality(): AIAgent['personality'] {
    return {
      openness: 0.6,
      conscientiousness: 0.7,
      extraversion: 0.5,
      agreeableness: 0.6,
      neuroticism: 0.4
    };
  }

  private registerAgentToTTSQueue(agent: AIAgent): void {
    // Determina la priorità dell'agente in base al suo ruolo
    let priority = 5; // Priorità media di default
    
    // Assegna priorità in base al ruolo
    if (agent.role.toLowerCase().includes('direttore') || 
        agent.role.toLowerCase().includes('responsabile') ||
        agent.role.toLowerCase().includes('supervisor')) {
      priority = 8; // Priorità alta
    } else if (agent.role.toLowerCase().includes('assistente')) {
      priority = 3; // Priorità bassa
    }
    
    // Registra l'agente nel sistema di coda TTS
    ttsQueueService.registerAgentVoice({
      agentId: agent.id,
      name: agent.name,
      voiceConfig: {
        voice: agent.voice.profile,
        language: agent.voice.language,
        emotion: agent.voice.emotion
      },
      role: agent.role,
      priority: priority
    });
  }

  async createAgentFromDocument(
    name: string,
    role: string,
    documentId: string,
    voiceProfile?: string
  ): Promise<AIAgent> {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      
      // Get document content
      const { data: document, error } = await supabase
        .from('academy_documents')
        .select('content_text')
        .eq('id', documentId)
        .single();
      
      if (error) throw error;
      if (!document?.content_text) {
        throw new Error('Document content not found');
      }

      // Process document content in chunks
      const knowledge = await this.processDocumentContent(document.content_text);

      // Generate personality profile
      const personality = await this.generatePersonality(role, knowledge.topics);

      // Create agent
      const agent: AIAgent = {
        id: crypto.randomUUID(),
        name,
        role,
        personality,
        knowledge,
        voice: {
          profile: voiceProfile || 'default',
          emotion: 'neutral',
          language: 'it-IT'
        },
        behavior: {
          responseStyle: await this.generateResponseStyle(personality),
          interactionPatterns: await this.generateInteractionPatterns(role, personality),
          decisionMaking: await this.generateDecisionPatterns(role, personality)
        }
      };

      // Store agent
      this.agents.set(agent.id, agent);

      // Save to database
      await this.saveAgent(agent);

      return agent;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }

  async createAgentFromChat(
    name: string,
    role: string,
    chatHistory: Array<{ role: string; content: string }>,
    voiceProfile?: string
  ): Promise<AIAgent> {
    try {
      // Extract knowledge from chat
      const knowledge = await this.processChat(chatHistory);

      // Generate personality profile
      const personality = await this.generatePersonality(role, knowledge.topics);

      // Create agent
      const agent: AIAgent = {
        id: crypto.randomUUID(),
        name,
        role,
        personality,
        knowledge,
        voice: {
          profile: voiceProfile || 'default',
          emotion: 'neutral',
          language: 'it-IT'
        },
        behavior: {
          responseStyle: await this.generateResponseStyle(personality),
          interactionPatterns: await this.generateInteractionPatterns(role, personality),
          decisionMaking: await this.generateDecisionPatterns(role, personality)
        }
      };

      // Store agent
      this.agents.set(agent.id, agent);

      // Save to database
      await this.saveAgent(agent);

      return agent;
    } catch (error) {
      console.error('Error creating agent from chat:', error);
      throw error;
    }
  }

  private async processDocumentContent(content: string): Promise<AIAgent['knowledge']> {
    const chunks = this.splitIntoChunks(content);
    const processedChunks = await Promise.all(
      chunks.map(chunk => this.processChunk(chunk))
    );

    return {
      topics: Array.from(new Set(processedChunks.flatMap(c => c.topics))),
      context: processedChunks.map(c => c.context).join('\n'),
      sources: ['document']
    };
  }

  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += this.CHUNK_SIZE) {
      chunks.push(text.slice(i, i + this.CHUNK_SIZE));
    }
    return chunks;
  }

  private async processChunk(chunk: string): Promise<{
    topics: string[];
    context: string;
  }> {
    const prompt = `
      Analyze this text and extract:
      1. Main topics (as a list)
      2. Key information and context
      3. Important relationships between concepts

      Text: ${chunk}
    `;

    const response = await aiService.generateResponse(prompt, 'mistral');
    
    try {
      const parsed = JSON.parse(response);
      return {
        topics: parsed.topics || [],
        context: parsed.context || ''
      };
    } catch {
      // Fallback if response is not JSON
      return {
        topics: [],
        context: response
      };
    }
  }

  private async processChat(
    chatHistory: Array<{ role: string; content: string }>
  ): Promise<AIAgent['knowledge']> {
    const prompt = `
      Analyze this conversation and extract:
      1. Main topics discussed
      2. Key information and context
      3. Important patterns and preferences

      Conversation:
      ${chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
    `;

    const response = await aiService.generateResponse(prompt, 'mistral');
    
    try {
      const parsed = JSON.parse(response);
      return {
        topics: parsed.topics || [],
        context: parsed.context || '',
        sources: ['chat']
      };
    } catch {
      return {
        topics: [],
        context: response,
        sources: ['chat']
      };
    }
  }

  private async generatePersonality(
    role: string,
    topics: string[]
  ): Promise<AIAgent['personality']> {
    const prompt = `
      Generate a personality profile for an AI agent with role: ${role}
      Topics of expertise: ${topics.join(', ')}
      
      Return a JSON object with these traits (0-1 scale):
      - openness
      - conscientiousness
      - extraversion
      - agreeableness
      - neuroticism
      
      Consider the role and expertise when determining trait levels.
    `;

    const response = await aiService.generateResponse(prompt, 'mistral');
    
    try {
      return JSON.parse(response);
    } catch {
      // Default balanced personality
      return {
        openness: 0.6,
        conscientiousness: 0.7,
        extraversion: 0.5,
        agreeableness: 0.6,
        neuroticism: 0.4
      };
    }
  }

  private async generateResponseStyle(
    personality: AIAgent['personality']
  ): Promise<string> {
    const prompt = `
      Generate a response style description based on this personality:
      ${JSON.stringify(personality)}
      
      Consider:
      1. Communication style (formal/informal)
      2. Level of detail in responses
      3. Emotional expression
      4. Use of technical language
    `;

    return aiService.generateResponse(prompt, 'mistral');
  }

  private async generateInteractionPatterns(
    role: string,
    personality: AIAgent['personality']
  ): Promise<string[]> {
    const prompt = `
      Generate interaction patterns for an AI agent:
      Role: ${role}
      Personality: ${JSON.stringify(personality)}
      
      Return a JSON array of behavior patterns for:
      1. Initial interactions
      2. Problem-solving approaches
      3. Emotional responses
      4. Conflict resolution
    `;

    const response = await aiService.generateResponse(prompt, 'mistral');
    
    try {
      return JSON.parse(response);
    } catch {
      return ['default_pattern'];
    }
  }

  private async generateDecisionPatterns(
    role: string,
    personality: AIAgent['personality']
  ): Promise<string[]> {
    const prompt = `
      Generate decision-making patterns for an AI agent:
      Role: ${role}
      Personality: ${JSON.stringify(personality)}
      
      Return a JSON array of decision strategies for:
      1. Risk assessment
      2. Priority setting
      3. Resource allocation
      4. Time management
    `;

    const response = await aiService.generateResponse(prompt, 'mistral');
    
    try {
      return JSON.parse(response);
    } catch {
      return ['default_decision'];
    }
  }

  private async saveAgent(agent: AIAgent): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('avatar_instances')
      .insert({
        template_id: agent.id,
        name: agent.name,
        status: 'active',
        learning_data: {
          personality: agent.personality,
          knowledge: agent.knowledge,
          behavior: agent.behavior
        }
      });

    if (error) throw error;
  }

  async getResponse(
    agentId: string,
    input: string,
    context?: any
  ): Promise<AgentResponse> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');

    try {
      // Generate response using agent's knowledge and personality
      const prompt = `
        As an AI agent with these characteristics:
        Role: ${agent.role}
        Personality: ${JSON.stringify(agent.personality)}
        Knowledge: ${JSON.stringify(agent.knowledge)}
        Response Style: ${agent.behavior.responseStyle}
        
        Respond to: "${input}"
        ${context ? `Context: ${JSON.stringify(context)}` : ''}
        
        Return a JSON object with:
        1. text: The response text
        2. emotion: The emotional state (neutral/happy/sad/angry)
        3. confidence: Confidence level (0-1)
      `;

      const response = await aiService.generateResponse(prompt, 'mistral');
      const parsed = JSON.parse(response);

      // Aggiungi la risposta alla coda TTS dell'agente
      // In questo modo gestiremo automaticamente l'ordine di parlato degli agenti
      ttsQueueService.enqueue(
        agentId, 
        parsed.text, 
        {
          emotion: parsed.emotion,
          voice: agent.voice.profile,
          language: agent.voice.language
        },
        undefined // Usa la priorità di default dell'agente
      );

      return parsed;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  /**
   * Aggiorna il nome di un agente AI
   * @param agentId ID dell'agente da aggiornare
   * @param newName Nuovo nome da assegnare all'agente
   */
  async updateAgentName(
    agentId: string,
    newName: string
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agente non trovato');

    try {
      // Aggiorna il nome localmente
      agent.name = newName;

      // Aggiorna nell'istanza TTS
      const agentProfile = ttsQueueService.getAgentProfile(agentId);
      if (agentProfile) {
        // Annulla la registrazione attuale
        ttsQueueService.unregisterAgentVoice(agentId);
        
        // Registra di nuovo con il nuovo nome
        this.registerAgentToTTSQueue(agent);
      }

      // Aggiorna nel database
      if (supabase) {
        const { error } = await supabase
          .from('avatar_instances')
          .update({
            name: newName,
            updated_at: new Date().toISOString()
          })
          .eq('template_id', agentId);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Errore durante l\'aggiornamento del nome dell\'agente:', error);
      throw error;
    }
  }

  /**
   * Elimina un agente AI
   * @param agentId ID dell'agente da eliminare
   */
  async deleteAgent(
    agentId: string
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agente non trovato');

    try {
      // Rimuovi l'agente dalla coda TTS
      ttsQueueService.unregisterAgentVoice(agentId);
      
      // Rimuovi l'agente dalla memoria locale
      this.agents.delete(agentId);

      // Aggiorna lo stato nel database (non eliminiamo effettivamente, ma impostiamo come inattivo)
      if (supabase) {
        const { error } = await supabase
          .from('avatar_instances')
          .update({
            status: 'inactive',
            deleted_at: new Date().toISOString()
          })
          .eq('template_id', agentId);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Errore durante l\'eliminazione dell\'agente:', error);
      throw error;
    }
  }

  /**
   * Ottiene la lista di tutti gli agenti disponibili
   */
  getAllAgents(): AIAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Ottiene un agente specifico per ID
   */
  getAgent(agentId: string): AIAgent | undefined {
    return this.agents.get(agentId);
  }

  async updateAgentKnowledge(
    agentId: string,
    newContent: string,
    source: string
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');

    try {
      // Process new content
      const processedContent = await this.processChunk(newContent);

      // Update agent's knowledge
      agent.knowledge.topics = Array.from(new Set([
        ...agent.knowledge.topics,
        ...processedContent.topics
      ]));
      agent.knowledge.context += '\n' + processedContent.context;
      agent.knowledge.sources = Array.from(new Set([
        ...agent.knowledge.sources,
        source
      ]));

      // Update in database
      await this.updateAgent(agent);
    } catch (error) {
      console.error('Error updating agent knowledge:', error);
      throw error;
    }
  }

  private async updateAgent(agent: AIAgent): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('avatar_instances')
      .update({
        learning_data: {
          personality: agent.personality,
          knowledge: agent.knowledge,
          behavior: agent.behavior
        },
        updated_at: new Date().toISOString()
      })
      .eq('template_id', agent.id);

    if (error) throw error;
  }
}

export const aiAgentService = new AIAgentService();
