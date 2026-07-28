import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { loadDeliveries } from "@/lib/deliveries";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardCompletionXp } from "@/lib/gamification";

type Action = "start" | "pause" | "review" | "complete" | "link";

/**
 * Landing page é publicada depois da entrega: cobrar a URL na conclusão
 * travava o designer numa demanda já pronta. Para esse tipo o link é
 * opcional e entra depois pela ação "link".
 */
const TIPOS_SEM_LINK_OBRIGATORIO = ["landing page"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Faça login para atualizar uma entrega." }, { status: 401 });
    const { id } = await params;
    const { action, driveUrl } = await request.json() as { action?: Action; driveUrl?: string };
    if (!action || !["start", "pause", "review", "complete", "link"].includes(action)) return NextResponse.json({ error: "Ação inválida." }, { status: 400 });

    const admin = createAdminClient();
    const { data: delivery, error: deliveryError } = await admin
      .from("creator_deliveries")
      .select("id, organization_id, assignee_id, due_at, delivery_type_id")
      .eq("id", id)
      .maybeSingle();
    if (deliveryError) throw deliveryError;
    if (!delivery || (profile.role === "designer" && delivery.assignee_id !== profile.id)) {
      return NextResponse.json({ error: "Você não tem permissão para alterar esta entrega." }, { status: 403 });
    }

    const { data: tipo } = await admin
      .from("creator_delivery_types")
      .select("name")
      .eq("id", delivery.delivery_type_id)
      .maybeSingle();
    const linkOpcional = TIPOS_SEM_LINK_OBRIGATORIO.includes((tipo?.name ?? "").toLocaleLowerCase("pt-BR"));

    if (action === "complete" && !linkOpcional && !isDriveUrl(driveUrl)) {
      return NextResponse.json({ error: "Informe um link válido da pasta ou entrega no Google Drive para concluir." }, { status: 400 });
    }
    if (action === "complete" && linkOpcional && driveUrl && !isHttpsUrl(driveUrl)) {
      return NextResponse.json({ error: "O link informado não é válido." }, { status: 400 });
    }

    // Só grava a URL: não mexe em status, não abre nem fecha sessão de tempo e
    // não passa por awardCompletionXp — daí não duplicar XP nem reiniciar nada.
    if (action === "link") {
      const valido = linkOpcional ? isHttpsUrl(driveUrl) : isDriveUrl(driveUrl);
      if (!valido) return NextResponse.json({ error: "Informe um link válido (https)." }, { status: 400 });
      const { error } = await admin.from("creator_deliveries").update({ delivery_url: driveUrl }).eq("id", id);
      if (error) throw error;
      const deliveriesAtualizadas = await loadDeliveries(profile);
      return NextResponse.json({ delivery: deliveriesAtualizadas.find((item) => item.id === id) });
    }

    if (action === "start") {
      const { data: active } = await admin.from("creator_time_sessions").select("id").eq("user_id", profile.id).is("ended_at", null).maybeSingle();
      if (active) return NextResponse.json({ error: "Finalize ou pause o timer atual antes de iniciar outro." }, { status: 409 });
      const { error: sessionError } = await admin.from("creator_time_sessions").insert({ delivery_id: id, user_id: profile.id });
      if (sessionError) throw sessionError;
      const { error } = await admin.from("creator_deliveries").update({ status: "em_producao" }).eq("id", id);
      if (error) throw error;
    } else {
      const { error: closeError } = await admin.from("creator_time_sessions").update({ ended_at: new Date().toISOString() }).eq("delivery_id", id).eq("user_id", profile.id).is("ended_at", null);
      if (closeError) throw closeError;
      const update = action === "pause"
        ? { status: "pausada" }
        : action === "review"
          ? { status: "aguardando_revisao" }
          : { status: "entregue", delivered_at: new Date().toISOString(), delivery_url: driveUrl || null };
      const { error } = await admin.from("creator_deliveries").update(update).eq("id", id);
      if (error) throw error;
      if (action === "complete") {
        await awardCompletionXp({ userId: delivery.assignee_id, organizationId: delivery.organization_id, deliveryId: id, dueAt: delivery.due_at });
      }
    }

    const deliveries = await loadDeliveries(profile);
    return NextResponse.json({ delivery: deliveries.find((item) => item.id === id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar a entrega." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Faça login para excluir uma entrega." }, { status: 401 });
    const { id } = await params;
    const admin = createAdminClient();
    const { data: delivery, error: deliveryError } = await admin
      .from("creator_deliveries")
      .select("id, assignee_id")
      .eq("id", id)
      .maybeSingle();
    if (deliveryError) throw deliveryError;
    if (!delivery || (profile.role === "designer" && delivery.assignee_id !== profile.id)) {
      return NextResponse.json({ error: "Você não tem permissão para excluir esta entrega." }, { status: 403 });
    }
    const { error: xpError } = await admin.from("creator_xp_events").delete().eq("delivery_id", id);
    if (xpError) throw xpError;
    const { error } = await admin.from("creator_deliveries").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível excluir a entrega." }, { status: 500 });
  }
}

function isDriveUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "drive.google.com" || url.hostname === "docs.google.com");
  } catch {
    return false;
  }
}

/** Landing page publicada mora no domínio do cliente, não no Drive. */
function isHttpsUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
