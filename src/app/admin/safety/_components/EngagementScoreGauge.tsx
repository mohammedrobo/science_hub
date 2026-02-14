'use client';

interface EngagementScoreGaugeProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export function EngagementScoreGauge({ score, size = 'md', showLabel = true }: EngagementScoreGaugeProps) {
    const sizes = { sm: 48, md: 80, lg: 120 };
    const s = sizes[size];
    const strokeWidth = size === 'sm' ? 4 : size === 'md' ? 6 : 8;
    const radius = (s - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const color =
        score >= 80 ? '#22c55e' :
        score >= 60 ? '#3b82f6' :
        score >= 40 ? '#eab308' :
        score >= 20 ? '#f97316' : '#ef4444';

    const label =
        score >= 80 ? 'Excellent' :
        score >= 60 ? 'Good' :
        score >= 40 ? 'Average' :
        score >= 20 ? 'Low' : 'Critical';

    const fontSize = size === 'sm' ? 12 : size === 'md' ? 18 : 28;
    const labelFontSize = size === 'sm' ? 7 : size === 'md' ? 9 : 11;

    return (
        <div className="flex flex-col items-center gap-1">
            <svg width={s} height={s} className="transform -rotate-90">
                <circle
                    cx={s / 2} cy={s / 2} r={radius}
                    fill="none"
                    stroke="#27272a"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={s / 2} cy={s / 2} r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
                />
                <text
                    x={s / 2} y={s / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={fontSize}
                    fontWeight="bold"
                    className="rotate-90"
                    style={{ transformOrigin: 'center' }}
                >
                    {score}
                </text>
            </svg>
            {showLabel && (
                <span
                    className="font-medium"
                    style={{ color, fontSize: labelFontSize }}
                >
                    {label}
                </span>
            )}
        </div>
    );
}
