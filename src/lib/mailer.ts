// SMTP2GO HTTP API: https://developers.smtp2go.com/reference/send-standard-email
type Mail = { to: string; subject: string; html: string; text: string };

export async function sendMail({ to, subject, html, text }: Mail) {
  const res = await fetch("https://api.smtp2go.com/v3/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Smtp2go-Api-Key": process.env.SMTP2GO_API_KEY!,
    },
    body: JSON.stringify({
      sender: process.env.MAIL_FROM,
      to: [to],
      subject,
      html_body: html,
      text_body: text,
    }),
  });
  if (!res.ok) {
    throw new Error(`SMTP2GO ${res.status}: ${await res.text()}`);
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function otpEmail(code: string) {
  return {
    subject: `Your sign-in code: ${code}`,
    text: `Your sign-in code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your sign-in code is:</p><p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p><p>It expires in 10 minutes. If you didn't request it, ignore this email.</p>`,
  };
}

export function receiptEmail(p: {
  name: string;
  amount: number;
  currency: string;
  id: string;
  date: Date;
}) {
  const total = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: p.currency.toUpperCase(),
  }).format(p.amount / 100);
  const when = p.date.toUTCString();
  return {
    subject: `Receipt for your payment of ${total}`,
    text: `Hi ${p.name},\n\nThanks for your payment.\n\nAmount: ${total}\nReference: ${p.id}\nDate: ${when}\n`,
    html: `<h2>Payment receipt</h2><p>Hi ${esc(p.name)}, thanks for your payment.</p><table cellpadding="6"><tr><td>Amount</td><td><b>${total}</b></td></tr><tr><td>Reference</td><td>${esc(p.id)}</td></tr><tr><td>Date</td><td>${when}</td></tr></table>`,
  };
}

export function refundEmail(p: {
  name: string;
  currency: string;
  id: string;
  refunded: number; // newly refunded amount, minor units
  paymentAmount: number; // original payment
  totalRefunded: number; // cumulative incl. this refund
}) {
  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: p.currency.toUpperCase(),
    }).format(cents / 100);
  const partial = p.totalRefunded < p.paymentAmount;
  const refunded = fmt(p.refunded);
  const remaining = fmt(p.paymentAmount - p.totalRefunded);
  const lead = partial
    ? `We've refunded ${refunded} of your ${fmt(p.paymentAmount)} payment.`
    : `We've refunded your payment of ${refunded}.`;
  const timing =
    "It typically takes 5-10 business days to appear on your statement, depending on your bank.";
  return {
    subject: partial
      ? `Partial refund of ${refunded} issued`
      : `Your refund of ${refunded} is on its way`,
    text: `Hi ${p.name},\n\n${lead}\n${partial ? `Remaining charged: ${remaining}\n` : ""}Reference: ${p.id}\n\n${timing}\n`,
    html: `<h2>${partial ? "Partial refund issued" : "Refund issued"}</h2><p>Hi ${esc(p.name)}, ${lead}</p><table cellpadding="6"><tr><td>Refunded</td><td><b>${refunded}</b></td></tr>${partial ? `<tr><td>Remaining charged</td><td>${remaining}</td></tr>` : ""}<tr><td>Reference</td><td>${esc(p.id)}</td></tr></table><p>${timing}</p>`,
  };
}
