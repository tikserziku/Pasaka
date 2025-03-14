// Add the router configuration to your layout or main component
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Configure the router with future flags
const router = createBrowserRouter(
  [
    // Your routes here
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

// Then use this router in your application