'use client';

import { useState, useEffect, useRef } from 'react';
import FairyTaleGenerator from '@/components/FairyTaleGenerator';
import ImageGenerator from '@/components/ImageGenerator';
import AudioPlayer from '@/components/AudioPlayer';

export default function Home() {
  const [story, setStory] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showStory, setShowStory] = useState<boolean>(false);
  const [isReadingMode, setIsReadingMode] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [subtitles, setSubtitles] = useState<string[]>([]);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState<number>(0);
  const [isGeneratingImages, setIsGeneratingImages] = useState<boolean>(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const subtitleTimers = useRef<NodeJS.Timeout[]>([]);
  
  // Автоматическая смена изображений
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isReadingMode && images.length > 0) {
      interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, 8000); // Смена изображений каждые 8 секунд
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isReadingMode, images]);
  
  // Очистка таймеров субтитров при размонтировании
  useEffect(() => {
    return () => {
      subtitleTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);
  
  // Обработка генерации сказки
  const handleTaleGenerated = async (tale: string) => {
    setStory(tale);
    setShowStory(true);
    
    // Автоматически разбиваем сказку на субтитры (предложения)
    const sentences = tale
      .replace(/([.!?])\s+/g, "$1|")
      .split("|")
      .filter(s => s.trim().length > 0);
    setSubtitles(sentences);
    
    // Автоматически запускаем генерацию изображений
    generateImagesFromStory(tale);
  };
  
  // Генерация изображений на основе сказки
  const generateImagesFromStory = async (storyText: string) => {
    setIsGeneratingImages(true);
    try {
      // Делим сказку на три части для создания трех разных изображений
      const paragraphs = storyText.split('\n\n').filter(p => p.trim() !== '');
      
      // Создаём детализированные промпты на основе текста сказки
      // Выделяем ключевые элементы для каждой части сказки
      const kroliks = storyText.toLowerCase().includes('кролик') || storyText.toLowerCase().includes('нолик');
      const forestMagic = storyText.toLowerCase().includes('лес') || storyText.toLowerCase().includes('волшебн');
      const lake = storyText.toLowerCase().includes('озеро') || storyText.toLowerCase().includes('вода');
      const owl = storyText.toLowerCase().includes('сова') || storyText.toLowerCase().includes('офелия');
      
      let character = kroliks ? 'кролик Нолик с рыжевато-белым мехом' : 'главный герой сказки';
      let setting = forestMagic ? 'волшебный изумрудный лес' : 'сказочная страна';
      
      const prompts = [
        `Детская книжная иллюстрация: ${character} стоит в ${setting}. Сцена из начала сказки, яркие акварельные краски, стиль детских книг, дневной свет, красочная и детализированная иллюстрация.`,
        
        `Детская книжная иллюстрация: ${owl ? 'мудрая сова Офелия разговаривает с' : 'встреча'} ${character} в ${setting}. Средняя часть сказки, яркие акварельные краски, стиль детских книг, красочная и детализированная иллюстрация.`,
        
        `Детская книжная иллюстрация: ${character} ${lake ? 'возле волшебного озера, от которого исходит магическое сияние' : 'в кульминационный момент сказки'}. Финал сказки, яркие акварельные краски, стиль детских книг, волшебное свечение, красочная и детализированная иллюстрация.`
      ];

      const imageUrls: string[] = [];

      for (const prompt of prompts) {
        // Используем OpenAI для генерации изображений
        const response = await fetch('/api/openai/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error('Не удалось сгенерировать изображение');
        }

        const data = await response.json();
        imageUrls.push(data.imageUrl);
      }

      setImages(imageUrls);
      
      // После генерации изображений, генерируем аудио
      generateAudioFromStory(storyText);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImages(false);
    }
  };
  
  // Генерация аудио на основе сказки
  const generateAudioFromStory = async (storyText: string) => {
    setIsGeneratingAudio(true);
    try {
      const response = await fetch('/api/openai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: storyText,
          voice: 'alloy', 
        }),
      });

      if (!response.ok) {
        throw new Error('Не удалось сгенерировать аудио');
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAudio(false);
    }
  };
  
  // Запуск режима чтения
  const startReadingMode = () => {
    if (!audioRef.current || !audioUrl) return;
    
    setIsReadingMode(true);
    setCurrentSubtitleIndex(0);
    
    // Очищаем предыдущие таймеры
    subtitleTimers.current.forEach(timer => clearTimeout(timer));
    subtitleTimers.current = [];
    
    // Рассчитываем время для показа каждого субтитра
    // Примерное время чтения - 250-300 мс на слово
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
  };
  
  // Обработка завершения аудио
  const handleAudioEnded = () => {
    setIsReadingMode(false);
    // Очищаем таймеры
    subtitleTimers.current.forEach(timer => clearTimeout(timer));
  };
  
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

        {!showStory ? (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <FairyTaleGenerator onTaleGenerated={handleTaleGenerated} />
          </div>
        ) : isReadingMode ? (
          // Режим чтения с полноэкранными изображениями и субтитрами
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <button 
              onClick={() => setIsReadingMode(false)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full"
            >
              ✕
            </button>
            
            <div className="relative flex-grow">
              {images.length > 0 && (
                <div className="absolute inset-0">
                  <img
                    src={images[currentImageIndex]}
                    alt={`Иллюстрация ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              
              <div className="absolute bottom-20 left-0 right-0 bg-black bg-opacity-60 p-4 text-white text-center text-xl">
                {subtitles[currentSubtitleIndex]}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Ваша сказка</h2>
              <div className="prose max-w-full">
                {story.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </div>
            
            {/* Статус генерации изображений */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Иллюстрации к сказке</h2>
              
              {isGeneratingImages ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-8 flex items-center justify-center bg-gray-100">
                    <div className="animate-pulse text-xl">Генерация...</div>
                  </div>
                  <div className="border rounded-lg p-8 flex items-center justify-center bg-gray-100">
                    <div className="animate-pulse text-xl">Генерация...</div>
                  </div>
                  <div className="border rounded-lg p-8 flex items-center justify-center bg-gray-100">
                    <div className="animate-pulse text-xl">Генерация...</div>
                  </div>
                </div>
              ) : images.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {images.map((imageUrl, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden shadow-md">
                      <img 
                        src={imageUrl} 
                        alt={`Иллюстрация ${index + 1} к сказке`} 
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p>Изображения еще не созданы</p>
              )}
            </div>
            
            {/* Аудиоплеер и кнопка запуска режима чтения */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Озвучивание сказки</h2>
              
              {isGeneratingAudio ? (
                <div className="border rounded-lg p-8 flex items-center justify-center bg-gray-100">
                  <div className="animate-pulse text-xl">Создание аудио...</div>
                </div>
              ) : audioUrl ? (
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
              ) : (
                <p>Аудио еще не создано</p>
              )}
            </div>
            
            <button
              onClick={() => {
                setShowStory(false);
                setStory('');
                setImages([]);
                setAudioUrl(null);
                setIsReadingMode(false);
                subtitleTimers.current.forEach(timer => clearTimeout(timer));
              }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors"
            >
              Создать новую сказку
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
