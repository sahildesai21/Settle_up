interface SendInviteEmailInput {
  memberName: string;
  memberEmail: string;
  groupName: string;
  inviterName: string;
  inviterEmail?: string;
}

interface SendInviteEmailResult {
  sent: boolean;
  reason?: "not_configured" | "failed";
}

export async function sendGroupInviteEmail({
  memberName,
  memberEmail,
  groupName,
  inviterName,
  inviterEmail,
}: SendInviteEmailInput): Promise<SendInviteEmailResult> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    return { sent: false, reason: "not_configured" };
  }

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: memberEmail,
          to_name: memberName,
          group_name: groupName,
          inviter_name: inviterName,
          email: memberEmail,
          name: inviterName,
          inviter_email: inviterEmail ?? "",
          message: `${inviterName} added you to the group \"${groupName}\" on SettleUp.`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Invite email failed");
    }

    return { sent: true };
  } catch {
    return { sent: false, reason: "failed" };
  }
}
