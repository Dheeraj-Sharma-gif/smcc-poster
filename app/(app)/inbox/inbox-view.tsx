"use client";
import { useEffect, useState } from "react";
import { Inbox as InboxIcon, Sparkles, Copy, Check, Loader2, Heart, Send, AlertTriangle, ExternalLink, CornerDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORMS, PLATFORM_IDS, type PlatformId } from "@/lib/config";
import { formatCompact, cn } from "@/lib/utils";

interface Reply {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  mine: boolean;
}

interface Comment {
  id: string;
  platform: PlatformId;
  author: string;
  text: string;
  timestamp: string;
  postTitle?: string;
  postType?: string;
  postLink?: string;
  likeCount?: number;
  connected: boolean;
  replies: Reply[];
  repliedByMe: boolean;
}

// Platforms where posting a reply is possible with the free / available API.
const POSTABLE: PlatformId[] = ["instagram", "facebook", "youtube"];

type SendState = { status: "idle" | "confirm" | "sending" | "posted" | "simulated" | "error"; msg?: string };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function InboxView() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PlatformId | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "needs" | "replied">("all");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [drafting, setDrafting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [send, setSend] = useState<Record<string, SendState>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/inbox", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setComments((d.comments || []).map((c: Comment) => ({ ...c, replies: c.replies || [] }))))
      .finally(() => setLoading(false));
  }, []);

  // Does the thread still need a reply? (never answered, or viewer's follow-up is last)
  function needsReply(c: Comment): boolean {
    if (!c.replies.length) return true;
    return !c.replies[c.replies.length - 1].mine;
  }
  // The latest question from the viewer — what a new reply should answer.
  function latestQuestion(c: Comment): string {
    for (let i = c.replies.length - 1; i >= 0; i--) if (!c.replies[i].mine) return c.replies[i].text;
    return c.text;
  }

  async function draft(c: Comment) {
    setDrafting(c.id);
    try {
      const res = await fetch("/api/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: c.author, text: latestQuestion(c), platform: c.platform }),
      }).then((r) => r.json());
      setReplies((p) => ({ ...p, [c.id]: res.reply }));
      setSend((p) => ({ ...p, [c.id]: { status: "idle" } }));
    } finally {
      setDrafting(null);
    }
  }

  function copy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  async function post(c: Comment) {
    const text = replies[c.id];
    if (!text?.trim()) return;
    // two-step confirm
    if (send[c.id]?.status !== "confirm") {
      setSend((p) => ({ ...p, [c.id]: { status: "confirm" } }));
      return;
    }
    setSend((p) => ({ ...p, [c.id]: { status: "sending" } }));
    try {
      const res = await fetch("/api/inbox/reply/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: c.platform, commentId: c.id, text }),
      }).then((r) => r.json());
      if (res.error) setSend((p) => ({ ...p, [c.id]: { status: "error", msg: res.error } }));
      else if (res.posted) {
        // Optimistically append my reply to the thread so it shows as a chat.
        setComments((prev) =>
          prev.map((x) =>
            x.id === c.id
              ? {
                  ...x,
                  repliedByMe: true,
                  replies: [
                    ...x.replies,
                    { id: `${c.id}-local-${x.replies.length}`, author: "SINU GUPTA", text, timestamp: new Date().toISOString(), mine: true },
                  ],
                }
              : x
          )
        );
        setReplies((p) => { const n = { ...p }; delete n[c.id]; return n; });
        setSend((p) => ({ ...p, [c.id]: { status: "posted" } }));
      } else setSend((p) => ({ ...p, [c.id]: { status: "simulated", msg: res.reason } }));
    } catch (e: any) {
      setSend((p) => ({ ...p, [c.id]: { status: "error", msg: e.message } }));
    }
  }

  const shown = comments
    .filter((c) => (filter === "all" ? true : c.platform === filter))
    .filter((c) =>
      statusFilter === "all" ? true : statusFilter === "needs" ? needsReply(c) : !needsReply(c)
    );

  const needsCount = comments.filter(needsReply).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
          <InboxIcon className="size-6 text-primary" /> Comments Inbox
        </h1>
        <p className="text-sm text-muted-foreground">
          Full conversation view. See which post each comment is on, your past replies, and answer follow-ups. Instagram, Facebook &amp; YouTube post directly; LinkedIn drafts for you to copy.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => setFilter("all")} className={cn("rounded-full border px-3 py-1 text-xs font-medium", filter === "all" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
          All
        </button>
        {PLATFORM_IDS.map((id) => (
          <button key={id} onClick={() => setFilter(id)} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", filter === id ? "border-transparent text-white" : "border-border text-muted-foreground hover:text-foreground")} style={filter === id ? { background: PLATFORMS[id].color } : undefined}>
            {(() => { const I = PLATFORMS[id].icon; return <I className="size-3.5" />; })()}
            {PLATFORMS[id].short}
          </button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" />
        <button onClick={() => setStatusFilter(statusFilter === "needs" ? "all" : "needs")} className={cn("rounded-full border px-3 py-1 text-xs font-medium", statusFilter === "needs" ? "border-transparent bg-warning/20 text-warning" : "border-border text-muted-foreground hover:text-foreground")}>
          Needs reply{needsCount ? ` · ${needsCount}` : ""}
        </button>
        <button onClick={() => setStatusFilter(statusFilter === "replied" ? "all" : "replied")} className={cn("rounded-full border px-3 py-1 text-xs font-medium", statusFilter === "replied" ? "border-transparent bg-success/20 text-success" : "border-border text-muted-foreground hover:text-foreground")}>
          Replied
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No comments here.</p>}
          {shown.map((c) => {
            const cfg = PLATFORMS[c.platform];
            const postable = POSTABLE.includes(c.platform);
            const st = send[c.id]?.status || "idle";
            const need = needsReply(c);
            const hasThread = c.replies.length > 0;
            const showBox = replies[c.id] !== undefined;
            // Build the chat thread: original comment first, then all replies.
            const thread = [
              { id: `${c.id}-orig`, author: c.author, text: c.text, timestamp: c.timestamp, mine: false },
              ...c.replies,
            ];
            const isOpen = open[c.id] ?? true;
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: `${cfg.color}20` }}>
                      <cfg.icon className="size-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* header */}
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold">{c.author}</span>
                        <span className="text-xs text-muted-foreground">{cfg.short} · {timeAgo(c.timestamp)}</span>
                        {!c.connected && <Badge variant="muted">Sample</Badge>}
                        {need ? (
                          <Badge variant="warning">{c.repliedByMe ? "Follow-up · reply" : "Awaiting reply"}</Badge>
                        ) : (
                          <Badge variant="success"><Check className="size-3" /> Replied</Badge>
                        )}
                        {c.likeCount ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Heart className="size-3" />{formatCompact(c.likeCount)}</span>
                        ) : null}
                      </div>

                      {/* which post/video/reel/story this is on */}
                      {(c.postTitle || c.postType) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                          {c.postType && (
                            <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">{c.postType}</span>
                          )}
                          {c.postLink ? (
                            <a href={c.postLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary hover:underline">
                              on: {c.postTitle} <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">on: {c.postTitle}</span>
                          )}
                        </div>
                      )}

                      {/* chat thread */}
                      <div className="mt-3">
                        {hasThread && (
                          <button onClick={() => setOpen((p) => ({ ...p, [c.id]: !isOpen }))} className="mb-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                            {isOpen ? "Hide" : "Show"} conversation ({thread.length} messages)
                          </button>
                        )}
                        {(isOpen || !hasThread) && (
                          <div className="space-y-1.5">
                            {thread.map((m) => (
                              <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                                <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.mine ? "rounded-br-sm bg-primary/15 text-foreground" : "rounded-bl-sm bg-muted text-foreground/90")}>
                                  <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                                    {m.mine ? "You (SINU GUPTA)" : m.author} · {timeAgo(m.timestamp)}
                                  </div>
                                  <p className="whitespace-pre-wrap">{m.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* reply composer */}
                      {showBox ? (
                        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-primary">
                            <Sparkles className="size-3" /> Your reply {postable ? "(edit, then post)" : "(edit, then copy)"}
                          </div>
                          <textarea
                            value={replies[c.id]}
                            onChange={(e) => {
                              setReplies((p) => ({ ...p, [c.id]: e.target.value }));
                              if (st !== "idle") setSend((p) => ({ ...p, [c.id]: { status: "idle" } }));
                            }}
                            rows={2}
                            className="w-full resize-y rounded-md border border-input bg-background/60 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {postable && (
                              <Button
                                size="sm"
                                variant={st === "confirm" ? "danger" : "default"}
                                onClick={() => post(c)}
                                disabled={st === "sending" || st === "posted" || !replies[c.id]?.trim()}
                              >
                                {st === "sending" ? <Loader2 className="animate-spin" /> : st === "posted" ? <Check /> : <Send />}
                                {st === "posted" ? "Posted" : st === "sending" ? "Posting…" : st === "confirm" ? `Confirm: post to ${cfg.short}?` : "Reply & Post"}
                              </Button>
                            )}
                            <Button variant="secondary" size="sm" onClick={() => copy(c.id, replies[c.id])}>
                              {copied === c.id ? <Check className="text-success" /> : <Copy />} {copied === c.id ? "Copied" : "Copy"}
                            </Button>
                            {!postable && (
                              <span className="text-xs text-muted-foreground">{cfg.short}: copy &amp; reply manually</span>
                            )}
                          </div>

                          {st === "posted" && <p className="mt-2 flex items-center gap-1 text-xs text-success"><Check className="size-3" /> Reply posted to {cfg.short}.</p>}
                          {st === "simulated" && <p className="mt-2 flex items-center gap-1.5 text-xs text-warning"><AlertTriangle className="size-3" /> {send[c.id]?.msg || "Simulated, not posted."} (Copy it to reply manually for now.)</p>}
                          {st === "error" && <p className="mt-2 flex items-center gap-1.5 text-xs text-danger"><AlertTriangle className="size-3" /> {send[c.id]?.msg}</p>}
                        </div>
                      ) : (
                        <Button variant={need ? "default" : "secondary"} size="sm" className="mt-2" onClick={() => draft(c)} disabled={drafting === c.id}>
                          {drafting === c.id ? <Loader2 className="animate-spin" /> : hasThread ? <CornerDownRight /> : <Sparkles />}
                          {hasThread ? "Reply again" : "Draft reply"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
