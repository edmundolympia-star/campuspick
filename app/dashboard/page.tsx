import { DashboardChrome } from "@/components/AppChrome";
import { DashboardClient } from "./dashboard-client";

export default function DashboardPage() {
  return (
    <DashboardChrome active="orders">
      <DashboardClient />
    </DashboardChrome>
  );
}
