'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import FairyTaleGenerator from '@/components/FairyTaleGenerator';
import Image from 'next/image';

// Типы для управления приложением
type AppState = 'initial' | 'generating-story' | 'generating-images' | 'generating-audio' | 'ready' | 'reading';
type ImageStatus = 'idle' | 'loading' | 'success' | 'error';

export default function Home() {
  // Состояние приложения
  const [appState, setAppState] = useState<AppState>('initial');
  const appStateRef = useRef<AppState>('initial'); // Добавляем ref для отслеживания состояния
  
  // Основное содержимое
  const [story, setStory] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Состояние процессов и ошибок
  const [isGeneratingStory, setIsGeneratingStory] = useState<boolean>(false);
  const [imagesStatus, setImagesStatus] = useState<ImageStatus>('idle');
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Компоненты для режима чтения
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [subtitles, setSubtitles] = useState<string[]>([]);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState<number>(0);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const subtitleTimers = useRef<NodeJS.Timeout[]>([]);
  
  // Сохраняем состояние в ref для отслеживания изменений
  useEffect(() => {
    appStateRef.current = appState;
    console.log('Состояние приложения изменилось:', appState);
  }, [appState]);

  // Восстанавливаем состояние из localStorage при загрузке
  useEffect(() => {
    // Проверяем хранилище только при клиентском рендеринге
    if (typeof window !== 'undefined') {
      try {
        const savedState = localStorage.getItem('appState');
        const savedStory = localStorage.getItem('story');
        
        // Если есть сохраненное состояние, инициализируем приложение
        if (savedState === 'initial' || !savedState) {
          console.log('Инициализация нового состояния');
          setAppState('initial');
          // Очищаем все предыдущие данные
          localStorage.removeItem('story');
          localStorage.removeItem('images');
          localStorage.removeItem('appState');
        } else {
          console.log('Восстановление предыдущего состояния невозможно, сброс к начальному');
          // Сбрасываем все к начальному состоянию
          setAppState('initial');
          localStorage.setItem('appState', 'initial');
        }
      } catch (err) {
        console.error('Ошибка при чтении из localStorage:', err);
        // При ошибке сбрасываем все к начальному состоянию
        setAppState('initial');
      }
    }
  }, []);
  
  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      subtitleTimers.current.forEach(timer => clearTimeout(timer));
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);
  
  // Автоматическая смена изображений в режиме чтения
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (appState === 'reading' && images.length > 0) {
      interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, 8000); // Смена изображений каждые 8 секунд
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [appState, images]);
  
  // Генерация изображений на основе сказки
  const generateImagesFromStory = useCallback(async (storyText: string) => {
    if (appStateRef.current !== 'generating-images') {
      console.log('Пропуск генерации изображений, так как состояние изменилось');
      return;
    }
    
    setImagesStatus('loading');
    try {
      // Анализируем текст для создания более точных промптов
      const kroliks = storyText.toLowerCase().includes('кролик') || storyText.toLowerCase().includes('нолик');
      const forestMagic = storyText.toLowerCase().includes('лес') || storyText.toLowerCase().includes('волшебн');
      const lake = storyText.toLowerCase().includes('озеро') || storyText.toLowerCase().includes('вода');
      const owl = storyText.toLowerCase().includes('сова') || storyText.toLowerCase().includes('офелия');
      
      const character = kroliks ? 'кролик Нолик с рыжевато-белым мехом' : 'главный герой сказки';
      const setting = forestMagic ? 'волшебный изумрудный лес' : 'сказочная страна';
      
      const prompts = [
        `Детская книжная иллюстрация: ${character} стоит в ${setting}. Сцена из начала сказки, яркие акварельные краски, стиль детских книг, дневной свет, красочная и детализированная иллюстрация.`,
        `Детская книжная иллюстрация: ${owl ? 'мудрая сова Офелия разговаривает с' : 'встреча'} ${character} в ${setting}. Средняя часть сказки, яркие акварельные краски, стиль детских книг, красочная и детализированная иллюстрация.`,
        `Детская книжная иллюстрация: ${character} ${lake ? 'возле волшебного озера, от которого исходит магическое сияние' : 'в кульминационный момент сказки'}. Финал сказки, яркие акварельные краски, стиль детских книг, волшебное свечение, красочная и детализированная иллюстрация.`
      ];

      console.log('Начало генерации изображений с промптами:', prompts);

      const imageUrls: string[] = [];
      
      // Генерируем изображения последовательно для снижения нагрузки
      for (const prompt of prompts) {
        // Проверяем, не изменилось ли состояние
        if (appStateRef.current !== 'generating-images') {
          console.log('Прерывание генерации изображений, состояние изменилось');
          break;
        }
        
        try {
          console.log('Отправка запроса на генерацию изображения с промптом:', prompt);
          
          const response = await fetch('/api/openai/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
          });
          
          console.log('Получен ответ с кодом:', response.status);
          
          if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log('Получены данные ответа:', data);
          
          if (data.imageUrl) {
            console.log('Получен URL изображения:', data.imageUrl);
            imageUrls.push(data.imageUrl);
          } else {
            console.error('Отсутствует URL изображения в ответе:', data);
          }
        } catch (err) {
          console.error('Ошибка при обработке отдельного запроса:', err);
        }
      }

      if (imageUrls.length === 0) {
        throw new Error('Не удалось сгенерировать ни одного изображения');
      }

      console.log('Завершена генерация изображений, получено URL:', imageUrls);
      setImages(imageUrls);
      setImagesStatus('success');
      
      // Проверяем, что состояние не изменилось
      if (appStateRef.current === 'generating-images') {
        // Переходим к созданию аудио
        setAppState('generating-audio');
        await generateAudioFromStory(storyText);
      }
    } catch (err) {
      console.error('Ошибка при генерации изображений:', err);
      setImagesStatus('error');
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка при создании изображений');
      
      // Проверяем, что состояние не изменилось
      if (appStateRef.current === 'generating-images') {
        // Даже если изображения не сгенерированы, пробуем создать аудио
        setAppState('generating-audio');
        await generateAudioFromStory(storyText);
      }
    }
  }, []);
  
  // Генерация аудио из текста
  const generateAudioFromStory = useCallback(async (storyText: string) => {
    if (appStateRef.current !== 'generating-audio') {
      console.log('Пропуск генерации аудио, так как состояние изменилось');
      return;
    }
    
    setAudioStatus('loading');
    try {
      console.log('Начало генерации аудио из текста длиной:', storyText.length);
      
      // Ограничиваем длину текста для API
      const maxLength = 4000;
      const truncatedText = storyText.length > maxLength 
        ? storyText.substring(0, maxLength) + "... (текст был сокращен для озвучивания)"
        : storyText;
      
      const response = await fetch('/api/openai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: truncatedText,
          voice: 'alloy', 
        }),
      });

      console.log('Получен ответ от API text-to-speech с кодом:', response.status);
      
      if (!response.ok) {
        throw new Error(`Ошибка при создании аудио: ${response.status}`);
      }

      const audioBlob = await response.blob();
      console.log('Получен аудио-блоб размером:', audioBlob.size);
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      const url = URL.createObjectURL(audioBlob);
      console.log('Создан URL объекта из аудио-блоба:', url);
      
      setAudioUrl(url);
      setAudioStatus('success');
      
      // Проверяем, что состояние не изменилось
      if (appStateRef.current === 'generating-audio') {
        setAppState('ready');
      }
    } catch (err) {
      console.error('Ошибка при создании аудио:', err);
      setAudioStatus('error');
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка при создании аудио');
      
      // Проверяем, что состояние не изменилось
      if (appStateRef.current === 'generating-audio') {
        setAppState('ready'); // Переходим в готовое состояние, даже если есть ошибки
      }
    }
  }, [audioUrl]);
  
  // Генерация сказки - обработчик для FairyTaleGenerator
  const handleTaleGenerated = useCallback(async (tale: string) => {
    // Проверяем, что состояние сейчас - generating-story
    if (appStateRef.current !== 'generating-story') {
      console.log('Пропуск обработки сгенерированной сказки, так как состояние изменилось');
      return;
    }
    
    console.log('Сказка сгенерирована, длина:', tale.length);
    setStory(tale);
    
    // Разбиваем сказку на предложения для субтитров
    const sentences = tale
      .replace(/([.!?])\s+/g, "$1|")
      .split("|")
      .filter(s => s.trim().length > 0);
    setSubtitles(sentences);
    
    // Обновляем текущее состояние
    setAppState('generating-images');
    
    // Сохраняем историю в localStorage
    try {
      localStorage.setItem('story', tale);
      localStorage.setItem('appState', 'generating-images');
    } catch (err) {
      console.error('Ошибка при сохранении в localStorage:', err);
    }
    
    // Генерируем иллюстрации
    await generateImagesFromStory(tale);
  }, [generateImagesFromStory]);
  
  // Запуск режима чтения
  const startReadingMode = useCallback(() => {
    if (!audioRef.current || !audioUrl) {
      console.error('Невозможно запустить режим чтения: аудио не готово');
      return;
    }
    
    console.log('Запуск режима чтения');
    setAppState('reading');
    setCurrentSubtitleIndex(0);
    
    // Сохраняем состояние
    try {
      localStorage.setItem('appState', 'reading');
    } catch (err) {
      console.error('Ошибка при сохранении состояния:', err);
    }
    
    // Очищаем предыдущие таймеры
    subtitleTimers.current.forEach(timer => clearTimeout(timer));
    subtitleTimers.current = [];
    
    // Рассчитываем время для показа каждого субтитра
    const totalWords = subtitles.reduce((acc, subtitle) => acc + subtitle.split(' ').length, 0);
    const audioDuration = audioRef.current.duration || (totalWords * 250 / 1000);
    const avgTimePerSubtitle = audioDuration * 1000 / subtitles.length;
    
    console.log('Параметры чтения:', {
      'Всего субтитров': subtitles.length,
      'Всего слов': totalWords,
      'Длительность аудио': audioDuration,
      'Среднее время на субтитр': avgTimePerSubtitle
    });
    
    // Настраиваем таймеры для каждого субтитра
    subtitles.forEach((_, index) => {
      if (index === 0) return; // Первый показываем сразу
      
      const timer = setTimeout(() => {
        setCurrentSubtitleIndex(index);
      }, avgTimePerSubtitle * index);
      
      subtitleTimers.current.push(timer);
    });
    
    // Запускаем аудио
    audioRef.current.play().catch(err => {
      console.error('Ошибка воспроизведения аудио:', err);
      alert('Не удалось запустить воспроизведение аудио. Попробуйте нажать на кнопку воспроизведения вручную.');
    });
  }, [audioUrl, subtitles]);
  
  // Обработка завершения аудио
  const handleAudioEnded = useCallback(() => {
    console.log('Аудио завершило воспроизведение');
    setAppState('ready');
    subtitleTimers.current.forEach(timer => clearTimeout(timer));
    
    // Сохраняем состояние
    try {
      localStorage.setItem('appState', 'ready');
    } catch (err) {
      console.error('Ошибка при сохранении состояния:', err);
    }
  }, []);
  
  // Сброс приложения
  const resetApp = useCallback(() => {
    setStory('');
    setImages([]);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAppState('initial');
    setError(null);
    setImagesStatus('idle');
    setAudioStatus('idle');
    subtitleTimers.current.forEach(timer => clearTimeout(timer));
    console.log('Приложение сброшено');
    
    // Сбрасываем состояние в localStorage
    try {
      localStorage.removeItem('story');
      localStorage.removeItem('images');
      localStorage.setItem('appState', 'initial');
    } catch (err) {
      console.error('Ошибка при сбросе состояния:', err);
    }
  }, [audioUrl]);
  
  // Обработчик начала генерации
  const handleStartGenerating = useCallback(() => {
    console.log('Начало генерации сказки');
    setAppState('generating-story');
    
    // Сохраняем состояние
    try {
      localStorage.setItem('appState', 'generating-story');
    } catch (err) {
      console.error('Ошибка при сохранении состояния:', err);
    }
  }, []);
  
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="w-full max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-6 text-purple-800 
                    bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
          Волшебные Сказки
        </h1>
        <p className="text-lg md:text-xl text-center mb-8 text-gray-700">
          Создавайте уникальные сказки с помощью искусственного интеллекта, 
          смотри иллюстрации и слушай озвучку!
        </p>

        {appState === 'initial' ? (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <FairyTaleGenerator 
              onTaleGenerated={handleTaleGenerated} 
              onGenerating={handleStartGenerating}
            />
          </div>
        ) : appState === 'reading' ? (
          // Режим чтения с полноэкранными изображениями и субтитрами
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <button 
              onClick={() => setAppState('ready')}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full"
              aria-label="Закрыть режим чтения"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <div className="relative flex-grow">
              {images.length > 0 && (
                <div className="absolute inset-0">
                  <div className="relative w-full h-full">
                    <Image
                      src={images[currentImageIndex]}
                      alt={`Иллюстрация ${currentImageIndex + 1}`}
                      fill
                      style={{ objectFit: 'contain' }}
                      unoptimized
                      priority
                    />
                  </div>
                </div>
              )}
              
              <div className="absolute bottom-20 left-0 right-0 mx-4 bg-black bg-opacity-60 p-4 text-white text-center text-xl rounded-lg">
                {subtitles[currentSubtitleIndex]}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Показываем сгенерированную сказку */}
            {story && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Ваша сказка</h2>
                <div className="prose max-w-full">
                  {story.split('\n').map((paragraph, index) => (
                    paragraph.trim() ? <p key={index} className="mb-4 text-gray-800">{paragraph}</p> : null
                  ))}
                </div>
              </div>
            )}
            
            {/* Блок с иллюстрациями */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Иллюстрации к сказке</h2>
              
              {imagesStatus === 'loading' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="border rounded-lg p-8 flex items-center justify-center bg-gray-100 h-64">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="rounded-full bg-gray-300 h-12 w-12 mb-2"></div>
                        <div className="text-xl text-gray-500">Генерация...</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {imagesStatus === 'success' && images.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {images.map((imageUrl, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden shadow-md h-64 relative">
                      <div className="relative w-full h-full">
                        <Image 
                          src={imageUrl} 
                          alt={`Иллюстрация ${index + 1} к сказке`}
                          fill
                          style={{ objectFit: 'cover' }}
                          unoptimized
                          onError={() => {
                            console.error(`Ошибка загрузки изображения ${index + 1}`);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {imagesStatus === 'error' && (
                <div className="p-4 border-l-4 border-red-500 bg-red-50 text-red-700">
                  <p className="font-medium">Не удалось загрузить изображения</p>
                  {error && <p className="mt-1">{error}</p>}
                  <button 
                    className="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded"
                    onClick={() => generateImagesFromStory(story)}
                  >
                    Попробовать снова
                  </button>
                </div>
              )}
              
              {imagesStatus === 'idle' && appState !== 'generating-story' && (
                <p className="text-gray-500">Изображения будут созданы после генерации сказки</p>
              )}
            </div>
            
            {/* Блок с аудио */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Озвучивание сказки</h2>
              
              {audioStatus === 'loading' && (
                <div className="border rounded-lg p-8 flex items-center justify-center bg-gray-100">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="rounded-full bg-gray-300 h-12 w-12 mb-2"></div>
                    <div className="text-xl text-gray-500">Создание аудио...</div>
                  </div>
                </div>
              )}
              
              {audioStatus === 'success' && audioUrl && (
                <div>
                  {/* Обычный HTML5 аудиоплеер с явными стилями */}
                  <div className="p-4 border border-gray-300 rounded-lg bg-gray-50 mb-4">
                    <audio 
                      ref={audioRef}
                      src={audioUrl}
                      controls
                      onEnded={handleAudioEnded}
                      className="w-full"
                      style={{ 
                        display: 'block',
                        width: '100%',
                        minHeight: '40px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.375rem'
                      }}
                    />
                  </div>
                  
                  {/* Альтернативный плеер для отладки */}
                  <div className="p-4 border border-gray-300 rounded-lg bg-gray-50 mb-4">
                    <p className="text-gray-700 mb-2">Если аудиоплеер не виден, используйте эти кнопки:</p>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.play();
                          }
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                      >
                        Играть
                      </button>
                      
                      <button
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.pause();
                          }
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded ml-2"
                      >
                        Пауза
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={startReadingMode}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-md
                              transition-colors"
                  >
                    Запустить режим чтения с иллюстрациями
                  </button>
                </div>
              )}
              
              {audioStatus === 'error' && (
                <div className="p-4 border-l-4 border-red-500 bg-red-50 text-red-700">
                  <p className="font-medium">Не удалось создать аудио</p>
                  {error && <p className="mt-1">{error}</p>}
                  <div className="mt-3">
                    <button 
                      onClick={() => generateAudioFromStory(story)}
                      className="bg-red-100 text-red-800 px-3 py-1 rounded"
                    >
                      Попробовать снова
                    </button>
                  </div>
                </div>
              )}
              
              {audioStatus === 'idle' && appState !== 'generating-story' && appState !== 'generating-images' && (
                <p className="text-gray-500">Аудио будет создано после генерации сказки и иллюстраций</p>
              )}
            </div>
            
            {/* Кнопка для создания новой сказки */}
            {appState !== 'generating-story' && (
              <button
                onClick={resetApp}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors"
              >
                Создать новую сказку
              </button>
            )}
          </div>
        )}
        
        {/* Отладочная информация - уберите в продакшн */}
        <div className="mt-8 text-xs text-gray-400">
          Текущее состояние: {appState}
        </div>
      </div>
    </main>
  );
}
