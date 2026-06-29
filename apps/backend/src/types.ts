export interface Option {
  label: string
  text: string
}

export interface ChoiceQuestion {
  id?: number
  type: '单选题' | '判断题'
  text: string
  options: Option[]
  answer: string // original label, e.g. "B"
  shuffledOptions?: Option[]
  correctShuffledIdx?: number
}

export interface MultiChoiceQuestion {
  id?: number
  type: '多选题'
  text: string
  options: Option[]
  answer: string // comma-separated original labels, e.g. "A,C"
  shuffledOptions?: Option[]
  correctShuffledIndices?: number[]
}

export interface FillQuestion {
  id?: number
  type: '填空题'
  text: string
  blanks: string[] // correct answers per blank
  answer: string[]
}

export type Question = ChoiceQuestion | MultiChoiceQuestion | FillQuestion

export interface SavedAnswer {
  // For choice/fill: index of selected option in shuffled array, or -1 if unanswered
  // For fill: array of user answers per blank
  // For multi-choice: array of selected option indices (number[])
  [key: string]: number | number[] | string[]
}

export interface QuizState {
  score: number
  answered: number
  questions: Omit<Question, 'shuffledOptions' | 'correctShuffledIdx' | 'correctShuffledIndices'> & {
    shuffledOptions?: Option[]
    correctShuffledIdx?: number
    correctShuffledIndices?: number[]
  }[]
  answers: SavedAnswer
}
