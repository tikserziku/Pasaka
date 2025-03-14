import { useState } from 'react';
import { useChat } from 'ai/react';

interface FairyTaleGeneratorProps {
  onTaleGenerated: (tale: string) => void;
}

export default function FairyTaleGenerator({ onTaleGenerated }: FairyTaleGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [theme, setTheme] = useState('волшебная');
  const [length, setLength] = useState('короткая');

  const { messages, append, isLoading } = useChat({
    api: '/api/openai/chat',
    onFinish: (message) => {
      setIsGenerating(false);
      onTaleGenerated(message.content);
    },
  });

  const handleGenerateTale = async () => {
    setIsGenerating(true);
    const systemPrompt = `Ты волшебный рассказчик сказок. Создай ${length} сказку на ${theme} тему${prompt ? ` о ${prompt}` : ''}. 
    Сказка должна быть подходящей для детей, содержать начало, середину и конец, иметь поучительный смысл. 
    Оформляй абзацы и диалоги правильно. Используй яркие описания для возможности создания иллюстраций.`;
    
    await append({
      role: 'user',
      content: systemPrompt,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Генератор сказок</h2>
      
      <div className="mb-4">
        <label htmlFor="theme-select" className="block text-sm font-medium mb-1">Тема сказки:</label>
        <select 
          id="theme-select"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="w-full p-2 border rounded-md"
          aria-label="Выберите тему сказки"
        >
          <option value="волшебная">Волшебная</option>
          <option value="приключенческая">Приключенческая</option>
          <option value="фантастическая">Фантастическая</option>
          <option value="о животных">О животных</option>
          <option value="о дружбе">О дружбе</option>
        </select>
      </div>
      
      <div className="mb-4">
        <label htmlFor="length-select" className="block text-sm font-medium mb-1">Длина сказки:</label>
        <select 
          id="length-select"
          value={length}
          onChange={(e) => setLength(e.target.value)}
          className="w-full p-2 border rounded-md"
          aria-label="Выберите длину сказки"
        >
          <option value="короткая">Короткая</option>
          <option value="средняя">Средняя</option>
          <option value="длинная">Длинная</option>
        </select>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">О чем (необязательно):</label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Например: о драконе и принцессе"
          className="w-full p-2 border rounded-md"
        />
      </div>
      
      <button
        onClick={handleGenerateTale}
        disabled={isGenerating || isLoading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md 
                  disabled:bg-purple-300 transition-colors"
      >
        {isGenerating || isLoading ? 'Создание сказки...' : 'Создать сказку'}
      </button>
    </div>
  );
} 