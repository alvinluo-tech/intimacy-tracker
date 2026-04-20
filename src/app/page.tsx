import { redirect } from "next/navigation";

import { getServerUser } from "@/features/auth/queries";

export default async function Home() {
  const user = await getServerUser();
  redirect(user ? "/dashboard" : "/login");
}
