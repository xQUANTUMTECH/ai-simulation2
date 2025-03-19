import { supabase } from './supabase';

export interface AcademyCourse {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AcademyVideo {
  id: string;
  course_id: string;
  title: string;
  description: string;
  url: string;
  duration: number;
  order: number;
  transcript: string;
  created_at: string;
  updated_at: string;
}

export interface AcademyDocument {
  id: string;
  video_id: string;
  title: string;
  description: string;
  file_url: string;
  content_text: string;
  created_at: string;
  updated_at: string;
}

export interface VideoProgress {
  id: string;
  user_id: string;
  video_id: string;
  progress: number;
  completed: boolean;
  last_position: number;
  created_at: string;
  updated_at: string;
}

class AcademyService {
  // Courses
  async getCourses(): Promise<AcademyCourse[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('academy_courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getCourse(courseId: string): Promise<AcademyCourse> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('academy_courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) throw error;
    return data;
  }

  async createCourse(course: Omit<AcademyCourse, 'id' | 'created_at' | 'updated_at'>): Promise<AcademyCourse> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('academy_courses')
      .insert(course)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Videos
  async getVideos(courseId: string): Promise<AcademyVideo[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('academy_videos')
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getVideo(videoId: string): Promise<AcademyVideo> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('academy_videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error) throw error;
    return data;
  }

  async createVideo(video: Omit<AcademyVideo, 'id' | 'created_at' | 'updated_at'>): Promise<AcademyVideo> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('academy_videos')
      .insert(video)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Documents
  async getDocuments(videoId: string): Promise<AcademyDocument[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('academy_documents')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async createDocument(document: Omit<AcademyDocument, 'id' | 'created_at' | 'updated_at'>): Promise<AcademyDocument> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('academy_documents')
      .insert(document)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Progress
  async getVideoProgress(videoId: string): Promise<VideoProgress | null> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('academy_video_progress')
      .select('*')
      .eq('video_id', videoId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateProgress(videoId: string, progress: number, position: number): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const completed = progress === 100;

    const { error } = await supabase
      .from('academy_video_progress')
      .upsert({
        user_id: user.id,
        video_id: videoId,
        progress,
        completed,
        last_position: position
      }, {
        onConflict: 'user_id,video_id'
      });

    if (error) throw error;
  }

  // Analytics
  async getCourseProgress(courseId: string): Promise<{
    totalVideos: number;
    completedVideos: number;
    averageProgress: number;
  }> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Get all videos for the course
    const { data: videos, error: videosError } = await supabase
      .from('academy_videos')
      .select('id')
      .eq('course_id', courseId);

    if (videosError) throw videosError;

    // Get progress for all videos
    const { data: progress, error: progressError } = await supabase
      .from('academy_video_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('video_id', videos.map(v => v.id));

    if (progressError) throw progressError;

    const totalVideos = videos.length;
    const completedVideos = progress?.filter(p => p.completed).length || 0;
    const averageProgress = progress?.reduce((acc, p) => acc + p.progress, 0) / totalVideos || 0;

    return {
      totalVideos,
      completedVideos,
      averageProgress
    };
  }
}

export const academyService = new AcademyService();