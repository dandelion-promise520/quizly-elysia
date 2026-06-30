import type { ChoiceQuestion, FillQuestion, MultiChoiceQuestion, Question, SavedAnswer } from '@quizly/types'
import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'db_quiz_progress'
const PTS = 5

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffleQuestions(questions: Question[]): Question[] {
  const shuffled = shuffle(questions)
  return shuffled.map((q) => {
    if (q.type === '填空题')
      return q
    if (q.type === '多选题') {
      const correctLabels = q.answer.split(',').map(s => s.trim())
      const correctTexts = q.options
        .filter(o => correctLabels.includes(o.label))
        .map(o => o.text)
      const shuffledByText = shuffle(q.options.map(o => o.text))
      const shuffledOptions = shuffledByText.map((text, idx) => ({
        label: String.fromCharCode(65 + idx),
        text,
      }))
      const correctShuffledIndices = shuffledOptions.reduce<number[]>((acc, o, idx) => {
        if (correctTexts.includes(o.text)) {
          acc.push(idx)
        }
        return acc
      }, [])
      const shuffledCorrectAnswer = shuffledOptions
        .filter((_, idx) => correctShuffledIndices.includes(idx))
        .map(o => o.label)
        .join(',')
      return {
        ...q,
        shuffledOptions,
        correctShuffledIndices,
        answer: shuffledCorrectAnswer,
      }
    }
    else {
      const correctText = q.options.find(o => o.label === q.answer)?.text
      if (!correctText)
        return q
      const shuffledByText = shuffle(q.options.map(o => o.text))
      const shuffledOptions = shuffledByText.map((text, idx) => ({
        label: String.fromCharCode(65 + idx),
        text,
      }))
      const correctShuffledIdx = shuffledOptions.findIndex(
        o => o.text === correctText,
      )
      return {
        ...q,
        shuffledOptions,
        correctShuffledIdx,
        answer: shuffledOptions[correctShuffledIdx!]!.label,
      }
    }
  })
}

function loadSaved(): { state: { score: number, answered: number }, answers: SavedAnswer, questions: Partial<Question>[], score?: number, answered?: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw)
      return JSON.parse(raw)
  }
  catch { /* ignore */ }
  return null
}

function persist(questions: Question[], answers: SavedAnswer, score: number, answered: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    score,
    answered,
    questions: questions.map(q => ({
      type: q.type,
      text: q.text,
      options: q.type === '填空题' ? [] : q.options,
      blanks: 'blanks' in q ? q.blanks : undefined,
      shuffledOptions: 'shuffledOptions' in q ? q.shuffledOptions : undefined,
      correctShuffledIdx: 'correctShuffledIdx' in q ? q.correctShuffledIdx : undefined,
      correctShuffledIndices: 'correctShuffledIndices' in q ? q.correctShuffledIndices : undefined,
      answer: q.answer,
    })),
    answers,
  }))
}

export interface QuizHookReturn {
  questions: Question[]
  score: number
  answered: number
  total: number
  answers: SavedAnswer
  doneFlags: Record<number, boolean>
  pickAnswer: (qi: number, oi: number) => void
  submitMulti: (qi: number, selectedIndices: number[]) => void
  submitFill: (qi: number, userAnswers: string[]) => void
  submitAll: () => void
  resetAll: () => void
  hydrated: boolean
}

export function useQuizState(initialQuestions: Question[]): QuizHookReturn {
  const TOTAL = initialQuestions.length
  const [hydrated, setHydrated] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [answers, setAnswers] = useState<SavedAnswer>({})
  const [doneFlags, setDoneFlags] = useState<Record<number, boolean>>({})

  // Refs for reading latest state inside callbacks
  const questionsRef = useRef<Question[]>([])
  const scoreRef = useRef(0)
  const answeredRef = useRef(0)
  const answersRef = useRef<SavedAnswer>({})

  useEffect(() => {
    questionsRef.current = questions
  }, [questions])
  useEffect(() => {
    scoreRef.current = score
  }, [score])
  useEffect(() => {
    answeredRef.current = answered
  }, [answered])
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // Hydration guard
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Init: shuffle or restore
  useEffect(() => {
    if (!hydrated)
      return

    const saved = loadSaved()
    let q: Question[]
    let a: SavedAnswer = {}
    let s = 0
    let an = 0

    if (saved && saved.questions.length === TOTAL) {
      q = (saved.questions as Question[]).map((question) => {
        const item = { ...question }
        if (item.type === '填空题') {
          const fItem = item as unknown as { answer: unknown, blanks: unknown }
          if (!Array.isArray(fItem.answer)) {
            fItem.answer = typeof fItem.answer === 'string' ? [fItem.answer] : []
          }
          if (!Array.isArray(fItem.blanks)) {
            fItem.blanks = typeof fItem.blanks === 'string' ? [fItem.blanks] : []
          }
        }
        return item
      })
      s = saved.state?.score ?? saved.score ?? 0
      an = saved.state?.answered ?? saved.answered ?? 0
      a = saved.answers ?? {}

      // Fill missing shuffle data
      initialQuestions.forEach((orig, i) => {
        if (i >= q.length)
          return
        const targetQ = q[i]
        if (targetQ.type === '多选题' && orig.type === '多选题') {
          const multiQ = targetQ as MultiChoiceQuestion
          if (!multiQ.shuffledOptions) {
            const correctLabels = orig.answer.split(',').map(s => s.trim())
            const correctTexts = orig.options
              .filter(o => correctLabels.includes(o.label))
              .map(o => o.text)
            const shuffledByText = shuffle(orig.options.map(o => o.text))
            multiQ.shuffledOptions = shuffledByText.map((text, idx) => ({
              label: String.fromCharCode(65 + idx),
              text,
            }))
            multiQ.correctShuffledIndices = multiQ.shuffledOptions.reduce<number[]>((acc, o, idx) => {
              if (correctTexts.includes(o.text)) {
                acc.push(idx)
              }
              return acc
            }, [])
            multiQ.answer = multiQ.shuffledOptions
              .filter((_, idx) => multiQ.correctShuffledIndices!.includes(idx))
              .map(o => o.label)
              .join(',')
          }
        }
        else if (targetQ.type !== '填空题' && orig.type !== '填空题') {
          const choiceQ = targetQ as ChoiceQuestion
          if (!choiceQ.shuffledOptions) {
            const correctText = orig.options.find(o => o.label === orig.answer)?.text
            if (correctText) {
              const shuffledByText = shuffle(orig.options.map(o => o.text))
              choiceQ.shuffledOptions = shuffledByText.map((text, idx) => ({
                label: String.fromCharCode(65 + idx),
                text,
              }))
              choiceQ.correctShuffledIdx = choiceQ.shuffledOptions.findIndex(
                o => o.text === correctText,
              )
              choiceQ.answer = choiceQ.shuffledOptions[choiceQ.correctShuffledIdx].label
            }
          }
        }
      })
    }
    else {
      q = shuffleQuestions(initialQuestions)
    }

    const df: Record<number, boolean> = {}
    Object.keys(a).forEach((key) => {
      df[Number.parseInt(key, 10)] = true
    })

    setQuestions(q)
    setScore(s)
    setAnswered(an)
    setAnswers(a)
    setDoneFlags(df)
  }, [hydrated, initialQuestions, TOTAL])

  const pickAnswer = useCallback((qi: number, oi: number) => {
    setDoneFlags((prev) => {
      if (prev[qi])
        return prev
      const q = questionsRef.current[qi]
      if (q.type === '填空题' || q.type === '多选题')
        return prev
      const isRight = oi === (q as ChoiceQuestion).correctShuffledIdx
      setScore(s => s + (isRight ? PTS : 0))
      setAnswered(a => a + 1)
      setAnswers((prevA) => {
        const next = { ...prevA, [String(qi)]: oi }
        persist(questionsRef.current, next, scoreRef.current + (isRight ? PTS : 0), answeredRef.current + 1)
        return next
      })
      return { ...prev, [qi]: true }
    })
  }, [])

  const submitMulti = useCallback((qi: number, selectedIndices: number[]) => {
    setDoneFlags((prev) => {
      if (prev[qi])
        return prev
      const q = questionsRef.current[qi]
      if (q.type !== '多选题')
        return prev
      const correctIndices = (q as MultiChoiceQuestion).correctShuffledIndices || []
      const isRight
        = selectedIndices.length === correctIndices.length
          && selectedIndices.every(val => correctIndices.includes(val))
      setScore(s => s + (isRight ? PTS : 0))
      setAnswered(a => a + 1)
      setAnswers((prevA) => {
        const next = { ...prevA, [String(qi)]: selectedIndices }
        persist(questionsRef.current, next, scoreRef.current + (isRight ? PTS : 0), answeredRef.current + 1)
        return next
      })
      return { ...prev, [qi]: true }
    })
  }, [])

  const submitFill = useCallback((qi: number, userAnswers: string[]) => {
    setDoneFlags((prev) => {
      if (prev[qi])
        return prev
      const q = questionsRef.current[qi]
      if (q.type !== '填空题')
        return prev
      const fillQ = q as FillQuestion
      let blankCorrect = 0
      for (let b = 0; b < fillQ.answer.length; b++) {
        if (userAnswers[b] === fillQ.answer[b])
          blankCorrect++
      }
      const allCorrect = blankCorrect === fillQ.answer.length
      setScore(s => s + (allCorrect ? PTS : 0))
      setAnswered(a => a + 1)
      setAnswers((prevA) => {
        const next = { ...prevA, [String(qi)]: userAnswers }
        persist(questionsRef.current, next, scoreRef.current + (allCorrect ? PTS : 0), answeredRef.current + 1)
        return next
      })
      return { ...prev, [qi]: true }
    })
  }, [])

  const submitAll = useCallback(() => {
    setDoneFlags((prevDf) => {
      const newDf = { ...prevDf }
      const newAnswers = { ...answersRef.current }
      let newAnswered = answeredRef.current
      const newScore = scoreRef.current

      questionsRef.current.forEach((q, i) => {
        if (newDf[i])
          return
        newDf[i] = true
        newAnswered++
        if (q.type === '填空题') {
          const fillQ = q as FillQuestion
          newAnswers[String(i)] = fillQ.answer.map(() => '')
        }
        else if (q.type === '多选题') {
          newAnswers[String(i)] = []
        }
        else {
          newAnswers[String(i)] = -1
        }
      })

      setAnswers(newAnswers)
      setAnswered(newAnswered)
      persist(questionsRef.current, newAnswers, newScore, newAnswered)
      return newDf
    })
  }, [])

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    const q = shuffleQuestions(initialQuestions)
    setQuestions(q)
    setScore(0)
    setAnswered(0)
    setAnswers({})
    setDoneFlags({})
  }, [initialQuestions])

  return {
    questions,
    score,
    answered,
    total: TOTAL,
    answers,
    doneFlags,
    pickAnswer,
    submitMulti,
    submitFill,
    submitAll,
    resetAll,
    hydrated,
  }
}
