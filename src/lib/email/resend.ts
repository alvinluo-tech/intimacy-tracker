const RESEND_API_URL = "https://api.resend.com/emails";

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Intimacy Tracker";

  if (!from) {
    throw new Error(
      "Missing RESEND_FROM_EMAIL (must use a verified Resend domain mailbox)"
    );
  }

  return { apiKey, from, appName };
}

function buildHtmlEmail(
  appName: string,
  title: string,
  message: string,
  buttonText: string,
  actionUrl: string,
  footerText: string
) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7; padding: 40px 0; width: 100%;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #f3f4f6;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">
                ${appName}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">${title}</h2>
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 24px; color: #4b5563;">
                ${message}
              </p>
              
              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${actionUrl}" style="display: inline-block; background-color: #5e6ad2; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; border: 1px solid #5e6ad2;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              
              <div style="border-top: 1px solid #f3f4f6; padding-top: 24px;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">如果按钮无法点击，请复制并访问以下链接：</p>
                <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; word-break: break-all;">
                  <a href="${actionUrl}" style="font-size: 14px; color: #5e6ad2; text-decoration: none;">${actionUrl}</a>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; line-height: 20px; color: #6b7280;">
                ${footerText}
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #9ca3af;">
                © ${new Date().getFullYear()} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const { apiKey, from, appName } = getEmailConfig();

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const html = buildHtmlEmail(
    appName,
    "重置你的密码",
    `我们收到了你在 <strong>${appName}</strong> 的密码重置请求。如果你发起了此请求，请点击下方按钮重置密码。该链接仅在短时间内有效。`,
    "重置密码",
    resetLink,
    "如果你没有请求重置密码，请忽略此邮件，你的账号依然安全。"
  );

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

  const html = buildHtmlEmail(
    appName,
    "验证你的邮箱",
    `欢迎加入 <strong>${appName}</strong>！为了确保你的账号安全并激活所有功能，请验证你的电子邮箱地址。`,
    "立即验证邮箱",
    verifyLink,
    "你收到这封邮件是因为你在我们的应用中注册了账号。如果你没有进行此操作，请忽略此邮件。"
  );

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
