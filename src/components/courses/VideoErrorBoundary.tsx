'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  videoUrl?: string | null;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for the video player.
 * Catches render errors and displays a recovery UI with retry + YouTube fallback.
 */
export class VideoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[VideoErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-6 text-center rounded-lg border border-zinc-800">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-5 border border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">
            Something went wrong
          </h3>
          <p className="text-zinc-400 text-sm mb-6 max-w-sm">
            The video player encountered an unexpected error. You can try
            reloading, or watch the video directly on YouTube.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={this.handleRetry}
              variant="outline"
              className="border-zinc-700 hover:border-primary hover:text-primary gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            {this.props.videoUrl && (
              <Button
                asChild
                className="bg-red-600 hover:bg-red-700 text-white gap-2"
              >
                <a
                  href={this.props.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Watch on YouTube
                </a>
              </Button>
            )}
          </div>
          {this.state.error && (
            <p className="mt-4 text-xs text-zinc-600 font-mono max-w-md truncate">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
