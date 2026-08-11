import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-midnight p-6 text-paper">
          <section className="mx-auto mt-20 max-w-3xl rounded-lg border border-gold/30 bg-white/[.06] p-8">
            <p className="text-sm font-semibold uppercase tracking-[.28em] text-gold">Historical Document Analyzer</p>
            <h1 className="mt-4 font-cinzel text-4xl font-bold">The interface failed to render.</h1>
            <p className="mt-4 text-paper/70">Refresh the page once. If it stays here, the browser console will show the exact frontend error.</p>
            <pre className="mt-6 overflow-auto rounded-md bg-black/35 p-4 text-sm text-red-200">{String(this.state.error?.message || this.state.error)}</pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
