import { supabase } from './supabase';
import { courseProgressService } from './course-progress-service';

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  objectives: string[];
  target_audience: string[];
  estimated_duration: string;
  max_participants: number;
  enrollment_start_date?: string;
  enrollment_end_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_in_course: number;
  created_at: string;
  updated_at: string;
}

export interface CourseResource {
  id: string;
  section_id: string;
  title: string;
  description: string;
  type: 'video' | 'document' | 'quiz' | 'link';
  url: string;
  order_in_section: number;
  metadata: {
    duration?: string;
    fileSize?: number;
    fileType?: string;
    thumbnailUrl?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: 'pending' | 'active' | 'completed' | 'dropped';
  enrolled_at: string;
  completed_at?: string;
  progress: number;
}

class CourseService {
  // Course Management
  async createCourse(course: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Promise<Course> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('courses')
      .insert(course)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCourses(): Promise<Course[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getCourse(courseId: string): Promise<{
    course: Course;
    sections: (CourseSection & { resources: CourseResource[] })[];
    enrollment?: CourseEnrollment;
    progress?: {
      totalResources: number;
      completedResources: number;
      lastAccessed?: string;
    };
  }> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    const { data: sections, error: sectionsError } = await supabase
      .from('course_sections')
      .select(`
        *,
        resources:course_resources(*)
      `)
      .eq('course_id', courseId)
      .order('order_in_course', { ascending: true });

    if (sectionsError) throw sectionsError;

    // Get enrollment and progress if user is authenticated
    let enrollment;
    let progress;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        enrollment = await courseProgressService.getEnrollment(courseId);
        if (enrollment) {
          const { resources } = await courseProgressService.getCourseProgress(courseId);
          const totalResources = sections.reduce((total, section) => 
            total + section.resources.length, 0);
          const completedResources = resources.filter(r => r.status === 'completed').length;
          const lastAccessed = resources.length > 0 
            ? resources.sort((a, b) => 
                new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime()
              )[0].last_accessed
            : undefined;
          
          progress = {
            totalResources,
            completedResources,
            lastAccessed
          };
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }

    return {
      course,
      sections: sections || [],
      enrollment,
      progress
    };
  }

  // Section Management
  async createSection(section: Omit<CourseSection, 'id' | 'created_at' | 'updated_at'>): Promise<CourseSection> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('course_sections')
      .insert(section)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateSectionOrder(sectionId: string, newOrder: number): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('course_sections')
      .update({ order_in_course: newOrder })
      .eq('id', sectionId);

    if (error) throw error;
  }

  // Resource Management
  async createResource(resource: Omit<CourseResource, 'id' | 'created_at' | 'updated_at'>): Promise<CourseResource> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('course_resources')
      .insert(resource)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateResourceOrder(resourceId: string, newOrder: number): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('course_resources')
      .update({ order_in_section: newOrder })
      .eq('id', resourceId);

    if (error) throw error;
  }

  // Enrollment Management
  async enrollInCourse(courseId: string): Promise<CourseEnrollment> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

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

  async updateEnrollmentProgress(courseId: string, progress: number): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('course_enrollments')
      .update({
        progress,
        status: progress === 100 ? 'completed' : 'active',
        completed_at: progress === 100 ? new Date().toISOString() : null
      })
      .eq('course_id', courseId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async getEnrollment(courseId: string): Promise<CourseEnrollment | null> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getUserEnrollments(): Promise<(CourseEnrollment & { course: Course })[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        course:courses(*)
      `)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Course Progress Tracking
  async getCourseProgress(courseId: string): Promise<{
    totalResources: number;
    completedResources: number;
    progress: number;
  }> {
    const { sections } = await this.getCourse(courseId);
    const enrollment = await this.getEnrollment(courseId);

    const totalResources = sections.reduce(
      (total, section) => total + section.resources.length,
      0
    );

    return {
      totalResources,
      completedResources: Math.floor((enrollment?.progress || 0) * totalResources / 100),
      progress: enrollment?.progress || 0
    };
  }
}

export const courseService = new CourseService();