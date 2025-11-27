"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";
import { ChatSidebar, ConversationSummary } from "@/components/ai-elements/chat-sidebar";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

/**
 * ORIGINAL single-chat storage (kept for compatibility)
 */
const STORAGE_KEY = "chat-messages";

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): {
  messages: UIMessage[];
  durations: Record<string, number>;
} => {
  if (typeof window === "undefined")
    return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };

    const parsed = JSON.parse(stored) as StorageData;
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch (error) {
    console.error("Failed to load messages from localStorage:", error);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (
  messages: UIMessage[],
  durations: Record<string, number>
) => {
  if (typeof window === "undefined") return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save messages to localStorage:", error);
  }
};

/**
 * Helper: safely derive a title from first user message
 * Handles both `parts`-based messages and simple `content` strings.
 */
const getTitleFromMessages = (
  msgs: UIMessage[],
  fallback: string
): string => {
  const firstUser = msgs.find((m) => m.role === "user");
  if (!firstUser) return fallback;

  const anyMsg = firstUser as any;

  // Newer AI SDK: message.parts array
  if (Array.isArray(anyMsg.parts)) {
    const textPart = anyMsg.parts.find(
      (p: any) => p && p.type === "text" && typeof p.text === "string"
    );
    if (textPart) {
      return (textPart as any).text.slice(0, 40);
    }
  }

  // Older style: content: string
  if (typeof anyMsg.content === "string") {
    return anyMsg.content.slice(0, 40);
  }

  return fallback;
};

/**
 * NEW: multi-conversation storage
 */
type Conversation = {
  id: string;
  title: string;
  messages: UIMessage[];
  durations: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

const CONVERSATIONS_KEY = "chat-conversations-v1";

const loadConversationsFromStorage = (): {
  conversations: Conversation[];
  activeId?: string;
} => {
  if (typeof window === "undefined")
    return { conversations: [], activeId: undefined };

  try {
    const stored = localStorage.getItem(CONVERSATIONS_KEY);
    if (!stored) return { conversations: [], activeId: undefined };

    const parsed = JSON.parse(stored) as {
      conversations?: Conversation[];
      activeId?: string;
    };

    return {
      conversations: parsed.conversations || [],
      activeId: parsed.activeId,
    };
  } catch (error) {
    console.error("Failed to load conversations:", error);
    return { conversations: [], activeId: undefined };
  }
};

const saveConversationsToStorage = (
  conversations: Conversation[],
  activeId?: string
) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      CONVERSATIONS_KEY,
      JSON.stringify({ conversations, activeId })
    );
  } catch (error) {
    console.error("Failed to save conversations to localStorage:", error);
  }
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // NEW: list of conversations + active one
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >(undefined);

  // ORIGINAL single-chat bootstrap (still used as initial data)
  const stored = typeof window !== "undefined"
    ? loadMessagesFromStorage()
    : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  /**
   * On mount: load conversations list.
   * If none exist, bootstrap a first conversation from the old single-chat storage.
   */
  useEffect(() => {
    setIsClient(true);

    if (typeof window === "undefined") return;

    const { conversations: storedConvs, activeId } =
      loadConversationsFromStorage();

    if (storedConvs.length > 0) {
      setConversations(storedConvs);
      const chosenId = activeId || storedConvs[0].id;
      setActiveConversationId(chosenId);

      const activeConv = storedConvs.find((c) => c.id === chosenId);
      if (activeConv) {
        setMessages(activeConv.messages);
        setDurations(activeConv.durations);
        return;
      }
    }

    // No multi-conversation data -> bootstrap from original single-chat storage
    const legacy = loadMessagesFromStorage();
    if (legacy.messages.length > 0) {
      const now = new Date().toISOString();
      const id =
        (typeof crypto !== "undefined" &&
          "randomUUID" in crypto &&
          crypto.randomUUID()) ||
        `conv-${Date.now()}`;

      const titleFromFirstUser = getTitleFromMessages(
        legacy.messages,
        "First chat"
      );

      const conv: Conversation = {
        id,
        title: titleFromFirstUser,
        messages: legacy.messages,
        durations: legacy.durations,
        createdAt: now,
        updatedAt: now,
      };

      setConversations([conv]);
      setActiveConversationId(id);
      saveConversationsToStorage([conv], id);
      setMessages(legacy.messages);
      setDurations(legacy.durations);
    }
  }, [setMessages]);

  /**
   * Whenever messages/durations or active conversation change,
   * update the conversations list + new storage.
   * Also keep old single-chat storage updated for compatibility.
   */
  useEffect(() => {
    if (!isClient || !activeConversationId) return;

    setConversations((prev) => {
      const now = new Date().toISOString();
      const idx = prev.findIndex((c) => c.id === activeConversationId);

      const titleFromFirstUser = getTitleFromMessages(
        messages,
        idx >= 0 ? prev[idx].title : "New chat"
      );

      const updated: Conversation = {
        id: activeConversationId,
        title: titleFromFirstUser,
        messages,
        durations,
        createdAt: idx >= 0 ? prev[idx].createdAt : now,
        updatedAt: now,
      };

      const next =
        idx >= 0
          ? [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)]
          : [updated, ...prev];

      saveConversationsToStorage(next, activeConversationId);
      return next;
    });

    // keep original single-thread storage in sync as well
    saveMessagesToStorage(messages, durations);
  }, [messages, durations, activeConversationId, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prevDurations) => {
      const newDurations = { ...prevDurations };
      newDurations[key] = duration;
      return newDurations;
    });
  };

  /**
   * Welcome message for any conversation that currently has no messages
   */
  useEffect(() => {
    if (!isClient) return;

    // if there is already at least one message, do nothing
    if (messages.length > 0) return;

    const welcomeMessage: UIMessage = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      parts: [
        {
          type: "text",
          text: WELCOME_MESSAGE,
        },
      ],
    };

    setMessages([welcomeMessage]);
    setDurations({});
  }, [isClient, messages.length, setMessages]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    sendMessage({ text: data.message });
    form.reset();
  }

  /**
   * NEW: create a fresh conversation and switch to it
   */
  function handleNewChat() {
    const id =
      (typeof crypto !== "undefined" &&
        "randomUUID" in crypto &&
        crypto.randomUUID()) ||
      `conv-${Date.now()}`;
    const now = new Date().toISOString();

    const newConv: Conversation = {
      id,
      title: "New chat",
      messages: [],
      durations: {},
      createdAt: now,
      updatedAt: now,
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(id);
    setMessages([]);
    setDurations({});

    // also clear legacy single-chat storage
    saveMessagesToStorage([], {});
  }

  /**
   * NEW: select an existing conversation from sidebar
   */
  function handleSelectConversation(id: string) {
    setActiveConversationId(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setMessages(conv.messages);
      setDurations(conv.durations);
    } else {
      setMessages([]);
      setDurations({});
    }
  }

    /**
   * Delete a conversation from the sidebar
   */
  function handleDeleteConversation(id: string) {
    const remaining = conversations.filter((c) => c.id !== id);

    let newActiveId = activeConversationId;
    if (activeConversationId === id) {
      newActiveId = remaining.length > 0 ? remaining[0].id : undefined;
    }

    setConversations(remaining);
    setActiveConversationId(newActiveId);

    if (newActiveId) {
      const nextConv = remaining.find((c) => c.id === newActiveId);
      if (nextConv) {
        setMessages(nextConv.messages);
        setDurations(nextConv.durations);
      } else {
        setMessages([]);
        setDurations({});
      }
    } else {
      // no conversations left
      setMessages([]);
      setDurations({});
      saveMessagesToStorage([], {});
    }

    // update multi-conversation storage
    saveConversationsToStorage(remaining, newActiveId);
  }

  /**
   * ORIGINAL clearChat function name is kept,
   * but now it behaves like "New Chat" so other parts won't break.
   */
  function clearChat() {
    handleNewChat();
    toast.success("Chat cleared");
  }

  // data for sidebar: only id + title
  const sidebarConversations: ConversationSummary[] = conversations.map(
    (c) => ({
      id: c.id,
      title: c.title,
    })
  );

  // compute classes for left offset when sidebar is collapsed vs expanded
  const leftOffsetClass = sidebarCollapsed ? "left-16" : "left-64";
  const sidebarWidthClass = sidebarCollapsed ? "w-16" : "w-64";

  return (
    <div className="flex h-screen font-sans dark:bg-black">
      {/* LEFT: sidebar with fixed New + scrollable previous chats */}
      <div className={`${sidebarWidthClass} flex-shrink-0`}>
        <ChatSidebar
          conversations={sidebarConversations}
          activeId={activeConversationId}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
          onDelete={handleDeleteConversation}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((s) => !s)}
        />
      </div>

      {/* RIGHT: existing chat UI */}
      <main className="flex-1 w-full dark:bg-black h-screen relative">
        {/* background watermark */}
        <div className="absolute inset-0 bg-[url('/bits2boards__1_-removebg-preview.png')] bg-center bg-no-repeat bg-contain opacity-10 pointer-events-none" />

        {/* top header — adjust left using inline class substitution */}
        <div className={`fixed top-0 ${leftOffsetClass} right-0 z-50 bg-linear-to-b from-background via-background/50 to-transparent dark:bg-black overflow-visible pb-16`}>
          <div className="relative overflow-visible">
            <ChatHeader>
              <ChatHeaderBlock />
              <ChatHeaderBlock className="justify-center items-center">
                <Avatar className="size-8 ring-1 ring-primary">
                  <AvatarImage src="/bits2boards__1_-removebg-preview.png" />
                  <AvatarFallback>
                    <Image
                      src="/bits2boards__1_-removebg-preview.png.png"
                      alt="Logo"
                      width={36}
                      height={36}
                    />
                  </AvatarFallback>
                </Avatar>
                <p className="tracking-tight">{AI_NAME}</p>
              </ChatHeaderBlock>
              {/* empty right block to balance layout */}
              <ChatHeaderBlock className="justify-end" />
            </ChatHeader>
          </div>
        </div>

        <div className="h-screen overflow-y-auto px-5 py-4 w-full pt-[88px] pb-[150px]">
          <div className="flex flex-col items-center justify-end min-h-full">
            {isClient ? (
              <>
                <MessageWall
                  messages={messages}
                  status={status}
                  durations={durations}
                  onDurationChange={handleDurationChange}
                />
                {status === "submitted" && (
                  <div className="flex justify-start max-w-3xl w-full">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* bottom input bar — also shifts left based on sidebar state */}
        <div className={`fixed bottom-0 ${leftOffsetClass} right-0 z-50 bg-linear-to-t from-background via-background/50 to-transparent dark:bg-black overflow-visible pt-13`}>
          <div className="w-full px-5 pt-5 pb-1 items-center flex justify-center relative overflow-visible">
            <div className="message-fade-overlay" />
            <div className="max-w-3xl w-full">
              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel
                          htmlFor="chat-form-message"
                          className="sr-only"
                        >
                          Message
                        </FieldLabel>
                        <div className="relative h-13">
                          <Input
                            {...field}
                            id="chat-form-message"
                            className="h-15 pr-15 pl-5 bg-card rounded-[20px]"
                            placeholder="Type your message here..."
                            disabled={status === "streaming"}
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                              }
                            }}
                          />
                          {(status == "ready" || status == "error") && (
                            <Button
                              className="absolute right-3 top-3 rounded-full"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}
                          {(status == "streaming" || status == "submitted") && (
                            <Button
                              className="absolute right-2 top-2 rounded-full"
                              size="icon"
                              onClick={() => {
                                stop();
                              }}
                            >
                              <Square className="size-4" />
                            </Button>
                          )}
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </div>
          </div>
          <div className="w-full px-5 py-3 items-center flex justify-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {OWNER_NAME}
            &nbsp;
            <Link href="/terms" className="underline">
              Terms of Use
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
