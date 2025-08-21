import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Actions, Action } from '@/components/ai-elements/actions';
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
  PromptInputAttachment,
} from '@/components/ai-elements/prompt-input';
import { Response } from '@/components/ai-elements/response';
import { Loader } from '@/components/ai-elements/loader';
import { CodeBlock, CodeBlockCopyButton } from '@/components/ai-elements/code-block';
import { GlobeIcon, MicIcon, ImageIcon, RefreshCcwIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { apiConfig } from '@/lib/ai';
import { useAuth } from '@/contexts/AuthContext';

const models = [
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet' }
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    image?: string;
  }>;
}

export default function Chat() {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ type: 'image'; url: string; file: File }>>([]);
  const { getToken } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    // Convertir archivos a base64
    const imagePromises = attachments.map(async (attachment) => {
      return new Promise<{ type: 'image'; image: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            type: 'image',
            image: reader.result as string
          });
        };
        reader.readAsDataURL(attachment.file);
      });
    });

    const imageContents = await Promise.all(imagePromises);
    
    const messageContent: Array<{ type: 'text' | 'image'; text?: string; image?: string }> = [];
    
    if (input.trim()) {
      messageContent.push({
        type: 'text',
        text: input.trim()
      });
    }
    
    messageContent.push(...imageContents);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent.length === 1 && messageContent[0].type === 'text' 
        ? messageContent[0].text! 
        : messageContent,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
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

  const handleFileSelect = (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    const newAttachments = imageFiles.map(file => ({
      type: 'image' as const,
      url: URL.createObjectURL(file),
      file
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const attachment = prev[index];
      URL.revokeObjectURL(attachment.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRegenerateMessage = async (messageIndex: number) => {
    if (messageIndex < 0 || messageIndex >= messages.length) return;
    
    // Obtener todos los mensajes hasta el mensaje que queremos regenerar (excluyendo el último mensaje del asistente)
    const messagesToResend = messages.slice(0, messageIndex);
    
    setMessages(messagesToResend);
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
          messages: messagesToResend.map(msg => ({ role: msg.role, content: msg.content }))
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.choices[0]?.message?.content || 'No response received',
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Regenerate error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Error: No se pudo regenerar la respuesta',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (content: string | Array<any>) => {
    const textToCopy = typeof content === 'string' ? content : JSON.stringify(content);
    navigator.clipboard.writeText(textToCopy);
  };

  const parseMessageWithCodeBlocks = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Agregar texto antes del bloque de código
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push({ type: 'text', content: textBefore });
        }
      }

      // Agregar el bloque de código
      const language = match[1] || 'text';
      const code = match[2];
      parts.push({ type: 'code', content: code, language });

      lastIndex = match.index + match[0].length;
    }

    // Agregar texto restante después del último bloque de código
    if (lastIndex < content.length) {
      const textAfter = content.slice(lastIndex);
      if (textAfter.trim()) {
        parts.push({ type: 'text', content: textAfter });
      }
    }

    // Si no hay bloques de código, devolver todo como texto
    if (parts.length === 0) {
      parts.push({ type: 'text', content });
    }

    return parts;
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto p-6 min-h-0 flex-1">
      <Conversation>
          <ConversationContent>
            {messages.map((message, messageIndex) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.role === 'assistant' ? (
                    <div>
                      {typeof message.content === 'string' ? (
                        <div className="space-y-4">
                          {parseMessageWithCodeBlocks(message.content).map((part, partIndex) => (
                            <div key={partIndex}>
                              {part.type === 'code' ? (
                                <CodeBlock
                                  code={part.content}
                                  language={part.language || 'text'}
                                  showLineNumbers={true}
                                >
                                  <CodeBlockCopyButton />
                                </CodeBlock>
                              ) : (
                                <Response>{part.content}</Response>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Response>{JSON.stringify(message.content)}</Response>
                      )}
                      <Actions className="mt-2">
                        <Action
                          onClick={() => handleRegenerateMessage(messageIndex)}
                          label="Regenerate"
                        >
                          <RefreshCcwIcon className="size-3" />
                        </Action>
                        <Action
                          onClick={() => handleCopyMessage(message.content)}
                          label="Copy"
                        >
                          <CopyIcon className="size-3" />
                        </Action>
                      </Actions>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {typeof message.content === 'string' ? (
                        <div>{message.content}</div>
                      ) : (
                        message.content.map((item, index) => (
                          <div key={index}>
                            {item.type === 'text' ? (
                              <div>{item.text}</div>
                            ) : item.type === 'image' ? (
                              <img 
                                src={item.image} 
                                alt="Imagen enviada" 
                                className="max-w-xs rounded-lg"
                              />
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </MessageContent>
              </Message>
            ))}
              {isLoading && <Loader />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="flex-shrink-0">
          {/* Preview de attachments */}
          {attachments.length > 0 && (
            <div className="mb-2 p-2 border rounded-lg">
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={attachment.url} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded"
                    />
                    <button
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading}
            />
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputAttachment
                  accept="image/*"
                  multiple
                  onSelect={handleFileSelect}
                >
                  <PromptInputButton>
                    <ImageIcon size={16} />
                  </PromptInputButton>
                </PromptInputAttachment>
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
                disabled={(!input.trim() && attachments.length === 0) || isLoading} 
                status={isLoading ? 'submitting' : 'ready'} 
              />
            </PromptInputToolbar>
          </PromptInput>
      </div>
    </div>
  );
}