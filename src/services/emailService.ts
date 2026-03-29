import nodemailer, { Transporter } from 'nodemailer';

interface EventDetail {
  eventName: string;
  location: string;
  hours: number;
  startDate?: string;
  endDate?: string;
}

// Lazily resolve the transporter once per process lifetime
let _transporter: Transporter | null = null;

const getTransporter = async (): Promise<Transporter> => {
  if (_transporter) return _transporter;

  const hasRealCreds =
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    !process.env.SMTP_USER.includes('your_gmail');

  if (hasRealCreds) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('[EmailService] Using real SMTP:', process.env.SMTP_USER);
  } else {
    // Auto-create a free Ethereal test account — no config needed
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('[EmailService] Using Ethereal test account:', testAccount.user);
    console.log('[EmailService] View sent emails at: https://ethereal.email/messages');
  }

  return _transporter;
};

export const sendApprovalEmail = async (
  toEmail: string,
  firstName: string,
  assignedEvents: EventDetail[]
): Promise<void> => {
  const transporter = await getTransporter();

  const eventRows = assignedEvents
    .map(
      (e, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#f9fafb' : '#ffffff'};">
        <td style="padding:12px 16px; font-weight:600; color:#1f2937;">${e.eventName}</td>
        <td style="padding:12px 16px; color:#374151;">${e.location}</td>
        <td style="padding:12px 16px; color:#374151; text-align:center;">${e.hours} hrs</td>
        <td style="padding:12px 16px; color:#374151; font-size:13px;">
          ${e.startDate && e.endDate ? `${e.startDate} → ${e.endDate}` : 'TBD'}
        </td>
      </tr>`
    )
    .join('');

  const eventsSection =
    assignedEvents.length > 0
      ? `<h3 style="margin:0 0 12px; font-size:14px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.5px;">
           Your Assigned Events
         </h3>
         <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; border-collapse:collapse;">
           <thead>
             <tr style="background:#6366f1;">
               <th style="padding:12px 16px; color:#fff; font-size:13px; text-align:left;">Event</th>
               <th style="padding:12px 16px; color:#fff; font-size:13px; text-align:left;">Location</th>
               <th style="padding:12px 16px; color:#fff; font-size:13px; text-align:center;">Hours</th>
               <th style="padding:12px 16px; color:#fff; font-size:13px; text-align:left;">Dates</th>
             </tr>
           </thead>
           <tbody>${eventRows}</tbody>
         </table>`
      : '<p style="color:#6b7280;">Events will be assigned to you shortly by the admin team.</p>';

  const assignmentText =
    assignedEvents.length > 0
      ? `You have been <strong style="color:#6366f1;">assigned to ${
          assignedEvents.length === 1 ? '1 event' : `${assignedEvents.length} events`
        }</strong> listed below. Please review the details carefully.`
      : 'You are now an approved staff member.';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;">🎉 You've Been Approved!</h1>
            <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Wishaw Youth Charity Staff Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">Hello, ${firstName}!</p>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              Congratulations — your volunteer profile has been reviewed and approved by our administration team.
              ${assignmentText}
            </p>
            ${eventsSection}
            <div style="margin:28px 0 0;padding:16px 20px;background:#faf5ff;border-left:4px solid #6366f1;border-radius:0 8px 8px 0;">
              <p style="margin:0;font-size:14px;color:#5b21b6;font-weight:600;">
                📋 Please ensure you arrive on time and prepared with any required materials.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:13px;color:#9ca3af;">
              This email was sent by the Wishaw Youth Charity Admin Portal. Please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: `"Wishaw Youth Charity" <${process.env.SMTP_USER || 'noreply@wishaw.local'}>`,
    to: toEmail,
    subject: '✅ You Have Been Approved — Wishaw Youth Charity',
    html,
  });

  // Log clickable Ethereal preview URL in development
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[EmailService] ✅ Email delivered! Preview → ${previewUrl}`);
  }
};
