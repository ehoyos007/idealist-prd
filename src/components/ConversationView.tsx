import { useEffect, useRef, useState } from 'react';
import { ConversationMessage } from '@/types/idea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FileIcon, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConversationViewProps {
  messages: ConversationMessage[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ContextMessage({ message }: { message: ConversationMessage }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const context = message.retrievedContext;

  if (!context) return null;

  return (
    <div className="mx-4 sm:mx-8 p-3 border border-dashed border-primary/50 bg-primary/5 rounded-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary/70" />
          <span className="font-mono text-xs text-primary/70">
            RAG Context: {context.chunks.length} section{context.chunks.length > 1 ? 's' : ''} retrieved
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-primary/70" />
        ) : (
          <ChevronDown className="h-4 w-4 text-primary/70" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Keywords used */}
          {context.queryKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground mr-1">Keywords:</span>
              {context.queryKeywords.map((keyword, i) => (
                <Badge key={i} variant="outline" className="text-xs font-mono py-0 px-1.5">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}

          {/* Retrieved chunks */}
          <div className="space-y-2">
            {context.chunks.map((chunk, i) => (
              <div key={chunk.id} className="p-2 bg-background border border-border rounded-sm">
                <div className="flex items-center gap-2 mb-1">
                  <FileIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    {chunk.fileName} · Section {chunk.chunkIndex + 1}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 line-clamp-3 leading-relaxed">
                  {chunk.text.substring(0, 200)}
                  {chunk.text.length > 200 && '...'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ConversationView({ messages }: ConversationViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono text-sm">
        Start speaking to begin the conversation...
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="flex-1 pr-4">
      <div className="space-y-4 pb-4">
        {messages.map((message, index) => {
          // Render context messages differently
          if (message.role === 'context') {
            return <ContextMessage key={index} message={message} />;
          }

          return (
            <div
              key={index}
              className={cn(
                "p-3 sm:p-4 border-2 border-primary break-words",
                message.role === 'user' 
                  ? "bg-secondary ml-4 sm:ml-8" 
                  : "bg-background mr-4 sm:mr-8"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {message.role === 'user' ? 'You' : 'Idealist'}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-foreground leading-relaxed break-words">{message.content}</p>
              
              {message.attachedFile && (
                <div className="flex items-center gap-2 mt-3 p-2 bg-muted/50 border border-border rounded max-w-full overflow-hidden">
                  <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-mono truncate">{message.attachedFile.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ({formatFileSize(message.attachedFile.size)})
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
