export interface Service {
  num: string;
  category: string;
  title: string;
  description: string;
  tags: string[];
}

export const services: Service[] = [
  {
    num: '01',
    category: 'Production Vidéo',
    title: "Vidéo d'Entreprise",
    description:
      "Films institutionnels, publicités digitales, interviews corporate, reportages événementiels. L'exigence du cinéma au service de votre message.",
    tags: ['Film institutionnel', 'Publicité digitale', 'Interview', 'Reportage'],
  },
  {
    num: '02',
    category: 'Imagerie Aérienne',
    title: 'Drone & Aérien',
    description:
      'Drone certifié catégorie A1/A3, prises de vue 4K à 360°, time-lapse aériens. Des angles impossibles qui subliment vos espaces et événements.',
    tags: ['Drone certifié', '4K Ultra HD', 'Time-lapse', 'Immobilier'],
  },
  {
    num: '03',
    category: 'Photographie',
    title: 'Photo Corporate',
    description:
      "Portraits corporate, shooting événementiel, photographie d'architecture et de produit. Des images qui renforcent votre identité visuelle.",
    tags: ['Corporate', 'Événementiel', 'Architecture', 'Produit'],
  },
  {
    num: '04',
    category: 'Web & Digital',
    title: 'Site Internet',
    description:
      'Conception web sur mesure, identité digitale, landing pages haute performance. Votre vitrine en ligne pensée pour attirer, convaincre et convertir.',
    tags: ['Site vitrine', 'Landing page', 'Identité digitale', 'SEO'],
  },
];
