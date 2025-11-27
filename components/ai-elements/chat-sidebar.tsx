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
        "h-screen border-r bg-sidebar flex flex-col transition-all duration-150 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* HEADER */}
      <div className="p-2 border-b flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2 w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Chats</span>

              <Button size="sm" onClick={onNewChat} title={CLEAR_CHAT_TEXT}>
                <div className="flex items-center gap-2">
                  <Plus className="w-3 h-3" />
                  <span>{CLEAR_CHAT_TEXT}</span>
                </div>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleCollapse && onToggleCollapse()}
              title="Collapse sidebar"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          // COLLAPSED HEADER: ONLY EXPAND BUTTON
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleCollapse && onToggleCollapse()}
            title="Expand sidebar"
            className="ml-1"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* SCROLLABLE PREVIOUS CHATS */}
      {!collapsed && (
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
                <span className="truncate">
                  {conv.title || "Untitled chat"}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  title="Delete chat"
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
      )}
    </aside>
  );
}
