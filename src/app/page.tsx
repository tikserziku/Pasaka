'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import FairyTaleGenerator from '@/components/FairyTaleGenerator';
import SimpleFairyTaleGenerator from '@/components/SimpleFairyTaleGenerator';
import Image from 'next/image';

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
  const [useSimpleGenerator, setUseSimpleGenerator] = useState<boolean>(false);
  
  // Компоненты для режима чтения
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [subtitles, setSubtitles] = useState<string[]>([]);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState<number>(0);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const subtitleTimers = useRef<NodeJS.Timeout[]>([]);
  
  // Вывод состояния для отладки
  useEffect(() => {
    console.log('Текущее состояние приложения:', appState);
  }, [appState]);

  // При инициализации проверяем, можем ли запустить отладочный режим
  useEffect(() => {
    const debugMode = localStorage.getItem('debug_mode') === 'true';
    if (debugMode) {
      setUseSimpleGenerator(true);
      console.log('Включен режим отладки с упрощенным генератором');
    }
  }, []);
  
  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      subtitleTimers.current.forEach(timer => clearTimeout(timer));
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);
  
  // Генерация сказки - обработчик для FairyTaleGenerator
  const handleTaleGenerated = useCallback(async (tale: string) => {
    console.log('Сказка сгенерирована, длина:', tale.length);
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

  // Переключение режима генератора для отладки
  const toggleGeneratorMode = () => {
    setUseSimpleGenerator(prev => {
      const newValue = !prev;
      localStorage.setItem('debug_mode', newValue.toString());
      return newValue;
    });
  };

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

        {/* Кнопка переключения режима отладки */}
        <div className="mb-4 text-center">
          <button 
            onClick={toggleGeneratorMode}
            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-2 rounded"
          >
            {useSimpleGenerator ? "Использовать обычный генератор" : "Режим отладки"}
          </button>
        </div>

        {appState === 'initial' ? (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            {useSimpleGenerator ? (
              <SimpleFairyTaleGenerator 
                onTaleGenerated={handleTaleGenerated} 
                onGenerating={() => setAppState('generating-story')}
              />
            ) : (
              <FairyTaleGenerator 
                onTaleGenerated={handleTaleGenerated} 
                onGenerating={() => setAppState('generating-story')}
              />
            )}
          </div>
        ) : (
          // Остальной код компонента без изменений
