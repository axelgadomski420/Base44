import { RodoBanner } from "@/components/common/RodoBanner";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import AssistantPanel from "@/components/assistant/AssistantPanel";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
}></>

function AppLayout() {
  return (
    <><RodoBanner />
    <AppShell>
      <Outlet />
      <AssistantPanel />
    </AppShell>
  ></>
}
