import SideNav from "@/components/layout/SideNav";
import BottomNav from "@/components/layout/BottomNav";
import AssistantPanel from "@/components/common/AssistantPanel";
import { useWallet } from "@/lib/useWallet";

export default function AppShell({ children }) {
  const { coins, level } = useWallet();

  return (
    <div className="relative min-h-screen">
      <div className="mx-auto flex w-full max-w-[1440px]">
        <SideNav coins={coins} level={level} />
        <main className="min-h-screen w-full flex-1 border-border/50 pb-24 lg:border-x lg:pb-0">
          {children}
        </main>
      </div>
      <AssistantPanel />
      <BottomNav />
    </div>
  );
}
