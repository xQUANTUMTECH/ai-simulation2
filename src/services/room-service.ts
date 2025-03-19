import { webRTCService } from './webrtc-service';
import { supabase } from './supabase';

export interface VirtualRoom {
  id: string;
  name: string;
  type: 'web' | 'unreal';
  status: 'waiting' | 'active' | 'ended';
  maxParticipants: number;
  createdBy: string;
  createdAt: string;
}

export interface RoomParticipant {
  id: string;
  userId: string;
  name: string;
  role: 'host' | 'participant' | 'observer';
  status: 'active' | 'inactive';
  joinedAt: string;
  leftAt?: string;
}

class RoomService {
  private currentRoom: VirtualRoom | null = null;
  private participants: Map<string, RoomParticipant> = new Map();

  constructor() {
    this.setupWebRTCListeners();
  }

  private setupWebRTCListeners() {
    webRTCService.on('joined', ({ roomId, userId }) => {
      this.broadcastParticipantJoined(roomId, userId);
    });

    webRTCService.on('left', () => {
      if (this.currentRoom) {
        this.broadcastParticipantLeft(this.currentRoom.id);
      }
    });

    webRTCService.on('connectionStateChange', ({ peerId, state }) => {
      this.updateParticipantStatus(peerId, state === 'connected' ? 'active' : 'inactive');
    });
  }

  async createRoom(options: {
    name: string;
    type: VirtualRoom['type'];
    maxParticipants: number;
  }): Promise<VirtualRoom> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const room: Partial<VirtualRoom> = {
      name: options.name,
      type: options.type,
      status: 'waiting',
      maxParticipants: options.maxParticipants,
      createdBy: user.id
    };

    const { data, error } = await supabase
      .from('virtual_rooms')
      .insert(room)
      .select()
      .single();

    if (error) throw error;

    this.currentRoom = data;
    return data;
  }

  async joinRoom(roomId: string, options: {
    audio: boolean;
    video: boolean;
    role?: RoomParticipant['role'];
  }): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Get room details
    const { data: room, error: roomError } = await supabase
      .from('virtual_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError) throw roomError;

    // Join WebRTC room
    await webRTCService.joinRoom(roomId, {
      audio: options.audio,
      video: options.video
    });

    this.currentRoom = room;
  }

  async leaveRoom(): Promise<void> {
    if (!this.currentRoom) return;

    await webRTCService.leaveRoom();
    this.currentRoom = null;
    this.participants.clear();
  }

  private async broadcastParticipantJoined(roomId: string, userId: string) {
    if (!supabase) return;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return;

    const participant: RoomParticipant = {
      id: crypto.randomUUID(),
      userId: user.id,
      name: user.user_metadata.full_name || 'Anonymous',
      role: 'participant',
      status: 'active',
      joinedAt: new Date().toISOString()
    };

    this.participants.set(userId, participant);

    // Broadcast to other participants
    webRTCService.sendData({
      type: 'participant_joined',
      participant
    });
  }

  private async broadcastParticipantLeft(roomId: string) {
    if (!supabase) return;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return;

    // Broadcast to other participants
    webRTCService.sendData({
      type: 'participant_left',
      userId: user.id
    });
  }

  private updateParticipantStatus(participantId: string, status: RoomParticipant['status']) {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.status = status;
      this.participants.set(participantId, participant);
    }
  }

  getParticipants(): RoomParticipant[] {
    return Array.from(this.participants.values());
  }

  getCurrentRoom(): VirtualRoom | null {
    return this.currentRoom;
  }
}

export const roomService = new RoomService();