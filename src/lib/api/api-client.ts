/**
 * Клиентские функции для работы с API
 * Этот файл содержит функции для отправки запросов к API из клиентского кода
 */

import { API_CONFIG } from './api-config';
import { 
  ImageGenerationParams, 
  AudioGenerationParams, 
  ImageGenerationResponse, 
  ApiErrorResponse 
} from '@/types';

// Базовая функция для отправки запросов к API
export async function fetchFromApi<T>(
  endpoint: string, 
  data: any, 
  options: RequestInit = {}
): Promise<T> {
  const defaultOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    ...options
  };

  try {
    // Добавляем таймаут для длительных операций
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 секунд
    
    const response = await fetch(endpoint, {
      ...defaultOptions,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Пытаемся получить детальную информацию об ошибке
      let errorData: ApiErrorResponse;
      try {
        errorData = await response.json() as ApiErrorResponse;
      } catch (e) {
        errorData = { 
          error: `HTTP error ${response.status}`,
          details: response.statusText
        };
      }
      
      throw new Error(errorData.details || errorData.error || 'Unknown API error');
    }
    
    return await response.json() as T;
  } catch (error: any) {
    // Особая обработка ошибок таймаута
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. The operation took too long to complete.');
    }
    
    // Перебрасываем ошибку дальше
    throw error;
  }
}

/**
 * Генерирует изображение на основе текстового запроса
 */
export async function generateImage(params: ImageGenerationParams): Promise<string> {
  try {
    // Определяем, работаем ли мы в среде Netlify
    const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
    const endpoint = isNetlify 
      ? '/.netlify/functions/openai-api' 
      : '/api/openai/chat';
    
    // Выбираем подходящий эндпоинт
    const endpoint = isNetlify 
      ? '/.netlify/functions/openai-api/generate-image' 
      : API_CONFIG.openai.endpoints.generateImage;
    
    const response = await fetchFromApi<ImageGenerationResponse>(endpoint, params);
    
    if (!response.imageUrl) {
      throw new Error('No image URL in the response');
    }
    
    return response.imageUrl;
  } catch (error: any) {
    console.error('Error generating image:', error);
    throw error;
  }
}

/**
 * Генерирует аудио на основе текста
 */
export async function generateAudio(params: AudioGenerationParams): Promise<Blob> {
  try {
    // Определяем, работаем ли мы в среде Netlify
    const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
    
    if (isNetlify) {
      // В Netlify получаем аудио в формате base64
      const endpoint = '/.netlify/functions/openai-api/text-to-speech';
      const response = await fetchFromApi<{audio: string; format: string}>(endpoint, params);
      
      // Преобразуем base64 в Blob
      const binary = atob(response.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      return new Blob([bytes], { type: 'audio/mpeg' });
    } else {
      // Для обычного API запрашиваем аудио как бинарный поток
      const response = await fetch(API_CONFIG.openai.endpoints.textToSpeech, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      return await response.blob();
    }
  } catch (error: any) {
    console.error('Error generating audio:', error);
    throw error;
  }
}

/**
 * Проверяет доступность API серверов
 */
export async function checkApiStatus(): Promise<{
  openai: boolean;
  replicate: boolean;
}> {
  try {
    const openaiStatus = await fetch('/api/status/openai').then(res => res.ok).catch(() => false);
    const replicateStatus = await fetch('/api/status/replicate').then(res => res.ok).catch(() => false);
    
    return {
      openai: openaiStatus,
      replicate: replicateStatus
    };
  } catch (error) {
    console.error('Error checking API status:', error);
    return {
      openai: false,
      replicate: false
    };
  }
}
