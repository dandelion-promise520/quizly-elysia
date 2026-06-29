import { MagneticButton, StatefulButton } from './motion/button'

interface QuizFooterProps {
  allDone: boolean
  onSubmitAll: () => void
  onReset: () => void
}

export default function QuizFooter({ allDone, onSubmitAll, onReset }: QuizFooterProps) {
  return (
    <div className="flex justify-center gap-3 mt-10">
      {!allDone && (
        <StatefulButton
          variant="primary"
          size="lg"
          ripple
          className="px-9 py-3 shadow-[0_2px_8px_rgba(13,148,136,0.25)] font-sans"
          onClick={onSubmitAll}
        >
          提交全部答案
        </StatefulButton>
      )}
      {allDone && (
        <MagneticButton
          variant="secondary"
          size="lg"
          className="px-9 py-3 font-sans"
          onClick={onReset}
        >
          重新作答
        </MagneticButton>
      )}
    </div>
  )
}
