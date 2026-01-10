import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { ChatConversation } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  conversation: ChatConversation | null;
  connectionStatus: "connected" | "connecting" | "disconnected";
  onRefresh: () => void;
}

export function ChatHeader({ conversation, connectionStatus, onRefresh }: ChatHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 p-3 sm:p-4 border-b bg-background">
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
          {conversation?.participant_name || "Loading..."}
        </h2>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              connectionStatus === "connected" && "bg-green-500",
              connectionStatus === "connecting" && "bg-yellow-500",
              connectionStatus === "disconnected" && "bg-red-500"
            )}
          />
          <span className="text-xs text-muted-foreground">
            {connectionStatus === "connected" && "Online"}
            {connectionStatus === "connecting" && "Connecting..."}
            {connectionStatus === "disconnected" && "Reconnecting..."}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        className="shrink-0"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}
