export interface Feature {
  num: string;
  title: string;
  description: string;
}

export const features: Feature[] = [
  {
    num: '01',
    title: 'Matériel cinéma',
    description:
      'Sony FX3, drones certifiés, éclairage pro — qualité broadcast pour tous les budgets.',
  },
  {
    num: '02',
    title: 'Interlocuteur unique',
    description:
      "Un seul contact du brief à la livraison. Pas de délégation, pas de perte d'information.",
  },
  {
    num: '03',
    title: 'Vision stratégique',
    description:
      'Expertise réseaux sociaux intégrée — chaque vidéo pensée pour sa diffusion dès le tournage.',
  },
  {
    num: '04',
    title: 'Références sectorielles',
    description:
      'Sport professionnel, institutions, corporate, santé, tourisme — on connaît vos enjeux.',
  },
];
