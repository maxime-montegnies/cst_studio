export interface ProcessStep {
  num: string;
  title: string;
  description: string;
}

export const processSteps: ProcessStep[] = [
  {
    num: '01',
    title: 'Conception & Brief',
    description:
      'On échange sur vos objectifs, cibles et intentions visuelles. Rythme, angles, sound design — tout est pensé avant de toucher une caméra.',
  },
  {
    num: '02',
    title: 'Tournage',
    description:
      "Sony FX3, drone certifié, éclairage cinéma. On capte votre réalité avec l'exigence d'un long-métrage et l'efficacité d'un plateau pro.",
  },
  {
    num: '03',
    title: 'Post-production',
    description:
      'Montage narratif, étalonnage colorimétrique, sound design. Chaque détail affiné pour un rendu cinématique et immersif.',
  },
  {
    num: '04',
    title: 'Diffusion & Suivi',
    description:
      'Formats optimisés par plateforme, conseils stratégiques, accompagnement réseaux. On va jusqu\'au bout — y compris après livraison.',
  },
];
