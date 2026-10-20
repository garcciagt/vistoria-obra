import { createServerFn } from "@tanstack/react-start";

export const checkUserBanned = createServerFn({ method: "GET" })
  .validator((email: string) => email)
  .handler(async ({ data: email }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // List users filtered by email to find the user
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
    if (error) return { banned: false };

    // Search through all users for the matching email
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const user = allUsers?.users?.find((u) => u.email === email);
    if (!user) return { banned: false };

    // Check if banned_until is set and in the future
    if (user.banned_until) {
      const bannedUntil = new Date(user.banned_until);
      // "none" means not banned; a far-future date means effectively permanent
      if (user.banned_until !== "none" && bannedUntil > new Date()) {
        return { banned: true };
      }
    }

    return { banned: false };
  });

export const checkUserBannedById = createServerFn({ method: "GET" })
  .validator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      console.log("[ban-check] getUserById error:", error?.message, "user:", !!data?.user);
      return { banned: false };
    }
    const bu = (data.user as any).banned_until;
    console.log("[ban-check] userId:", userId, "banned_until:", bu, "type:", typeof bu);
    if (!bu || bu === "none") return { banned: false };
    // Handle both date string and "forever"/"permanent" values
    if (bu === "forever" || bu === "permanent") return { banned: true };
    const bannedDate = new Date(bu);
    if (!isNaN(bannedDate.getTime()) && bannedDate > new Date()) return { banned: true };
    return { banned: false };
  });
