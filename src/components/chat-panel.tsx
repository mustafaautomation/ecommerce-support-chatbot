"use client";

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  FileText,
  Headphones,
  Mic,
  MoreHorizontal,
  Package,
  Paperclip,
  RefreshCw,
  Ruler,
  RotateCcw,
  Square,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { CitationRow } from "@/components/citation-row";
import { Markdown } from "@/components/markdown";
import { RichCards } from "@/components/rich-cards";
import { BRAND, STARTER_TILES } from "@/lib/brand";
import type { Card, Citation, ToolTrace } from "@/lib/types";

type Bubble = {
  id: string;
  role: "user" | "assistant" | "human";
  content: string;
  cards: Card[];
  citations: Citation[];
  tools: ToolTrace[];
  createdAt: string;
  stopped?: boolean;
  files?: string[];
};

type Attachment = { id: string; file: File; url: string };

const greeting: Bubble = {
  id: "greeting",
  role: "assistant",
  content: BRAND.greeting,
  cards: [],
  citations: [],
  tools: [],
  createdAt: "2026-11-25T12:00:00.000Z",
};

const ICONS = {
  package: Package,
  rotate: RotateCcw,
  ruler: Ruler,
  headphones: Headphones,
} as const;

function phaseCopy(tools: ToolTrace[], message: string) {
  const name = tools[0]?.name;
  const order = message.match(/DW-\d+/i)?.[0]?.toUpperCase();
  if (name === "lookup_order" || name === "track_shipment") return order ? `Retrieving order ${order}…` : "Retrieving the order…";
  if (name === "search_knowledge") return "Searching shop notes…";
  if (name === "start_return" || name === "start_exchange") return "Starting the return…";
  if (name === "product_search") return "Looking through the rail…";
  if (name === "size_recommendation") return "Checking the size notes…";
  if (name === "handoff_to_agent") return "Connecting you to the desk…";
  if (name === "apply_goodwill_coupon") return "Checking courtesy codes…";
  if (name === "cancel_order") return "Checking whether this order can be cancelled…";
  if (name === "check_refund_status") return "Checking the refund…";
  if (/order/i.test(message)) return order ? `Retrieving order ${order}…` : "Checking the shop ledger…";
  if (/return|policy|ship|size|care/i.test(message)) return "Searching shop notes…";
  return "Checking the shop ledger…";
}

function clock(iso: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" }).format(new Date(iso));
}

export function ChatPanel({
  pendingPrompt,
  onPromptConsumed,
  fill = false,
  showClose = false,
  onClose,
  frame = false,
}: {
  pendingPrompt?: string | null;
  onPromptConsumed?: () => void;
  fill?: boolean;
  showClose?: boolean;
  onClose?: () => void;
  frame?: boolean;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [messages, setMessages] = useState<Bubble[]>([greeting]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [handoff, setHandoff] = useState<"connecting" | "joined" | null>(null);
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [menuOpen, setMenuOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [live, setLive] = useState("");
  const [stuck, setStuck] = useState(false);
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [thumb, setThumb] = useState<"up" | "down" | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const followRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const revealRef = useRef<number | null>(null);
  const launched = useRef<string | null>(null);
  const lastSent = useRef<string | null>(null);
  const fileCount = useRef(0);
  const idRef = useRef(0);

  const empty = messages.length === 1 && messages[0]?.id === "greeting";
  const latestAssistant = [...messages].reverse().find((message) => message.role !== "user");

  function scrollToEnd(force = false) {
    const node = logRef.current;
    if (!node) return;
    if (!force && !followRef.current) return;
    node.scrollTo({ top: node.scrollHeight });
  }

  function resetChat() {
    abortRef.current?.abort();
    if (revealRef.current) window.clearInterval(revealRef.current);
    setMessages([greeting]);
    setConversationId(null);
    setSuggestions([]);
    setHandoff(null);
    setError(null);
    setPhase(null);
    setBusy(false);
    setDraft("");
    setFiles([]);
    fileCount.current = 0;
  }

  function addFiles(list: FileList | File[]) {
    const next: Attachment[] = [];
    for (const file of Array.from(list)) {
      if (fileCount.current >= 10) {
        setToast("This conversation already has 10 files.");
        break;
      }
      if (files.length + next.length >= 3) {
        setToast("Attach up to 3 files on a message.");
        break;
      }
      const ok = ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type);
      if (!ok) {
        setToast("Use a JPG, PNG, WebP, or PDF.");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setToast("Each file must be 5 MB or smaller.");
        continue;
      }
      fileCount.current += 1;
      idRef.current += 1;
      next.push({ id: `${file.name}-${file.size}-${idRef.current}`, file, url: URL.createObjectURL(file) });
    }
    if (next.length) setFiles((current) => [...current, ...next]);
    window.setTimeout(() => setToast(null), 4000);
  }

  async function send(text: string) {
    const attachmentNames = files.map((item) => item.file.name);
    const message = [text.trim(), attachmentNames.length ? `Attached: ${attachmentNames.join(", ")}` : ""].filter(Boolean).join("\n");
    if ((!message && attachmentNames.length === 0) || busy) return;
    lastSent.current = text;
    const sentFiles = attachmentNames;
    setDraft("");
    setFiles([]);
    setError(null);
    setBusy(true);
    setPhase(phaseCopy([], message));
    setLive("Assistant is replying");
    setSuggestions([]);
    setThumb(null);
    followRef.current = true;
    idRef.current += 1;
    const userBubble: Bubble = {
      id: `local-${idRef.current}`,
      role: "user",
      content: text.trim() || `Attached ${sentFiles.join(", ")}`,
      cards: [],
      citations: [],
      tools: [],
      createdAt: new Date().toISOString(),
      files: sentFiles,
    };
    idRef.current += 1;
    const pendingId = `pending-${idRef.current}`;
    setMessages((current) => [
      ...current,
      userBubble,
      { id: pendingId, role: "assistant", content: "", cards: [], citations: [], tools: [], createdAt: new Date().toISOString() },
    ]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => ({ error: "The desk didn’t answer." }));
        throw new Error(detail.error ?? "The desk didn’t answer.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";
      const cards: Card[] = [];
      const citations: Citation[] = [];
      const tools: ToolTrace[] = [];
      let handoffFlag = false;
      let nextSuggestions: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.split("\n").find((entry) => entry.startsWith("data: "));
          if (!line) continue;
          const event = JSON.parse(line.slice(6)) as {
            type: string;
            text?: string;
            conversationId?: string;
            tools?: ToolTrace[];
            card?: Card;
            citation?: Citation;
            suggestions?: string[];
            handoff?: boolean;
            mode?: "demo" | "live";
          };
          if (event.type === "meta" && event.conversationId) {
            setConversationId(event.conversationId);
            if (event.tools) {
              tools.push(...event.tools);
              setPhase(phaseCopy(tools, message));
            }
          }
          if (event.type === "card" && event.card) cards.push(event.card);
          if (event.type === "citation" && event.citation) citations.push(event.citation);
          if (event.type === "token" && event.text) assembled += event.text;
          if (event.type === "suggestions" && event.suggestions) nextSuggestions = event.suggestions.slice(0, 3);
          if (event.type === "done") {
            handoffFlag = Boolean(event.handoff);
            if (event.mode === "live" || event.mode === "demo") setMode(event.mode);
          }
        }
      }
      await reveal(pendingId, assembled, cards, citations, tools, controller.signal);
      if (handoffFlag) {
        setHandoff("connecting");
        window.setTimeout(() => setHandoff("joined"), 800);
        const urgentTurn = /damage|chargeback|stolen|fraud|missing parcel/i.test(message);
        setUrgent(urgentTurn);
        window.dispatchEvent(
          new CustomEvent("driftwood-desk-alert", {
            detail: { urgent: urgentTurn, message: message.slice(0, 140) },
          }),
        );
      }
      setSuggestions(nextSuggestions.length > 0 ? nextSuggestions : ["Track an order", "Start a return", "Talk to a person"]);
      setLive("Assistant replied");
    } catch (caught) {
      if (controller.signal.aborted) {
        setMessages((current) => current.map((bubble) => (bubble.id === pendingId ? { ...bubble, stopped: true, content: bubble.content || "Stopped" } : bubble)));
      } else {
        setMessages((current) => current.filter((bubble) => bubble.id !== pendingId));
        setDraft(text);
        setError(caught instanceof Error ? caught.message : "The desk didn’t answer.");
      }
    } finally {
      setBusy(false);
      setPhase(null);
      abortRef.current = null;
      onPromptConsumed?.();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function reveal(id: string, text: string, cards: Card[], citations: Citation[], tools: ToolTrace[], signal: AbortSignal) {
    const words = text.split(/(\s+)/).filter((part) => part.length > 0);
    const groups: string[] = [];
    for (let index = 0; index < words.length; index += 6) groups.push(words.slice(index, index + 6).join(""));
    return new Promise<void>((resolve) => {
      let cursor = 0;
      const started = performance.now();
      const tick = () => {
        if (signal.aborted) {
          resolve();
          return;
        }
        const elapsed = performance.now() - started;
        const step = elapsed < 280 ? 0 : elapsed > 900 ? 3 : 1;
        cursor = Math.min(groups.length, cursor + step);
        const content = groups.slice(0, cursor).join("");
        const done = cursor >= groups.length;
        setMessages((current) =>
          current.map((bubble) =>
            bubble.id === id
              ? { ...bubble, content, cards: done ? cards : [], citations: done ? citations : [], tools: done ? tools : tools.slice(0, 1), createdAt: new Date().toISOString() }
              : bubble,
          ),
        );
        scrollToEnd();
        if (done) {
          if (revealRef.current) window.clearInterval(revealRef.current);
          revealRef.current = null;
          resolve();
          return;
        }
      };
      tick();
      revealRef.current = window.setInterval(tick, 24);
    });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function startDictation() {
    const Host = window as Window & {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = Host.SpeechRecognition || Host.webkitSpeechRecognition;
    if (!Ctor) {
      setToast("Voice input isn't available in this browser. Type instead.");
      window.setTimeout(() => setToast(null), 4000);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.onstart = () => setListening(true);
    recognition.onerror = () => {
      setListening(false);
      setToast("Voice input isn't available in this browser. Type instead.");
      window.setTimeout(() => setToast(null), 4000);
    };
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript ?? "";
      setDraft((current) => (current ? `${current} ${said}` : said));
    };
    try {
      recognition.start();
    } catch {
      setListening(false);
      setToast("Voice input isn't available in this browser. Type instead.");
    }
  }

  useEffect(() => {
    rootRef.current?.setAttribute("data-hydrated", "true");
    const desktop = window.matchMedia("(min-width: 640px)").matches;
    if (desktop) inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!pendingPrompt) {
      launched.current = null;
      return;
    }
    if (launched.current === pendingPrompt) return;
    launched.current = pendingPrompt;
    onPromptConsumed?.();
    void send(pendingPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; text?: string; theme?: string };
      if (data?.type === "driftwood-prompt" && data.text) void send(data.text);
      if (data?.type === "driftwood-theme" && (data.theme === "light" || data.theme === "dark" || data.theme === "system")) {
        setTheme(data.theme);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, busy]);

  const human = handoff === "joined";

  return (
    <section
      ref={rootRef}
      data-testid={frame ? "landing-hero-chat" : "chat-widget"}
      className={
        fill
          ? "chat-widget-shell relative flex h-full min-h-0 flex-col rounded-none border-0 shadow-none"
          : "chat-widget-shell relative flex h-[min(680px,calc(100dvh-8rem))] min-h-[520px] flex-col"
      }
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
      }}
    >
      <div className="h-0.5 bg-accent" />
      <header data-testid="chat-header" className="flex h-16 items-center justify-between gap-2 border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative grid size-7 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
            {human ? "ME" : "R"}
            <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-success ring-2 ring-surface" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold leading-5 tracking-tight">
              {human ? BRAND.human : `${BRAND.bot} · Driftwood Outfitters`}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {human ? BRAND.humanRole : handoff === "connecting" ? "Connecting you to a team member…" : "Online 24/7"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span data-testid="mode-pill" className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {mode === "live" ? "Live AI" : "Demo mode"}
          </span>
          <div className="relative">
            <IconButton label="Menu" pressed={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              <MoreHorizontal className="size-4" />
            </IconButton>
            {menuOpen ? (
              <div role="menu" className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-border bg-surface p-1 text-sm shadow-[var(--shadow-card)]">
                <button type="button" role="menuitem" className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-accent-soft" onClick={() => { resetChat(); setMenuOpen(false); }}>
                  New chat
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-testid="theme-toggle"
                  className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-accent-soft"
                  onClick={() => {
                    const next = resolvedTheme === "dark" ? "light" : "dark";
                    setTheme(next);
                    if (window.parent !== window) window.parent.postMessage({ type: "driftwood-theme", theme: next }, window.location.origin);
                    setMenuOpen(false);
                  }}
                >
                  {resolvedTheme === "dark" ? "Light" : "Dark"}
                </button>
                <button type="button" role="menuitem" className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-accent-soft" onClick={() => { setMenuOpen(false); void send("Talk to a person"); }}>
                  Talk to a human
                </button>
              </div>
            ) : null}
          </div>
          {showClose ? (
            <IconButton label="Close chat" onClick={() => onClose?.()}>
              <X className="size-4" />
            </IconButton>
          ) : null}
        </div>
      </header>
      {urgent ? (
        <p data-testid="urgent-banner" role="alert" className="border-b border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          Urgent. The desk is alerted. This demo does not text a real on-call number.
        </p>
      ) : null}
      {handoff ? (
        <p data-testid="handoff-banner" className="border-b border-info/30 bg-info/10 px-3 py-2 text-xs text-foreground">
          {handoff === "joined" ? `${BRAND.human} joined` : "Connecting you to a team member…"}
        </p>
      ) : null}
      <div className="sr-only" role="status" aria-live="polite">
        {live}
      </div>
      <div
        ref={logRef}
        data-testid="chat-messages"
        role="log"
        aria-live="off"
        aria-relevant="additions"
        className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4 [scrollbar-width:thin]"
        onWheel={() => {
          followRef.current = false;
        }}
        onScroll={(event) => {
          const node = event.currentTarget;
          const near = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
          if (near) followRef.current = true;
          setStuck(!near && !followRef.current);
        }}
      >
        {messages.map((message, index) => {
          const sameBefore = messages[index - 1]?.role === message.role;
          const time = clock(message.createdAt);
          const label = message.role === "user" ? `You, ${time}` : `${message.role === "human" ? BRAND.human : BRAND.bot}, ${time}`;
          const streaming = busy && message.id.startsWith("pending") && !message.stopped;
          return (
            <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start gap-2"} aria-label={label}>
              {message.role !== "user" && !sameBefore ? (
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                  {message.role === "human" ? "ME" : "R"}
                </span>
              ) : message.role !== "user" ? (
                <span className="w-6 shrink-0" />
              ) : null}
              <div
                data-testid={message.role === "user" ? "message-user" : "message-assistant"}
                data-streaming={streaming ? "true" : undefined}
                aria-busy={streaming ? true : undefined}
                className={
                  message.role === "user"
                    ? "max-w-[82%] rounded-[18px] rounded-br-[4px] bg-accent px-3 py-2 text-[14.5px] leading-[22px] text-accent-foreground"
                    : message.role === "human"
                      ? "max-w-[92%] rounded-[18px] rounded-bl-[4px] bg-surface-2 px-3 py-2 text-[14.5px] leading-[22px]"
                      : "max-w-[calc(100%-4px)] text-[14.5px] leading-[22px]"
                }
              >
                {message.role === "assistant" && message.content === "" && streaming ? null : message.role === "user" ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <Markdown text={message.content} />
                )}
                {streaming && message.content ? <span className="chat-caret" aria-hidden /> : null}
                {message.stopped ? <p className="mt-1 text-[11.5px] text-muted-foreground">Stopped</p> : null}
                {message.files?.map((name) => (
                  <p key={name} className="mt-1 text-[11.5px] opacity-80">
                    {name}
                  </p>
                ))}
                {message.role !== "user" ? <RichCards cards={message.cards} /> : null}
                {message.tools.length > 0 ? (
                  <ul className="mt-2 grid gap-1">
                    {message.tools.map((tool) => (
                      <li key={tool.name} data-testid="tool-trace" className="flex items-center justify-between rounded-xl border border-border px-2 py-1.5 text-[12px]">
                        <span>{tool.summary}</span>
                        <span className={tool.ok ? "text-success" : "text-danger"}>{tool.ok ? "Done" : "Failed"}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {message.role === "assistant" ? <CitationRow citations={message.citations} /> : null}
                <time dateTime={message.createdAt} className="mt-1 block text-[11.5px] text-muted-foreground opacity-0 group-hover:opacity-100 focus-within:opacity-100 hover:opacity-100">
                  {time}
                </time>
                {message.role === "assistant" && message.content && !streaming ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <IconButton
                      label={copied === message.id ? "Copied" : "Copy"}
                      onClick={() => {
                        void navigator.clipboard?.writeText(message.content);
                        setCopied(message.id);
                        window.setTimeout(() => setCopied(null), 2000);
                      }}
                    >
                      {copied === message.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </IconButton>
                    <IconButton label="Regenerate" onClick={() => lastSent.current && void send(lastSent.current)}>
                      <RefreshCw className="size-3.5" />
                    </IconButton>
                    <IconButton label="Thumbs up" pressed={thumb === "up" && message.id === latestAssistant?.id} onClick={() => setThumb(thumb === "up" ? null : "up")}>
                      <ThumbsUp className="size-3.5" />
                    </IconButton>
                    <IconButton label="Thumbs down" pressed={thumb === "down" && message.id === latestAssistant?.id} onClick={() => setThumb(thumb === "down" ? null : "down")}>
                      <ThumbsDown className="size-3.5" />
                    </IconButton>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        {phase ? (
          <p data-testid="phase-indicator" className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="phase-dots inline-flex gap-1" aria-hidden>
              <span className="size-1.5 rounded-full bg-current" />
              <span className="size-1.5 rounded-full bg-current" />
              <span className="size-1.5 rounded-full bg-current" />
            </span>
            {phase}
          </p>
        ) : null}
      </div>
      {stuck ? (
        <button
          type="button"
          data-testid="jump-to-latest"
          className="absolute top-20 left-1/2 z-10 inline-flex h-9 -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-surface px-3 text-xs shadow-[var(--shadow-card)]"
          onClick={() => {
            followRef.current = true;
            setStuck(false);
            scrollToEnd(true);
          }}
        >
          <ArrowDown className="size-3.5" /> Jump to latest
        </button>
      ) : null}
      {empty ? (
        <div className="grid grid-cols-2 gap-2 px-4 pb-2">
          {STARTER_TILES.map((tile) => {
            const Icon = ICONS[tile.icon];
            return (
              <button
                key={tile.label}
                type="button"
                data-testid="quick-reply"
                className="flex min-h-11 items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 text-left text-[13px] font-medium hover:bg-accent-soft"
                onClick={() => void send(tile.label === "What size rain shell should I get?" ? "What size rain shell should I get? I'm 5'10\" and usually a medium." : tile.label)}
              >
                <Icon className="size-4 shrink-0 text-accent" aria-hidden />
                <span>{tile.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {suggestions.length > 0 && !empty ? (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              data-testid="quick-reply"
              onClick={() => void send(suggestion)}
              className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-3 text-[13px] font-medium hover:bg-accent-soft disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="mx-4 mb-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          <p>{error}</p>
          <button type="button" className="mt-1 underline" onClick={() => lastSent.current && void send(lastSent.current)}>
            Retry send
          </button>
        </div>
      ) : null}
      {toast ? (
        <p role="status" className="mx-4 mb-2 rounded-xl bg-foreground px-3 py-2 text-xs text-background">
          {toast}
        </p>
      ) : null}
      <div className="border-t border-border px-3 pb-2 pt-2">
        <button type="button" data-testid="lead-link" className="mb-1 text-left text-[12px] text-accent underline" onClick={() => setLeadOpen((open) => !open)}>
          Leave contact details for the team
        </button>
        {leadOpen ? (
          <LeadCard
            onDone={(summary) => {
              setLeadOpen(false);
              idRef.current += 1;
              setMessages((current) => [
                ...current,
                {
                  id: `lead-${idRef.current}`,
                  role: "assistant",
                  content: summary,
                  cards: [],
                  citations: [],
                  tools: [],
                  createdAt: new Date().toISOString(),
                },
              ]);
            }}
          />
        ) : null}
      <form data-testid="composer" onSubmit={onSubmit}>
        {files.length > 0 ? (
          <div className="mb-2 flex gap-2">
            {files.map((item) => (
              <span key={item.id} className="relative inline-flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 text-[11px]">
                {item.file.type === "application/pdf" ? (
                  <FileText className="size-8" aria-hidden />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" className="size-12 rounded-lg object-cover" />
                )}
                <button type="button" aria-label={`Remove ${item.file.name}`} onClick={() => setFiles((current) => current.filter((file) => file.id !== item.id))}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-1 rounded-2xl border border-border bg-surface-2 p-1.5 pl-2">
          <button type="button" data-testid="composer-attach" aria-label="Attach a file" className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted" onClick={() => fileRef.current?.click()}>
            <Paperclip className="size-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <textarea
            ref={inputRef}
            data-testid="composer-input"
            value={draft}
            rows={1}
            onChange={(event) => {
              setDraft(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${Math.min(event.target.scrollHeight, 132)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void send(draft);
              }
            }}
            aria-label={human ? `Message ${BRAND.human}` : "Message Rowan"}
            placeholder={listening ? "Listening…" : human ? BRAND.humanPlaceholder : BRAND.placeholder}
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-[14.5px] leading-5 outline-none"
          />
          <button
            type="button"
            data-testid="composer-mic"
            aria-label={listening ? "Listening" : "Start voice input"}
            className={`grid size-8 place-items-center rounded-full ${listening ? "text-accent ring-2 ring-accent" : "text-muted-foreground hover:bg-muted"}`}
            onClick={startDictation}
          >
            <Mic className="size-5" />
          </button>
          {busy ? (
            <button
              type="button"
              data-testid="composer-stop"
              aria-label="Stop generating"
              className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground"
              onClick={() => abortRef.current?.abort()}
            >
              <Square className="size-2.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              data-testid="composer-send"
              aria-label="Send"
              disabled={!draft.trim() && files.length === 0}
              className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
            >
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11.5px] leading-4 text-muted-foreground">
          AI assistant · Portfolio demo · <a className="underline" href="/policies">Privacy</a>
          <br />
          {BRAND.disclaimer}
        </p>
      </form>
      </div>
      {dragOver ? (
        <div className="absolute inset-0 grid place-items-center rounded-[inherit] border-2 border-dashed border-accent bg-surface/80 text-sm">
          Drop to attach
        </div>
      ) : null}
    </section>
  );
}

type SpeechRec = {
  lang: string;
  start: () => void;
  onstart: (() => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null;
};

function LeadCard({ onDone }: { onDone: (summary: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      data-testid="lead-card"
      className="mt-2 grid gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || !email.includes("@") || phone.replace(/\D/g, "").length < 7 || !consent) {
          setError("Add a name, email, phone, and consent.");
          return;
        }
        onDone(`We'll use this callback number: ${phone}. Email: ${email}.`);
      }}
    >
      <p className="text-sm font-semibold">Leave contact details for the team</p>
      <label className="text-xs font-medium">Name<input className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-2 px-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="Maya Chen" /></label>
      <label className="text-xs font-medium">Phone<input className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-2 px-2" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="555-010-0140" /></label>
      <label className="text-xs font-medium">Email<input className="mt-1 h-10 w-full rounded-xl border border-border bg-surface-2 px-2" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="maya.chen@example.com" /></label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> The desk may reply about this demo request.</label>
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
      <button type="submit" className="h-9 rounded-full bg-accent text-sm text-accent-foreground">Save details</button>
    </form>
  );
}

function IconButton({
  label,
  onClick,
  children,
  testId,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
