import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router";
import "./App.css";
import App from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";



const queryClient = new QueryClient();
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      
    <HashRouter>
      <App />
    </HashRouter>
       </QueryClientProvider>
  </React.StrictMode>,
);
