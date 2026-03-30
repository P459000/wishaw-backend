import nodemailer, { Transporter } from 'nodemailer';

interface EventDetail {
  eventName: string;
  location: string;
  sessionType?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
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
        <td style="padding:12px 16px; color:#374151; text-align:center;">${e.sessionType || 'General'}</td>
        <td style="padding:12px 16px; color:#374151; font-size:13px;">
          ${e.date ? `${e.date} (${e.startTime} - ${e.endTime})` : 'TBD'}
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
               <th style="padding:12px 16px; color:#fff; font-size:13px; text-align:center;">Type</th>
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

// ── Student Registration Confirmation ─────────────────────────────────────────
interface StudentEmailPayload {
  guardianName: string;
  guardianEmail: string;
  childName: string;
  familyId: string;
  isEmergencyContact?: boolean; // true = message tailored for additional guardian
}

export const sendStudentRegistrationEmail = async (
  payload: StudentEmailPayload
): Promise<void> => {
  const transporter = await getTransporter();

  const { guardianName, guardianEmail, childName, familyId, isEmergencyContact = false } = payload;

  const subjectLine = isEmergencyContact
    ? `👶 ${childName} has been registered — Youth Ochilis Community Program`
    : `✅ Registration Confirmed — ${childName} — Youth Ochilis Community Program`;

  const headingText = isEmergencyContact
    ? `You've been listed as an Emergency Contact`
    : `Registration Confirmed! 🎉`;

  const introText = isEmergencyContact
    ? `<strong>${childName}</strong> has been registered with the Youth Ochilis Community Program and you have been listed as an emergency contact by their primary guardian.
       <br/><br/>Please ensure your contact details remain up-to-date should the program need to reach you.`
    : `Thank you for registering <strong>${childName}</strong> with the Youth Ochilis Community Program.
       Our team will be in touch with session schedules and upcoming activities.`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🌟</div>
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">${headingText}</h1>
            <p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">
              Youth Ochilis Community Program
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">
              Dear ${guardianName},
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
              ${introText}
            </p>

            <!-- Info card -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#faf5ff;border:1px solid #ddd6fe;border-radius:10px;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="padding:18px 24px;">
                  <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.06em;">
                    Registration Details
                  </p>
                  <table cellpadding="0" cellspacing="0" style="width:100%;">
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#374151;font-weight:600;width:140px;">Child's Name</td>
                      <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:700;">${childName}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#374151;font-weight:600;">Family ID</td>
                      <td style="padding:6px 0;font-size:14px;color:#6366f1;font-weight:800;letter-spacing:0.05em;">${familyId}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#374151;font-weight:600;">Status</td>
                      <td style="padding:6px 0;">
                        <span style="background:#dcfce7;color:#16a34a;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;">✓ Active</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <div style="padding:16px 20px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
              <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">
                📋 Please keep your Family ID (<strong>${familyId}</strong>) safe — you will need it when contacting us about ${childName}.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">
              Youth Ochilis Community Program  ·  Registration Confirmation
            </p>
            <p style="margin:0;font-size:12px;color:#d1d5db;">
              This email was sent automatically. Please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: `"Youth Ochilis Community Program" <${process.env.SMTP_USER || 'noreply@youthochilis.local'}>`,
    to: guardianEmail,
    subject: subjectLine,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[EmailService] 📧 Student registration email → ${guardianEmail} | Preview: ${previewUrl}`);
  }
};

// ── Event Registration Confirmation ───────────────────────────────────────────
interface StaffDetail {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailId?: string;
}

interface EventRegistrationPayload {
  guardianName: string;
  guardianEmail: string;
  childName: string;
  eventName: string;
  location: string;
  sessionType: string;
  date: string;
  startTime: string;
  endTime: string;
  assignedStaff: StaffDetail[];
}

export const sendEventRegistrationConfirmation = async (
  payload: EventRegistrationPayload
): Promise<void> => {
  const transporter = await getTransporter();

  const {
    guardianName,
    guardianEmail,
    childName,
    eventName,
    location,
    sessionType,
    date,
    startTime,
    endTime,
    assignedStaff,
  } = payload;

  const staffRows = assignedStaff.length > 0
    ? assignedStaff.map(
        (staff, idx) => `
        <tr style="background: ${idx % 2 === 0 ? '#f9fafb' : '#ffffff'};">
          <td style="padding:10px 14px; font-weight:600; color:#1f2937;">${staff.firstName} ${staff.lastName}</td>
          <td style="padding:10px 14px; color:#4b5563;">${staff.phoneNumber || 'N/A'}</td>
          <td style="padding:10px 14px; color:#6366f1;">${staff.emailId || 'N/A'}</td>
        </tr>`
      ).join('')
    : '<tr><td colspan="3" style="padding:10px 14px; color:#6b7280; text-align:center;">Assigned soon</td></tr>';

  const staffSection = `
    <h3 style="margin:24px 0 10px; font-size:14px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.5px;">
      Staff Members Present
    </h3>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; border-collapse:collapse; margin-bottom:24px;">
      <thead>
        <tr style="background:#8b5cf6;">
          <th style="padding:10px 14px; color:#fff; font-size:13px; text-align:left;">Name</th>
          <th style="padding:10px 14px; color:#fff; font-size:13px; text-align:left;">Phone</th>
          <th style="padding:10px 14px; color:#fff; font-size:13px; text-align:left;">Email</th>
        </tr>
      </thead>
      <tbody>${staffRows}</tbody>
    </table>
  `;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#10b981,#3b82f6);padding:40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🗓️</div>
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">Event Registration Confirmed!</h1>
            <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">
              Youth Ochilis Community Program
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">
              Hello ${guardianName},
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
              You have successfully registered <strong>${childName}</strong> for the upcoming event: <strong style="color:#3b82f6;">${eventName}</strong>. 
              We are excited to see them there! Below are the details for the event.
            </p>

            <!-- Event Details Card -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;overflow:hidden;">
              <tr>
                <td style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0" style="width:100%;">
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#374151;font-weight:600;width:90px;">📍 Location</td>
                      <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:700;">${location}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#374151;font-weight:600;">📅 Date</td>
                      <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:700;">${date}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:#374151;font-weight:600;">⏱️ Time</td>
                      <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:700;">${startTime} - ${endTime}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            ${staffSection}

            <div style="padding:16px 20px;background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;">
              <p style="margin:0;font-size:14px;color:#1e40af;font-weight:600;">
                If your plans change, please unregister from the Family Portal to allow another family to attend.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">
              Youth Ochilis Community Program · Event Confirmation
            </p>
            <p style="margin:0;font-size:12px;color:#d1d5db;">
              This email was sent automatically. Please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: `"Youth Ochilis Community Program" <${process.env.SMTP_USER || 'noreply@youthochilis.local'}>`,
    to: guardianEmail,
    subject: `🗓️ Registered for ${eventName} — Youth Ochilis Community Program`,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[EmailService] 📧 Event registration email → ${guardianEmail} | Preview: ${previewUrl}`);
  }
};

