"use client";

import { CLEAR_CHAT_TEXT } from "@/config";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Trash2, ChevronsLeft, ChevronsRight, Plus } from "lucide-react";

export type ConversationSummary = {
  id: string;
  title: string;
};

type ChatSidebarProps = {
  conversations: ConversationSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  collapsed = false,
  onToggleCollapse,
}: ChatSidebarProps) {
  return (
    <aside
      className={cn(
        "h-screen border-r bg-sidebar flex flex-col transition-width duration-150 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* FIXED HEADER WITH NEW CHAT BUTTON */}
      <div className="p-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-semibold", collapsed && "sr-only")}>
            Chats
          </span>

          {/* new chat button - show smaller icon when collapsed */}
          <Button size="sm" onClick={onNewChat} title={CLEAR_CHAT_TEXT}>
            <div className="flex items-center gap-2">
              <Plus className="w-3 h-3" />
              {!collapsed && <span>{CLEAR_CHAT_TEXT}</span>}
            </div>
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {/* collapse/expand toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleCollapse && onToggleCollapse()}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="w-4 h-4" />
            ) : (
              <ChevronsLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
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
              title={conv.title || "Untitled chat"}
            >
              <span className={cn("truncate", collapsed && "sr-only")}>
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
                title="Delete conversation"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </button>
          ))}

          {conversations.length === 0 && (
            <p className={cn("text-xs text-muted-foreground px-2 py-1", collapsed && "sr-only")}>
              No previous chats yet.
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
