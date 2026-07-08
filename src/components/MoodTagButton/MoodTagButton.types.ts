export interface MoodTagButtonProps {
  tag: string;
  selected: boolean;
  onToggle: (tag: string) => void;
}
