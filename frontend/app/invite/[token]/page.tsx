import { InviteRedeemPage } from "../../../components/InviteRedeemPage";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteRedeemPage token={token} />;
}
