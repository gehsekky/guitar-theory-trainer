import './SegmentedControl.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  /** Accessible name of the group, e.g. "Difficulty". */
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  /** Called only when the selection actually changes. */
  onChange: (value: T) => void;
}

/** A row of mutually exclusive buttons (Easy | Hard), as a radio group. */
export default function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="mode-toggle" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? 'mode-btn active' : 'mode-btn'}
          onClick={() => {
            if (option.value !== value) onChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
