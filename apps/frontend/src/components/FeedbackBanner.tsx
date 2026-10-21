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
      ? 'bg-success/10 border-success/20 dark:border-success/30 text-success dark:text-success'
      : type === 'wrong'
        ? 'bg-destructive/10 border-destructive/20 dark:border-destructive/30 text-destructive dark:text-destructive'
        : 'bg-warning/10 border-warning/25 dark:border-warning/30 text-warning dark:text-warning'

  return (
    <div className={`mt-3.5 rounded-xl text-sm leading-relaxed p-3.5 border ${cls}`}>
      {/* eslint-disable-next-line react-dom/no-dangerously-set-innerhtml */}
      <div dangerouslySetInnerHTML={{ __html: message }} />
    </div>
  )
}
