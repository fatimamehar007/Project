import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Socket, io } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';
import { chatAPI } from '@/lib/api';
import ChatMessage from './message';
import ChatInput from './input';

interface Message {
  id: string;
  message: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  language?: string;
  confidence?: number;
}

const ChatContainer = () => {
  const { schemeId } = useParams<{ schemeId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { token } = useAuthStore();

  // Query to fetch chat history
  const { data: history } = useQuery({
    queryKey: ['chat-history', schemeId],
    queryFn: async () => {
      if (!schemeId) return [];
      const response = await chatAPI.getHistory(schemeId);
      return response.data;
    },
    enabled: !!schemeId,
  });

  // Mutation to send message
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!schemeId) throw new Error('No scheme selected');
      return chatAPI.sendMessage(schemeId, message);
    },
  });

  // Initialize socket connection
  useEffect(() => {
    if (!token || !schemeId) return;

    socketRef.current = io('/chat', {
      auth: { token },
      query: { schemeId },
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      setIsTyping(false);
    });

    socket.on('typing', () => {
      setIsTyping(true);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      // Handle error (show toast, etc.)
    });

    return () => {
      socket.disconnect();
    };
  }, [token, schemeId]);

  // Load chat history
  useEffect(() => {
    if (history) {
      setMessages(history);
    }
  }, [history]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      message,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);

    try {
      await sendMessageMutation.mutateAsync(message);
    } catch (error) {
      console.error('Error sending message:', error);
      // Handle error (show toast, etc.)
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.message}
              sender={message.sender}
              timestamp={new Date(message.timestamp)}
              language={message.language}
              confidence={message.confidence}
            />
          ))}
          {isTyping && (
            <ChatMessage
              message=""
              sender="ai"
              timestamp={new Date()}
              isLoading
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput
        onSend={handleSendMessage}
        isLoading={sendMessageMutation.isPending || isTyping}
      />
    </div>
  );
};

export default ChatContainer; 