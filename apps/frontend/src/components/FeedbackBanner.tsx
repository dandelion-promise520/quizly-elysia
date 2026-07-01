interface FeedbackBannerProps {
  show: boolean
  type: 'correct' | 'wrong' | 'unanswered'
  message: string
}

export default function FeedbackBanner({ show, type, message }: FeedbackBannerProps) {
  if (!show)
    return null

  const cls
    = type === 'correct'
      ? 'bg-green-500/10 border-green-500/20 dark:border-emerald-500/30 text-green-800 dark:text-emerald-300'
      : type === 'wrong'
        ? 'bg-destructive/10 border-destructive/20 dark:border-destructive/30 text-destructive dark:text-red-400'
        : 'bg-amber-500/10 border-amber-500/20 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'

  return (
    <div className={`mt-3.5 rounded-xl text-sm leading-relaxed p-3.5 border ${cls}`}>
      {/* eslint-disable-next-line react-dom/no-dangerously-set-innerhtml */}
      <div dangerouslySetInnerHTML={{ __html: message }} />
    </div>
  )
}
