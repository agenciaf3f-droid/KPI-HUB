import { Award, Sparkles, Trophy } from "lucide-react";
import type { GamificationData } from "@/lib/gamification";

export function GamificationPanel({ data, role }: { data: GamificationData; role: "admin" | "designer" }) {
  const progress = Math.min(100, Math.round((data.totalXp / data.nextLevelXp) * 100));
  return <section className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
    <article className="rounded-[1.5rem] bg-primary p-5 text-primary-foreground shadow-sm sm:p-6">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary-foreground/70 uppercase"><Sparkles className="size-4" /> Gamificação</p>
      <div className="mt-5 flex items-end gap-3"><p className="text-5xl font-semibold tracking-[-0.07em]">{data.totalXp}</p><p className="mb-1 text-sm font-medium text-primary-foreground/75">XP · Nível {data.level}</p></div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-primary-foreground/20"><div className="h-full rounded-full bg-primary-foreground transition-all" style={{ width: `${progress}%` }} /></div>
      <p className="mt-2 text-xs text-primary-foreground/75">{data.nextLevelXp - data.totalXp > 0 ? `${data.nextLevelXp - data.totalXp} XP para o próximo nível` : "Novo nível alcançado"}</p>
      <div className="mt-5 flex flex-wrap gap-2">{data.achievements.length ? data.achievements.map((achievement) => <span key={achievement.key} title={achievement.description} className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">{achievement.name}</span>) : <span className="text-xs text-primary-foreground/75">Conclua uma demanda para liberar sua primeira conquista.</span>}</div>
    </article>
    <article className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-6">
      <header className="flex items-center gap-2"><Trophy className="size-5 text-primary" /><div><p className="text-lg font-semibold tracking-[-0.02em]">{role === "admin" ? "Ranking da equipe" : "Meu progresso"}</p><p className="text-sm text-muted-foreground">XP conquistado com demandas concluídas.</p></div></header>
      <div className="mt-5 space-y-3">{data.leaderboard.length ? data.leaderboard.map((member, index) => {
        const memberLevel = Math.floor(member.xp / 100) + 1;
        return <div key={member.id} className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5"><span className="w-5 text-center text-xs font-semibold text-muted-foreground">{index + 1}</span><span className="size-3 rounded-full" style={{ backgroundColor: member.color }} /><span className="min-w-0 flex-1 truncate text-sm font-medium">{member.name}</span><span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Nível {memberLevel}</span><strong className="text-sm">{member.xp} XP</strong></div>;
      }) : <div className="rounded-xl bg-muted px-4 py-5 text-sm text-muted-foreground">O ranking aparecerá após a primeira entrega concluída.</div>}</div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><Award className="size-3.5" /> Conclusão: 25 XP · No prazo: +10 XP</p>
    </article>
  </section>;
}
