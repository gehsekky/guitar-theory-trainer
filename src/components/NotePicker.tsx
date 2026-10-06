import { CHROMATIC, displayNote, type Note } from '../theory';

interface NotePickerProps {
  /** Currently selected notes. */
  selected: Note[];
  /** Max number of notes selectable at once (1 for single-choice). */
  max: number;
  onChange: (selected: Note[]) => void;
  disabled?: boolean;
  /** Notes to visually mark as correct/incorrect after grading. */
  correctNotes?: Note[];
  graded?: boolean;
}

/**
 * Grid of note toggle buttons. With max=1 it behaves like a radio group;
 * with max=3 it lets the user build a set of notes (selecting a 4th when
 * full deselects nothing — the user must tap a selected note to free a slot,
 * except in single-select mode where the choice simply moves).
 */
export default function NotePicker({
  selected,
  max,
  onChange,
  disabled,
  correctNotes,
  graded,
}: NotePickerProps) {
  function toggle(note: Note) {
    if (selected.includes(note)) {
      onChange(selected.filter((n) => n !== note));
    } else if (max === 1) {
      onChange([note]);
    } else if (selected.length < max) {
      onChange([...selected, note]);
    }
  }

  return (
    <div className="note-picker" role="group" aria-label="Note choices">
      {CHROMATIC.map((note) => {
        const isSelected = selected.includes(note);
        const isCorrect = graded && correctNotes?.includes(note);
        const isWrongPick = graded && isSelected && !correctNotes?.includes(note);
        let cls = 'note-btn';
        if (isSelected) cls += ' selected';
        if (isCorrect) cls += ' correct';
        if (isWrongPick) cls += ' wrong';
        return (
          <button
            key={note}
            type="button"
            className={cls}
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => toggle(note)}
          >
            {displayNote(note)}
          </button>
        );
      })}
    </div>
  );
}
