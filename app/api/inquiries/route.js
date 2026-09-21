import { isSameOrigin } from "@/lib/request";
import { z } from "zod";
import { supabase } from "@/lib/supabase/server";
import { configured } from "@/lib/config";
const schema = z.object({
  property_id: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().max(30).optional().default(""),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(0).optional(),
});
export async function POST(request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!configured)
    return Response.json({
      message:
        "Demo preview: your inquiry was not sent. Connect Supabase to enable inquiries.",
    });
  try {
    const raw = await request.text();
    if (raw.length > 6000)
      return Response.json({ error: "Inquiry is too long." }, { status: 413 });
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return Response.json(
        { error: "Please enter a valid name, email, and message." },
        { status: 400 },
      );
    const db = await supabase();
    const { website, ...values } = parsed.data;
    const { error } = await db.rpc("submit_inquiry", {
      p_property_id: values.property_id,
      p_name: values.name,
      p_email: values.email,
      p_phone: values.phone,
      p_message: values.message,
    });
    if (error)
      return Response.json(
        {
          error:
            "Unable to send. The listing may be unavailable, or you have already sent several inquiries. Please try later.",
        },
        { status: 429 },
      );
    return Response.json(
      { message: "Inquiry sent. The realtor will be in touch." },
      { status: 201 },
    );
  } catch {
    return Response.json(
      { error: "Unable to process this inquiry." },
      { status: 400 },
    );
  }
}
