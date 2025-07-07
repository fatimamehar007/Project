import { cn, formatDate, getConfidenceColor } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';

interface ChatMessageProps {
  message: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  language?: string;
  confidence?: number;
  isLoading?: boolean;
}

const ChatMessage = ({
  message,
  sender,
  timestamp,
  language,
  confidence,
  isLoading,
}: ChatMessageProps) => {
  const isAI = sender === 'ai';

  return (
    <div
      className={cn(
        'flex w-full gap-3 p-4',
        isAI ? 'bg-muted/50' : 'bg-background'
      )}
    >
      <Avatar
        className={cn(
          'h-8 w-8',
          isAI ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <span className="text-xs">{isAI ? 'AI' : 'You'}</span>
      </Avatar>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isAI ? 'Assistant' : 'You'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(timestamp, 'p')}
          </span>
          {language && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium">
              {language}
            </span>
          )}
          {confidence && (
            <span
              className={cn(
                'text-xs font-medium',
                getConfidenceColor(confidence)
              )}
            >
              {(confidence * 100).toFixed(0)}% confidence
            </span>
          )}
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          {isLoading ? (
            <div className="flex gap-1">
              <span className="animate-bounce">•</span>
              <span className="animate-bounce delay-100">•</span>
              <span className="animate-bounce delay-200">•</span>
            </div>
          ) : (
            message
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 