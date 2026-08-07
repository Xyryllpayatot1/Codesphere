import { requireSession } from "@/lib/auth";
import { handle } from "@/lib/api";
import { loadNetMissionCatalog } from "@/lib/net/progress";

export const GET = handle(async () => {
  const session = await requireSession();
  return loadNetMissionCatalog(session.id);
});
