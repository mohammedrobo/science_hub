'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * SafetyErrorBoundary — Catches render errors in safety dashboard tabs
 * so that one broken tab doesn't crash the entire dashboard.
 */
export class SafetyErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[SafetyDashboard] Component error:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-zinc-800 bg-zinc-900/50 min-h-[200px] gap-4">
                    <div className="p-3 rounded-full bg-red-500/10">
                        <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-sm font-semibold text-zinc-200">
                            {this.props.fallbackTitle || 'Something went wrong'}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 max-w-md">
                            {this.state.error?.message || 'An unexpected error occurred while loading this section.'}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="gap-2 text-xs"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Try Again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
