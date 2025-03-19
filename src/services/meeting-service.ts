import { EventEmitter } from '../utils/event-emitter';

interface Participant {
  id: string;
  name: string;
  role: 'presenter' | 'participant' | 'observer';
  status: 'active' | 'inactive';
  permissions: {
    canPresent: boolean;
    canChat: boolean;
    canAnnotate: boolean;
    canControl: boolean;
  };
}

interface MeetingState {
  id: string;
  status: 'waiting' | 'active' | 'paused' | 'ended';
  presenter: string | null;
  participants: Participant[];
  startTime: Date | null;
  endTime: Date | null;
  tools: {
    whiteboard: boolean;
    chat: boolean;
    polls: boolean;
    scenarios: boolean;
  };
}

class MeetingService extends EventEmitter {
  private state: MeetingState;

  constructor() {
    super();
    this.state = {
      id: '',
      status: 'waiting',
      presenter: null,
      participants: [],
      startTime: null,
      endTime: null,
      tools: {
        whiteboard: false,
        chat: true,
        polls: false,
        scenarios: false
      }
    };
  }

  // Inizializzazione meeting
  async initializeMeeting(meetingId: string): Promise<void> {
    this.state.id = meetingId;
    this.state.status = 'waiting';
    this.emit('meeting:initialized', { meetingId });
  }

  // Gestione partecipanti
  async addParticipant(participant: Omit<Participant, 'status'>): Promise<void> {
    const newParticipant: Participant = {
      ...participant,
      status: 'active'
    };

    this.state.participants.push(newParticipant);
    this.emit('participant:added', newParticipant);
  }

  async removeParticipant(participantId: string): Promise<void> {
    this.state.participants = this.state.participants.filter(
      p => p.id !== participantId
    );
    this.emit('participant:removed', { participantId });
  }

  async updateParticipantRole(participantId: string, role: Participant['role']): Promise<void> {
    const participant = this.state.participants.find(p => p.id === participantId);
    if (participant) {
      participant.role = role;
      this.emit('participant:updated', participant);
    }
  }

  // Controllo presentazione
  async startPresentation(presenterId: string): Promise<void> {
    this.state.status = 'active';
    this.state.presenter = presenterId;
    this.state.startTime = new Date();
    this.emit('presentation:started', {
      presenterId,
      startTime: this.state.startTime
    });
  }

  async stopPresentation(): Promise<void> {
    this.state.status = 'ended';
    this.state.presenter = null;
    this.state.endTime = new Date();
    this.emit('presentation:stopped', {
      endTime: this.state.endTime
    });
  }

  async pausePresentation(): Promise<void> {
    this.state.status = 'paused';
    this.emit('presentation:paused');
  }

  async resumePresentation(): Promise<void> {
    this.state.status = 'active';
    this.emit('presentation:resumed');
  }

  // Gestione strumenti
  async toggleTool(tool: keyof MeetingState['tools']): Promise<void> {
    this.state.tools[tool] = !this.state.tools[tool];
    this.emit('tool:toggled', {
      tool,
      enabled: this.state.tools[tool]
    });
  }

  // Gestione permessi
  async updateParticipantPermissions(
    participantId: string,
    permissions: Partial<Participant['permissions']>
  ): Promise<void> {
    const participant = this.state.participants.find(p => p.id === participantId);
    if (participant) {
      participant.permissions = {
        ...participant.permissions,
        ...permissions
      };
      this.emit('permissions:updated', {
        participantId,
        permissions: participant.permissions
      });
    }
  }

  // Ottenere lo stato corrente
  getMeetingState(): MeetingState {
    return { ...this.state };
  }

  getParticipant(participantId: string): Participant | undefined {
    return this.state.participants.find(p => p.id === participantId);
  }

  // Eventi e notifiche
  private notifyParticipants(event: string, data: any): void {
    this.emit('notification', {
      event,
      data,
      timestamp: new Date()
    });
  }
}

export const meetingService = new MeetingService();
