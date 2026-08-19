import { DashboardChrome } from "@/components/AppChrome";
import { PrintableQrClient } from "./printable-qr-client";

export default function QrPage() {
  return (
    <DashboardChrome active="qr">
      <PrintableQrClient />
    </DashboardChrome>
  );
}
