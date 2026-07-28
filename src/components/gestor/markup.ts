// Markup do Dash-Gestores (dashboard.html linhas 693-1098) como constante.
// SEM o #login-overlay (609-622): login agora e so o do hub.
// Handlers inline (onclick=...) resolvem em window - o engine os pendura la.
export const GESTOR_MARKUP = String.raw`<!-- ════════════ TAB NAVIGATION + CONTROLES ════════════ -->
<!-- Sem a barra de marca: o seletor de abas e os controles de periodo dividem
     a mesma linha, para nao sobrar faixa vazia no topo. -->
<nav class="tab-nav">
  <div class="tab-btns">
    <button class="tab-btn active" onclick="switchTab('tab1')">📊 Relatórios dos Clientes</button>
    <button class="tab-btn" onclick="switchTab('tab2')">⭐ NPS dos Clientes</button>
    <button class="tab-btn" onclick="switchTab('tab3')">📉 Churn</button>
  </div>
  <div class="topbar-right">
    <div class="status-pill loading" id="status-pill">
      <div class="dot"></div>
      <span id="status-text">Carregando…</span>
    </div>
    <button id="btn-date" onclick="toggleDatePicker()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <span id="btn-date-label">—</span>
    </button>
    <button id="btn-reload" onclick="reloadData()" title="Recarregar dados" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;border:1px solid var(--border);background:var(--surface);cursor:pointer;transition:var(--transition);box-shadow:var(--shadow-sm);" onmouseenter="this.style.boxShadow='var(--shadow-md)'" onmouseleave="this.style.boxShadow='var(--shadow-sm)'">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
    </button>
  </div>
</nav>

<!-- ════════════ ABA 1 — RELATÓRIOS ════════════ -->
<div id="tab1" class="tab-content active">

<!-- ════════════ DATE PICKER ════════════ -->
<div id="dp-overlay" onclick="handleOverlayClick(event)">
  <div id="dp-modal">
    <div id="dp-shortcuts">
      <button class="dp-short" data-sh="today"     onclick="setShortcut(this,'today')">Hoje</button>
      <button class="dp-short" data-sh="yesterday" onclick="setShortcut(this,'yesterday')">Ontem</button>
      <button class="dp-short" data-sh="7d"        onclick="setShortcut(this,'7d')">Últimos 7 dias</button>
      <button class="dp-short" data-sh="14d"       onclick="setShortcut(this,'14d')">Últimos 14 dias</button>
      <button class="dp-short" data-sh="30d"       onclick="setShortcut(this,'30d')">Últimos 30 dias</button>
      <button class="dp-short" data-sh="thisMonth" onclick="setShortcut(this,'thisMonth')">Este mês</button>
      <button class="dp-short" data-sh="lastMonth" onclick="setShortcut(this,'lastMonth')">Mês passado</button>
      <button class="dp-short" data-sh="custom"    onclick="setShortcut(this,'custom')">Personalizado</button>
    </div>
    <div id="dp-right">
      <div id="dp-months"></div>
      <div id="dp-footer">
        <span id="dp-range-label">Selecione um intervalo</span>
        <div style="display:flex;gap:8px;">
          <button class="btn-ghost" onclick="closeDatePicker()">Cancelar</button>
          <button class="btn-primary" onclick="applyDatePicker()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Atualizar
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ════════════ DRILL-DOWN OVERLAY ════════════ -->
<div id="drill-overlay" onclick="drillOverlayClick(event)">
  <div class="drill-modal" id="drill-modal" onclick="event.stopPropagation()">
    <div class="drill-modal-head" id="drill-head">
      <div>
        <h2 id="drill-title">Detalhes</h2>
        <div class="drill-sub" id="drill-sub"></div>
      </div>
      <button class="drill-close-btn" onclick="closeDrill()" title="Fechar">✕</button>
    </div>
    <div class="drill-modal-body" id="drill-body"></div>
  </div>
</div>

<!-- ════════════ MAIN ════════════ -->
<main id="main">

  <div id="error-banner">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <span id="error-text"></span>
  </div>

  <!-- Filter bar -->
  <div id="filter-bar">
    <div style="display:flex;align-items:center;gap:6px;">
      <span class="filter-label">Status:</span>
      <select id="filter-status" class="filter-select" onchange="applyFilter()">
        <option value="">Todos</option>
        <option value="ativo">Ativos</option>
        <option value="inativo">Inativos</option>
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <span class="filter-label">Plano:</span>
      <select id="filter-plan" class="filter-select" onchange="applyFilter()">
        <option value="">Todos os planos</option>
      </select>
    </div>
    <!-- So o admin escolhe o gestor; para os demais o filtro e a propria
         pessoa (ver nomeDeEscopo no engine) e este bloco fica escondido. -->
    <div class="filtro-gestor" style="display:flex;align-items:center;gap:6px;">
      <span class="filter-label">Gestor:</span>
      <select id="filter-gestor" class="filter-select" onchange="applyFilter()">
        <option value="">Todos os gestores</option>
      </select>
    </div>
  </div>

  <!-- KPIs -->
  <div class="section-title">Indicadores do Período</div>
  <div id="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#eff6ff;">💬</div>
      <div class="kpi-value" id="kpi-msgs"><span class="sk" style="width:64px;height:30px;"></span></div>
      <div class="kpi-label">Total de mensagens</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#f0fdf4;">✅</div>
      <div class="kpi-value" id="kpi-active"><span class="sk" style="width:48px;height:30px;"></span></div>
      <div class="kpi-label">Grupos ativos</div>
    </div>
    <!-- "Gestores" e a quebra por setor sao panorama da agencia: no escopo de
         uma pessoa so mostrariam numeros dos outros. Somem via CSS. -->
    <div class="kpi-card so-admin">
      <div class="kpi-icon" style="background:#faf5ff;">👤</div>
      <div class="kpi-value" id="kpi-gestores"><span class="sk" style="width:40px;height:30px;"></span></div>
      <div class="kpi-label">Gestores</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#fff7ed;">⚡</div>
      <div class="kpi-value" id="kpi-leadtime"><span class="sk" style="width:56px;height:30px;"></span></div>
      <div class="kpi-label"><span class="rotulo-equipe">Lead Time médio da equipe</span><span class="rotulo-eu">Seu Lead Time médio</span></div>
    </div>
  </div>

  <!-- Quebra por setor: mesma informação do card "da equipe" acima, só que
       separada. Menor de propósito — é detalhe, não manchete. -->
  <div id="kpi-grid-lt">
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#fff7ed;">🚀</div>
      <div class="kpi-value" id="kpi-lt-trafego"><span class="sk" style="width:52px;height:22px;"></span></div>
      <div class="kpi-label">Lead Time Tráfego</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#f3e8ff;">✏️</div>
      <div class="kpi-value" id="kpi-lt-edicao"><span class="sk" style="width:52px;height:22px;"></span></div>
      <div class="kpi-label">Lead Time Edição</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#fff7ed;">🎨</div>
      <div class="kpi-value" id="kpi-lt-webdesign"><span class="sk" style="width:52px;height:22px;"></span></div>
      <div class="kpi-label">Lead Time Designer</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#e0f2fe;">📊</div>
      <div class="kpi-value" id="kpi-lt-estrategia"><span class="sk" style="width:52px;height:22px;"></span></div>
      <div class="kpi-label">Lead Time Estratégia</div>
    </div>
  </div>

  <!-- Charts row 1 — Lead Time + Conversas em Aberto -->
  <div class="section-title">Análise Visual</div>
  <div style="display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:14px;">
    <div class="chart-card chart-clickable">
      <div class="chart-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="chart-title">Lead Time da equipe</div>
          <span style="font-size:.65rem;color:var(--text-2);font-weight:500;">· clique para detalhes</span>
        </div>
        <div class="chart-sub">Azul: horário comercial (min úteis) · Verde: fora do horário (min corridos)</div>
      </div>
      <div class="chart-wrap" style="height:230px;"><canvas id="chart-lt"></canvas></div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:14px;">
    <div class="chart-card">
      <div class="chart-header">
        <div class="chart-title">⏳ Grupos em Aberto</div>
        <div class="chart-sub">Clientes aguardando resposta do time · a conversa é do grupo até alguém responder — o gestor da conta é só quem cuida do cliente, o tempo não é debitado dele</div>
      </div>
      <div id="open-tickets-table"></div>
    </div>
  </div>

  <!-- Charts row 2 — Relatórios por Semana (largura cheia) -->
  <div id="chart-grid" style="grid-template-columns:1fr;">
    <div class="chart-card chart-clickable">
      <div class="chart-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="chart-title">Relatórios por Semana</div>
          <span style="font-size:.65rem;color:var(--text-2);font-weight:500;">· clique para detalhes</span>
        </div>
        <div class="chart-sub">Faltam enviar vs enviados</div>
      </div>
      <div class="chart-wrap"><canvas id="chart-rel"></canvas></div>
    </div>
  </div>

  <!-- Charts row 3 — Respostas por Gestor -->
  <div id="chart-grid-3">
    <div class="chart-card">
      <div class="chart-header">
        <div class="chart-title">Respostas da equipe</div>
        <div class="chart-sub">Como cada um responde: texto, áudio ou mídia</div>
      </div>
      <div id="respostas-table"></div>
    </div>
  </div>


  <div class="section-title">Detalhamento por Grupo</div>
  <div id="table-card">
    <div class="table-header">
      <div>
        <div class="table-title">Grupos</div>
        <div class="table-count" id="table-count">— grupos</div>
      </div>
    </div>
    <div class="table-scroll">
      <table>
        <thead id="thead">
          <tr>
            <th onclick="sortBy('name')">Grupo</th>
            <th onclick="sortBy('plan')">Plano</th>
            <th onclick="sortBy('gestor')">Gestor</th>
            <th onclick="sortBy('msgs')">Mensagens</th>
            <th onclick="sortBy('avgLT')">Lead Time</th>
            <th onclick="sortBy('silenceDays')">Dias sem msg</th>
            <th onclick="sortBy('reportDays')">Status relatório</th>
          </tr>
        </thead>
        <tbody id="tbody">
          <tr><td colspan="7" style="padding:40px 24px;text-align:center;">
            <div class="sk" style="width:100%;height:16px;margin-bottom:10px;"></div>
            <div class="sk" style="width:88%;height:16px;margin-bottom:10px;"></div>
            <div class="sk" style="width:94%;height:16px;"></div>
          </td></tr>
        </tbody>
      </table>
    </div>
  </div>
</main>
</div><!-- /tab1 -->

<!-- ════════════ ABA 2 — NPS DOS CLIENTES ════════════ -->
<div id="tab2" class="tab-content">
<main style="max-width:1400px;margin:0 auto;padding:28px 32px;">

  <div class="nps-topbar">
    <div><div class="section-title" style="margin-bottom:0;">NPS — Clientes</div></div>
    <div style="display:flex;align-items:center;gap:10px;">
      <div class="status-pill loading" id="nps-status-pill">
        <div class="dot"></div>
        <span id="nps-status-text">Aguardando…</span>
      </div>
      <select id="nps-month-select" class="filter-select" onchange="npsLoadMonth()"></select>
      <button class="btn-primary" onclick="npsLoadMonth()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/></svg>
        Atualizar
      </button>
    </div>
  </div>

  <div id="nps-error-banner" style="display:none;background:#fff1f2;border:1px solid #fecdd3;border-radius:var(--radius);padding:14px 18px;margin-bottom:20px;color:#be123c;font-size:.78rem;font-weight:500;align-items:center;gap:10px;">
    <span id="nps-error-text"></span>
  </div>

  <div class="section-title">Indicadores Gerais</div>
  <div class="nps-cards-grid">
    <div class="nps-card">
      <div class="nps-card-title">NPS do Gestor</div>
      <div class="nps-card-sub">Satisfação com o gestor de tráfego</div>
      <div class="nps-gauge-wrap"><canvas id="gauge-gestor"></canvas><div class="nps-big-number" id="nps-val-gestor">—</div></div>
      <div id="nps-badge-gestor" style="margin-bottom:8px;"></div>
      <div class="nps-breakdown" id="nps-break-gestor">
        <span><div class="dot-p"></div> 0 Promotores</span>
        <span><div class="dot-n"></div> 0 Neutros</span>
        <span><div class="dot-d"></div> 0 Detratores</span>
      </div>
    </div>
    <div class="nps-card">
      <div class="nps-card-title">NPS da Agência</div>
      <div class="nps-card-sub">Satisfação com a agência F3F</div>
      <div class="nps-gauge-wrap"><canvas id="gauge-agencia"></canvas><div class="nps-big-number" id="nps-val-agencia">—</div></div>
      <div id="nps-badge-agencia" style="margin-bottom:8px;"></div>
      <div class="nps-breakdown" id="nps-break-agencia">
        <span><div class="dot-p"></div> 0 Promotores</span>
        <span><div class="dot-n"></div> 0 Neutros</span>
        <span><div class="dot-d"></div> 0 Detratores</span>
      </div>
    </div>
  </div>

  <div class="section-title">NPS por Gestor</div>
  <div class="nps-gestor-grid" id="nps-gestor-grid">
    <div class="nps-card" style="grid-column:1/-1;text-align:center;padding:40px;">
      <span style="color:var(--text-2);font-size:.82rem;">Selecione um mês para carregar os dados</span>
    </div>
  </div>

</main>
</div><!-- /tab2 -->

<!-- ════════════ ABA 3 — CHURN ════════════ -->
<div id="tab3" class="tab-content">
<main style="max-width:1400px;margin:0 auto;padding:28px 32px;">

  <div class="nps-topbar">
    <div><div class="section-title" style="margin-bottom:0;">Churn — Cancelamentos</div></div>
    <div style="display:flex;align-items:center;gap:10px;">
      <div class="status-pill loading" id="churn-status-pill">
        <div class="dot"></div>
        <span id="churn-status-text">Aguardando…</span>
      </div>
      <select id="churn-period-select" class="filter-select" onchange="churnRender()">
        <option value="all">Todo o histórico</option>
        <option value="ytd">Ano atual</option>
        <option value="12m">Últimos 12 meses</option>
        <option value="6m">Últimos 6 meses</option>
        <option value="3m">Últimos 3 meses</option>
      </select>
      <select id="churn-plan-select" class="filter-select" onchange="churnRender()">
        <option value="all">Todos os planos</option>
      </select>
      <button class="btn-primary" onclick="churnLoad(true)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/></svg>
        Atualizar
      </button>
    </div>
  </div>

  <div id="churn-error-banner" style="display:none;background:#fff1f2;border:1px solid #fecdd3;border-radius:var(--radius);padding:14px 18px;margin-bottom:20px;color:#be123c;font-size:.78rem;font-weight:500;align-items:center;gap:10px;">
    <span id="churn-error-text"></span>
  </div>

  <div class="section-title">Indicadores Gerais</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:28px;">
    <div class="nps-card"><div class="nps-card-title">🚪 Cancelamentos</div><div style="font-size:1.9rem;font-weight:700;color:#dc2626;margin-top:8px;" id="churn-kpi-total">—</div><div class="nps-card-sub" id="churn-kpi-total-sub">no período</div></div>
    <div class="nps-card"><div class="nps-card-title">👥 Clientes Ativos</div><div style="font-size:1.9rem;font-weight:700;color:#10b981;margin-top:8px;" id="churn-kpi-active">—</div><div class="nps-card-sub" id="churn-kpi-active-sub">atualmente na base</div></div>
    <div class="nps-card"><div class="nps-card-title">📉 Churn Rate</div><div style="font-size:1.9rem;font-weight:700;color:var(--primary);margin-top:8px;" id="churn-kpi-rate">—</div><div class="nps-card-sub">no período</div></div>
    <div class="nps-card"><div class="nps-card-title">⏱️ Permanência Média</div><div style="font-size:1.9rem;font-weight:700;color:var(--text);margin-top:8px;" id="churn-kpi-tempo">—</div><div class="nps-card-sub">dias até cancelar</div></div>
    <div class="nps-card"><div class="nps-card-title">💰 LTV Médio</div><div style="font-size:1.9rem;font-weight:700;color:var(--text);margin-top:8px;" id="churn-kpi-ltv">—</div><div class="nps-card-sub">dos cancelados</div></div>
    <div class="nps-card"><div class="nps-card-title">🔄 Taxa de Retorno</div><div style="font-size:1.9rem;font-weight:700;color:#8b5cf6;margin-top:8px;" id="churn-kpi-retorno">—</div><div class="nps-card-sub" id="churn-kpi-retorno-sub">voltaram após churn</div></div>
  </div>

  <div class="section-title">Cancelamentos por Mês</div>
  <div class="nps-card" style="padding:20px;margin-bottom:28px;"><div style="height:340px;"><canvas id="chart-churn-month"></canvas></div></div>

  <div class="section-title">🚨 Área de Risco — Clientes há mais tempo sem mensagem</div>
  <div class="nps-card" style="padding:20px;margin-bottom:28px;">
    <div style="font-size:.75rem;color:var(--text-2);margin-bottom:12px;">
      Ranking dos clientes <strong>ativos</strong> que estão há mais tempo sem enviar mensagem para vocês. Considera apenas a última mensagem do cliente e ignora mensagens do time.
    </div>
    <div style="height:340px;"><canvas id="chart-churn-risk"></canvas></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;">
    <div>
      <div class="section-title">Cancelamentos por Plano</div>
      <div class="nps-card" style="padding:20px;"><div style="height:280px;"><canvas id="chart-churn-plan"></canvas></div></div>
    </div>
    <div>
      <div class="section-title">Tempo de Permanência</div>
      <div class="nps-card" style="padding:20px;"><div style="height:280px;"><canvas id="chart-churn-tenure"></canvas></div></div>
    </div>
  </div>

  <div class="section-title" style="margin-top:28px;">Churn por Gestor</div>
  <div class="nps-card" style="padding:20px;margin-bottom:28px;">
    <div style="font-size:.78rem;color:var(--text-2);margin-bottom:10px;line-height:1.5;">
      Cancelamentos por gestor (coluna P da planilha) — barra mostra <strong>nº absoluto de churns</strong> e a linha mostra <strong>% de churn</strong> sobre o total de clientes que ele já teve (ativos hoje + cancelados). Clique em um gestor para ver os clientes cancelados.
    </div>
    <div style="height:340px;"><canvas id="chart-churn-gestor"></canvas></div>
  </div>

  <div class="section-title">Lista de Cancelamentos</div>
  <div class="nps-card" style="padding:0;overflow:hidden;">
    <div style="max-height:520px;overflow:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:.78rem;">
        <thead style="position:sticky;top:0;background:var(--m-head);z-index:1;">
          <tr style="border-bottom:1px solid var(--border);">
            <th style="text-align:left;padding:12px 16px;font-weight:600;color:var(--text-2);">Cliente</th>
            <th style="text-align:left;padding:12px 16px;font-weight:600;color:var(--text-2);">Gestor</th>
            <th style="text-align:left;padding:12px 16px;font-weight:600;color:var(--text-2);">Plano</th>
            <th style="text-align:left;padding:12px 16px;font-weight:600;color:var(--text-2);">Entrada</th>
            <th style="text-align:left;padding:12px 16px;font-weight:600;color:var(--text-2);">Saída</th>
            <th style="text-align:right;padding:12px 16px;font-weight:600;color:var(--text-2);">Dias</th>
            <th style="text-align:right;padding:12px 16px;font-weight:600;color:var(--text-2);">LTV</th>
            <th style="text-align:center;padding:12px 16px;font-weight:600;color:var(--text-2);">Retornou?</th>
          </tr>
        </thead>
        <tbody id="churn-table-body"><tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-2);">Carregando…</td></tr></tbody>
      </table>
    </div>
  </div>

</main>
</div><!-- /tab3 -->
`;
