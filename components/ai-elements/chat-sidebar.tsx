"use client";

import { CLEAR_CHAT_TEXT } from "@/config";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export type ConversationSummary = {
  id: string;
  title: string;
};

type ChatSidebarProps = {
  conversations: ConversationSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;   // 🔹 NEW
};

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,                        // 🔹 NEW
}: ChatSidebarProps) {
  return (
    <aside className="h-screen w-64 border-r bg-sidebar flex flex-col">
      {/* FIXED HEADER WITH NEW CHAT BUTTON */}
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-sm font-semibold">Chats</span>
        <Button size="sm" onClick={onNewChat}>
          {CLEAR_CHAT_TEXT}
        </Button>
      </div>

      {/* SCROLLABLE PREVIOUS CHATS */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full text-left text-sm px-2 py-1 rounded-md hover:bg-accent truncate flex items-center justify-between",
                conv.id === activeId && "bg-accent"
              )}
            >
              <span className="truncate">
                {conv.title || "Untitled chat"}
              </span>

              {/* delete icon – stop click from selecting the conversation */}
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </button>
          ))}

          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">
              No previous chats yet.
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
