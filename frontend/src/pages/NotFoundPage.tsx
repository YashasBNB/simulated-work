import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/States'

export function NotFoundPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-5 py-16">
      <div className="rounded-lg border border-noc-200 bg-white">
        <EmptyState
          title="Page not found"
          description="The route you requested does not exist in this application."
          action={
            <Link to="/assistant">
              <Button variant="primary">Go to Incident Assistant</Button>
            </Link>
          }
        />
      </div>
    </div>
  )
}
