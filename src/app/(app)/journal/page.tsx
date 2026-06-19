import { History } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { getJournal } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Journal d'audit (BF-15 / BNF-09) : trace horodatée et inaltérable de chaque action.
export default async function JournalPage() {
  const entrees = await getJournal();
  return (
    <>
      <Topbar title="Journal d'audit" />
      <main className="space-y-5 p-5 lg:p-6">
        <p className="flex items-center gap-2 text-sm text-slate">
          <History size={15} /> Historique complet et horodaté des actions (traçabilité — BNF-09).
        </p>

        <div className="card p-5">
          {entrees.length === 0 ? (
            <p className="text-sm text-muted">Aucune action enregistrée pour le moment.</p>
          ) : (
            <ol className="relative space-y-6 border-l border-line pl-6">
              {entrees.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[1.69rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-interactive" />
                  <p className="text-sm text-ink">
                    <span className="font-medium">{e.acteur}</span> {e.action}{" "}
                    <span className="text-slate">« {e.cible} »</span>
                  </p>
                  <p className="text-xs text-muted">{new Date(e.date).toLocaleString("fr-FR")}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </>
  );
}
