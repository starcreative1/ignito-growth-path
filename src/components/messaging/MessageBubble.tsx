import { Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Message } from "@/hooks/useMessages";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const formattedTime = format(new Date(message.created_at), "HH:mm");

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        {!isOwn && (
          <p className="text-xs font-medium mb-1 opacity-70">
            {message.sender_name}
          </p>
        )}
        
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {message.file_url && (
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "text-xs underline mt-1 block",
              isOwn ? "text-primary-foreground/80" : "text-foreground/80"
            )}
          >
            📎 {message.file_name || "Attachment"}
          </a>
        )}

        <div className={cn(
          "flex items-center gap-1 mt-1",
          isOwn ? "justify-end" : "justify-start"
        )}>
          <span className="text-[10px] opacity-60">
            {formattedTime}
          </span>
          
          {isOwn && (
            <span className="opacity-60">
              {message.is_read ? (
                <CheckCheck className="h-3 w-3" />
              ) : message.delivered_at ? (
                <CheckCheck className="h-3 w-3 opacity-50" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
