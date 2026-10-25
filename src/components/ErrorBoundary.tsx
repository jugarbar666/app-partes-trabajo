import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-red-500/50 rounded-2xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-lg font-bold text-white">Se ha producido un error inesperado</h2>
                <p className="text-xs text-slate-400">La aplicación ha detectado un problema al cargar la vista.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-700/60 font-mono text-xs text-red-300 break-words max-h-48 overflow-y-auto">
              {this.state.error?.message || 'Error desconocido'}
              {this.state.error?.stack && (
                <pre className="mt-2 text-[10px] text-slate-400 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer text-center"
              >
                🔄 Recargar página
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition cursor-pointer text-center"
              >
                🧹 Limpiar datos locales y reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
