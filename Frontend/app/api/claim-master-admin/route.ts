import { NextResponse } from "next/server";
import { insforge } from "@/lib/insforge";
import { auth } from "@/lib/auth";

export async function POST() {
  try {
    // Must be authenticated
    const { data: authData } = await auth.getCurrentUser();
    if (!authData?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const authId = authData.user.id;
    const email = authData.user.email;

    // Safety gate: only proceed if NO master_admin exists yet
    const { data: existing } = await insforge.database
      .from("erp_users")
      .select("id")
      .eq("role", "master_admin")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A master admin already exists. Use the InsForge dashboard to manage roles." },
        { status: 403 }
      );
    }

    // Check if this auth user already has an erp_users row
    const { data: byAuthId } = await insforge.database
      .from("erp_users")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();

    const { data: byEmail } = !byAuthId && email
      ? await insforge.database.from("erp_users").select("id").eq("email", email).maybeSingle()
      : { data: null };

    const existingRow = byAuthId || byEmail;

    if (existingRow) {
      // Update existing row
      const { error } = await insforge.database
        .from("erp_users")
        .update({ role: "master_admin", auth_id: authId, is_active: true })
        .eq("id", existingRow.id);

      if (error) throw error;
    } else {
      // Insert new row
      const { error } = await insforge.database.from("erp_users").insert({
        auth_id: authId,
        email,
        full_name: "Master Admin",
        role: "master_admin",
        is_active: true,
      });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
