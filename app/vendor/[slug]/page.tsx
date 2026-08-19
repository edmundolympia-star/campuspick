import { StudentOrderClient } from "./student-order-client";

export default async function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <StudentOrderClient slug={slug} />;
}
