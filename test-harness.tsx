import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./src/App.css";
import { ReduxProvider } from "./src/providers/redux-provider";
import { ThemeProvider } from "./src/providers/theme-provider";
import ImportModal from "./src/components/products/import";

const queryClient = new QueryClient();
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ReduxProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ImportModal onClose={() => {}} />
        </ThemeProvider>
      </QueryClientProvider>
    </ReduxProvider>
  </React.StrictMode>,
);
