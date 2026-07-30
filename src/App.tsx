import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ProjectsPage } from './features/projects/ProjectsPage'
import { ProjectDetailPage } from './features/projects/ProjectDetailPage'
import { ReviewsPage } from './features/reviews/ReviewsPage'
import { SettingsPage } from './features/settings/SettingsPage'

const router = createBrowserRouter([
  { element: <AppShell />, children: [
    { index: true, element: <Navigate to="/projects" replace /> },
    { path: '/projects', element: <ProjectsPage /> },
    { path: '/projects/:projectId', element: <ProjectDetailPage /> },
    { path: '/reviews', element: <ReviewsPage /> },
    { path: '/settings', element: <SettingsPage /> },
    { path: '*', element: <Navigate to="/projects" replace /> },
  ] },
])

export default function App() { return <RouterProvider router={router} /> }
