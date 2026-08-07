import type { ContentBlock } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { InlineHtml } from "./inline-html";
import { Callout } from "./callout";
import { CodeBlock } from "./code-block";

export function BlockHeading({ block }: { block: Extract<ContentBlock, { type: "heading" }> }) {
  const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
  return (
    <Tag
      className={cn(
        "mt-6 mb-3 scroll-mt-24 font-semibold tracking-tight text-foreground",
        block.level === 1 && "text-2xl",
        block.level === 2 && "text-xl",
        block.level === 3 && "text-lg",
      )}
    >
      <InlineHtml text={block.text} />
    </Tag>
  );
}

export function BlockParagraph({ block }: { block: Extract<ContentBlock, { type: "paragraph" }> }) {
  return (
    <p className="my-3 leading-relaxed text-foreground/90">
      <InlineHtml text={block.text} />
    </p>
  );
}

export function BlockList({ block }: { block: Extract<ContentBlock, { type: "list" }> }) {
  return block.ordered ? (
    <ol className="my-3 list-decimal space-y-1.5 pl-6 text-foreground/90">
      {block.items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          <InlineHtml text={item} />
        </li>
      ))}
    </ol>
  ) : (
    <ul className="my-3 list-disc space-y-1.5 pl-6 text-foreground/90">
      {block.items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          <InlineHtml text={item} />
        </li>
      ))}
    </ul>
  );
}

export function BlockImage({ block }: { block: Extract<ContentBlock, { type: "image" }> }) {
  return (
    <figure className="my-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.src} alt={block.alt} className="mx-auto max-h-96 rounded-lg border border-border" />
      {block.caption && <figcaption className="mt-2 text-center text-sm text-muted-foreground">{block.caption}</figcaption>}
    </figure>
  );
}

export function BlockTable({ block }: { block: Extract<ContentBlock, { type: "table" }> }) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            {block.headers.map((h, i) => (
              <th key={i} className="px-4 py-2 text-left font-semibold">
                <InlineHtml text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-foreground/90">
                  <InlineHtml text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BlockQuote({ block }: { block: Extract<ContentBlock, { type: "quote" }> }) {
  return (
    <blockquote className="my-4 border-l-4 border-primary pl-4 italic text-muted-foreground">
      <p>
        <InlineHtml text={block.text} />
      </p>
      {block.cite && <footer className="mt-1 text-sm not-italic">— {block.cite}</footer>}
    </blockquote>
  );
}

export function BlockCheckpoint({ block }: { block: Extract<ContentBlock, { type: "checkpoint" }> }) {
  return (
    <div className="my-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p className="mb-2 text-sm font-semibold text-primary">{block.title ?? "Checkpoint"}</p>
      <ul className="space-y-1.5">
        {block.items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-foreground/90">
            <span className="text-primary">✓</span>
            <span>
              <InlineHtml text={item} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BlockEmbed({ block }: { block: Extract<ContentBlock, { type: "embed" }> }) {
  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border">
      <iframe
        src={block.url}
        title={block.title ?? "Embedded content"}
        className="aspect-video w-full"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registry — the single place new block types get wired into the renderer.
// The interactive blocks live in their own files (they need client state).
// ---------------------------------------------------------------------------

import { ExampleBlock } from "./example-block";
import { ExerciseBlock } from "./exercise-block";
import { QuizBlock } from "./quiz-block";
import { SectionBlock } from "./section-block";
import { AnalogyBlock } from "./analogy-block";
import { VisualBlock } from "./visual-block";
import { BreakdownBlock } from "./breakdown-block";
import { DemoBlock } from "./demo-block";
import { GuidedBlock } from "./guided-block";
import { MistakeBlock } from "./mistake-block";
import { ReflectionBlock } from "./reflection-block";
import { PromptBuilderBlock } from "./prompt-builder-block";
import { PromptAnalyzerBlock } from "./prompt-analyzer-block";
import { NetLabBlock } from "./netlab-block";

export function LessonBlocks({ blocks, className }: { blocks: ContentBlock[]; className?: string }) {
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return <BlockHeading key={i} block={block} />;
          case "paragraph":
            return <BlockParagraph key={i} block={block} />;
          case "list":
            return <BlockList key={i} block={block} />;
          case "code":
            return <CodeBlock key={i} language={block.language} code={block.code} title={block.title} />;
          case "callout":
            return <Callout key={i} variant={block.variant} title={block.title} text={block.text} />;
          case "image":
            return <BlockImage key={i} block={block} />;
          case "table":
            return <BlockTable key={i} block={block} />;
          case "quote":
            return <BlockQuote key={i} block={block} />;
          case "checkpoint":
            return <BlockCheckpoint key={i} block={block} />;
          case "embed":
            return <BlockEmbed key={i} block={block} />;
          case "example":
            return <ExampleBlock key={i} block={block} />;
          case "exercise":
            return <ExerciseBlock key={i} exerciseKey={block.exerciseKey} title={block.title} />;
          case "quiz":
            return <QuizBlock key={i} quizKey={block.quizKey} title={block.title} />;
          case "divider":
            return <hr key={i} className="my-6 border-border" />;
          case "section":
            return <SectionBlock key={i} block={block} />;
          case "analogy":
            return <AnalogyBlock key={i} block={block} />;
          case "visual":
            return <VisualBlock key={i} block={block} />;
          case "breakdown":
            return <BreakdownBlock key={i} block={block} />;
          case "demo":
            return <DemoBlock key={i} block={block} />;
          case "guided":
            return <GuidedBlock key={i} block={block} />;
          case "mistake":
            return <MistakeBlock key={i} block={block} />;
          case "reflection":
            return <ReflectionBlock key={i} block={block} />;
          case "promptBuilder":
            return <PromptBuilderBlock key={i} block={block} />;
          case "promptAnalyzer":
            return <PromptAnalyzerBlock key={i} block={block} />;
          case "netlab":
            return <NetLabBlock key={i} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
