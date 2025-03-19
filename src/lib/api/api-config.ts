import OpenAI from 'openai';

/**
 * Конфигурация API для разных сред (разработка, продакшн, Netlify)
 * 
 * Этот файл обеспечивает правильную конфигурацию API в разных средах,
 * включая локальную разработку и деплой на Netlify
 */

// Определяем, находимся ли мы в среде Netlify
const isNetlify = process.env.NETLIFY === 'true';

// Определяем, в какой среде запускается код - сервер или клиент
const isServer = typeof window === 'undefined';

/**
 * Получает API ключ с учетом среды выполнения
 */
export function getApiKey(keyName: string): string {
  // На сервере мы можем напрямую получить ключ из переменных окружения
  if (isServer) {
    return process.env[keyName] || '';
  }
  
  // В клиенте мы не можем получить ключи напрямую, если они не имеют префикса NEXT_PUBLIC_
  // В этом случае мы возвращаем пустую строку, а API запрос должен быть отправлен на сервер
  return '';
}

/**
 * Создает экземпляр API клиента OpenAI с правильной конфигурацией
 */
export function createOpenAIClient(): OpenAI {
  const apiKey = getApiKey('OPENAI_API_KEY');
  
  // Если мы на Netlify, то можем использовать специфичные настройки
  if (isNetlify) {
    return new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: false, // Всегда false для безопасности
      // Добавляем кастомные настройки для Netlify, если нужно
      maxRetries: 3,
      timeout: 60000, // Увеличенный таймаут для Netlify Functions
    });
  }
  
  // Стандартная инициализация для других сред
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: false,
  });
}

/**
 * Преобразует API URL, учитывая среду развертывания
 * Для некоторых сред, таких как Netlify, может потребоваться особое форматирование URL
 */
export function getApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  return `${baseUrl}/api/${path}`;
}

/**
 * Проверяет наличие необходимых ключей API
 * Полезно для предварительной проверки конфигурации
 */
export function validateApiConfig(): { isValid: boolean; missingKeys: string[] } {
  const requiredKeys = ['OPENAI_API_KEY'];
  const missingKeys = requiredKeys.filter(key => !process.env[key]);
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys
  };
}

/**
 * Настройки для запросов к API
 */
export const API_CONFIG = {
  // Настройки для OpenAI API
  openai: {
    models: {
      chat: 'gpt-4o',
      textToSpeech: 'tts-1'
    },
    // Настройки для разных типов запросов
    endpoints: {
      chat: '/api/openai/chat',
      generateImage: '/api/openai/generate-image',
      textToSpeech: '/api/openai/text-to-speech'
    },
    // Таймауты для разных типов запросов
    timeouts: {
      chat: 60000,
      generateImage: 120000,
      textToSpeech: 60000
    }
  },
  
  // Настройки для Replicate API (если используется)
  replicate: {
    models: {
      imageGeneration: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b'
    },
    endpoints: {
      generateImage: '/api/replicate/generate-image'
    }
  }
};

/**
 * Хелпер для определения, работает ли определенный API
 * Проверяет наличие ключей и доступность API
 */
export async function checkApiAvailability(apiName: 'openai' | 'replicate'): Promise<boolean> {
  try {
    switch (apiName) {
      case 'openai':
        return !!getApiKey('OPENAI_API_KEY');
      case 'replicate':
        return !!getApiKey('REPLICATE_API_TOKEN');
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error checking ${apiName} API availability:`, error);
    return false;
  }
}
