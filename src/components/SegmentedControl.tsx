'use client';

interface SegmentedControlProps {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
    return (
        <div className="segmented-control">
            {options.map(opt => (
                <button
                    key={opt.value}
                    className={`segmented-btn ${value === opt.value ? 'active' : ''}`}
                    onClick={() => onChange(opt.value)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
