export interface Testimonial {
  text: string;
  initials: string;
  name: string;
  role: string;
}

export const testimonials: Testimonial[] = [
  {
    text: "Un travail exceptionnel sur notre film institutionnel. L'équipe a su capter l'essence de notre marque avec une précision et une créativité remarquables.",
    initials: 'FC',
    name: 'Direction Communication',
    role: 'FC Metz',
  },
  {
    text: 'Des prises de vue aériennes absolument spectaculaires pour notre événement. Réactivité, professionnalisme et rendu cinématique au rendez-vous.',
    initials: 'CO',
    name: 'Responsable Événements',
    role: 'Castres Olympique',
  },
  {
    text: 'Notre site et notre identité visuelle ont été entièrement repensés. Résultat bluffant, délais respectés, communication parfaite tout au long du projet.',
    initials: 'TI',
    name: 'Directeur Général',
    role: 'Triangle Impérial',
  },
];
