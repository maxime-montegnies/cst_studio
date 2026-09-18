export interface Stat {
  value: string;
  label: string;
  /** If set, value is animated as a count-up from 0 to this number. */
  countTo?: number;
  /** Optional suffix appended to the counted number, e.g. '+'. */
  suffix?: string;
}

export const stats: Stat[] = [
  { value: '50+', countTo: 50, suffix: '+', label: 'Clients accompagnés' },
  { value: '200+', countTo: 200, suffix: '+', label: 'Projets réalisés' },
  { value: '5+', countTo: 5, suffix: '+', label: "Années d'expérience" },
  { value: '4K', label: 'Qualité de tournage' },
];
