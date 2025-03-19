# System Architecture Documentation

## Overview
Il sistema è costruito come un'applicazione web moderna con capacità real-time, integrazione AI e un sistema completo di gestione dell'apprendimento. Utilizza Supabase per i servizi backend e React per il frontend.

## Core Components

### 1. Authentication System
File di riferimento:
- `src/services/auth-service.ts`: Gestione autenticazione e sessioni
- `src/services/security-service.ts`: Sicurezza e controllo accessi
- `src/components/auth/LoginForm.tsx`: Form di login
- `src/components/auth/RegisterForm.tsx`: Form di registrazione

- **User Management**
  - Email/password authentication
  - Role-based access control (User/Admin)
  - Session management
  - Security features (2FA, account lockout)

- **Security Layer**
  - RLS (Row Level Security) policies
  - Permission inheritance
  - Audit logging
  - Compliance tracking

### 2. Learning Platform

#### Course Management
File di riferimento:
- `src/services/course-service.ts`: Gestione corsi e contenuti
- `src/components/sections/Courses.tsx`: Interfaccia corsi
- `src/components/sections/CourseDetails.tsx`: Dettagli corso
- `src/components/sections/CourseCreation.tsx`: Creazione corsi

- **Components**
  - CourseCreation: Course creation interface
  - CourseDetails: Course details view
  - VideoPlayer: Video playback component
  - DocumentViewer: Document viewing interface
  - QuizSystem: Quiz management system

- **Data Flow**
  1. Admin creates course structure
  2. Content processing and upload
  3. Student enrollment and access
  4. Progress tracking

#### Video System
File di riferimento:
- `src/services/video-service.ts`: Elaborazione video
- `src/services/video-transcoding-service.ts`: Transcodifica video
- `src/services/dash-service.ts`: Streaming DASH
- `src/services/hls-service.ts`: Streaming HLS
- `src/components/VideoPlayer.tsx`: Player video
- `src/components/VideoUploader.tsx`: Upload video

- **Processing Pipeline**
  1. Upload handling
  2. Format validation
  3. Transcoding service
  4. Thumbnail generation
  5. Streaming optimization

### 3. AI Integration

#### Agent System
File di riferimento:
- `src/services/ai-service.ts`: Servizio AI principale
- `src/services/ai-agent-service.ts`: Gestione agenti AI
- `src/services/analysis-service.ts`: Analisi performance
- `src/components/sections/Avatars.tsx`: Interfaccia agenti

- **Components**
  - AIAgentService: Agent management service
  - Knowledge Extraction: Content analysis
  - Personality Generation: Agent personality creation
  - Voice Synthesis: Text-to-speech system
  - AIModelService: Model versioning and training
  - AIAnalyticsService: Performance monitoring
  - AISecurityService: Access control and auditing
  - AIComplianceService: Data protection and privacy

- **Creation Flow**
  1. Document/chat analysis
  2. Knowledge extraction
  3. Personality generation
  4. Voice profile setup
  5. Behavior pattern definition
  6. Model optimization
  7. Performance monitoring
  8. Security validation
  9. Compliance checks

#### Quiz Generation
File di riferimento:
- `src/services/quiz-service.ts`: Gestione quiz
- `src/services/learning-service.ts`: Analisi apprendimento
- `src/components/sections/Quiz.tsx`: Interfaccia quiz

- **Components**
  - QuizService: Quiz management service
  - AIService: AI integration service
  - ContentAnalyzer: Content analysis system
  - QuizAnalytics: Performance tracking
  - QuizSecurity: Access control
  - QuizCompliance: Data protection

- **Generation Flow**
  1. Content analysis
  2. Topic extraction
  3. Question generation
  4. Answer validation
  5. Difficulty calibration
  6. Performance analysis
  7. Security checks
  8. Compliance validation

### 4. Real-time Features

#### WebRTC System
File di riferimento:
- `src/services/webrtc-service.ts`: Gestione WebRTC
- `src/services/room-service.ts`: Gestione stanze
- `src/components/simulation/WebRoom.tsx`: Interfaccia stanza web
- `src/components/simulation/UnrealViewer.tsx`: Visualizzatore Unreal

- **Components**
  - WebRTCService: WebRTC management
  - RoomManager: Room management
  - MediaHandler: Media stream handling
  - ConnectionManager: Connection management

- **Connection Flow**
  1. Room creation
  2. Peer discovery
  3. Connection establishment
  4. Media streaming
  5. Data channel setup

#### Voice System
File di riferimento:
- `src/services/voice-service.ts`: Sintesi vocale
- `src/services/tts-service.ts`: Text-to-speech
- `src/hooks/useVoice.ts`: Hook per funzionalità vocali

- **Components**
  - VoiceService: Voice synthesis service
  - EmotionHandler: Emotion processing
  - LanguageManager: Language management

- **Processing Flow**
  1. Text input
  2. Emotion analysis
  3. Voice selection
  4. Speech synthesis
  5. Audio output

## User Flows

### Student Experience
File di riferimento:
- `src/components/sections/Dashboard.tsx`: Dashboard studente
- `src/components/sections/CourseDetails.tsx`: Dettagli corso
- `src/components/sections/VideoDetails.tsx`: Visualizzazione video
- `src/components/sections/Documents.tsx`: Gestione documenti

1. **Authentication**
   - Registration/Login
   - Profile setup
   - Terms acceptance

2. **Course Access**
   - Course browsing
   - Enrollment
   - Content access
   - Progress tracking

3. **Learning**
   - Video viewing
   - Document reading
   - Quiz taking
   - AI interaction

4. **Progress Monitoring**
   - Completion status
   - Quiz scores
   - Certificates
   - Performance analysis

### Admin Experience
File di riferimento:
- `src/components/admin/AdminDashboard.tsx`: Dashboard admin
- `src/components/admin/UserManagement.tsx`: Gestione utenti
- `src/components/admin/CourseManagement.tsx`: Gestione corsi
- `src/components/admin/SystemSettings.tsx`: Impostazioni sistema

1. **Content Management**
   - Course creation
   - Content upload
   - Resource management
   - Quiz generation

2. **User Management**
   - Account management
   - Role assignment
   - Activity monitoring
   - Permission management

3. **System Configuration**
   - Settings management
   - Template configuration
   - Integration setup
   - Performance monitoring

4. **Analytics & Reports**
   - Statistics viewing
   - Report generation
   - Metric tracking
   - Trend analysis

## Technical Implementation

### Frontend Architecture
File di riferimento:
- `src/App.tsx`: Componente root
- `src/components/Modal.tsx`: Componente modale
- `src/components/NavItem.tsx`: Navigazione
- `src/components/StatCard.tsx`: Card statistiche

- **Core Components**
  ```
  src/
  ├── components/
  │   ├── admin/          - Admin interface
  │   ├── auth/           - Authentication components
  │   ├── course/         - Course management
  │   ├── simulation/     - Simulation interface
  │   └── common/         - Shared components
  ```

### Service Functions Documentation

#### AI Service (`src/services/ai-service.ts`)
File di riferimento:
- `src/services/ai-service.ts`: Servizio AI principale
- `src/services/ai-agent-service.ts`: Gestione agenti
- `src/services/ai-model-service.ts`: Gestione modelli

- **generateResponse(prompt: string, model?: string)**
  - Purpose: Generates AI responses using local Ollama or OpenRouter fallback
  - Flow:
    1. Attempts local Ollama query
    2. Falls back to OpenRouter if needed
    3. Records usage metrics
    4. Handles errors with fallback options

- **textToSpeech(text: string, options?: object)**
  - Purpose: Converts text to speech using Groq API
  - Parameters:
    - text: Content to synthesize
    - options: Voice, language, emotion settings
  - Returns: Audio buffer for playback

- **generateScenarioFromChat(messages: Array)**
  - Purpose: Creates simulation scenarios from chat history
  - Input: Array of chat messages
  - Output: Structured scenario with roles, phases, metrics

#### WebRTC Service (`src/services/webrtc-service.ts`)
File di riferimento:
- `src/services/webrtc-service.ts`: Servizio WebRTC
- `src/services/room-service.ts`: Gestione stanze
- `src/services/meeting-service.ts`: Gestione meeting

- **createPeerConnection(peerId: string)**
  - Purpose: Establishes WebRTC peer connections
  - Handles:
    - Stream setup
    - ICE candidate exchange
    - Connection state management

- **joinRoom(roomId: string, options: object)**
  - Purpose: Connects user to virtual room
  - Setup:
    - Media streams
    - Data channels
    - Room state sync

- **sendData(data: any)**
  - Purpose: Broadcasts data to all peers
  - Uses: Data channels for real-time updates

#### Voice Service (`src/services/voice-service.ts`)
File di riferimento:
- `src/services/voice-service.ts`: Servizio voce
- `src/services/tts-service.ts`: Text-to-speech
- `src/hooks/useVoice.ts`: Hook voce

- **speak(text: string, config?: object)**
  - Purpose: Synthesizes and plays speech
  - Features:
    - Emotion support
    - Language selection
    - Voice profiles

- **startListening()**
  - Purpose: Activates speech recognition
  - Handles:
    - Audio input
    - Speech processing
    - Result events

#### Course Service (`src/services/course-service.ts`)
File di riferimento:
- `src/services/course-service.ts`: Gestione corsi
- `src/services/course-progress-service.ts`: Tracciamento progressi
- `src/services/learning-service.ts`: Analytics apprendimento

- **createCourse(course: object)**
  - Purpose: Creates new course with resources
  - Validates:
    - Course structure
    - Resource links
    - Access permissions

- **updateProgress(courseId: string, progress: number)**
  - Purpose: Updates student course progress
  - Tracks:
    - Completion percentage
    - Time spent
    - Resource access

#### Video Service (`src/services/video-service.ts`)
File di riferimento:
- `src/services/video-service.ts`: Gestione video
- `src/services/video-transcoding-service.ts`: Transcodifica
- `src/services/thumbnail-service.ts`: Generazione thumbnail

- **processVideo(videoId: string, options: object)**
  - Purpose: Handles video processing pipeline
  - Steps:
    1. Format validation
    2. Transcoding
    3. Thumbnail generation
    4. Quality optimization

- **generateThumbnail(videoId: string, timestamp: number)**
  - Purpose: Creates video thumbnails
  - Features:
    - Multiple sizes
    - Quality settings
    - Storage optimization

#### Document Service (`src/services/document-service.ts`)
File di riferimento:
- `src/services/document-service.ts`: Gestione documenti
- `src/components/DocumentViewer.tsx`: Visualizzatore
- `src/components/FileUpload.tsx`: Upload file

- **uploadDocument(file: File, userId: string)**
  - Purpose: Handles document uploads
  - Processing:
    - Format validation
    - Size checks
    - Storage management

- **processDocument(docId: string)**
  - Purpose: Processes uploaded documents
  - Features:
    - Text extraction
    - Metadata generation
    - Version control

#### Analytics Service (`src/services/analytics-service.ts`)
File di riferimento:
- `src/services/analytics-service.ts`: Analytics
- `src/services/learning-service.ts`: Analytics apprendimento
- `src/components/sections/Analytics.tsx`: Dashboard analytics

- **trackUserActivity(userId: string, activity: object)**
  - Purpose: Records user learning activities
  - Tracks:
    - Time spent
    - Resources accessed
    - Quiz attempts

- **generateReport(options: object)**
  - Purpose: Creates analytics reports
  - Types:
    - User progress
    - Course completion
    - Resource usage

#### Security Service (`src/services/security-service.ts`)
File di riferimento:
- `src/services/security-service.ts`: Sicurezza
- `src/services/compliance-service.ts`: Conformità
- `src/services/auth-service.ts`: Autenticazione

- **validateSession(sessionId: string)**
  - Purpose: Validates user sessions
  - Checks:
    - Token validity
    - Session expiry
    - Access permissions

- **logSecurityEvent(event: object)**
  - Purpose: Records security-related events
  - Logs:
    - Login attempts
    - Permission changes
    - Access violations

### Backend Services
- **Core Services**
  ```
  services/
  ├── auth-service.ts       - Authentication management
  ├── course-service.ts     - Course management
  ├── video-service.ts      - Video processing
  ├── ai-service.ts         - AI integration
  ├── webrtc-service.ts     - Real-time communication
  └── voice-service.ts      - Voice synthesis
  ```

### Database Schema
- **Main Tables**
  ```
  - users
  - courses
  - videos
  - documents
  - quizzes
  - ai_agents
  - analytics
  ```

### Integration Points
1. **AI Integration**
   - OpenAI/Mistral for text generation
   - Custom models for specific tasks
   - Knowledge extraction pipeline

2. **Media Processing**
   - Video transcoding
   - Document processing
   - Storage optimization

3. **Real-time Communication**
   - WebRTC for peer connections
   - Voice synthesis for AI agents
   - Data synchronization

## Security Measures

### Authentication
- Email verification
- Password policies
- Session management
- Multi-factor authentication

### Authorization
- Role-based access
- Permission inheritance
- Resource policies
- API security

### Data Protection
- At-rest encryption
- Secure transmission
- Privacy controls
- Audit logging

## Performance Optimization

### Caching Strategy
- Content caching
- API response caching
- Browser storage
- Memory optimization

### Load Management
- Request throttling
- Connection pooling
- Resource limits
- Error handling

## Monitoring and Analytics

### System Metrics
- Performance tracking
- Error monitoring
- Usage statistics
- Resource utilization

### User Analytics
- Learning progress
- Engagement metrics
- Quiz performance
- Resource usage

## Deployment Architecture

### Infrastructure
- Supabase for backend
- CDN for media
- WebRTC server
- Storage bucket

### Scaling Strategy
- Horizontal scaling
- Load balancing
- Cache distribution
- Resource optimization

## Future Improvements

### Planned Features
1. Enhanced AI Integration
   - Improved agent behavior
   - Better context understanding
   - More natural interactions

2. Extended Learning Tools
   - Interactive transcripts
   - Collaborative features
   - Advanced analytics

3. Performance Improvements
   - Optimized video delivery
   - Better resource management
   - Enhanced real-time features

### Roadmap
1. Short Term (1-3 months)
   - Quiz system improvement
   - WebRTC implementation
   - Voice system integration

2. Medium Term (3-6 months)
   - Advanced AI features
   - Performance optimization
   - Additional analytics

3. Long Term (6+ months)
   - New learning modalities
   - Infrastructure scaling
   - Advanced integrations