import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireCapability } from './auth/guards'
import { AppShell } from './components/layout/AppShell'
import { LoadingState } from './components/ui/States'
import { AssistantPage } from './pages/AssistantPage'
import { LoginPage } from './pages/LoginPage'

/**
 * Routes other than the Incident Assistant are loaded on demand: the assistant
 * is the hot path during an incident and should not pay for the analytics,
 * audit and document tooling up front.
 */
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
)
const AuditPage = lazy(() => import('./pages/AuditPage').then((m) => ({ default: m.AuditPage })))
const DocumentDetailPage = lazy(() =>
  import('./pages/DocumentDetailPage').then((m) => ({ default: m.DocumentDetailPage })),
)
const DocumentsPage = lazy(() =>
  import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })),
)
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
const ReviewQueuePage = lazy(() =>
  import('./pages/ReviewQueuePage').then((m) => ({ default: m.ReviewQueuePage })),
)

function RouteFallback() {
  return <LoadingState label="Loading view…" />
}

/**
 * Route table. `RequireCapability` mirrors the backend's `require_roles` for UX
 * only — authorization is always re-checked server-side.
 */
export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/assistant" replace />} />
          <Route
            path="assistant"
            element={
              <RequireCapability capability="runQuery">
                <AssistantPage />
              </RequireCapability>
            }
          />
          <Route
            path="history"
            element={
              <RequireCapability capability="viewOwnHistory">
                <HistoryPage />
              </RequireCapability>
            }
          />
          <Route
            path="documents"
            element={
              <RequireCapability capability="viewDocuments">
                <DocumentsPage />
              </RequireCapability>
            }
          />
          <Route
            path="documents/:docId"
            element={
              <RequireCapability capability="viewDocumentDetail">
                <DocumentDetailPage />
              </RequireCapability>
            }
          />
          <Route
            path="review"
            element={
              <RequireCapability capability="viewReviewQueue">
                <ReviewQueuePage />
              </RequireCapability>
            }
          />
          <Route
            path="analytics"
            element={
              <RequireCapability capability="viewAnalytics">
                <AnalyticsPage />
              </RequireCapability>
            }
          />
          <Route
            path="audit"
            element={
              <RequireCapability capability="viewAuditLogs">
                <AuditPage />
              </RequireCapability>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
