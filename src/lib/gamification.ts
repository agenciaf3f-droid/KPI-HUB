import "server-only";

import type { AppProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type GamificationData = {
  totalXp: number;
  level: number;
  nextLevelXp: number;
  achievements: { key: string; name: string; description: string }[];
  leaderboard: { id: string; name: string; color: string; xp: number }[];
};

export async function awardCompletionXp({ userId, organizationId, deliveryId, dueAt }: { userId: string; organizationId: string; deliveryId: string; dueAt: string | null }) {
  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("creator_xp_events").select("id").eq("delivery_id", deliveryId).eq("user_id", userId).eq("reason", "entrega_concluida").maybeSingle();
  if (existingError) throw existingError;
  if (existing) return;

  const basePoints = 25;
  const onTime = dueAt ? new Date(dueAt) >= new Date() : false;
  const { error } = await admin.from("creator_xp_events").insert([
    { user_id: userId, delivery_id: deliveryId, points: basePoints, reason: "entrega_concluida" },
    ...(onTime ? [{ user_id: userId, delivery_id: deliveryId, points: 10, reason: "entrega_no_prazo" }] : []),
  ]);
  if (error) throw error;

  const { count, error: countError } = await admin.from("creator_xp_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("reason", "entrega_concluida");
  if (countError) throw countError;
  await grantAchievement(admin, organizationId, userId, "primeira_entrega", "Primeira entrega", "Concluiu a primeira demanda.", count === 1);
  await grantAchievement(admin, organizationId, userId, "ritmo_5", "Ritmo em construção", "Concluiu 5 demandas.", (count ?? 0) >= 5);
  await grantAchievement(admin, organizationId, userId, "ritmo_10", "Ritmo consistente", "Concluiu 10 demandas.", (count ?? 0) >= 10);
}

async function grantAchievement(admin: ReturnType<typeof createAdminClient>, organizationId: string, userId: string, key: string, name: string, description: string, earned: boolean) {
  if (!earned) return;
  const { data: achievement, error } = await admin.from("creator_achievements").upsert({ organization_id: organizationId, key, name, description }, { onConflict: "organization_id,key" }).select("id").single();
  if (error || !achievement) throw error ?? new Error("Não foi possível registrar a conquista.");
  const { error: userAchievementError } = await admin.from("creator_user_achievements").upsert({ user_id: userId, achievement_id: achievement.id }, { onConflict: "user_id,achievement_id", ignoreDuplicates: true });
  if (userAchievementError) throw userAchievementError;
}

export async function loadGamification(profile: AppProfile): Promise<GamificationData> {
  return loadOrganizationGamification(profile.organization_id, profile.role === "designer" ? profile.id : undefined);
}

export async function loadOrganizationGamification(organizationId: string, onlyUserId?: string): Promise<GamificationData> {
  const admin = createAdminClient();
  const { data: profiles, error: profilesError } = await admin.from("creator_profiles").select("id, full_name, designer_color").eq("organization_id", organizationId).eq("show_in_rankings", true);
  if (profilesError) throw profilesError;
  const profileRows = onlyUserId ? (profiles ?? []).filter((profile) => profile.id === onlyUserId) : (profiles ?? []);
  const ids = profileRows.map((profile) => profile.id);
  if (!ids.length) return emptyGamification();
  const { data: events, error: eventsError } = await admin.from("creator_xp_events").select("user_id, points").in("user_id", ids);
  if (eventsError) throw eventsError;
  const scores = new Map(ids.map((id) => [id, 0]));
  for (const event of events ?? []) scores.set(event.user_id, (scores.get(event.user_id) ?? 0) + event.points);
  const leaderboard = profileRows.map((profile) => ({ id: profile.id, name: profile.full_name, color: profile.designer_color ?? "#6E37C4", xp: scores.get(profile.id) ?? 0 })).sort((a, b) => b.xp - a.xp);
  const selectedId = onlyUserId ?? leaderboard[0]?.id;
  const totalXp = selectedId ? scores.get(selectedId) ?? 0 : 0;
  const { data: achievements } = selectedId ? await admin
    .from("creator_user_achievements")
    .select("achievement:creator_achievements(key, name, description)")
    .eq("user_id", selectedId) : { data: [] };
  const achievementList = (achievements ?? []).flatMap((row) => {
    const item = row.achievement as unknown as { key: string; name: string; description: string } | null;
    return item ? [item] : [];
  });
  const level = Math.floor(totalXp / 100) + 1;
  return { totalXp, level, nextLevelXp: level * 100, achievements: achievementList, leaderboard };
}

function emptyGamification(): GamificationData {
  return { totalXp: 0, level: 1, nextLevelXp: 100, achievements: [], leaderboard: [] };
}
