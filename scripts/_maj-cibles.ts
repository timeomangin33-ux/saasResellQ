import { chargerEnv } from './charger-env'
chargerEnv()
async function main() {
  const { prisma } = await import('../prisma')
  const { count } = await prisma.collectTarget.updateMany({ data: { sweepMaxPages: 30 } })
  console.log(`${count} cible(s) ramenée(s) à 30 pages par balayage.`)
  const cibles = await prisma.collectTarget.findMany({
    select: { query: true, sweepMaxPages: true, sweepIntervalMinutes: true, intervalMinutes: true },
    orderBy: { priority: 'desc' },
  })
  for (const c of cibles) {
    console.log(`  ${c.query.padEnd(20)} balayage ${c.sweepMaxPages} pages / ${c.sweepIntervalMinutes} min · rafraîchissement ${c.intervalMinutes} min`)
  }
  await prisma.$disconnect()
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exit(1)})
