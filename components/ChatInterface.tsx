import React, { useState, useEffect, useRef } from 'react';
import { PersonaProfile, ChatMessage } from '../types';
import { createChatSession } from '../services/geminiService';
import { Chat, GenerateContentResponse } from "@google/genai";

interface Props {
  profile: PersonaProfile;
}

const ChatInterface: React.FC<Props> = ({ profile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat
    chatSessionRef.current = createChatSession(profile);
    
    // Initial greeting if no messages
    if (messages.length === 0) {
        // We could trigger a "hello" from the model, but usually we wait for user.
        // Let's simulate a system start.
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: inputText,
        timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
        const result = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
        
        let fullResponse = "";
        const modelMsgId = (Date.now() + 1).toString();
        
        // Optimistic update for stream
        setMessages(prev => [...prev, {
            id: modelMsgId,
            role: 'model',
            text: '...',
            timestamp: Date.now()
        }]);

        for await (const chunk of result) {
            const c = chunk as GenerateContentResponse;
            if (c.text) {
                fullResponse += c.text;
                setMessages(prev => prev.map(m => 
                    m.id === modelMsgId ? { ...m, text: fullResponse } : m
                ));
            }
        }
    } catch (e) {
        console.error("Chat error", e);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "[Connection Error: I couldn't hear you clearly.]",
            timestamp: Date.now()
        }]);
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center gap-4">
        <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-600">
                {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-serif">{profile.name[0]}</div>
                )}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
        </div>
        <div>
            <h3 className="font-bold text-white">{profile.name}</h3>
            <p className="text-xs text-slate-400">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
        {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-md ${
                    msg.role === 'user' 
                    ? 'bg-cyan-700 text-white rounded-tr-none' 
                    : 'bg-slate-700 text-slate-200 rounded-tl-none'
                }`}>
                    {msg.text}
                </div>
            </div>
        ))}
        {isTyping && (
             <div className="flex justify-start">
                <div className="bg-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-md flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex gap-2">
            <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded-full px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button 
                onClick={handleSend}
                disabled={!inputText.trim() || isTyping}
                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;