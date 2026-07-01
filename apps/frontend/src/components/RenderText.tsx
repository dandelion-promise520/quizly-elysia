import React from 'react'

function renderInlineMath(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  const pattern = /([A-Z][A-Z0-9]*)(?:_(\w+)|_\{([^}]+)\}|\^(\w+)|\^\{([^}]+)\})/gi
  let match: RegExpExecArray | null = pattern.exec(text)

  while (match !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const base = match[1]
    const sub = match[2] ?? match[3]
    const sup = match[4] ?? match[5]

    if (sub != null) {
      nodes.push(
        <span key={`${match.index}-${match[0]}`} className="inline-flex items-baseline">
          {base}
          <sub className="align-sub text-[0.85em]">{sub}</sub>
        </span>,
      )
    }
    else if (sup != null) {
      nodes.push(
        <span key={`${match.index}-${match[0]}`} className="inline-flex items-baseline">
          {base}
          <sup className="align-super text-[0.75em]">{sup}</sup>
        </span>,
      )
    }
    else {
      nodes.push(match[0])
    }

    lastIndex = match.index + match[0].length
    match = pattern.exec(text)
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

export default function RenderText({ text }: { text: string }) {
  const elements: React.ReactNode[] = []
  let pos = 0
  while (true) {
    const start = text.indexOf('```', pos)
    if (start === -1) {
      const rest = text.slice(pos)
      if (rest) {
        elements.push(
          <div key={pos} className="whitespace-pre-wrap text-[15.5px]">
            {renderInlineMath(rest)}
          </div>,
        )
      }
      break
    }
    if (start > pos) {
      elements.push(
        <div key={pos} className="whitespace-pre-wrap text-[15.5px]">
          {renderInlineMath(text.slice(pos, start))}
        </div>,
      )
    }

    const fenceEnd = text.indexOf('```', start + 3)
    if (fenceEnd === -1) {
      // unmatched fence, push rest as text
      elements.push(
        <div key={start} className="whitespace-pre-wrap text-[15.5px]">
          {text.slice(start)}
        </div>,
      )
      break
    }

    const inner = text.slice(start + 3, fenceEnd)
    // inner may start with language like "c\n"
    const firstNewline = inner.indexOf('\n')
    let lang = ''
    let code = inner
    if (firstNewline !== -1) {
      lang = inner.slice(0, firstNewline).trim()
      code = inner.slice(firstNewline + 1)
    }

    elements.push(
      <pre key={start} className="bg-slate-50 border border-slate-200 rounded-md p-3 overflow-auto text-sm font-mono">
        <code className={lang ? `language-${lang}` : ''}>
          {code}
        </code>
      </pre>,
    )

    pos = fenceEnd + 3
  }

  return <>{elements}</>
}
