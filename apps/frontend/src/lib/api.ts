import type { Question } from '@quizly/types'

const API_BASE = '/api'

export async function getQuestions(): Promise<Question[]> {
  const res = await fetch(`${API_BASE}/questions`)
  if (!res.ok)
    throw new Error('Failed to fetch questions')
  return res.json()
}

export async function saveQuestions(questions: Question[]): Promise<{ success: boolean, questions?: Question[], error?: string }> {
  const res = await fetch(`${API_BASE}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(questions),
  })
  if (!res.ok)
    throw new Error('Failed to save questions')
  return res.json()
}

export async function verifyAdminPassword(password: string): Promise<{ success: boolean, error?: string }> {
  const res = await fetch(`${API_BASE}/admin/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  })
  if (!res.ok)
    throw new Error('Failed to verify admin password')
  return res.json()
}
