import { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  storyText: string;
}

export default function AudioPlayer({ storyText }: AudioPlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Очистка URL при размонтировании компонента
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const generateSpeech = async () => {
    if (!storyText || storyText.trim() === '') {
      setError('Сначала создайте сказку');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Используем OpenAI API для создания аудио (предполагается, что это Whisper)
      const response = await fetch('/api/openai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: storyText,
          voice: 'alloy', // Предполагаем, что это голос из OpenAI TTS
        }),
      });

      if (!response.ok) {
        throw new Error('Не удалось сгенерировать аудио');
      }

      // Получаем аудио как блоб и создаем URL для аудиоэлемента
      const audioBlob = await response.blob();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Автоматически начинаем воспроизведение
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      setError('Произошла ошибка при генерации аудио');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="mt-8 w-full max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Озвучивание сказки</h2>
      
      <button
        onClick={generateSpeech}
        disabled={isGenerating || storyText.trim() === ''}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md 
                  disabled:bg-green-300 transition-colors mb-4"
      >
        {isGenerating ? 'Создание аудио...' : 'Озвучить сказку'}
      </button>
      
      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}
      
      {audioUrl && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <audio 
            ref={audioRef}
            src={audioUrl} 
            onEnded={() => setIsPlaying(false)}
            className="w-full"
            controls
          />
          
          <div className="flex justify-center mt-4">
            <button
              onClick={handlePlayPause}
              className={`px-6 py-2 rounded-full ${
                isPlaying 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {isPlaying ? 'Пауза' : 'Играть'}
            </button>
          </div>
        </div>
      )}
      
      {isGenerating && (
        <div className="border rounded-lg p-8 flex items-center justify-center bg-gray-100">
          <div className="animate-pulse text-xl">Озвучивание сказки...</div>
        </div>
      )}
    </div>
  );
} 