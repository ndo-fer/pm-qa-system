import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const projectCode = session?.user?.projectCode || "ERP-PM";
  redirect(`/${projectCode}/dashboard`);
}
