import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Volume2, VolumeX, Sun, Moon, Loader } from 'lucide-react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  audio?: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(
        'https://api.together.xyz/v1/chat/completions',
        {
          model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
          messages: [...messages, userMessage],
          max_tokens: 512,
          temperature: 0.7,
          top_p: 0.7,
          top_k: 50,
          repetition_penalty: 1,
          stop: ['<|eot_id|>', '<|eom_id|>'],
        },
        {
          headers: {
            'Authorization': 'Bearer 6aa2ed09284539d4226d1628cf4bea6f008f11becc3c502f3f9d059ee4696e0d',
            'Content-Type': 'application/json',
          },
        }
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.choices[0].message.content,
      };
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
      
      // Generate TTS for the assistant's message
      await generateTTS(assistantMessage);
    } catch (error) {
      console.error('Error fetching AI response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTTS = async (message: Message) => {
    setIsTTSLoading(true);
    try {
      const response = await axios.post(
        'https://api.neets.ai/v1/tts',
        {
          text: message.content,
          voice_id: "ariana-grande",
          params: {
            model: "ar-diff-50k"
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': '31c31384757d41bea9cf0c21af89c2db'
          },
          responseType: 'arraybuffer'
        }
      );

      const audioBlob = new Blob([response.data], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg === message ? { ...msg, audio: audioUrl } : msg
        )
      );

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error generating TTS:', error);
    } finally {
      setIsTTSLoading(false);
    }
  };

  const toggleAudio = (audio: string | undefined) => {
    if (audioRef.current && audio) {
      if (audioRef.current.paused) {
        audioRef.current.src = audio;
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  };

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
      <header className={`${isDarkMode ? 'bg-blue-800' : 'bg-blue-600'} text-white p-4 flex justify-between items-center`}>
        <h1 className="text-2xl font-bold flex items-center">
          <MessageSquare className="mr-2" /> AIConnect
        </h1>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isDarkMode ? <Sun /> : <Moon />}
        </button>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                message.role === 'user'
                  ? isDarkMode ? 'bg-blue-900 ml-auto' : 'bg-blue-100 ml-auto'
                  : isDarkMode ? 'bg-gray-800' : 'bg-white'
              } max-w-[80%]`}
            >
              <p>{message.content}</p>
              {message.role === 'assistant' && message.audio && (
                <button
                  onClick={() => toggleAudio(message.audio)}
                  className={`mt-2 p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                >
                  {audioRef.current?.paused ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              )}
              {message.role === 'assistant' && isTTSLoading && (
                <div className="mt-2 flex items-center">
                  <Loader size={16} className="animate-spin mr-2" />
                  <span className="text-sm">Generating audio...</span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className={`p-3 rounded-lg max-w-[80%] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <p>AI is thinking...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>
      <footer className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t p-4`}>
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className={`flex-1 border ${
              isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
            } rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button
            type="submit"
            disabled={isLoading}
            className={`${
              isDarkMode ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'
            } text-white px-4 py-2 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center`}
          >
            <Send className="mr-2" /> Send
          </button>
        </form>
      </footer>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

export default App;