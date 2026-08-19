import { DashboardChrome } from "@/components/AppChrome";
import { SettingsClient } from "./settings-client";

export default function SettingsPage() {
  return (
    <DashboardChrome active="settings">
      <SettingsClient />
    </DashboardChrome>
  );
}
