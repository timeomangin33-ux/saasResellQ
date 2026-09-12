-- Page partenaire et comptage des visiteurs : ce que la base doit recevoir.
--
-- À coller tel quel dans l'éditeur SQL de Neon (console.neon.tech, votre
-- projet, onglet « SQL Editor »), ou à appliquer avec `npm run db:push` depuis
-- une machine qui a DATABASE_URL.
--
-- Pourquoi un fichier à coller plutôt qu'une migration Prisma : le dossier
-- `migrations/` est en retard de plusieurs tables sur `schema.prisma` — la
-- table des parrainages elle-même n'y figure pas — et le workflow « Prisma
-- Migrate Deploy » échoue à chaque push. Ajouter une migration ici ne ferait
-- que creuser l'écart. Ces quatre instructions, elles, s'appliquent seules.
--
-- Tant que ce n'est pas appliqué, /partenaire répond « page indisponible » et le compteur de
-- visiteurs reste à zéro : le reste du site n'est pas affecté.

-- AlterTable
ALTER TABLE "referrals" ADD COLUMN     "jeton" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- CreateTable
CREATE TABLE "referral_visites" (
    "code" TEXT NOT NULL,
    "jour" TIMESTAMP(3) NOT NULL,
    "visiteurs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "referral_visites_pkey" PRIMARY KEY ("code","jour")
);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_jeton_key" ON "referrals"("jeton");

-- AddForeignKey
ALTER TABLE "referral_visites" ADD CONSTRAINT "referral_visites_code_fkey" FOREIGN KEY ("code") REFERENCES "referrals"("code") ON DELETE CASCADE ON UPDATE CASCADE;

