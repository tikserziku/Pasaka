import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import ErrorHandler from './ErrorHandler';

interface FallbackImageGeneratorProps {
  prompt: string;
  onImageGenerated: (imageUrl: string) => void;
  onGenerationStart?: () => void;
  onGenerationEnd?: () => void;
}

// Типы запросов API
type ApiProvider = 'openai' | 'replicate' | 'mock';
type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

export default function FallbackImageGenerator({
  prompt,
  onImageGenerated,
  onGenerationStart,
  onGenerationEnd
}: FallbackImageGeneratorProps) {
  const [currentProvider, setCurrentProvider] = useState<ApiProvider>('openai');
  const [status, setStatus] = useState<ApiStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [image, setImage] = useState<string | null>(null);

  // Проверка доступности API
  const checkApiAvailability = useCallback(async (provider: ApiProvider): Promise<boolean> => {
    try {
      let endpoint = '';
      
      switch (provider) {
        case 'openai':
          endpoint = '/api/openai/generate-image';
          break;
        case 'replicate':
          endpoint = '/api/replicate/generate-image';
          break;
        default:
          return false;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(endpoint, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error(`Ошибка при проверке доступности API ${provider}:`, error);
      return false;
    }
  }, []);

  // Функция для генерации изображения с помощью OpenAI
  const generateWithOpenAI = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);
      
      if (onGenerationStart) onGenerationStart();
      
      // Расширяем промпт для получения более качественного результата
      const enhancedPrompt = prompt.toLowerCase().includes('детск') || prompt.toLowerCase().includes('сказк') 
        ? prompt 
        : `${prompt} Иллюстрация в стиле детских книг, акварельная техника, яркие цвета, детализированная.`;
      
      const response = await fetch('/api/openai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enhancedPrompt }),
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.imageUrl) {
        throw new Error('Отсутствует URL изображения в ответе');
      }
      
      setImage(data.imageUrl);
      setStatus('success');
      
      // Уведомляем родительский компонент об успешной генерации
      onImageGenerated(data.imageUrl);
    } catch (error: any) {
      console.error('Ошибка при генерации изображения с OpenAI:', error);
      setError(error.message || 'Не удалось сгенерировать изображение');
      setStatus('error');
      
      // Если это серверная ошибка (5xx), попробуем использовать Replicate
      if (
        error.message && 
        (error.message.includes('500') || 
         error.message.includes('502') || 
         error.message.includes('503'))
      ) {
        console.log('Переключение на резервный API Replicate...');
        setCurrentProvider('replicate');
      } else {
        // Для других ошибок просто увеличиваем счетчик попыток
        setRetryCount(prev => prev + 1);
      }
    } finally {
      if (onGenerationEnd) onGenerationEnd();
    }
  }, [prompt, onImageGenerated, onGenerationStart, onGenerationEnd]);

  // Функция для генерации изображения с помощью Replicate
  const generateWithReplicate = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);
      
      if (onGenerationStart) onGenerationStart();
      
      // Расширяем промпт для Stable Diffusion
      const enhancedPrompt = prompt.toLowerCase().includes('детск') || prompt.toLowerCase().includes('сказк')
        ? prompt
        : `${prompt}, children's book illustration, watercolor style, vibrant colors, detailed, fantasy, 4k`;
      
      const response = await fetch('/api/replicate/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: enhancedPrompt,
          // Дополнительные параметры для Stable Diffusion
          negative_prompt: "poorly drawn, blurry, low quality, disfigured, text, watermark"
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Replicate возвращает массив URLs в свойстве output
      const imageUrl = Array.isArray(data.output) && data.output.length > 0 
        ? data.output[0] 
        : null;
      
      if (!imageUrl) {
        throw new Error('Отсутствует URL изображения в ответе');
      }
      
      setImage(imageUrl);
      setStatus('success');
      
      // Уведомляем родительский компонент об успешной генерации
      onImageGenerated(imageUrl);
    } catch (error: any) {
      console.error('Ошибка при генерации изображения с Replicate:', error);
      setError(error.message || 'Не удалось сгенерировать изображение');
      setStatus('error');
      
      // Генерация резервной заглушки, если все API недоступны
      if (retryCount >= 2) {
        generateMockImage();
      } else {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      if (onGenerationEnd) onGenerationEnd();
    }
  }, [prompt, onImageGenerated, retryCount, onGenerationStart, onGenerationEnd]);

  // Функция для создания заглушки изображения, если все API недоступны
  const generateMockImage = useCallback(() => {
    setStatus('loading');
    
    // Создаем URL заглушки с текстом промпта
    const mockImageUrl = `https://placehold.co/600x400/9370db/ffffff?text=${encodeURIComponent(prompt.substring(0, 30))}`;
    
    setTimeout(() => {
      setImage(mockImageUrl);
      setStatus('success');
      onImageGenerated(mockImageUrl);
      
      // Показываем пользователю, что это заглушка
      setError('API недоступны. Показано изображение-заглушка.');
    }, 1000);
  }, [prompt, onImageGenerated]);

  // Запускаем генерацию при изменении провайдера или повторной попытке
  useEffect(() => {
    if (!prompt || status === 'loading') return;
    
    const generateImage = async () => {
      // Сначала проверяем доступность API
      const isAvailable = await checkApiAvailability(currentProvider);
      
      if (!isAvailable) {
        // Если текущий провайдер недоступен, переключаемся на другой
        if (currentProvider === 'openai') {
          console.log('OpenAI API недоступен, переключение на Replicate...');
          setCurrentProvider('replicate');
          return;
        } else if (currentProvider === 'replicate') {
          console.log('Replicate API недоступен, использование заглушки...');
          setCurrentProvider('mock');
          return;
        }
      }
      
      // Генерируем изображение с выбранным провайдером
      switch (currentProvider) {
        case 'openai':
          await generateWithOpenAI();
          break;
        case 'replicate':
          await generateWithReplicate();
          break;
        case 'mock':
          generateMockImage();
          break;
      }
    };
    
    generateImage();
  }, [
    prompt, 
    currentProvider, 
    generateWithOpenAI, 
    generateWithReplicate, 
    generateMockImage, 
    checkApiAvailability,
    status
  ]);

  // Хэндлер для повторной попытки
  const handleRetry = () => {
    setStatus('idle'); // Сбрасываем статус, чтобы триггерить useEffect
  };

  // Хэндлер для ручной смены провайдера
  const handleSwitchProvider = () => {
    setCurrentProvider(prev => {
      if (prev === 'openai') return 'replicate';
      if (prev === 'replicate') return 'openai';
      return 'openai';
    });
    setStatus('idle');
    setRetryCount(0);
  };

  return (
    <div className="w-full">
      {/* Информация о текущем провайдере */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-sm text-gray-600">Провайдер: </span>
          <span className="ml-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {currentProvider === 'openai' ? 'OpenAI DALL-E' : 
             currentProvider === 'replicate' ? 'Replicate Stable Diffusion' : 
             'Заглушка'}
          </span>
        </div>
        
        {status !== 'loading' && (
          <button
            onClick={handleSwitchProvider}
            className="text-xs px-2 py-0.5 text-gray-600 hover:text-gray-900 underline"
            disabled={status === 'loading'}
          >
            Сменить провайдер
          </button>
        )}
      </div>
      
      {/* Обработчик ошибок */}
      <ErrorHandler
        error={error}
        onRetry={handleRetry}
        onClose={() => setError(null)}
        retryCount={retryCount}
        maxRetries={3}
        errorType="api"
        autoRetry={retryCount < 2 && status === 'error'}
      />
      
      {/* Контейнер изображения */}
      <div className="border rounded-lg overflow-hidden bg-gray-50">
        {status === 'loading' && (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-500 border-l-gray-200 border-r-gray-200 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Создание изображения с помощью {
                currentProvider === 'openai' ? 'OpenAI DALL-E' : 
                currentProvider === 'replicate' ? 'Replicate Stable Diffusion' : 
                'генератора заглушки'
              }...</p>
            </div>
          </div>
        )}
        
        {status === 'success' && image && (
          <div className="relative h-64">
            <Image
              src={image}
              alt={prompt}
              fill
              style={{ objectFit: 'contain' }}
              className="rounded-lg"
              unoptimized={currentProvider === 'mock'} // Заглушки не нужно оптимизировать
            />
          </div>
        )}
        
        {status === 'idle' && (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Изображение будет сгенерировано...</p>
          </div>
        )}
      </div>
    </div>
  );
}
