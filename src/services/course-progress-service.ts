import { supabase } from './supabase';

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: 'pending' | 'active' | 'completed' | 'dropped';
  enrolled_at: string;
  completed_at?: string;
  progress: number;
}

export interface CourseProgress {
  id: string;
  enrollment_id: string;
  resource_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  last_accessed: string;
  completion_time: number;
}

class CourseProgressService {
  async enrollInCourse(courseId: string): Promise<CourseEnrollment> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (existing) return existing;

    // Create new enrollment
    const { data, error } = await supabase
      .from('course_enrollments')
      .insert({
        user_id: user.id,
        course_id: courseId,
        status: 'active',
        progress: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getEnrollment(courseId: string): Promise<CourseEnrollment | null> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateResourceProgress(
    enrollmentId: string,
    resourceId: string,
    progress: number,
    completionTime: number
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const status = progress === 100 ? 'completed' : 'in_progress';

    const { error } = await supabase
      .from('course_progress')
      .upsert({
        enrollment_id: enrollmentId,
        resource_id: resourceId,
        status,
        progress,
        completion_time: completionTime,
        last_accessed: new Date().toISOString()
      }, {
        onConflict: 'enrollment_id,resource_id'
      });

    if (error) throw error;
  }

  async getResourceProgress(enrollmentId: string, resourceId: string): Promise<CourseProgress | null> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('course_progress')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .eq('resource_id', resourceId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getCourseProgress(courseId: string): Promise<{
    enrollment: CourseEnrollment;
    resources: Array<CourseProgress & { resource_id: string }>;
  }> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const enrollment = await this.getEnrollment(courseId);
    if (!enrollment) throw new Error('Not enrolled in course');

    const { data: resources, error } = await supabase
      .from('course_progress')
      .select('*')
      .eq('enrollment_id', enrollment.id);

    if (error) throw error;

    return {
      enrollment,
      resources: resources || []
    };
  }

  async dropCourse(courseId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('course_enrollments')
      .update({ 
        status: 'dropped',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('course_id', courseId);

    if (error) throw error;
  }

  async resumeCourse(courseId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('course_enrollments')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('course_id', courseId);

    if (error) throw error;
  }
}

export const courseProgressService = new CourseProgressService();