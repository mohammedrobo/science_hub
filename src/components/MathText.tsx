'use client';

import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';

interface MathTextProps {
    text: string;
    className?: string;
}

export const MathText = ({ text, className }: MathTextProps) => {
    if (!text) return null;

    // Helper to split text by delimiters
    // We look for $$...$$ first, then $...$
    // This is a basic parser.

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Regex for Block Math $$...$$
    // Regex for Inline Math $...$
    // Note: JS Regex doesn't support recursive matching, but this handles basic cases.
    const regex = /(\$\$([\s\S]+?)\$\$)|(\$([^\$\n]+?)\$)/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
        }

        const fullMatch = match[0];
        const blockContent = match[2];
        const inlineContent = match[4];

        if (blockContent) {
            parts.push(<BlockMath key={`block-${match.index}`}>{blockContent}</BlockMath>);
        } else if (inlineContent) {
            parts.push(<InlineMath key={`inline-${match.index}`}>{inlineContent}</InlineMath>);
        }

        lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(<span key={`text-end`}>{text.substring(lastIndex)}</span>);
    }

    return <span className={className}>{parts}</span>;
};
