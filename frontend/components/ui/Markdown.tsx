import { type ReactNode } from "react";

function parseInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}

const HEADING_CLASS = {
  1: "text-xl font-semibold text-ink mt-6 first:mt-0",
  2: "text-lg font-semibold text-ink mt-5",
  3: "text-base font-semibold text-ink mt-4",
} as const;

/** Minimal renderer for AI-generated markdown (headings, lists, tables, bold, rules) —
 * no markdown library dependency, just enough to display a grant proposal cleanly. */
export function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let i = 0;

  function flushList() {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5 text-sm text-ink">
        {listItems.map((item, idx) => <li key={idx}>{parseInline(item)}</li>)}
      </ul>
    );
    listItems = [];
  }

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed === "") {
      flushList();
      i++;
      continue;
    }

    if (trimmed === "---") {
      flushList();
      blocks.push(<hr key={`hr-${i}`} className="border-border" />);
      i++;
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)/);
    if (heading) {
      flushList();
      const level = heading[1].length as 1 | 2 | 3;
      const Tag = `h${level}` as "h1" | "h2" | "h3";
      blocks.push(
        <Tag key={`h-${i}`} className={HEADING_CLASS[level]}>
          {parseInline(heading[2])}
        </Tag>
      );
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      i++;
      continue;
    }

    if (trimmed.startsWith("|")) {
      flushList();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const rows = tableLines
        .filter((l) => !/^\|[\s\-:|]+\|$/.test(l))
        .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
      const [header, ...body] = rows;
      if (header) {
        blocks.push(
          <div key={`table-${i}`} className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-xs text-muted">
                <tr>{header.map((h, idx) => <th key={idx} className="px-3 py-2 font-medium">{parseInline(h)}</th>)}</tr>
              </thead>
              <tbody>
                {body.map((row, ridx) => (
                  <tr key={ridx} className="border-t border-border">
                    {row.map((cell, cidx) => <td key={cidx} className="px-3 py-2 text-ink">{parseInline(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    flushList();
    blocks.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed text-ink">
        {parseInline(trimmed)}
      </p>
    );
    i++;
  }
  flushList();

  return <div className="flex flex-col gap-3">{blocks}</div>;
}
