// Типы для управления состоянием приложения
export type AppState = 'initial' | 'generating-story' | 'generating-images' | 'generating-audio' | 'ready' | 'reading';

// Типы для статусов процессов
export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

// Типы для тем сказок
export type FairyTaleTheme = 'волшебная' | 'приключенческая' | 'фантастическая' | 'о животных' | 'о дружбе';

// Типы для длины сказок
export type FairyTaleLength = 'короткая' | 'средняя' | 'длинная';

// Типы для параметров голосов озвучки
export type VoiceType = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

// Интерфейс для сгенерированной сказки
export interface FairyTale {
  text: string;
  theme: FairyTaleTheme;
  length: FairyTaleLength;
  createdAt: Date;
}

// Интерфейс для образа (иллюстрации)
export interface StoryImage {
  url: string;
  alt: string;
  prompt: string;
  position: 'beginning' | 'middle' | 'end';
}

// Интерфейс для аудио
export interface StoryAudio {
  url: string;
  voice: VoiceType;
  duration: number; // в секундах
}

// Интерфейс для полной истории со всеми ресурсами
export interface CompleteStory {
  id: string;
  tale: FairyTale;
  images: StoryImage[];
  audio?: StoryAudio;
}

// Параметры для API запросов

// Параметры для генерации сказки
export interface StoryGenerationParams {
  theme: FairyTaleTheme;
  length: FairyTaleLength;
  prompt?: string;
}

// Параметры для генерации изображения
export interface ImageGenerationParams {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
  quality?: 'standard' | 'hd';
}

// Параметры для генерации аудио
export interface AudioGenerationParams {
  text: string;
  voice?: VoiceType;
  speed?: number;
}

// Интерфейсы для ответов API

// Ответ API генерации изображения
export interface ImageGenerationResponse {
  imageUrl: string;
  error?: string;
  details?: string;
}

// Ответ API при ошибке
export interface ApiErrorResponse {
  error: string;
  details?: string;
}
