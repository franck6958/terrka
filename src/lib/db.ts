import "server-only";
import { neon } from "@neondatabase/serverless";

// Connexion à la base Neon Postgres (TREKKA).
// La chaîne de connexion est lue depuis la variable d'environnement DATABASE_URL
// définie dans .env.local — jamais committée (cf. .gitignore).
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL est manquante. Renseignez-la dans .env.local (voir README)."
  );
}

// `sql` est une fonction template taggée : sql`SELECT ... ${valeur}` est paramétré.
export const sql = neon(process.env.DATABASE_URL);
