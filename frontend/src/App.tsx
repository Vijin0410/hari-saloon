import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers/AppProviders';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { router } from '@/router';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  );
}
