import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorIcon } from './icons/ErrorIcon';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="bg-gray-900 min-h-screen text-gray-100 font-sans flex items-center justify-center p-4">
             <div 
                className="absolute top-0 left-0 w-full h-full bg-cover bg-center opacity-10"
                style={{backgroundImage: "url('https://images.unsplash.com/photo-1515523110820-9d116ad3f243?q=80&w=2070&auto=format&fit=crop')"}}>
            </div>
            <div className="relative z-10 text-center p-8 bg-red-900/30 backdrop-blur-md border border-red-500 rounded-xl max-w-lg mx-auto shadow-2xl">
                <ErrorIcon className="w-20 h-20 text-red-400 mx-auto mb-6" />
                <h1 className="text-3xl font-extrabold text-white mb-3">Oops! Something Went Wrong</h1>
                <p className="text-red-200 mb-8">
                    The application encountered an unexpected error. Please try reloading the page. If the problem persists, please contact support.
                </p>
                <button
                    onClick={this.handleReload}
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all duration-200 ease-in-out shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/50"
                >
                    Reload App
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
