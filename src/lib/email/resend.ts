const RESEND_API_URL = "https://api.resend.com/emails";

const emailT = {
  en: {
    appName: "Intimacy Tracker",
    verifyEmailHeading: "Verify your email",
    verifyEmailBody: "Welcome to <strong>{appName}</strong>! To secure your account and activate all features, please verify your email address.",
    verifyEmailButton: "Verify email now",
    verifyEmailFooter: "You received this email because you registered an account in our app. If you did not do this, please ignore this email.",
    verifyEmailSubject: "Verify your email",
    verifyEmailText: "Verify your email\n\nPlease open the following link to complete verification:\n{link}\n\nIf this was not you, please ignore this email.",
    resetPasswordHeading: "Reset your password",
    resetPasswordBody: "We received a password reset request for <strong>{appName}</strong>. If you initiated this request, click the button below to reset your password. This link is valid for a short time only.",
    resetPasswordButton: "Reset password",
    resetPasswordFooter: "If you did not request a password reset, please ignore this email. Your account is still secure.",
    resetPasswordSubject: "Reset your password",
    resetPasswordText: "Reset your password\n\nPlease open the following link to reset:\n{link}\n\nIf this was not you, please ignore this email.",
    pinResetHeading: "PIN Reset Code",
    pinResetBody: "Your PIN reset verification code is:",
    pinResetCodeBody: "Your PIN reset verification code is:",
    pinResetFooter: "This code is valid for 10 minutes. If you did not request this, please ignore this email.",
    pinResetSubject: "PIN Reset Code",
    pinResetText: "Your PIN Reset Code: {code}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.",
    pinResetExplanation: "You received this email because you initiated a PIN reset request in {appName}.",
    linkFallback: "If the button doesn't work, copy and paste the link below into your browser:",
    allRightsReserved: "All rights reserved.",
  },
  zh: {
    appName: "Intimacy Tracker",
    verifyEmailHeading: "验证你的邮箱",
    verifyEmailBody: "欢迎加入 <strong>{appName}</strong>！为了确保你的账号安全并激活所有功能，请验证你的电子邮箱地址。",
    verifyEmailButton: "立即验证邮箱",
    verifyEmailFooter: "你收到这封邮件是因为你在我们的应用中注册了账号。如果你没有进行此操作，请忽略此邮件。",
    verifyEmailSubject: "验证邮箱",
    verifyEmailText: "验证你的邮箱\n\n请打开以下链接完成验证：\n{link}\n\n如果不是你本人操作，请忽略此邮件。",
    resetPasswordHeading: "重置你的密码",
    resetPasswordBody: "我们收到了你在 <strong>{appName}</strong> 的密码重置请求。如果你发起了此请求，请点击下方按钮重置密码。该链接仅在短时间内有效。",
    resetPasswordButton: "重置密码",
    resetPasswordFooter: "如果你没有请求重置密码，请忽略此邮件，你的账号依然安全。",
    resetPasswordSubject: "重置密码",
    resetPasswordText: "重置你的密码\n\n请打开以下链接完成重置：\n{link}\n\n若非本人操作，请忽略此邮件。",
    pinResetHeading: "PIN 重置验证码",
    pinResetBody: "你的 PIN 重置验证码为：",
    pinResetCodeBody: "你的 PIN 重置验证码为：",
    pinResetFooter: "验证码有效期为 10 分钟。如果非本人操作，请忽略此邮件。",
    pinResetSubject: "PIN 重置验证码",
    pinResetText: "你的 PIN 重置验证码为：{code}\n\n验证码有效期为 10 分钟。\n\n如果非本人操作，请忽略此邮件。",
    pinResetExplanation: "你收到这封邮件是因为你在 {appName} 中发起了 PIN 重置请求。",
    linkFallback: "如果按钮无法点击，请复制并访问以下链接：",
    allRightsReserved: "版权所有。",
  },
};

function tt(locale: string, key: string, vars?: Record<string, string>) {
  const t = locale === "en" ? emailT.en : emailT.zh;
  let text = (t as Record<string, string>)[key] ?? (emailT.en as Record<string, string>)[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
  }
  return text;
}

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
  footerText: string,
  lang = "zh"
) {
  return `
<!DOCTYPE html>
<html lang="${lang}">
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
                <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">${tt(lang === "zh" ? "zh" : "en", "linkFallback")}</p>
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

export async function sendPasswordResetEmail(to: string, resetLink: string, locale = "zh") {
  const { apiKey, from, appName } = getEmailConfig();

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const html = buildHtmlEmail(
    appName,
    tt(locale, "resetPasswordHeading"),
    tt(locale, "resetPasswordBody", { appName }),
    tt(locale, "resetPasswordButton"),
    resetLink,
    tt(locale, "resetPasswordFooter"),
    locale
  );

  const text = tt(locale, "resetPasswordText", { link: resetLink });

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[${appName}] ${tt(locale, "resetPasswordSubject")}`,
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

export async function sendPinResetCodeEmail(to: string, code: string, locale = "zh") {
  const { apiKey, from, appName } = getEmailConfig();

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const lang = locale === "en" ? "en" : "zh";

  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tt(locale, "pinResetHeading")}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7; padding: 40px 0; width: 100%;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center; border-bottom: 1px solid #f3f4f6;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">${appName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; text-align: center;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">${tt(locale, "pinResetHeading")}</h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #4b5563;">
                ${tt(locale, "pinResetBody")}
              </p>
              <div style="font-size: 40px; font-weight: 700; letter-spacing: 8px; color: #111827; background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 0 auto 24px; display: inline-block;">
                ${code}
              </div>
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                ${tt(locale, "pinResetFooter")}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #6b7280;">
                ${tt(locale, "pinResetExplanation", { appName })}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = tt(locale, "pinResetText", { code });

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[${appName}] ${tt(locale, "pinResetSubject")}`,
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

export async function sendSignupVerificationEmail(to: string, verifyLink: string, locale = "zh") {
  const { apiKey, from, appName } = getEmailConfig();

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const html = buildHtmlEmail(
    appName,
    tt(locale, "verifyEmailHeading"),
    tt(locale, "verifyEmailBody", { appName }),
    tt(locale, "verifyEmailButton"),
    verifyLink,
    tt(locale, "verifyEmailFooter"),
    locale
  );

  const text = tt(locale, "verifyEmailText", { link: verifyLink });

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[${appName}] ${tt(locale, "verifyEmailSubject")}`,
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
