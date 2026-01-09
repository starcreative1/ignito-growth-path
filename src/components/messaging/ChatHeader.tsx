import { ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { Conversation } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  conversation: Conversation | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

export function ChatHeader({ conversation, connectionStatus }: ChatHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 p-4 border-b bg-background">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="shrink-0"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <h2 className="font-semibold truncate">
          {conversation?.mentor_name || "Loading..."}
        </h2>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              connectionStatus === 'connected' && "bg-green-500",
              connectionStatus === 'connecting' && "bg-yellow-500",
              connectionStatus === 'disconnected' && "bg-red-500"
            )}
          />
          <span className="text-xs text-muted-foreground">
            {connectionStatus === 'connected' && "Connected"}
            {connectionStatus === 'connecting' && "Connecting..."}
            {connectionStatus === 'disconnected' && "Reconnecting..."}
          </span>
        </div>
      </div>
    </div>
  );
}
