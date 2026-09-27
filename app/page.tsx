import AskTGP from "./components/AskTGP";
import { listQAs } from "@/lib/qa";

export const revalidate = 60;

export default async function Home() {
  const items = await listQAs();
  return <AskTGP initialItems={items} />;
}
