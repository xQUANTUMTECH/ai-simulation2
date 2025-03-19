import { supabase } from './supabase';

export interface AdminContentUpload {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: 'video' | 'document' | 'presentation';
  file_size: number;
  mime_type: string;
  status: 'processing' | 'ready' | 'error';
  selected?: boolean;
  tags?: string[];
  metadata: {
    duration?: number;
    resolution?: string;
    encoding?: string;
    thumbnails?: string[];
    pageCount?: number;
    author?: string;
    lastModified?: string;
    compressed?: boolean;
    originalSize?: number;
    compressionRatio?: number;
  };
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface BatchOperation {
  type: 'delete' | 'tag' | 'move' | 'process';
  ids: string[];
  data?: any;
}

export interface AdminQuizTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'published' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AdminQuizQuestion {
  id: string;
  template_id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'open_text' | 'matching';
  options?: {
    choices: string[];
    matches?: Record<string, string>;
  };
  correct_answer: string;
  explanation: string;
  points: number;
  order_number: number;
}

class AdminContentService {
  private readonly STORAGE_BUCKET = 'admin-content';
  private readonly MAX_BATCH_SIZE = 50;
  private readonly SUPPORTED_VIDEO_FORMATS = ['mp4', 'webm', 'mov'];
  private readonly SUPPORTED_DOC_FORMATS = ['pdf', 'doc', 'docx', 'txt'];
  private readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  async performBatchOperation(operation: BatchOperation): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    if (operation.ids.length > this.MAX_BATCH_SIZE) {
      throw new Error(`Maximum batch size is ${this.MAX_BATCH_SIZE} items`);
    }

    switch (operation.type) {
      case 'delete':
        await this.batchDelete(operation.ids);
        break;
      case 'tag':
        await this.batchTag(operation.ids, operation.data.tags);
        break;
      case 'move':
        await this.batchMove(operation.ids, operation.data.destination);
        break;
      case 'process':
        await this.batchProcess(operation.ids, operation.data.options);
        break;
    }
  }

  private async batchDelete(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('admin_content_uploads')
      .delete()
      .in('id', ids);

    if (error) throw error;
  }

  private async batchTag(ids: string[], tags: string[]): Promise<void> {
    const { error } = await supabase
      .from('admin_content_uploads')
      .update({ tags })
      .in('id', ids);

    if (error) throw error;
  }

  private async batchMove(ids: string[], destination: string): Promise<void> {
    // Implement move logic
  }

  private async batchProcess(ids: string[], options: any): Promise<void> {
    // Implement processing logic
  }

  private async optimizeStorage(file: File): Promise<Blob> {
    if (file.type.startsWith('video/')) {
      return await this.optimizeVideo(file);
    } else if (file.type.startsWith('application/')) {
      return await this.optimizeDocument(file);
    }
    return file;
  }

  private async optimizeVideo(file: File): Promise<Blob> {
    // Video optimization would go here
    // For now return original file
    return file;
  }

  private async optimizeDocument(file: File): Promise<Blob> {
    // Document optimization would go here
    // For now return original file
    return file;
  }

  private async generateThumbnail(file: File): Promise<string> {
    if (file.type.startsWith('video/')) {
      // Video thumbnail generation would go here
      return '';
    }
    return '';
  }

  // Content Upload Management
  async uploadContent(
    file: File,
    metadata: Pick<AdminContentUpload, 'title' | 'description' | 'file_type'>
  ): Promise<AdminContentUpload> {
    if (!supabase) throw new Error('Supabase client not initialized');

    try {
      // Validate file
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (file.type.startsWith('video/') && !this.SUPPORTED_VIDEO_FORMATS.includes(ext || '')) {
        throw new Error(`Unsupported video format. Supported formats: ${this.SUPPORTED_VIDEO_FORMATS.join(', ')}`);
      }
      if (file.type.startsWith('application/') && !this.SUPPORTED_DOC_FORMATS.includes(ext || '')) {
        throw new Error(`Unsupported document format. Supported formats: ${this.SUPPORTED_DOC_FORMATS.join(', ')}`);
      }

      // Optimize file
      const optimizedFile = await this.optimizeStorage(file);
      const thumbnail = await this.generateThumbnail(file);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(fileName, optimizedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(fileName);

      const originalSize = file.size;
      const compressedSize = optimizedFile.size;
      const compressionRatio = (1 - (compressedSize / originalSize)) * 100;

      // Create content record
      const { data: contentData, error: contentError } = await supabase
        .from('admin_content_uploads')
        .insert({
          ...metadata,
          file_url: publicUrl,
          file_size: compressedSize,
          mime_type: file.type,
          metadata: {
            lastModified: file.lastModified,
            compressed: compressedSize < originalSize,
            originalSize,
            compressionRatio: compressionRatio > 0 ? compressionRatio : 0,
            thumbnailUrl: thumbnail || null
          }
        })
        .select()
        .single();

      if (contentError) throw contentError;

      return contentData;
    } catch (error) {
      console.error('Error uploading content:', error);
      throw error;
    }
  }

  async getContent(contentId: string): Promise<AdminContentUpload> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: content, error } = await supabase
      .from('admin_content_uploads')
      .select('*')
      .eq('id', contentId.toString())
      .single();

    if (error) throw error;
    return content;
  }

  async updateContentMetadata(
    contentId: string,
    metadata: Partial<AdminContentUpload['metadata']>
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('admin_content_uploads')
      .update({
        metadata: metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', contentId);

    if (error) throw error;
  }

  async deleteContent(contentId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: content, error: fetchError } = await supabase
      .from('admin_content_uploads')
      .select('file_url')
      .eq('id', contentId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    const fileName = content.file_url.split('/').pop();
    const { error: storageError } = await supabase.storage
      .from(this.STORAGE_BUCKET)
      .remove([fileName]);

    if (storageError) throw storageError;

    // Delete record
    const { error: deleteError } = await supabase
      .from('admin_content_uploads')
      .delete()
      .eq('id', contentId);

    if (deleteError) throw deleteError;
  }

  // Quiz Template Management
  async createQuizTemplate(template: Omit<AdminQuizTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<AdminQuizTemplate> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('admin_quiz_templates')
      .insert(template)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async addQuizQuestion(question: Omit<AdminQuizQuestion, 'id' | 'created_at' | 'updated_at'>): Promise<AdminQuizQuestion> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('admin_quiz_template_questions')
      .insert(question)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateQuizTemplate(
    templateId: string,
    updates: Partial<AdminQuizTemplate>
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('admin_quiz_templates')
      .update(updates)
      .eq('id', templateId);

    if (error) throw error;
  }

  async getQuizTemplate(templateId: string): Promise<{
    template: AdminQuizTemplate;
    questions: AdminQuizQuestion[];
  }> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: template, error: templateError } = await supabase
      .from('admin_quiz_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    const { data: questions, error: questionsError } = await supabase
      .from('admin_quiz_template_questions')
      .select('*')
      .eq('template_id', templateId)
      .order('order_number', { ascending: true });

    if (questionsError) throw questionsError;

    return {
      template,
      questions: questions || []
    };
  }

  async deleteQuizTemplate(templateId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('admin_quiz_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
  }
}

export const adminContentService = new AdminContentService();