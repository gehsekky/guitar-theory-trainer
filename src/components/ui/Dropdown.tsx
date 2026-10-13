import './Dropdown.css';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

export interface DropdownGroup<T extends string> {
  label: string;
  options: readonly DropdownOption<T>[];
}

interface DropdownProps<T extends string> {
  /** Visible label beside the menu, e.g. "Scale". */
  label: string;
  groups: readonly DropdownGroup<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A labeled select with grouped options, styled to match SegmentedControl.
 * Suits choices that would crowd a row of buttons. */
export default function Dropdown<T extends string>({
  label,
  groups,
  value,
  onChange,
}: DropdownProps<T>) {
  return (
    <label className="dropdown">
      {label}
      <span className="dropdown-wrap">
        <select
          className="dropdown-select"
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
        >
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </span>
    </label>
  );
}
