import { supabase } from "@/integrations/supabase/client";

interface AuditLogParams {
  action: string;
  targetTable: string;
  targetId?: string | null;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
}

/**
 * Log an admin activity to the audit trail.
 * Fire-and-forget — errors are silently caught so they never break the main flow.
 */
export const logAdminActivity = async ({
  action,
  targetTable,
  targetId = null,
  beforeData = null,
  afterData = null,
}: AuditLogParams) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("admin_activity_logs").insert({
      admin_user_id: user.id,
      admin_email: user.email ?? "unknown",
      action,
      target_table: targetTable,
      target_id: targetId,
      before_data: beforeData as any,
      after_data: afterData as any,
    });
  } catch {
    // Silent — audit logging must never break main operations
  }
};
