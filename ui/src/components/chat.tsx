import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Response } from '@/components/ai-elements/response';
import { Loader } from '@/components/ai-elements/loader';
import { GlobeIcon, MicIcon } from 'lucide-react';
import { useState } from 'react';
import { apiConfig } from '@/lib/ai';
import { useAuth } from '@/contexts/AuthContext';

const models = [
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus' },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { getToken } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${apiConfig.baseURL}/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            userMessage
          ].map(msg => ({ role: msg.role, content: msg.content }))
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0]?.message?.content || 'No response received',
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error: No se pudo obtener respuesta del servidor',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col max-w-4xl mx-auto p-6">
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0 mb-4">
          <Conversation className="h-full">
            <ConversationContent>
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.role === 'assistant' ? (
                    <Response>
                      {message.content}
                    </Response>
                  ) : (
                    message.content
                  )}
                </MessageContent>
              </Message>
            ))}
              {isLoading && <Loader />}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

        <div className="flex-shrink-0">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading}
            />
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputButton>
                  <MicIcon size={16} />
                </PromptInputButton>
                <PromptInputButton>
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
                <PromptInputModelSelect
                  onValueChange={(value) => {
                    setModel(value);
                  }}
                  value={model}
                >
                  <PromptInputModelSelectTrigger>
                    <PromptInputModelSelectValue />
                  </PromptInputModelSelectTrigger>
                  <PromptInputModelSelectContent>
                    {models.map((model) => (
                      <PromptInputModelSelectItem key={model.id} value={model.id}>
                        {model.name}
                      </PromptInputModelSelectItem>
                    ))}
                  </PromptInputModelSelectContent>
                </PromptInputModelSelect>
              </PromptInputTools>
              <PromptInputSubmit 
                disabled={!input.trim() || isLoading} 
                status={isLoading ? 'submitting' : 'ready'} 
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}