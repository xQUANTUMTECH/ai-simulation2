import { supabase } from './supabase';

export interface WebRoom {
  id: string;
  name: string;
  layout: RoomLayout;
  participants: RoomParticipant[];
  zones: InteractionZone[];
  status: 'active' | 'inactive';
  maxParticipants: number;
}

interface RoomLayout {
  width: number;
  height: number;
  background: string;
  grid: boolean;
  gridSize: number;
}

export interface RoomParticipant {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  position: Position;
  rotation: number;
  speaking: boolean;
  handRaised: boolean;
  status: 'active' | 'inactive';
  permissions: {
    canMove: boolean;
    canSpeak: boolean;
    canShare: boolean;
    isPresenter: boolean;
  };
}

interface Position {
  x: number;
  y: number;
}

interface InteractionZone {
  id: string;
  type: 'presentation' | 'discussion' | 'quiet';
  position: Position;
  size: {
    width: number;
    height: number;
  };
  properties: {
    label?: string;
    maxParticipants?: number;
    audioEnabled?: boolean;
    videoEnabled?: boolean;
  };
}

class WebSimulationService {
  private rooms: Map<string, WebRoom> = new Map();
  private activeRoomId: string | null = null;

  async createRoom(name: string): Promise<WebRoom> {
    try {
      // Verifica che supabase sia disponibile
      if (!supabase) {
        console.error('Supabase client non inizializzato');
        throw new Error('Database non disponibile');
      }
      
      console.log(`Creazione nuova stanza: "${name}"`);
      
      // Genera un ID predefinito se supabase fallisce
      const roomId = crypto.randomUUID();
      
      let roomData;
      try {
        const { data, error } = await supabase
          .from('web_rooms')
          .insert({
            id: roomId, // Specifichiamo l'ID generato per evitare errori
            name,
            layout: {
              width: 1200,
              height: 800,
              background: '#f0f0f0',
              grid: true,
              gridSize: 20
            },
            status: 'active',
            max_participants: 50
          })
          .select()
          .single();

        if (error) {
          console.warn('Errore durante inserimento in DB, uso fallback:', error.message);
          throw error;
        }
        
        roomData = data;
      } catch (dbError) {
        // Fallback quando il database fallisce
        console.warn('Utilizzando fallback per creazione stanza', dbError);
        roomData = {
          id: roomId,
          name,
          layout: {
            width: 1200,
            height: 800,
            background: '#f0f0f0',
            grid: true,
            gridSize: 20
          },
          status: 'active',
          max_participants: 50
        };
      }

      const room: WebRoom = {
        id: roomData.id,
        name: roomData.name,
        layout: roomData.layout,
        participants: [],
        zones: [],
        status: roomData.status || 'active',
        maxParticipants: roomData.max_participants || 50
      };

      // Aggiungiamo zone predefinite per le aree di interazione
      room.zones.push({
        id: crypto.randomUUID(),
        type: 'discussion',
        position: { x: 200, y: 200 },
        size: { width: 400, height: 300 },
        properties: {
          label: 'Area discussione',
          audioEnabled: true,
          videoEnabled: true
        }
      });

      this.rooms.set(room.id, room);
      this.activeRoomId = room.id; // Imposta come stanza attiva
      
      console.log(`Stanza creata con successo. ID: ${room.id}`);
      return room;
    } catch (error) {
      console.error('Errore fatale nella creazione della stanza:', error);
      // Fallback completo anche in caso di errori gravi
      const fallbackRoom: WebRoom = {
        id: `fallback-${Date.now()}`,
        name: name || 'Stanza di emergenza',
        layout: {
          width: 1200,
          height: 800,
          background: '#f0f0f0',
          grid: true,
          gridSize: 20
        },
        participants: [],
        zones: [],
        status: 'active',
        maxParticipants: 50
      };
      
      this.rooms.set(fallbackRoom.id, fallbackRoom);
      this.activeRoomId = fallbackRoom.id;
      
      console.log(`Creata stanza di fallback. ID: ${fallbackRoom.id}`);
      return fallbackRoom;
    }
  }

  async joinRoom(roomId: string, participant: Omit<RoomParticipant, 'id'>): Promise<string> {
    try {
      // Verifica che supabase sia disponibile
      if (!supabase) {
        console.error('Supabase client non inizializzato');
        throw new Error('Database non disponibile');
      }
      
      console.log(`Partecipante ${participant.name} sta entrando nella stanza ${roomId}`);
      
      const room = this.rooms.get(roomId);
      if (!room) {
        console.error(`Stanza ${roomId} non trovata`);
        throw new Error('Stanza non trovata');
      }

      if (room.participants.length >= room.maxParticipants) {
        console.error(`Stanza ${roomId} piena (${room.participants.length}/${room.maxParticipants})`);
        throw new Error('La stanza è piena');
      }

      let participantId = '';
      
      try {
        const { data, error } = await supabase
          .from('web_room_participants')
          .insert({
            room_id: roomId,
            user_id: participant.userId,
            position: participant.position,
            status: participant.status,
            media_state: {
              audio: false,
              video: false
            }
          })
          .select()
          .single();

        if (error) {
          console.warn('Errore inserimento partecipante nel DB, uso fallback:', error.message);
          throw error;
        }
        
        participantId = data.id;
      } catch (dbError) {
        // Fallback quando il database fallisce
        console.warn('Utilizzando ID locale per il partecipante', dbError);
        participantId = `local-${crypto.randomUUID()}`;
      }

      const newParticipant: RoomParticipant = {
        id: participantId,
        ...participant
      };

      room.participants.push(newParticipant);
      console.log(`Partecipante ${newParticipant.name} (${participantId}) aggiunto alla stanza ${roomId}`);
      return newParticipant.id;
    } catch (error) {
      console.error('Errore durante l\'accesso alla stanza:', error);
      
      // Fallback di emergenza con ID locale
      const emergencyId = `emergency-${Date.now()}`;
      console.warn(`Generato ID di emergenza: ${emergencyId}`);
      return emergencyId;
    }
  }

  async leaveRoom(roomId: string, participantId: string): Promise<void> {
    try {
      // Verifica che supabase sia disponibile
      if (!supabase) {
        console.error('Supabase client non inizializzato');
        throw new Error('Database non disponibile');
      }
      
      console.log(`Partecipante ${participantId} sta uscendo dalla stanza ${roomId}`);
      
      const room = this.rooms.get(roomId);
      if (!room) {
        console.error(`Stanza ${roomId} non trovata`);
        throw new Error('Stanza non trovata');
      }

      try {
        const { error } = await supabase
          .from('web_room_participants')
          .update({ left_at: new Date().toISOString() })
          .eq('id', participantId);

        if (error) {
          console.warn('Errore aggiornamento stato partecipante nel DB:', error.message);
        }
      } catch (dbError) {
        console.warn('Errore DB durante l\'uscita, continuo comunque:', dbError);
      }

      // Aggiorna comunque lo stato locale anche se il DB fallisce
      room.participants = room.participants.filter(p => p.id !== participantId);
      console.log(`Partecipante ${participantId} rimosso dalla stanza ${roomId}`);
    } catch (error) {
      console.error('Errore durante l\'uscita dalla stanza:', error);
      // Non lanciamo l'errore per consentire un'uscita pulita anche in caso di problemi
    }
  }

  async updateParticipantPosition(
    roomId: string,
    participantId: string,
    position: Position
  ): Promise<void> {
    try {
      // Verifica che supabase sia disponibile
      if (!supabase) {
        console.error('Supabase client non inizializzato');
        throw new Error('Database non disponibile');
      }
      
      console.log(`Aggiornamento posizione partecipante ${participantId} nella stanza ${roomId}`);
      
      const room = this.rooms.get(roomId);
      if (!room) {
        console.error(`Stanza ${roomId} non trovata`);
        throw new Error('Stanza non trovata');
      }

      const participant = room.participants.find(p => p.id === participantId);
      if (!participant) {
        console.error(`Partecipante ${participantId} non trovato`);
        throw new Error('Partecipante non trovato');
      }

      // Controllo se la posizione è nei limiti della stanza
      if (
        position.x < 0 || position.x > room.layout.width ||
        position.y < 0 || position.y > room.layout.height
      ) {
        console.warn(`Posizione fuori dai limiti: (${position.x}, ${position.y}), limitando...`);
        // Invece di lanciare un errore, limita la posizione ai confini della stanza
        position.x = Math.max(0, Math.min(position.x, room.layout.width));
        position.y = Math.max(0, Math.min(position.y, room.layout.height));
      }

      try {
        // Aggiornamento della posizione nel database
        const { error } = await supabase
          .from('web_room_participants')
          .update({ position })
          .eq('id', participantId);

        if (error) {
          console.warn('Errore aggiornamento posizione nel DB:', error.message);
          // Continuiamo comunque, poiché aggiorniamo lo stato locale
        }
      } catch (dbError) {
        console.warn('Errore DB durante aggiornamento posizione, continuo comunque:', dbError);
        // Continuiamo con l'aggiornamento locale
      }

      // Aggiornamento dello stato locale (avviene sempre, anche se il DB fallisce)
      participant.position = position;
      
      // Controllo interazioni con le zone
      this.checkZoneInteractions(room, participant);
      
      // Non lanciamo errori per consentire il movimento anche con problemi di DB
    } catch (error) {
      console.error('Errore durante l\'aggiornamento della posizione:', error);
      // Non lanciamo errori per evitare di bloccare la UI
    }
  }

  async addInteractionZone(
    roomId: string,
    zone: Omit<InteractionZone, 'id'>
  ): Promise<string> {
    try {
      // Verifica che supabase sia disponibile
      if (!supabase) {
        console.error('Supabase client non inizializzato');
        throw new Error('Database non disponibile');
      }
      
      console.log(`Aggiunta zona di interazione di tipo ${zone.type} nella stanza ${roomId}`);
      
      const room = this.rooms.get(roomId);
      if (!room) {
        console.error(`Stanza ${roomId} non trovata`);
        throw new Error('Stanza non trovata');
      }

      // Genera un ID localmente in caso di problemi con il DB
      const zoneId = crypto.randomUUID();
      
      try {
        const { data, error } = await supabase
          .from('web_room_zones')
          .insert({
            id: zoneId, // Specifichiamo l'ID generato per evitare errori
            room_id: roomId,
            type: zone.type,
            position: zone.position,
            size: zone.size,
            settings: zone.properties
          })
          .select()
          .single();

        if (error) {
          console.warn('Errore durante inserimento zona nel DB, uso fallback:', error.message);
          throw error;
        }
        
        const newZone: InteractionZone = {
          id: data.id,
          ...zone
        };

        room.zones.push(newZone);
        return newZone.id;
      } catch (dbError) {
        // Fallback quando il database fallisce
        console.warn('Utilizzando fallback per creazione zona', dbError);
        
        // Crea comunque la zona con ID locale
        const newZone: InteractionZone = {
          id: zoneId,
          ...zone
        };

        room.zones.push(newZone);
        console.log(`Zona creata localmente con ID: ${zoneId}`);
        return zoneId;
      }
    } catch (error) {
      console.error('Errore durante la creazione della zona:', error);
      // Fallback di emergenza con ID locale
      const emergencyId = `zone-emergency-${Date.now()}`;
      console.warn(`Generato ID di emergenza per zona: ${emergencyId}`);
      return emergencyId;
    }
  }

  async removeInteractionZone(roomId: string, zoneId: string): Promise<void> {
    try {
      // Verifica che supabase sia disponibile
      if (!supabase) {
        console.error('Supabase client non inizializzato');
        throw new Error('Database non disponibile');
      }
      
      console.log(`Rimozione zona ${zoneId} dalla stanza ${roomId}`);
      
      const room = this.rooms.get(roomId);
      if (!room) {
        console.error(`Stanza ${roomId} non trovata`);
        throw new Error('Stanza non trovata');
      }

      try {
        const { error } = await supabase
          .from('web_room_zones')
          .delete()
          .eq('id', zoneId);

        if (error) {
          console.warn('Errore durante la rimozione della zona dal DB:', error.message);
          // Continuiamo comunque con la rimozione locale
        }
      } catch (dbError) {
        console.warn('Errore DB durante rimozione zona, continuo comunque:', dbError);
      }

      // Aggiorna comunque lo stato locale anche se il DB fallisce
      const zonesBefore = room.zones.length;
      room.zones = room.zones.filter(z => z.id !== zoneId);
      const zonesAfter = room.zones.length;
      
      if (zonesBefore === zonesAfter) {
        console.warn(`Nessuna zona trovata con ID ${zoneId}`);
      } else {
        console.log(`Zona ${zoneId} rimossa con successo (localmente)`);
      }
    } catch (error) {
      console.error('Errore durante la rimozione della zona:', error);
      // Non lanciamo l'errore per evitare di bloccare la UI
    }
  }

  private checkZoneInteractions(room: WebRoom, participant: RoomParticipant): void {
    room.zones.forEach(zone => {
      const isInZone = this.isPositionInZone(participant.position, zone);
      
      if (isInZone) {
        // Handle zone effects
        switch (zone.type) {
          case 'quiet':
            participant.permissions.canSpeak = false;
            break;
          case 'presentation':
            participant.permissions.canShare = true;
            break;
          case 'discussion':
            participant.permissions.canSpeak = true;
            participant.permissions.canShare = true;
            break;
        }

        // Emit zone enter event
        this.emitZoneEvent('enter', zone, participant);
      }
    });
  }

  private isPositionInZone(position: Position, zone: InteractionZone): boolean {
    return (
      position.x >= zone.position.x &&
      position.x <= zone.position.x + zone.size.width &&
      position.y >= zone.position.y &&
      position.y <= zone.position.y + zone.size.height
    );
  }

  private emitZoneEvent(
    type: 'enter' | 'leave',
    zone: InteractionZone,
    participant: RoomParticipant
  ): void {
    // This would emit events to the room's event system
    console.log(`Zone ${type} event:`, {
      zoneId: zone.id,
      zoneType: zone.type,
      participantId: participant.id
    });
  }

  async updateParticipantStatus(
    roomId: string,
    participantId: string,
    updates: Partial<RoomParticipant>
  ): Promise<void> {
    try {
      // Verifica che supabase sia disponibile
      if (!supabase) {
        console.error('Supabase client non inizializzato');
        throw new Error('Database non disponibile');
      }
      
      console.log(`Aggiornamento stato partecipante ${participantId} nella stanza ${roomId}`);
      
      const room = this.rooms.get(roomId);
      if (!room) {
        console.error(`Stanza ${roomId} non trovata`);
        throw new Error('Stanza non trovata');
      }

      const participant = room.participants.find(p => p.id === participantId);
      if (!participant) {
        console.error(`Partecipante ${participantId} non trovato`);
        throw new Error('Partecipante non trovato');
      }

      try {
        const { error } = await supabase
          .from('web_room_participants')
          .update({
            status: updates.status,
            media_state: {
              audio: updates.speaking || false,
              video: participant.permissions.canShare
            }
          })
          .eq('id', participantId);

        if (error) {
          console.warn('Errore aggiornamento stato partecipante nel DB:', error.message);
          // Continuiamo comunque con l'aggiornamento locale
        }
      } catch (dbError) {
        console.warn('Errore DB durante aggiornamento stato, continuo comunque:', dbError);
      }

      // Aggiornamento dello stato locale (avviene sempre, anche se il DB fallisce)
      Object.assign(participant, updates);
      console.log(`Stato partecipante ${participantId} aggiornato localmente`);
      
    } catch (error) {
      console.error('Errore durante l\'aggiornamento dello stato:', error);
      // Non lanciamo errori per evitare di bloccare la UI
    }
  }

  getParticipantsInZone(roomId: string, zoneId: string): RoomParticipant[] {
    try {
      const room = this.rooms.get(roomId);
      if (!room) {
        console.error(`Stanza ${roomId} non trovata`);
        return []; // Restituiamo array vuoto invece di lanciare errore
      }

      const zone = room.zones.find(z => z.id === zoneId);
      if (!zone) {
        console.error(`Zona ${zoneId} non trovata`);
        return []; // Restituiamo array vuoto invece di lanciare errore
      }

      return room.participants.filter(p => 
        this.isPositionInZone(p.position, zone)
      );
    } catch (error) {
      console.error('Errore nel recupero dei partecipanti in zona:', error);
      return []; // Restituiamo array vuoto in caso di errore
    }
  }

  async saveRoomState(roomId: string): Promise<void> {
    try {
      // Verifica che supabase sia disponibile
      if (!supabase) {
        console.error('Supabase client non inizializzato');
        throw new Error('Database non disponibile');
      }
      
      console.log(`Salvataggio stato stanza ${roomId}`);
      
      const room = this.rooms.get(roomId);
      if (!room) {
        console.error(`Stanza ${roomId} non trovata`);
        throw new Error('Stanza non trovata');
      }

      try {
        const { error } = await supabase
          .from('web_rooms')
          .update({
            layout: room.layout,
            status: room.status,
            max_participants: room.maxParticipants,
            updated_at: new Date().toISOString()
          })
          .eq('id', roomId);

        if (error) {
          console.warn('Errore aggiornamento stato stanza nel DB:', error.message);
          // Continuiamo comunque, lo stato locale è già aggiornato
        } else {
          console.log(`Stato stanza ${roomId} salvato nel database`);
        }
      } catch (dbError) {
        console.warn('Errore DB durante salvataggio stato stanza, continuo comunque:', dbError);
        // Poiché lo stato esiste già in memoria, consideriamo l'operazione riuscita
      }
    } catch (error) {
      console.error('Errore durante il salvataggio dello stato della stanza:', error);
      // Non lanciamo l'errore per evitare di bloccare la UI
    }
  }
}

export const webSimulationService = new WebSimulationService();
