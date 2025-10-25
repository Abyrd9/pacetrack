import nodemailer from "nodemailer";
import { Resend } from "resend";

// In production we use the real Resend client. During local development we
// prefer to send emails to a local SMTP catch-all (Mailpit/MailHog) so that we
// don't accidentally spam real addresses. We expose an object with the same
// shape (`resend.emails.send`) regardless of environment so that calling code
// doesn't have to change.

// ------------------------------
// Helper: create a minimal wrapper that mimics the Resend client but delivers
// over SMTP. We only implement the subset of the API we actually use in this
// codebase (currently `emails.send`).
// ------------------------------

function createDevResendMock() {
  // Default Mailpit ports. Env variables allow overrides if needed.
  const host = process.env.EMAIL_HOST ?? "127.0.0.1";
  const port = Number(process.env.EMAIL_PORT ?? "1025");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
  });

  return {
    emails: {
      // Keep the same signature the Resend SDK expects.
      async send(options: {
        from: string;
        to: string | string[];
        subject: string;
        html: string;
      }) {
        await transporter.sendMail({
          ...options,
          to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        });

        // Return a shape similar to Resend's response so callers that inspect
        // it don't break. We only use `id` in a few places for logging – a
        // stub value is fine.
        return { id: "local-dev" } as const;
      },
    },
  } as const;
}

// Export the proper client depending on environment.
export const resend =
  process.env.NODE_ENV === "production"
    ? (() => {
        if (!process.env.RESEND_API_KEY)
          throw new Error("RESEND_API_KEY is not set");
        return new Resend(process.env.RESEND_API_KEY);
      })()
    : createDevResendMock();
