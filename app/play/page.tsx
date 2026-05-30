import { requireAuth } from "@/lib/auth";
import PlayClient from "./PlayClient";

export default async function PlayPage() {
  await requireAuth();
  return <PlayClient />;
}
