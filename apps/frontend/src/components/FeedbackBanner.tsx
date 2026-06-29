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
      ? 'bg-green-50 border-green-300 text-green-900'
      : type === 'wrong'
        ? 'bg-red-50 border-red-300 text-red-900'
        : 'bg-amber-50 border-amber-300 text-amber-900'

  return (
    <div className={`mt-3.5 rounded-xl text-sm leading-relaxed p-3.5 border ${cls}`}>
      <div dangerouslySetInnerHTML={{ __html: message }} />
    </div>
  )
}
