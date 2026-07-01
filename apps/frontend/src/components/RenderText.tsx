import React from 'react'

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
            {rest}
          </div>,
        )
      }
      break
    }
    if (start > pos) {
      elements.push(
        <div key={pos} className="whitespace-pre-wrap text-[15.5px]">
          {text.slice(pos, start)}
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
