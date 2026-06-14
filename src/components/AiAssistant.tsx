import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, User, Bot, Loader2, Minimize2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: 'default-1',
    role: 'model',
    text: "Hello! I'm Joamedic's AI Assistant. How can I help you find the perfect medical scrubs today?"
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { t } = useLanguage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const botMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: botMessageId, role: 'model', text: '' }]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      if (!response.body) throw new Error("No response body.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') {
              setIsTyping(false);
              return;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                 botText += "\nError: " + data.error;
                 setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: botText } : m));
                 setIsTyping(false);
                 return;
              }
              if (data.text) {
                // Stream word by word smoothly
                botText += data.text;
                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: botText } : m));
              }
            } catch (err) {
              console.warn("Error parsing chunk", err);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: "I'm sorry, I'm having trouble connecting right now." } : m));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-6 z-[60]">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="bg-teal-500 hover:bg-teal-400 text-black p-4 rounded-full shadow-[0_4px_20px_1px_rgba(20,184,166,0.4)] flex items-center justify-center transition-colors group relative border-2 border-teal-400"
            >
              <MessageSquare size={24} className="group-hover:animate-pulse" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95, transformOrigin: 'bottom left' }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-0 left-0 w-[350px] sm:w-[400px] h-[550px] max-h-[80vh] glass-panel bg-slate-900/95 border-teal-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/10 bg-teal-500/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-black">
                    <Bot size={18} />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">Joamedic AI Assistant</h3>
                    <p className="text-teal-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span> Online
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Minimize2 size={16} />
                </button>
              </div>

              {/* Chat Canvas */}
              <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-4 no-scrollbar scroll-smooth">
                {messages.map((message) => (
                  <motion.div 
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex gap-2 max-w-[85%]">
                      {message.role === 'model' && (
                        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-teal-300 flex-shrink-0 mt-1 border border-white/10">
                          <Bot size={14} />
                        </div>
                      )}
                      
                      <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                        message.role === 'user' 
                          ? 'bg-teal-500 text-black rounded-tr-sm' 
                          : 'bg-white/5 text-white/90 rounded-tl-sm border border-white/10'
                      }`}>
                        {message.text}
                      </div>

                      {message.role === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-white flex-shrink-0 mt-1 border border-white/10">
                          <User size={14} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                     <div className="flex gap-2">
                       <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-teal-400">
                         <Loader2 size={14} className="animate-spin" />
                       </div>
                       <div className="bg-white/5 border border-white/10 text-white/60 p-3 rounded-2xl rounded-tl-sm text-xs">
                         Thinking...
                       </div>
                     </div>
                   </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-black/20 border-t border-white/10">
                <form onSubmit={handleSubmit} className="relative flex items-center">
                  <input
                    type="text"
                    disabled={isTyping}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about premium scrubs..."
                    className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-teal-400/50 focus:bg-white/10 transition-all disabled:opacity-50"
                  />
                  <button 
                    type="submit" 
                    disabled={!input.trim() || isTyping}
                    className="absolute right-2 p-1.5 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-500/30 text-black rounded-lg transition-colors group"
                  >
                    <Send size={16} className={`transition-transform ${input.trim() && !isTyping ? 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5' : ''}`} />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
