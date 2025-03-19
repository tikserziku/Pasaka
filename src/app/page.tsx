'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import FairyTaleGenerator from '@/components/FairyTaleGenerator';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// Типы для управления приложением
type AppState = 'initial' | 'generating-story' | 'generating-images' | 'generating-audio' | 'ready' | 'reading';
type ImageStatus = 'idle' | 'loading' | 'success' | 'error';

export default function Home() {
  // Состояние приложения
  const [appState, setAppState] = useState<AppState>('initial');
  
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
  
  // Генерация сказки
  const handleTaleGenerated = useCallback(async (tale: string) => {
    setStory(tale);
    setAppState('generating-images');
    
    // Разбиваем сказку на предложения для субтитров
    const sentences = tale
      .replace(/([.!?])\s+/g, "$1|")
      .split("|")
      .filter(s => s.trim().length > 0);
    setSubtitles(sentences);
    
    // Генерируем иллюстрации
    await generateImagesFromStory(tale);
  }, []);
  
  // Генерация изображений
  const generateImagesFromStory = async (storyText: string) => {
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

      const imageUrls: string[] = [];
      
      // Генерируем изображения параллельно для ускорения
      const imagePromises = prompts.map(prompt => 
        fetch('/api/openai/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Ошибка генерации изображения: ${response.status}`);
          }
          return response.json();
        })
        .then(data => data.imageUrl)
      );

      // Ждем завершения всех запросов
      const results = await Promise.allSettled(imagePromises);
      
      // Собираем успешные URL
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          imageUrls.push(result.value);
        }
      });

      if (imageUrls.length === 0) {
        throw new Error('Не удалось сгенерировать ни одного изображения');
      }

      setImages(imageUrls);
      setImagesStatus('success');
      
      // Переходим к созданию аудио
      setAppState('generating-audio');
      await generateAudioFromStory(storyText);
      
    } catch (err) {
      console.error('Ошибка при генерации изображений:', err);
      setImagesStatus('error');
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка при создании изображений');
      
      // Даже если изображения не сгенерированы, пробуем создать аудио
      setAppState('generating-audio');
      await generateAudioFromStory(storyText);
    }
  };
  
  // Генерация аудио
  const generateAudioFromStory = async (storyText: string) => {
    setAudioStatus('loading');
    try {
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

      if (!response.ok) {
        throw new Error(`Ошибка при создании аудио: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setAudioStatus('success');
      setAppState('ready');
    } catch (err) {
      console.error('Ошибка при создании аудио:', err);
      setAudioStatus('error');
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка при создании аудио');
      setAppState('ready'); // Переходим в готовое состояние, даже если есть ошибки
    }
  };
  
  // Запуск режима чтения
  const startReadingMode = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;
    
    setAppState('reading');
    setCurrentSubtitleIndex(0);
    
    // Очищаем предыдущие таймеры
    subtitleTimers.current.forEach(timer => clearTimeout(timer));
    subtitleTimers.current = [];
    
    // Рассчитываем время для показа каждого субтитра
    const totalWords = subtitles.reduce((acc, subtitle) => acc + subtitle.split(' ').length, 0);
    const audioDuration = audioRef.current.duration || (totalWords * 250 / 1000);
    const avgTimePerSubtitle = audioDuration * 1000 / subtitles.length;
    
    // Настраиваем таймеры для каждого субтитра
    subtitles.forEach((_, index) => {
      if (index === 0) return; // Первый показываем сразу
      
      const timer = setTimeout(() => {
        setCurrentSubtitleIndex(index);
      }, avgTimePerSubtitle * index);
      
      subtitleTimers.current.push(timer);
    });
    
    // Запускаем аудио
    audioRef.current.play();
  }, [audioUrl, subtitles]);
  
  // Обработка завершения аудио
  const handleAudioEnded = useCallback(() => {
    setAppState('ready');
    subtitleTimers.current.forEach(timer => clearTimeout(timer));
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
  }, [audioUrl]);
  
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="w-full max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-6 text-purple-800 
                    bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
          Волшебные Сказки
        </h1>
        <p className="text-lg md:text-xl text-center mb-8 text-gray-700">
          Создавай уникальные сказки с помощью искусственного интеллекта, 
          смотри иллюстрации и слушай озвучку!
        </p>

        {appState === 'initial' ? (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <FairyTaleGenerator 
              onTaleGenerated={handleTaleGenerated} 
              onGenerating={() => setAppState('generating-story')}
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
              <AnimatePresence mode="wait">
                {images.length > 0 && (
                  <motion.div
                    key={currentImageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0"
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={images[currentImageIndex]}
                        alt={`Иллюстрация ${currentImageIndex + 1}`}
                        layout="fill"
                        objectFit="contain"
                        priority
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-20 left-0 right-0 mx-4 bg-black bg-opacity-60 p-4 text-white text-center text-xl rounded-lg"
              >
                {subtitles[currentSubtitleIndex]}
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Показываем сгенерированную сказку */}
            {story && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Ваша сказка</h2>
                <div className="prose max-w-full">
                  {story.split('\n').map((paragraph, index) => (
                    paragraph.trim() ? <p key={index} className="mb-4">{paragraph}</p> : null
                  ))}
                </div>
              </div>
            )}
            
            {/* Блок с иллюстрациями */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Иллюстрации к сказке</h2>
              
              {imagesStatus === 'loading' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="border rounded-lg p-8 flex items-center justify-center bg-gray-100 h-64">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="rounded-full bg-gray-300 h-12 w-12 mb-2"></div>
                        <div className="text-xl">Генерация...</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {imagesStatus === 'success' && images.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {images.map((imageUrl, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden shadow-md h-64 relative">
                      <Image 
                        src={imageUrl} 
                        alt={`Иллюстрация ${index + 1} к сказке`}
                        layout="fill"
                        objectFit="cover"
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {imagesStatus === 'error' && (
                <div className="p-4 border-l-4 border-red-500 bg-red-50 text-red-700">
                  <p className="font-medium">Не удалось создать все иллюстрации</p>
                  {error && <p className="mt-1">{error}</p>}
                </div>
              )}
              
              {imagesStatus === 'idle' && appState !== 'generating-story' && (
                <p className="text-gray-500">Изображения будут созданы после генерации сказки</p>
              )}
            </div>
            
            {/* Блок с аудио */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Озвучивание сказки</h2>
              
              {audioStatus === 'loading' && (
                <div className="border rounded-lg p-8 flex items-center justify-center bg-gray-100">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="rounded-full bg-gray-300 h-12 w-12 mb-2"></div>
                    <div className="text-xl">Создание аудио...</div>
                  </div>
                </div>
              )}
              
              {audioStatus === 'success' && audioUrl && (
                <div>
                  <audio 
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={handleAudioEnded}
                    className="w-full mb-4"
                    controls
                  />
                  
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
      </div>
    </main>
  );
}
