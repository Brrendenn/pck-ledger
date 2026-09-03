import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function ProjectsRootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  const assignedProjectId = (session.user as any)?.assignedProjectId;

  if (role === "CLIENT" && assignedProjectId) {
    redirect(`/projects/${assignedProjectId}`);
  }

  redirect("/");
}