const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'xlumatechnologies@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'gbjwsjqvuamadrat', // App password without spaces
  },
};

// Create transporter
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error);
  } else {
    console.log('✅ Email service ready');
  }
});

/**
 * Send meeting invitation email
 */
const sendMeetingInvitation = async ({
  to,
  hostName,
  hostEmail,
  meetingTitle,
  meetingCode,
  meetingType,
  scheduledTime,
  message,
  appUrl = process.env.APP_URL || 'http://localhost:3000',
}) => {
  const meetingUrl = `${appUrl}/room/${meetingCode}`;
  const isScheduled = scheduledTime && new Date(scheduledTime) > new Date();

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .meeting-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .meeting-code { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; text-align: center; padding: 15px; background: #f0f0f0; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        .host-info { background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎥 Meeting Invitation</h1>
          <p>You've been invited to join a ${meetingType} meeting</p>
        </div>
        <div class="content">
          <div class="host-info">
            <strong>📧 From:</strong> ${hostName} (${hostEmail})
          </div>
          
          <div class="meeting-info">
            <h2 style="margin-top: 0; color: #667eea;">${meetingTitle}</h2>
            ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
            <p><strong>Meeting Type:</strong> ${meetingType === 'private' ? '🔒 Private' : '🌐 Public'}</p>
            ${isScheduled ? `<p><strong>Scheduled for:</strong> ${new Date(scheduledTime).toLocaleString()}</p>` : '<p><strong>Status:</strong> Join anytime</p>'}
          </div>

          <div class="meeting-code">
            Meeting Code: ${meetingCode}
          </div>

          <div style="text-align: center;">
            <a href="${meetingUrl}" class="button">Join Meeting</a>
          </div>

          <p style="text-align: center; color: #666; font-size: 14px;">
            Or copy this link: <br>
            <a href="${meetingUrl}" style="color: #667eea;">${meetingUrl}</a>
          </p>

          ${meetingType === 'private' ? `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #ffc107;">
              <strong>⚠️ Private Meeting:</strong> This is a private meeting. Only invited participants can join.
            </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>This invitation was sent from Luma Meet</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"${hostName} via Luma Meet" <${EMAIL_CONFIG.auth.user}>`,
    to,
    subject: `Meeting Invitation: ${meetingTitle}`,
    html: emailHtml,
    text: `
You've been invited to join a meeting!

From: ${hostName} (${hostEmail})
Meeting: ${meetingTitle}
Type: ${meetingType}
${isScheduled ? `Scheduled for: ${new Date(scheduledTime).toLocaleString()}` : 'Join anytime'}

Meeting Code: ${meetingCode}
Meeting Link: ${meetingUrl}

${message ? `Message: ${message}` : ''}

${meetingType === 'private' ? 'Note: This is a private meeting. Only invited participants can join.' : ''}
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send join request notification to host/cohosts
 */
const sendJoinRequestNotification = async ({
  to,
  requesterName,
  requesterEmail,
  meetingTitle,
  meetingCode,
  appUrl = process.env.APP_URL || 'http://localhost:3000',
}) => {
  const meetingUrl = `${appUrl}/room/${meetingCode}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .request-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f5576c; }
        .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 5px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Join Request</h1>
          <p>Someone wants to join your meeting</p>
        </div>
        <div class="content">
          <div class="request-info">
            <h2 style="margin-top: 0; color: #f5576c;">New Join Request</h2>
            <p><strong>Requester:</strong> ${requesterName}</p>
            <p><strong>Email:</strong> ${requesterEmail}</p>
            <p><strong>Meeting:</strong> ${meetingTitle}</p>
            <p><strong>Meeting Code:</strong> ${meetingCode}</p>
          </div>

          <div style="text-align: center;">
            <a href="${meetingUrl}" class="button">Go to Meeting to Accept/Reject</a>
          </div>

          <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
            You can accept or reject this request from the meeting room.
          </p>
        </div>
        <div class="footer">
          <p>This notification was sent from Luma Meet</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Luma Meet" <${EMAIL_CONFIG.auth.user}>`,
    to,
    subject: `Join Request for: ${meetingTitle}`,
    html: emailHtml,
    text: `
New Join Request

Requester: ${requesterName} (${requesterEmail})
Meeting: ${meetingTitle}
Meeting Code: ${meetingCode}

Go to the meeting to accept or reject this request:
${meetingUrl}
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Join request email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Join request email error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendMeetingInvitation,
  sendJoinRequestNotification,
};
