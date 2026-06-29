import { useEffect, useState } from 'react'
import AdminDashboard from '@/components/AdminDashboard'
import QuizPage from '@/components/QuizPage'

export function App() {
  const [route, setRoute] = useState<'quiz' | 'admin'>(
    window.location.hash === '#/admin' ? 'admin' : 'quiz',
  )

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash === '#/admin' ? 'admin' : 'quiz')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return route === 'admin' ? <AdminDashboard /> : <QuizPage />
}
