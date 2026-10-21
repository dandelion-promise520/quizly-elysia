import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import AdminDashboard from '@/components/AdminDashboard'
import FloatingActions from '@/components/FloatingActions'
import QuizPage from '@/components/QuizPage'
import { ThemeProvider } from '@/components/theme-provider'

import { ToastProvider } from '@/components/toast-provider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <>
      <QuizPage />
      <FloatingActions />
    </>
  ),
})

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminDashboard,
})

const routeTree = rootRoute.addChildren([indexRoute, adminRoute])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="quizly-theme-v2">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
