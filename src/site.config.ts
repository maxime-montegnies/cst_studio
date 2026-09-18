export const site = {
  name: 'CST Studio',
  tagline: 'Production audiovisuelle — Metz, Grand Est',
  description:
    "Studio de production audiovisuelle à Metz. Films d'entreprise, drone, photographie corporate et création web. Du concept à la livraison.",
  url: 'https://cststudio-pro.com',
  locale: 'fr_FR',

  email: 'hello@cststudio-pro.com',
  phone: '+33663096570',
  phoneDisplay: '+33 6 63 09 65 70',
  location: 'Metz, Grand Est — France',
  city: 'Metz',
  region: 'Grand Est',
  country: 'FR',

  hours: 'Lun–Ven · 9h–19h',
  travel: 'France entière & international',
  responseTime: 'Réponse sous 24h',

  social: {
    instagram: 'https://www.instagram.com/_cststudio_',
    linkedin: 'https://www.linkedin.com/in/theo-costa-430263182',
    vimeo: 'https://vimeo.com/user228928661',
  },
} as const;

export const nav = [
  { label: 'Services', href: '#services' },
  { label: 'Réalisations', href: '#realisations' },
  { label: 'Méthode', href: '#methode' },
  { label: 'Studio', href: '#studio' },
] as const;
