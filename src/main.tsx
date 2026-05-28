import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router";
import "./App.css";

import App from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReduxProvider } from "./providers/redux-provider";

const queryClient = new QueryClient();
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ReduxProvider>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <App />
        </HashRouter>
      </QueryClientProvider>
    </ReduxProvider>
  </React.StrictMode>,
);
