import next from 'eslint-config-next'

const base = Array.isArray(next) ? next : [next]

export default [
  ...base,
  {
    rules: {
      // Pedantic for French copy full of apostrophes; not a real bug.
      'react/no-unescaped-entities': 'off',
    },
  },
]
