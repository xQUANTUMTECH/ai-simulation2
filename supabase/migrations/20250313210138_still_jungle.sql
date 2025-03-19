/*
  # Add Status Column to Courses Table

  1. Changes
    - Add status column to courses table
    - Add status check constraint
    - Set default status value
*/

-- Add status column to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
CHECK (status IN ('draft', 'published', 'archived'));