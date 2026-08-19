"use client";
import { useState } from "react";
import { Sparkles, Wand2, Copy, Check, Hash, Megaphone, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PLATFORMS, PLATFORM_IDS, type PlatformId } from "@/lib/config";
import { cn } from "@/lib/utils";

interface Idea {
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  format: string;
}

const TOPIC_SUGGESTIONS = [
  "ITR filing last-date reminder",
  "Old vs new tax regime 2026",
  "Save tax under 80C",
  "HRA exemption explained",
  "Employee financial wellness",
  "Advance tax deadlines",
  "Freelancer tax checklist",
  "Capital gains basics",
];

const TONES = [
  { value: "helpful and confident", label: "Helpful & confident" },
  { value: "friendly and casual", label: "Friendly & casual" },
  { value: "authoritative and professional", label: "Professional" },
  { value: "witty and punchy", label: "Witty & punchy" },
];

export function StudioView() {
  const [platform, setPlatform] = useState<PlatformId>("instagram");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState(TONES[0].value);
  const [count, setCount] = useState(3);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [usedModel, setUsedModel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, topic, tone, count }),
      }).then((r) => r.json());
      setIdeas(res.ideas || []);
      setUsedModel(res.usedModel);
    } finally {
      setLoading(false);
    }
  }

  function copyIdea(i: number, idea: Idea) {
    const text = `${idea.caption}\n\n${idea.cta}\n\n${idea.hashtags.join(" ")}`;
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
          <Wand2 className="size-6 text-primary" /> Content Studio
        </h1>
        <p className="text-sm text-muted-foreground">AI-generated, ready-to-post ideas tailored to your brand and audience.</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select
              className="w-full"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformId)}
              options={PLATFORM_IDS.map((id) => ({ value: id, label: PLATFORMS[id].short }))}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Old vs new tax regime 2026" onKeyDown={(e) => e.key === "Enter" && generate()} />
          </div>
          <div className="space-y-1.5">
            <Label>How many</Label>
            <Select className="w-full" value={String(count)} onChange={(e) => setCount(Number(e.target.value))} options={[3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} ideas` }))} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Tone</Label>
            <Select className="w-full" value={tone} onChange={(e) => setTone(e.target.value)} options={TONES} />
          </div>
          <div className="flex items-end md:col-span-2">
            <Button className="w-full" onClick={generate} disabled={loading || !topic.trim()}>
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {loading ? "Generating…" : "Generate ideas"}
            </Button>
          </div>
          <div className="md:col-span-4">
            <div className="flex flex-wrap gap-1.5">
              {TOPIC_SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setTopic(s)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {ideas.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant={usedModel ? "default" : "muted"}>
            <Sparkles className="size-3" /> {usedModel ? "AI generated" : "Sample (add an AI key for tailored output)"}
          </Badge>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {ideas.map((idea, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <CardTitle className="text-base leading-snug">{idea.hook}</CardTitle>
              <Badge variant="muted" className="shrink-0 capitalize">{idea.format}</Badge>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{idea.caption}</p>
              {idea.cta && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Megaphone className="mt-0.5 size-4 shrink-0 text-warning" />
                  {idea.cta}
                </div>
              )}
              {idea.hashtags?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Hash className="size-3.5 text-muted-foreground" />
                  {idea.hashtags.map((h) => (
                    <span key={h} className="text-xs text-primary">{h.startsWith("#") ? h : `#${h}`}</span>
                  ))}
                </div>
              )}
              <div className="mt-auto pt-1">
                <Button variant="secondary" size="sm" onClick={() => copyIdea(i, idea)}>
                  {copied === i ? <Check className="text-success" /> : <Copy />}
                  {copied === i ? "Copied!" : "Copy post"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {ideas.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <div className={cn("grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary")}>
              <Wand2 className="size-6" />
            </div>
            <p className="text-sm text-muted-foreground">Pick a platform and topic, then generate ready-to-post ideas.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
