import type { ReactNode } from "react";

/**
 * Typed props for custom markdown components
 * Used with react-markdown to render styled markdown content
 */

export interface MarkdownChildrenProps {
  children?: ReactNode;
}

export interface MarkdownLinkProps extends MarkdownChildrenProps {
  href?: string;
}

export interface MarkdownCodeProps extends MarkdownChildrenProps {
  className?: string;
  inline?: boolean;
}

/**
 * Pre-configured markdown component overrides for consistent styling
 */
export const markdownComponents = {
  a: ({ children, href }: MarkdownLinkProps) => (
    <a className="text-primary underline hover:text-primary/80" href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  ),
  blockquote: ({ children }: MarkdownChildrenProps) => (
    <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  code: ({ children }: MarkdownChildrenProps) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</code>
  ),
  h1: ({ children }: MarkdownChildrenProps) => <h1 className="mb-2 text-lg font-bold">{children}</h1>,
  h2: ({ children }: MarkdownChildrenProps) => <h2 className="mb-2 text-base font-semibold">{children}</h2>,
  h3: ({ children }: MarkdownChildrenProps) => <h3 className="mb-1 text-sm font-semibold">{children}</h3>,
  li: ({ children }: MarkdownChildrenProps) => <li>{children}</li>,
  ol: ({ children }: MarkdownChildrenProps) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">{children}</ol>
  ),
  p: ({ children }: MarkdownChildrenProps) => (
    <p className="mb-2 text-sm leading-relaxed text-muted-foreground last:mb-0">{children}</p>
  ),
  pre: ({ children }: MarkdownChildrenProps) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">{children}</pre>
  ),
  strong: ({ children }: MarkdownChildrenProps) => <span className="font-semibold text-foreground">{children}</span>,
  ul: ({ children }: MarkdownChildrenProps) => (
    <ul className="mb-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">{children}</ul>
  ),
};

/**
 * Compact markdown components for smaller UI contexts
 */
export const compactMarkdownComponents = {
  ...markdownComponents,
  code: ({ children }: MarkdownChildrenProps) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs font-medium text-foreground">{children}</code>
  ),
  p: ({ children }: MarkdownChildrenProps) => (
    <p className="mb-1 text-xs leading-snug text-muted-foreground last:mb-0">{children}</p>
  ),
};
