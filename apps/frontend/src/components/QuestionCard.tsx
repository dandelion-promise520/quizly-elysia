import type { ChoiceQuestion, FillQuestion, MultiChoiceQuestion, Question } from '@quizly/types'
import { checkAnswerCorrect, normalizeSql } from '@/hooks/useQuizState'
import ChoiceCard from './ChoiceCard'
import FeedbackBanner from './FeedbackBanner'
import FillCard from './FillCard'
import MultiChoiceCard from './MultiChoiceCard'

interface QuestionCardProps {
  question: Question
  index: number
  displayIndex?: number
  done: boolean
  selectedIdx?: number
  selectedIndices?: number[]
  userAnswers?: string[]
  onPick: (qi: number, oi: number) => void
  onSubmitMulti?: (qi: number, indices: number[]) => void
  onSubmitFill: (qi: number, answers: string[]) => void
}

export default function QuestionCard({
  question,
  index,
  displayIndex,
  done,
  selectedIdx,
  selectedIndices,
  userAnswers,
  onPick,
  onSubmitMulti,
  onSubmitFill,
}: QuestionCardProps) {
  const isCorrect = question.type === '填空题'
    ? userAnswers && checkAnswerCorrect(question, userAnswers)
    : question.type === '多选题'
      ? selectedIndices && checkAnswerCorrect(question, selectedIndices)
      : selectedIdx !== undefined && checkAnswerCorrect(question, selectedIdx)

  let feedbackType: 'correct' | 'wrong' | 'unanswered' = 'wrong'
  let feedbackMsg = ''

  if (question.type === '填空题') {
    if (userAnswers) {
      const fillQ = question as FillQuestion
      let blankCorrect = 0
      for (let b = 0; b < fillQ.answer.length; b++) {
        const isBlankCorrect = question.category?.name === 'SQL填空题'
          ? normalizeSql(userAnswers[b]) === normalizeSql(fillQ.answer[b])
          : userAnswers[b] === fillQ.answer[b]
        if (isBlankCorrect)
          blankCorrect++
      }
      if (blankCorrect === fillQ.answer.length) {
        feedbackType = 'correct'
        feedbackMsg = '<strong>回答正确。</strong>'
      }
      else {
        feedbackType = 'wrong'
        const parts: string[] = []
        for (let b = 0; b < fillQ.answer.length; b++) {
          const isBlankCorrect = question.category?.name === 'SQL填空题'
            ? normalizeSql(userAnswers[b]) === normalizeSql(fillQ.answer[b])
            : userAnswers[b] === fillQ.answer[b]
          const status = isBlankCorrect ? '✓' : '✗'
          parts.push(`${status} 第${b + 1}空：你填"${userAnswers[b] || ''}"，正确答案"${fillQ.answer[b]}"`)
        }
        const statusText = blankCorrect === 0 ? '回答错误。' : '部分正确。'
        feedbackMsg = `<strong>${statusText}</strong><br>${parts.join('<br>')}`
      }
    }
  }
  else if (question.type === '多选题') {
    if (selectedIndices !== undefined) {
      if (isCorrect) {
        feedbackType = 'correct'
        feedbackMsg = `<strong>回答正确。</strong> 正确答案：${question.answer}`
      }
      else {
        const opts = question.shuffledOptions || question.options
        const selectedLabels = selectedIndices.map(idx => opts[idx]?.label).filter(Boolean).sort().join(',')
        const label = selectedLabels || '无'
        feedbackType = 'wrong'
        feedbackMsg = `<strong>回答错误。</strong> 你选择了 ${label}，正确答案是 ${question.answer}`
      }
    }
  }
  else {
    if (selectedIdx !== undefined) {
      if (isCorrect) {
        feedbackType = 'correct'
        feedbackMsg = `<strong>回答正确。</strong> 正确答案：${question.answer}`
      }
      else {
        const opts = question.shuffledOptions || question.options
        const label = selectedIdx >= 0 ? opts[selectedIdx]?.label : '?'
        feedbackType = 'wrong'
        feedbackMsg = `<strong>回答错误。</strong> 你选择了 ${label}，正确答案是 ${question.answer}`
      }
    }
  }

  const cardBorder = done
    ? question.type === '填空题'
      ? userAnswers && isCorrect
        ? 'border-green-300 ring-1 ring-green-300'
        : 'border-red-300 ring-1 ring-red-300'
      : question.type === '多选题'
        ? selectedIndices && isCorrect
          ? 'border-green-300 ring-1 ring-green-300'
          : 'border-red-300 ring-1 ring-red-300'
        : selectedIdx !== undefined && isCorrect
          ? 'border-green-300 ring-1 ring-green-300'
          : 'border-red-300 ring-1 ring-red-300'
    : ''

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-6 mb-4 shadow-sm transition-all duration-300 ${cardBorder}`}
    >
      {/* Question header */}
      <div className="flex items-start gap-2.5 mb-4.5">
        <span className="text-sm font-semibold text-white bg-teal-600 px-3 py-0.5 rounded-full flex-shrink-0 mt-0.5">
          {displayIndex ?? (index + 1)}
        </span>
        <span className="text-[11px] font-semibold text-teal-600 bg-teal-50 px-2.5 py-0.75 rounded-full flex-shrink-0 mt-0.5 border border-teal-200">
          {question.type}
        </span>
        <div className="flex-1 text-[15.5px] font-medium text-slate-900 leading-relaxed">
          {question.text}
        </div>
      </div>

      {/* Body */}
      {question.type === '填空题'
        ? (
            <FillCard
              question={question as FillQuestion}
              index={index}
              done={done}
              userAnswers={userAnswers}
              onSubmit={onSubmitFill}
            />
          )
        : question.type === '多选题'
          ? (
              <MultiChoiceCard
                question={question as MultiChoiceQuestion}
                index={index}
                done={done}
                selectedIndices={selectedIndices}
                onSubmit={onSubmitMulti!}
              />
            )
          : (
              <ChoiceCard
                question={question as ChoiceQuestion}
                index={index}
                done={done}
                selectedIdx={selectedIdx}
                onPick={onPick}
              />
            )}

      <FeedbackBanner show={done} type={feedbackType} message={feedbackMsg} />
    </div>
  )
}
