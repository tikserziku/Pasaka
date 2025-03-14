// Import the necessary components from react-router-dom
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Your routes configuration
const router = createBrowserRouter(
  [
    // Your routes here
  ],
  {
    // Add these future flags to opt-in to v7 behavior
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

// Your router component
export function Router() {
  return <RouterProvider router={router} />;
}