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

// ── Shared branded email UI helpers ───────────────────────────────────────────
const emailHeader = (title: string) => `
  <div style="background:linear-gradient(135deg,#1e0a3c 0%,#2d1b69 50%,#0e3a5c 100%);padding:32px 40px 24px;text-align:center;border-radius:12px 12px 0 0;">
    <p style="margin:0 0 10px;font-size:13px;font-weight:800;color:rgba(255,255,255,0.55);font-family:Arial,sans-serif;letter-spacing:0.15em;text-transform:uppercase;">
      Ochil Youths Community Improvement
    </p>
    <h1 style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.3px;line-height:1.3;">
      ${title}
    </h1>
  </div>
`;

const emailFooter = () => `
  <div style="background:#f8f7ff;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px;">
    <div style="margin-bottom:14px;">
      <a href="https://www.oyci.org.uk/ook" target="_blank" style="display:inline-block;margin:0 8px;padding:8px 18px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:99px;font-size:12px;font-weight:700;font-family:Arial,sans-serif;">
        🌐 Visit Website
      </a>
      <a href="https://www.facebook.com/OYCIchange/" target="_blank" style="display:inline-block;margin:0 8px;padding:8px 18px;background:#1877f2;color:#ffffff;text-decoration:none;border-radius:99px;font-size:12px;font-weight:700;font-family:Arial,sans-serif;">
        📘 Facebook
      </a>
    </div>
    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-family:Arial,sans-serif;">
      © ${new Date().getFullYear()} Ochil Youths Community Improvement (OYCI) &nbsp;·&nbsp; Charity Portal
    </p>
    <p style="margin:0;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">
      This is an automated message. Please do not reply directly to this email.
    </p>
  </div>
`;

export const sendApprovalEmail = async (
  toEmail: string,
  firstName: string,
  assignedEvents: EventDetail[],
  staffDetails?: {
    roleType?: string;
    skills?: string[];
    employmentType?: string;
    fixedSalary?: number;
    hourlyRate?: number;
  }
): Promise<void> => {
  const transporter = await getTransporter();
  const { roleType, skills, employmentType, fixedSalary, hourlyRate } = staffDetails ?? {};

  // ── Per-event timeline blocks ──────────────────────────────────────────────
  const buildEventBlock = (e: EventDetail, idx: number) => {
    const hasTime = e.date && e.startTime && e.endTime;
    const timeLabel = hasTime ? `${e.startTime} – ${e.endTime}` : 'TBD';
    const bg = idx % 2 === 0 ? '#f5f3ff' : '#eff6ff';
    return `
      <div style="background:${bg};border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin-bottom:16px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:0.07em;">
          📌 ${e.eventName} — ${e.date || 'Date TBD'} &nbsp;·&nbsp; ${e.sessionType || 'General'}
        </p>
        <p style="margin:0 0 12px;font-size:12px;color:#4b5563;">📍 ${e.location || 'Location TBD'}</p>

        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;border-collapse:collapse;">
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;vertical-align:middle;width:44px;font-size:20px;text-align:center;">🚗</td>
            <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:middle;">
              <span style="display:block;font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Arrival</span>
              <span style="display:block;font-size:15px;font-weight:800;color:#6366f1;">${hasTime ? e.startTime : 'TBD'} <span style="font-size:11px;font-weight:600;color:#6b7280;">(or 10 min before)</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;vertical-align:middle;font-size:20px;text-align:center;">📋</td>
            <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:middle;">
              <span style="display:block;font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Staff Briefing</span>
              <span style="display:block;font-size:15px;font-weight:800;color:#8b5cf6;">Before ${hasTime ? e.startTime : 'Session Start'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;vertical-align:middle;font-size:20px;text-align:center;">🟢</td>
            <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:middle;">
              <span style="display:block;font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Session Starts</span>
              <span style="display:block;font-size:15px;font-weight:800;color:#22c55e;">${hasTime ? e.startTime : 'TBD'} &nbsp;→&nbsp; ${e.location || ''}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 16px;vertical-align:middle;font-size:20px;text-align:center;">🔴</td>
            <td style="padding:12px 0;vertical-align:middle;">
              <span style="display:block;font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Session Ends</span>
              <span style="display:block;font-size:15px;font-weight:800;color:#ef4444;">${hasTime ? e.endTime : 'TBD'}</span>
            </td>
          </tr>
        </table>
      </div>`;
  };

  const eventsSection = assignedEvents.length > 0
    ? `<h3 style="margin:24px 0 12px;font-size:13px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.06em;">⏰ Your Assigned Sessions &amp; Timelines</h3>
       ${assignedEvents.map((e, i) => buildEventBlock(e, i)).join('')}`
    : `<div style="padding:14px 18px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280;font-size:14px;">
         Sessions will be assigned to you shortly by the admin team.
       </div>`;

  // ── Staff profile card ─────────────────────────────────────────────────────
  const staffCard = `
    <div style="background:#faf5ff;border:1px solid #ddd6fe;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:0.08em;">
        👤 Your Staff Profile
      </p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#6b7280;font-weight:600;width:140px;">Name</td>
          <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:700;">${firstName}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#6b7280;font-weight:600;">Email</td>
          <td style="padding:5px 0;font-size:13px;color:#6366f1;font-weight:700;">${toEmail}</td>
        </tr>
        ${roleType ? `<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;font-weight:600;">Role</td><td style="padding:5px 0;"><span style="background:#ede9fe;color:#6d28d9;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:700;">${roleType}</span></td></tr>` : ''}
        ${skills && skills.length > 0 ? `<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;font-weight:600;">Skills</td><td style="padding:5px 0;font-size:13px;color:#374151;font-weight:600;">${skills.join(', ')}</td></tr>` : ''}
        ${employmentType ? `<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;font-weight:600;">Employment</td><td style="padding:5px 0;font-size:13px;color:#374151;font-weight:600;">${employmentType === 'salaried' ? `Salaried — £${fixedSalary || 0}/mo` : `Contractual — £${hourlyRate || 0}/hr`}</td></tr>` : ''}
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#6b7280;font-weight:600;">Status</td>
          <td style="padding:5px 0;"><span style="background:#dcfce7;color:#16a34a;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:700;">✓ Approved</span></td>
        </tr>
      </table>
    </div>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
        <tr><td>${emailHeader('🎉 Welcome Aboard — You\'ve Been Approved!')}</td></tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Hello, ${firstName}!</p>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              Welcome to the <strong>Ochil Youths Community Improvement (OYCI)</strong> team! Your staff profile has been
              reviewed and <strong style="color:#10b981;">approved</strong> by our administration team.
              Below are your profile details and${assignedEvents.length > 0 ? ' all your assigned session timelines' : ' next steps'}.
            </p>

            ${staffCard}
            ${eventsSection}

            <div style="margin-top:24px;padding:16px 20px;background:#faf5ff;border-left:4px solid #6366f1;border-radius:0 8px 8px 0;">
              <p style="margin:0;font-size:14px;color:#5b21b6;font-weight:600;">
                📋 Please arrive on time for each session and ensure you are prepared with all required materials.
                Contact the admin team if you have any questions.
              </p>
            </div>
          </td>
        </tr>
        <tr><td>${emailFooter()}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: `"OYCI Admin" <${process.env.SMTP_USER || 'noreply@oyci.local'}>`,
    to: toEmail,
    subject: '✅ Staff Onboarded — Welcome to OYCI!',
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[EmailService] ✅ Staff onboarding email → ${toEmail} | Preview → ${previewUrl}`);
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
        <tr><td>${emailHeader(headingText)}</td></tr>

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
        <tr><td>${emailFooter()}</td></tr>
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

        <tr><td>${emailHeader('🗓️ Event Registration Confirmed!')}</td></tr>

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
        <tr><td>${emailFooter()}</td></tr>
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


// ── Staff Assignment Notification ─────────────────────────────────────────────
interface StaffAssignmentPayload {
  staffFirstName: string;
  staffLastName: string;
  staffEmail: string;
  eventName: string;
  location: string;
  sessionType: string;
  sessionTime: string;
  date: string;
  startTime: string;
  endTime: string;
}

export const sendStaffAssignmentEmail = async (
  payload: StaffAssignmentPayload
): Promise<void> => {
  const transporter = await getTransporter();
  const {
    staffFirstName, staffLastName, staffEmail,
    eventName, location, sessionType, sessionTime,
    date, startTime, endTime,
  } = payload;

  const sessionTimeLabels: Record<string, string> = {
    MORNING_TO_AFTERNOON: 'Morning to Afternoon',
    AFTERNOON_TO_EVENING: 'Afternoon to Evening',
    FULL_DAY: 'Full Day',
  };
  const sessionTimeLabel = sessionTimeLabels[sessionTime] || sessionTime;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=        <tr><td>${emailHeader('📋 You\'ve Been Assigned to a Session!')}</td></tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Hello, ${staffFirstName} ${staffLastName}!</p>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7;">
              You have been assigned to the session below by the admin team. Please review the details and ensure you are available.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#faf5ff;border:1px solid #ddd6fe;border-radius:10px;overflow:hidden;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:12px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:0.08em;">Session Details</p>
                <table cellpadding="0" cellspacing="0" style="width:100%;">
                  <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;font-weight:600;width:130px;">📋 Event</td><td style="padding:7px 0;font-size:14px;color:#111827;font-weight:800;">${eventName}</td></tr>
                  <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;font-weight:600;">📍 Location</td><td style="padding:7px 0;font-size:14px;color:#111827;font-weight:700;">${location}</td></tr>
                  <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;font-weight:600;">📅 Date</td><td style="padding:7px 0;font-size:14px;color:#111827;font-weight:700;">${date}</td></tr>
                  <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;font-weight:600;">🏷️ Session Type</td><td style="padding:7px 0;"><span style="background:#ede9fe;color:#6d28d9;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;">${sessionType}</span></td></tr>
                  <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;font-weight:600;">⏱️ Session Time</td><td style="padding:7px 0;font-size:13px;color:#374151;font-weight:600;">${sessionTimeLabel}</td></tr>
                </table>
              </td></tr>
            </table>

            <h3 style="margin:0 0 12px;font-size:13px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.06em;">⏰ Your Timeline for ${date}</h3>
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:24px; border-collapse:collapse;">
              <tr>
                <td style="padding:14px 20px;vertical-align:middle;width:50px;font-size:22px;text-align:center;border-bottom:1px solid #e5e7eb;">🚗</td>
                <td style="padding:14px 0;vertical-align:middle;border-bottom:1px solid #e5e7eb;">
                  <span style="display:block;font-size:12px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Arrival</span>
                  <span style="display:block;font-size:16px;font-weight:800;color:#6366f1;">${startTime} <span style="font-size:12px;font-weight:600;color:#6b7280;">(or earlier)</span></span>
                  <span style="font-size:13px;color:#374151;">Please arrive at least 10 minutes before the session starts to set up and prepare.</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;vertical-align:middle;width:50px;font-size:22px;text-align:center;border-bottom:1px solid #e5e7eb;">📋</td>
                <td style="padding:14px 0;vertical-align:middle;border-bottom:1px solid #e5e7eb;">
                  <span style="display:block;font-size:12px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Staff Briefing</span>
                  <span style="display:block;font-size:16px;font-weight:800;color:#8b5cf6;">Before ${startTime}</span>
                  <span style="font-size:13px;color:#374151;">Quick team check-in, review of participants, and any special requirements for the session.</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;vertical-align:middle;width:50px;font-size:22px;text-align:center;border-bottom:1px solid #e5e7eb;">🟢</td>
                <td style="padding:14px 0;vertical-align:middle;border-bottom:1px solid #e5e7eb;">
                  <span style="display:block;font-size:12px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Session Starts</span>
                  <span style="display:block;font-size:16px;font-weight:800;color:#22c55e;">${startTime}</span>
                  <span style="font-size:13px;color:#374151;">Session begins — <strong>${sessionType}</strong> (${sessionTimeLabel}). Location: ${location}.</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;vertical-align:middle;width:50px;font-size:22px;text-align:center;">🔴</td>
                <td style="padding:14px 0;vertical-align:middle;">
                  <span style="display:block;font-size:12px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Session Ends</span>
                  <span style="display:block;font-size:16px;font-weight:800;color:#ef4444;">${endTime}</span>
                  <span style="font-size:13px;color:#374151;">Session concludes. Please complete any handover notes and ensure the venue is secure before leaving.</span>
                </td>
              </tr>
            </table>

            <div style="padding:16px 20px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
              <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">⚠️ If you are unable to attend, please contact the admin team as soon as possible.</p>
            </div>
          </td>
        </tr>
        <tr><td>${emailFooter()}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: `"Youth Ochilis Admin" <${process.env.SMTP_USER || 'noreply@youthochilis.local'}>`,
    to: staffEmail,
    subject: `📋 Session Assignment — ${eventName} on ${date}`,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[EmailService] 📧 Staff assignment email → ${staffEmail} | Preview: ${previewUrl}`);
  }
};


// ── Student Onboarding Notification ──────────────────────────────────────────
interface OnboardingPayload {
  guardianName: string;
  guardianEmail: string;
  relationship: string;
  childName: string;
  familyId: string;
  eventName: string;
  location: string;
  sessionType: string;
  sessionTime: string;
  date: string;
  startTime: string;
  endTime: string;
  assignedStaff: { firstName: string; lastName: string; roleType?: string; phoneNumber?: string; emailId?: string }[];
}

export const sendStudentOnboardingEmail = async (payload: OnboardingPayload): Promise<void> => {
  const transporter = await getTransporter();
  const { guardianName, guardianEmail, relationship, childName, familyId,
    eventName, location, sessionType, sessionTime, date, startTime, endTime, assignedStaff } = payload;

  const sessionTimeLabels: Record<string, string> = {
    MORNING_TO_AFTERNOON: 'Morning to Afternoon',
    AFTERNOON_TO_EVENING: 'Afternoon to Evening',
    FULL_DAY: 'Full Day',
  };
  const sessionTimeLabel = sessionTimeLabels[sessionTime] || sessionTime;

  const staffRows = assignedStaff.length > 0
    ? assignedStaff.map((s, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#f9fafb' : '#ffffff'};">
        <td style="padding:10px 14px;font-weight:600;color:#1f2937;">${s.firstName} ${s.lastName}</td>
        <td style="padding:10px 14px;color:#6b7280;">${s.roleType || 'Staff'}</td>
        <td style="padding:10px 14px;color:#374151;">${s.phoneNumber || '—'}</td>
        <td style="padding:10px 14px;color:#6366f1;">${s.emailId || '—'}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="padding:12px;text-align:center;color:#9ca3af;">Staff will be updated soon.</td></tr>';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <tr><td>${emailHeader('🌟 ' + childName + ' Has Been Onboarded!')}</td></tr>


        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">Dear ${guardianName} (${relationship}),</p>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7;">
              We are pleased to confirm that <strong>${childName}</strong> (Family ID: <strong style="color:#6366f1;">${familyId}</strong>)
              has been onboarded to the following session by our admin team. Please review the details below.
            </p>

            <!-- Session Details -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#faf5ff;border:1px solid #ddd6fe;border-radius:10px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:12px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:0.08em;">Session Details</p>
                <table cellpadding="0" cellspacing="0" style="width:100%;">
                  <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;font-weight:600;width:130px;">📌 Event</td><td style="padding:7px 0;font-size:14px;color:#111827;font-weight:800;">${eventName}</td></tr>
                  <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;font-weight:600;">📍 Location</td><td style="padding:7px 0;font-size:14px;color:#111827;font-weight:700;">${location}</td></tr>
                  <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;font-weight:600;">📅 Date</td><td style="padding:7px 0;font-size:14px;color:#111827;font-weight:700;">${date}</td></tr>
                  <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;font-weight:600;">🕐 Time</td><td style="padding:7px 0;font-size:14px;color:#111827;font-weight:700;">${startTime} – ${endTime}</td></tr>
                  <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;font-weight:600;">🏷️ Type</td><td style="padding:7px 0;"><span style="background:#ede9fe;color:#6d28d9;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;">${sessionType}</span></td></tr>
                  <tr><td style="padding:7px 0;font-size:13px;color:#6b7280;font-weight:600;">⏱️ Session</td><td style="padding:7px 0;font-size:13px;color:#374151;font-weight:600;">${sessionTimeLabel}</td></tr>
                </table>
              </td></tr>
            </table>

            <!-- Staff Table -->
            <h3 style="margin:0 0 12px;font-size:13px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.06em;">👥 Assigned Staff</h3>
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;border-collapse:collapse;margin-bottom:24px;">
              <thead>
                <tr style="background:#6366f1;">
                  <th style="padding:10px 14px;color:#fff;font-size:13px;text-align:left;">Name</th>
                  <th style="padding:10px 14px;color:#fff;font-size:13px;text-align:left;">Role</th>
                  <th style="padding:10px 14px;color:#fff;font-size:13px;text-align:left;">Phone</th>
                  <th style="padding:10px 14px;color:#fff;font-size:13px;text-align:left;">Email</th>
                </tr>
              </thead>
              <tbody>${staffRows}</tbody>
            </table>

            <div style="padding:16px 20px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;margin-bottom:20px;">
              <p style="margin:0;font-size:14px;color:#15803d;font-weight:600;">
                ✅ Please log in to the Family Portal to view the session on your calendar.
              </p>
            </div>

            <div style="padding:16px 20px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
              <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">
                📋 Your Family ID is <strong>${familyId}</strong> — keep this safe for logging into the portal.
              </p>
            </div>
          </td>
        </tr>

        <tr><td>${emailFooter()}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: `"Youth Ochilis Admin" <${process.env.SMTP_USER || 'noreply@youthochilis.local'}>`,
    to: guardianEmail,
    subject: `🌟 ${childName} Onboarded — ${eventName} on ${date}`,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[EmailService] 📧 Onboarding email → ${guardianEmail} | Preview: ${previewUrl}`);
  }
};


// ── Payroll Request / Reminder Email ──────────────────────────────────────────
interface PayrollStaffItem {
  name: string;
  role: string;
  empType: string;
  sessionsAttended: number;
  totalHours: number;
  totalPay: number;
}

interface PayrollEmailPayload {
  period: string;
  payrollData: PayrollStaffItem[];
  totalPayroll: number;
  isReminder: boolean;
}

export const sendPayrollEmail = async (payload: PayrollEmailPayload): Promise<void> => {
  const transporter = await getTransporter();
  const { period, payrollData, totalPayroll, isReminder } = payload;

  const rows = payrollData.map((s, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#f9fafb' : '#ffffff'};">
      <td style="padding:10px 16px;font-weight:700;color:#111827;">${s.name}</td>
      <td style="padding:10px 16px;color:#6b7280;">${s.role}</td>
      <td style="padding:10px 16px;">
        <span style="background:${s.empType === 'salaried' ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.1)'};color:${s.empType === 'salaried' ? '#4f46e5' : '#b45309'};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;">${s.empType}</span>
      </td>
      <td style="padding:10px 16px;text-align:center;font-weight:600;">${s.sessionsAttended}</td>
      <td style="padding:10px 16px;text-align:center;font-weight:600;color:#6b7280;">${s.totalHours.toFixed(1)} hrs</td>
      <td style="padding:10px 16px;text-align:right;font-weight:800;font-size:15px;color:#10b981;">£${s.totalPay.toFixed(2)}</td>
    </tr>`).join('');

  const actionColor = isReminder ? '#f59e0b' : '#6366f1';
  const headerIcon  = isReminder ? '🔔' : '💸';
  const headerTitle = isReminder ? 'Payroll Payment Reminder' : 'Payroll Dispensing Request';
  const intro       = isReminder
    ? 'This is a <strong>reminder</strong> that the following payroll has not yet been cleared. Please action this at your earliest convenience.'
    : 'Please review the payroll summary below and action the payment clearance for the period stated. All amounts have been calculated based on completed sessions and logged hours.';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <tr><td>${emailHeader(headerIcon + ' ' + headerTitle)}</td></tr>


        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:17px;font-weight:700;color:#111827;">Dear Finance Team,</p>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7;">${intro}</p>

            <!-- Total Summary -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f0fdf4;border:2px solid #86efac;border-radius:10px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;">Total Payroll Due — ${period}</p>
                  <p style="margin:0;font-size:36px;font-weight:900;color:#10b981;">£${totalPayroll.toFixed(2)}</p>
                  <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">${payrollData.length} staff member${payrollData.length !== 1 ? 's' : ''} · ${payrollData.reduce((s, i) => s + i.sessionsAttended, 0)} completed session${payrollData.reduce((s, i) => s + i.sessionsAttended, 0) !== 1 ? 's' : ''}</p>
                </td>
              </tr>
            </table>

            <!-- Staff Breakdown -->
            <h3 style="margin:0 0 12px;font-size:13px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.06em;">📋 Staff Breakdown</h3>
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;border-collapse:collapse;margin-bottom:24px;">
              <thead>
                <tr style="background:#6366f1;">
                  <th style="padding:10px 16px;color:#fff;font-size:13px;text-align:left;">Name</th>
                  <th style="padding:10px 16px;color:#fff;font-size:13px;text-align:left;">Role</th>
                  <th style="padding:10px 16px;color:#fff;font-size:13px;text-align:left;">Type</th>
                  <th style="padding:10px 16px;color:#fff;font-size:13px;text-align:center;">Sessions</th>
                  <th style="padding:10px 16px;color:#fff;font-size:13px;text-align:center;">Hours</th>
                  <th style="padding:10px 16px;color:#fff;font-size:13px;text-align:right;">Pay</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
              <tfoot>
                <tr style="background:#f9fafb;border-top:2px solid #e5e7eb;">
                  <td colspan="5" style="padding:12px 16px;font-weight:800;color:#374151;">Total</td>
                  <td style="padding:12px 16px;text-align:right;font-weight:900;font-size:16px;color:#10b981;">£${totalPayroll.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            ${isReminder ? `
            <div style="padding:16px 20px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;margin-bottom:20px;">
              <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">⚠️ This is an automated reminder. Please clear the above payroll as soon as possible to ensure staff are paid on time.</p>
            </div>` : `
            <div style="padding:16px 20px;background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;margin-bottom:20px;">
              <p style="margin:0;font-size:14px;color:#1e40af;font-weight:600;">📌 Please process the above payments at your earliest convenience. All amounts are calculated from verified completed sessions only.</p>
            </div>`}
          </td>
        </tr>

        <tr><td>${emailFooter()}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const subject = isReminder
    ? `🔔 REMINDER: Payroll Payment Pending — ${period} — Ochilis Youth Community`
    : `💸 Payroll Dispensing Request — ${period} — Ochilis Youth Community`;

  const info = await transporter.sendMail({
    from: `"Ochilis Youth Community Admin" <${process.env.SMTP_USER || 'noreply@ochilis.local'}>`,
    to: 'murali183dhoni@gmail.com',
    subject,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[EmailService] 💸 Payroll ${isReminder ? 'reminder' : 'request'} email sent | Preview: ${previewUrl}`);
  }
};
