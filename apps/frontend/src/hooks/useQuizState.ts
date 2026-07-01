import type { ChoiceQuestion, FillQuestion, MultiChoiceQuestion, Question, SavedAnswer } from '@quizly/types'
import { useCallback, useEffect, useState } from 'react'

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

const STORAGE_VERSION = 'v1.0.3'

function loadSaved(): { state: { score: number, answered: number }, answers: SavedAnswer, questions: Partial<Question>[], score?: number, answered?: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data && data.version === STORAGE_VERSION) {
        return data
      }
      // 版本不匹配或数据格式陈旧，主动清理本地存储
      localStorage.removeItem(STORAGE_KEY)
    }
  }
  catch { /* ignore */ }
  return null
}

function persist(questions: Question[], answers: SavedAnswer, score: number, answered: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: STORAGE_VERSION,
    score,
    answered,
    questions: questions.map(q => ({
      type: q.type,
      text: q.text,
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
  submitAll: (courseId?: number, categoryId?: number) => void
  resetAll: () => void
  hydrated: boolean
}

export function normalizeSql(sql: string | undefined | null): string {
  if (!sql)
    return ''
  return sql
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ') // replace newlines/tabs with space
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .trim()
    .replace(/;\s*$/, '') // remove trailing semicolon
    .replace(/\s*,\s*/g, ',') // remove spaces around commas
    .replace(/\s*=\s*/g, '=') // remove spaces around equals
    .replace(/\s*<>\s*/g, '<>') // remove spaces around not equals
    .replace(/\s*!=\s*/g, '!=') // remove spaces around not equals
    .replace(/\s*>\s*/g, '>') // remove spaces around greater than
    .replace(/\s*<\s*/g, '<') // remove spaces around less than
    .replace(/\s*>=\s*/g, '>=') // remove spaces around >=
    .replace(/\s*<=\s*/g, '<=') // remove spaces around <=
    .replace(/\s*\(\s*/g, '(') // remove spaces around parentheses
    .replace(/\s*\)\s*/g, ')')
    .replace(/['"`]/g, '\'') // normalize quotes to single quotes
    .trim()
}

export function checkAnswerCorrect(q: Question, savedAns: any): boolean {
  if (q.type === '填空题') {
    const fillQ = q as FillQuestion
    if (!Array.isArray(savedAns))
      return false
    return fillQ.answer.every((ans, idx) => {
      const userVal = savedAns[idx] || ''
      const correctVal = ans || ''
      if (q.category?.name === 'SQL填空题') {
        return normalizeSql(userVal) === normalizeSql(correctVal)
      }
      return userVal === correctVal
    })
  }
  else if (q.type === '多选题') {
    const multiQ = q as MultiChoiceQuestion
    const correctIndices = multiQ.correctShuffledIndices || []
    if (!Array.isArray(savedAns))
      return false
    return (
      savedAns.length === correctIndices.length
      && savedAns.every(val => correctIndices.includes(val))
    )
  }
  else {
    const choiceQ = q as ChoiceQuestion
    return savedAns === choiceQ.correctShuffledIdx
  }
}

function fillMissingShuffle(targetQ: Question, orig: Question) {
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
}

export function useQuizState(initialQuestions: Question[]): QuizHookReturn {
  const TOTAL = initialQuestions.length
  const [hydrated, setHydrated] = useState(false)
  const [state, setState] = useState<{
    questions: Question[]
    score: number
    answered: number
    answers: SavedAnswer
    doneFlags: Record<number, boolean>
  }>({
    questions: [],
    score: 0,
    answered: 0,
    answers: {},
    doneFlags: {},
  })

  // Hydration guard
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Init: shuffle or restore with incremental recovery
  useEffect(() => {
    if (!hydrated || TOTAL === 0)
      return

    const saved = loadSaved()
    let q: Question[] = []
    const a: SavedAnswer = {}
    let s = 0
    let an = 0
    const df: Record<number, boolean> = {}

    if (saved && Array.isArray(saved.questions)) {
      q = initialQuestions.map((orig, i) => {
        // Find match in saved questions by text and type
        const savedQIndex = saved.questions.findIndex(
          (sq: any) => sq && sq.text === orig.text && sq.type === orig.type,
        )

        if (savedQIndex !== -1) {
          const savedQ = saved.questions[savedQIndex] as any
          const restoredQ = {
            ...orig,
            shuffledOptions: savedQ.shuffledOptions,
            correctShuffledIdx: savedQ.correctShuffledIdx,
            correctShuffledIndices: savedQ.correctShuffledIndices,
            answer: savedQ.answer,
          } as unknown as Question

          fillMissingShuffle(restoredQ, orig)

          const savedAns = saved.answers[String(savedQIndex)]
          if (savedAns !== undefined) {
            a[String(i)] = savedAns
            df[i] = true
            an++
            const isRight = checkAnswerCorrect(restoredQ, savedAns)
            if (isRight) {
              s += PTS
            }
          }

          return restoredQ
        }
        else {
          // Fallback to fresh shuffle for new questions
          return shuffleQuestions([orig])[0]
        }
      })
    }
    else {
      q = shuffleQuestions(initialQuestions)
    }

    setState({
      questions: q,
      score: s,
      answered: an,
      answers: a,
      doneFlags: df,
    })
  }, [hydrated, initialQuestions, TOTAL])

  // Side-effect: Persist state changes
  useEffect(() => {
    if (hydrated && state.questions.length > 0) {
      persist(state.questions, state.answers, state.score, state.answered)
    }
  }, [state, hydrated])

  const pickAnswer = useCallback((qi: number, oi: number) => {
    setState((prev) => {
      if (prev.doneFlags[qi])
        return prev
      const q = prev.questions[qi]
      if (!q || q.type === '填空题' || q.type === '多选题')
        return prev
      const isRight = oi === (q as ChoiceQuestion).correctShuffledIdx

      return {
        ...prev,
        score: prev.score + (isRight ? PTS : 0),
        answered: prev.answered + 1,
        answers: { ...prev.answers, [String(qi)]: oi },
        doneFlags: { ...prev.doneFlags, [qi]: true },
      }
    })
  }, [])

  const submitMulti = useCallback((qi: number, selectedIndices: number[]) => {
    setState((prev) => {
      if (prev.doneFlags[qi])
        return prev
      const q = prev.questions[qi]
      if (!q || q.type !== '多选题')
        return prev
      const correctIndices = (q as MultiChoiceQuestion).correctShuffledIndices || []
      const isRight
        = selectedIndices.length === correctIndices.length
          && selectedIndices.every(val => correctIndices.includes(val))

      return {
        ...prev,
        score: prev.score + (isRight ? PTS : 0),
        answered: prev.answered + 1,
        answers: { ...prev.answers, [String(qi)]: selectedIndices },
        doneFlags: { ...prev.doneFlags, [qi]: true },
      }
    })
  }, [])

  const submitFill = useCallback((qi: number, userAnswers: string[]) => {
    setState((prev) => {
      if (prev.doneFlags[qi])
        return prev
      const q = prev.questions[qi]
      if (!q || q.type !== '填空题')
        return prev
      const fillQ = q as FillQuestion
      let blankCorrect = 0
      for (let b = 0; b < fillQ.answer.length; b++) {
        if (userAnswers[b] === fillQ.answer[b])
          blankCorrect++
      }
      const allCorrect = blankCorrect === fillQ.answer.length

      return {
        ...prev,
        score: prev.score + (allCorrect ? PTS : 0),
        answered: prev.answered + 1,
        answers: { ...prev.answers, [String(qi)]: userAnswers },
        doneFlags: { ...prev.doneFlags, [qi]: true },
      }
    })
  }, [])

  const submitAll = useCallback((courseId?: number, categoryId?: number) => {
    setState((prev) => {
      const newDf = { ...prev.doneFlags }
      const newAnswers = { ...prev.answers }
      let newAnswered = prev.answered

      prev.questions.forEach((q, i) => {
        if (newDf[i])
          return

        if (courseId !== undefined) {
          if (q.courseId !== courseId)
            return
        }
        if (categoryId !== undefined) {
          if (q.categoryId !== categoryId)
            return
        }

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

      return {
        ...prev,
        answers: newAnswers,
        answered: newAnswered,
        doneFlags: newDf,
      }
    })
  }, [])

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    const q = shuffleQuestions(initialQuestions)
    setState({
      questions: q,
      score: 0,
      answered: 0,
      answers: {},
      doneFlags: {},
    })
  }, [initialQuestions])

  return {
    questions: state.questions,
    score: state.score,
    answered: state.answered,
    total: TOTAL,
    answers: state.answers,
    doneFlags: state.doneFlags,
    pickAnswer,
    submitMulti,
    submitFill,
    submitAll,
    resetAll,
    hydrated,
  }
}
