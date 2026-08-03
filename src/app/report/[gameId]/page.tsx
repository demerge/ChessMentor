import { ReportScreen } from "@/components/report/ReportScreen";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <ReportScreen gameId={gameId} />;
}
