import next from 'eslint-config-next'

const base = Array.isArray(next) ? next : [next]

const configuration = [
  {
    /**
     * Ce que le linter ne doit pas lire.
     *
     * Sans ce bloc, `npm run lint` parcourait aussi `.claude/worktrees/`, qui
     * contient une copie complète du dépôt : chaque défaut y était signalé une
     * seconde fois, sous un chemin qui n'existe pas dans le code source. Idem
     * pour le dossier `resellq/`, duplicata hérité d'une ancienne arborescence.
     *
     * Les deux scripts nommés en dernier sont des codemods d'un jour, écrits en
     * CommonJS mais portant l'extension `.js` dans un projet déclaré
     * `"type": "module"` : ils ne s'analysent pas, et leurs jumeaux `.cjs`
     * fonctionnent. Ils ne cassaient pas le produit, seulement `npm run
     * check:ci`, qui refusait donc de passer au vert pour deux fichiers morts.
     */
    ignores: [
      'node_modules/**',
      '.next/**',
      '.claude/**',
      'backups/**',
      'resellq/**',
      'vinted-discord-bot-main/**',
      'scripts/convert_single_to_double.js',
      'scripts/text_sweep.js',
    ],
  },
  ...base,
  {
    rules: {
      // Pointilleux sur une interface en français pleine d'apostrophes ; ce
      // n'est pas un vrai défaut.
      'react/no-unescaped-entities': 'off',
    },
  },
]

export default configuration
