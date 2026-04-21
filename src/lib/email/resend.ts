const RESEND_API_URL = "https://api.resend.com/emails";

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "Intimacy Tracker <onboarding@resend.dev>";
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Intimacy Tracker";

  return { apiKey, from, appName };
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const { apiKey, from, appName } = getEmailConfig();

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const html = `
  <div style="font-family: Inter, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827;">
    <h2 style="margin: 0 0 12px;">重置你的密码</h2>
    <p style="margin: 0 0 12px;">我们收到了你的密码重置请求。</p>
    <p style="margin: 0 0 20px;">
      <a href="${resetLink}" style="display: inline-block; padding: 10px 16px; border-radius: 8px; background: #111827; color: #ffffff; text-decoration: none;">
        立即重置密码
      </a>
    </p>
    <p style="margin: 0 0 8px; color: #4b5563;">如果按钮无法点击，请复制以下链接到浏览器打开：</p>
    <p style="margin: 0; word-break: break-all; color: #1f2937;">${resetLink}</p>
  </div>`;

  const text = `重置你的密码\n\n请打开以下链接完成重置：\n${resetLink}\n\n若非本人操作，请忽略此邮件。`;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[${appName}] 重置密码`,
      html,
      text,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend send failed: ${response.status} ${errorText}`);
  }
}

export async function sendSignupVerificationEmail(to: string, verifyLink: string) {
  const { apiKey, from, appName } = getEmailConfig();

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const html = `
  <div style="font-family: Inter, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827;">
    <h2 style="margin: 0 0 12px;">验证你的邮箱</h2>
    <p style="margin: 0 0 12px;">感谢注册 ${appName}。</p>
    <p style="margin: 0 0 20px;">
      <a href="${verifyLink}" style="display: inline-block; padding: 10px 16px; border-radius: 8px; background: #111827; color: #ffffff; text-decoration: none;">
        立即验证邮箱
      </a>
    </p>
    <p style="margin: 0 0 8px; color: #4b5563;">如果按钮无法点击，请复制以下链接到浏览器打开：</p>
    <p style="margin: 0; word-break: break-all; color: #1f2937;">${verifyLink}</p>
  </div>`;

  const text = `验证你的邮箱\n\n请打开以下链接完成验证：\n${verifyLink}\n\n如果不是你本人操作，请忽略此邮件。`;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[${appName}] 验证邮箱`,
      html,
      text,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend send failed: ${response.status} ${errorText}`);
  }
}
