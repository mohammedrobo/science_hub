declare module 'react-katex' {
    import React from 'react';

    export interface KatexProps {
        children?: React.ReactNode;
        math?: string;
        block?: boolean;
        errorColor?: string;
        renderError?: (error: any) => React.ReactNode;
        settings?: any;
        as?: any;
        style?: React.CSSProperties;
        className?: string;
        [key: string]: any;
    }

    export const InlineMath: React.FC<KatexProps | { children: string }>;
    export const BlockMath: React.FC<KatexProps | { children: string }>;
}
