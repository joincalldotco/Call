import { env } from "@/config/env";
import { Resend } from "resend";

const resend = new Resend(env.RESEND_API_KEY);

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail({ to, subject, text }: SendMailInput) {
  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error } as const;
    }

    return { success: true, data } as const;
  } catch (err) {
    console.error("Error sending email:", err);
    return { success: false, error: err } as const;
  }
}
