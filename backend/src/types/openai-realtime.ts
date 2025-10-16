// OpenAI Realtime API types

export interface OpenAIRealtimeSession {
  session_id: string;
  model: string;
  instructions: string;
  voice: VoiceType;
  input_audio_format: AudioFormat;
  output_audio_format: AudioFormat;
  turn_detection?: TurnDetection;
  tools?: Tool[];
  max_response_output_tokens?: number;
  temperature?: number;
}

export interface TurnDetection {
  type: 'server_vad' | 'none';
  threshold?: number;
  prefix_padding_ms?: number;
  silence_duration_ms?: number;
}

export interface Tool {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export type VoiceType = 'alloy' | 'echo' | 'fable' | 'nova' | 'shimmer';
export type AudioFormat = 'pcm16' | 'g711_ulaw' | 'g711_alaw';

// Client-to-server events
export interface SessionUpdateEvent {
  type: 'session.update';
  session: Partial<OpenAIRealtimeSession>;
}

export interface InputAudioBufferAppendEvent {
  type: 'input_audio_buffer.append';
  audio: string; // base64 encoded audio
}

export interface InputAudioBufferCommitEvent {
  type: 'input_audio_buffer.commit';
}

export interface InputAudioBufferClearEvent {
  type: 'input_audio_buffer.clear';
}

export interface ConversationItemCreateEvent {
  type: 'conversation.item.create';
  previous_item_id?: string;
  item: ConversationItem;
}

export interface ResponseCreateEvent {
  type: 'response.create';
  response?: Partial<Response>;
}

export interface ResponseCancelEvent {
  type: 'response.cancel';
}

// Server-to-client events
export interface SessionCreatedEvent {
  type: 'session.created';
  session: OpenAIRealtimeSession;
}

export interface SessionUpdatedEvent {
  type: 'session.updated';
  session: OpenAIRealtimeSession;
}

export interface InputAudioBufferCommittedEvent {
  type: 'input_audio_buffer.committed';
  previous_item_id?: string;
  item_id: string;
}

export interface InputAudioBufferClearedEvent {
  type: 'input_audio_buffer.cleared';
}

export interface InputAudioBufferSpeechStartedEvent {
  type: 'input_audio_buffer.speech_started';
  audio_start_ms: number;
  item_id: string;
}

export interface InputAudioBufferSpeechStoppedEvent {
  type: 'input_audio_buffer.speech_stopped';
  audio_end_ms: number;
  item_id: string;
}

export interface ConversationItemCreatedEvent {
  type: 'conversation.item.created';
  previous_item_id?: string;
  item: ConversationItem;
}

export interface ConversationItemInputAudioTranscriptionCompletedEvent {
  type: 'conversation.item.input_audio_transcription.completed';
  item_id: string;
  content_index: number;
  transcript: string;
}

export interface ConversationItemInputAudioTranscriptionFailedEvent {
  type: 'conversation.item.input_audio_transcription.failed';
  item_id: string;
  content_index: number;
  error: APIError;
}

export interface ResponseCreatedEvent {
  type: 'response.created';
  response: Response;
}

export interface ResponseDoneEvent {
  type: 'response.done';
  response: Response;
}

export interface ResponseOutputItemAddedEvent {
  type: 'response.output_item.added';
  response_id: string;
  output_index: number;
  item: ConversationItem;
}

export interface ResponseOutputItemDoneEvent {
  type: 'response.output_item.done';
  response_id: string;
  output_index: number;
  item: ConversationItem;
}

export interface ResponseContentPartAddedEvent {
  type: 'response.content_part.added';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  part: ContentPart;
}

export interface ResponseContentPartDoneEvent {
  type: 'response.content_part.done';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  part: ContentPart;
}

export interface ResponseTextDeltaEvent {
  type: 'response.text.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
}

export interface ResponseTextDoneEvent {
  type: 'response.text.done';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  text: string;
}

export interface ResponseAudioTranscriptDeltaEvent {
  type: 'response.audio_transcript.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
}

export interface ResponseAudioTranscriptDoneEvent {
  type: 'response.audio_transcript.done';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  transcript: string;
}

export interface ResponseAudioDeltaEvent {
  type: 'response.audio.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string; // base64 encoded audio
}

export interface ResponseAudioDoneEvent {
  type: 'response.audio.done';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
}

export interface RateLimitsUpdatedEvent {
  type: 'rate_limits.updated';
  rate_limits: RateLimit[];
}

export interface ErrorEvent {
  type: 'error';
  error: APIError;
}

// Data structures
export interface ConversationItem {
  id?: string;
  object?: 'realtime.item';
  type: 'message' | 'function_call' | 'function_call_output';
  status?: 'completed' | 'in_progress' | 'incomplete';
  role?: 'user' | 'assistant' | 'system';
  content?: ContentPart[];
  call_id?: string;
  name?: string;
  arguments?: string;
  output?: string;
}

export interface ContentPart {
  type: 'input_text' | 'input_audio' | 'text' | 'audio';
  text?: string;
  audio?: string; // base64 encoded
  transcript?: string;
}

export interface Response {
  id: string;
  object: 'realtime.response';
  status: 'in_progress' | 'completed' | 'incomplete' | 'cancelled' | 'failed';
  status_details?: any;
  output: ConversationItem[];
  usage?: Usage;
}

export interface Usage {
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  input_token_details?: TokenDetails;
  output_token_details?: TokenDetails;
}

export interface TokenDetails {
  cached_tokens?: number;
  text_tokens?: number;
  audio_tokens?: number;
}

export interface RateLimit {
  name: string;
  limit: number;
  remaining: number;
  reset_seconds: number;
}

export interface APIError {
  type: string;
  code?: string;
  message: string;
  param?: string;
  event_id?: string;
}

// Union types for events
export type ClientToServerEvent =
  | SessionUpdateEvent
  | InputAudioBufferAppendEvent
  | InputAudioBufferCommitEvent
  | InputAudioBufferClearEvent
  | ConversationItemCreateEvent
  | ResponseCreateEvent
  | ResponseCancelEvent;

export type ServerToClientEvent =
  | SessionCreatedEvent
  | SessionUpdatedEvent
  | InputAudioBufferCommittedEvent
  | InputAudioBufferClearedEvent
  | InputAudioBufferSpeechStartedEvent
  | InputAudioBufferSpeechStoppedEvent
  | ConversationItemCreatedEvent
  | ConversationItemInputAudioTranscriptionCompletedEvent
  | ConversationItemInputAudioTranscriptionFailedEvent
  | ResponseCreatedEvent
  | ResponseDoneEvent
  | ResponseOutputItemAddedEvent
  | ResponseOutputItemDoneEvent
  | ResponseContentPartAddedEvent
  | ResponseContentPartDoneEvent
  | ResponseTextDeltaEvent
  | ResponseTextDoneEvent
  | ResponseAudioTranscriptDeltaEvent
  | ResponseAudioTranscriptDoneEvent
  | ResponseAudioDeltaEvent
  | ResponseAudioDoneEvent
  | RateLimitsUpdatedEvent
  | ErrorEvent;

// Configuration interfaces
export interface OpenAIRealtimeConfig {
  apiKey: string;
  model?: string;
  instructions?: string;
  voice?: VoiceType;
  temperature?: number;
  maxResponseTokens?: number;
  turnDetection?: TurnDetection;
}

export interface ProxySessionConfig {
  userId: string;
  conversationId: string;
  personalityInstructions?: string;
  instructions?: string;
  voice?: VoiceType;
  temperature?: number;
  modalities?: string[];
  model?: string;
  turnDetection?: TurnDetection;
  voiceSettings?: {
    voice: VoiceType;
    speed: number;
    pitch: number;
  };
}