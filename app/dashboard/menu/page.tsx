import { DashboardChrome } from "@/components/AppChrome";
import { MenuClient } from "./menu-client";

export default function MenuPage() {
  return (
    <DashboardChrome active="menu">
      <MenuClient />
    </DashboardChrome>
  );
}
