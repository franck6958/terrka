import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { StoreStatus } from "@/components/StoreStatus";
import { ScrollToTop } from "@/components/ScrollToTop";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth-context";
import { getSessionUser } from "@/lib/auth";

// Le segment dépend de la session (cookies) : rendu dynamique, jamais prérendu.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Le middleware protège déjà ces routes ; garde-fou supplémentaire côté serveur.
  const session = await getSessionUser();
  if (!session) redirect("/connexion");

  const user = { id: session.sub, nom: session.nom, role: session.role, email: session.email };

  return (
    <AuthProvider user={user}>
      <StoreProvider>
        <div className="flex h-screen overflow-hidden bg-surface">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-y-auto">
            <StoreStatus />
            {children}
            <ScrollToTop />
          </div>
        </div>
      </StoreProvider>
    </AuthProvider>
  );
}
