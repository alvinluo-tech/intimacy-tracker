import { VerifyEmailClient } from "@/components/auth/VerifyEmailClient";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const sent = sp.sent === "1";
  const unverified = sp.unverified === "1";
  const fromRegister = sp.from === "register";
  const fromLoginUnverified = sp.reason === "login_unverified";

  return (
    <div className="space-y-4">
      {fromLoginUnverified ? <Notice>邮箱未验证，请先完成验证后再登录。</Notice> : null}
      {fromRegister && unverified ? (
        <Notice>该邮箱已注册但尚未验证，可在下方重新发送验证邮件。</Notice>
      ) : null}

      <Card className="p-5">
        <VerifyEmailClient
          initialEmail={email}
          initialError={error}
          initialSent={sent}
        />
      </Card>
    </div>
  );
}
