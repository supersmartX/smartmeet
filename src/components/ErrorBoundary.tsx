"use client";

import React, { ErrorInfo } from "react";
import logger from "@/lib/logger";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error({ error, errorInfo }, "UI Crash detected by ErrorBoundary");
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Something went wrong</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                A critical UI error occurred. Our engineers have been notified.
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Reload Page
            </button>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mt-6 text-left p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-auto max-h-40">
                <p className="text-[10px] font-mono text-red-500 break-all">
                  {this.state.error.stack}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
