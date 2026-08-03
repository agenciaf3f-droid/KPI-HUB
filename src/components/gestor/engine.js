/* ============================================================================
   MOTOR DO DASH-GESTORES — transplantado de public/dashboard.html (scripts
   inline, na ordem original) para modulo ES. O codigo abaixo e o original;
   as unicas cirurgias:
     1. supaHeaders(): token vem do client do hub (@supabase/ssr le o cookie
        da sessao unica e auto-renova) — era o authClient proprio do dashboard.
     2. fallback do loadActiveClients: hub client em vez de window.__authClient.
     3. Chart via npm (chart.js/auto, mesma 4.4.x do CDN) em vez de <script>.
     4. init() nao roda no import: initGestor() chama apos injetar o markup.
     5. Bloco de auth do original (login overlay, checkLogin, onAuthStateChange,
        ponte /gestor-session) NAO existe mais — a sessao e garantida pelo RSC.
   Bloco morto nao transplantado: calculaLeadTimeRepasse + renderLeadTimeRepasse
   (2o script inline; sem chamador e sem ids no markup — confirmado por grep).
   ============================================================================ */
import { Chart } from "chart.js/auto";

import { createClient } from "@/lib/supabase/client";

import { GESTOR_MARKUP } from "./markup";

const hub = createClient();

/* ================================================================
   ESCOPO POR USUARIO
   O dashboard original era um so painel para a agencia inteira: quem
   abrisse via o lead time de todo mundo lado a lado. No hub, cada
   pessoa ve so o proprio recorte; o admin continua vendo tudo.
   O escopo vem do servidor (gestor-app.tsx) — nunca do cliente.
   ================================================================ */
function escopo(){
  return (typeof window !== 'undefined' && window.__F3F_ESCOPO) || null;
}

/** Nome do gestor a filtrar. '' = sem filtro (admin ve todos). */
function nomeDeEscopo(){
  const e = escopo();
  if(!e || e.admin) return '';
  // Editor primeiro, de proposito: na planilha o lead time dele e creditado ao
  // balde da edicao ("Vídeos"/"Edição" — nomeDoGestor converte para o nome do
  // roster), nunca ao nome pessoal. Se o admin marcar Video + Gestor para um
  // editor, filtrar pelo nome dele devolveria painel vazio.
  if(e.editor) return nomeDoGestor('Edição');
  return e.nome || '';
}

// Tema dos graficos. O dashboard original so tinha modo claro e passava a cor
// literal para o Chart.js; aqui lemos a classe .dark que o hub poe no <html>
// no momento em que cada grafico e montado (renderCharts roda de novo quando
// o tema muda — ver gestor-app.tsx).
function CT(){
  return document.documentElement.classList.contains('dark')
    ? { tick:'#b4a9b7', grid:'#2f2533' }
    : { tick:'#9ca3af', grid:'#f3f4f6' };
}

// Do 2o script inline do original: as FUNCOES de la eram mortas
// (calculaLeadTimeRepasse sem chamador), mas esta declaracao e viva —
// applyRoster preenche e o motor le (setor por telefone).
const EQUIPE_POR_TELEFONE = new Map();


/* ================================================================
   CONSTANTS
   ================================================================ */
/* ================================================================
   DATA SOURCE — via /api/leadtime (autenticado)
   ================================================================
   Antes o navegador falava direto com o Supabase usando uma chave embutida
   aqui. Como este arquivo é servido publicamente, a chave e a tabela inteira
   ficavam abertas a qualquer visitante. Agora a chave vive só no servidor
   (env var, ver api/leadtime.js) e nenhuma linha sai sem sessão válida.

   A query string continua a do PostgREST: o proxy repassa igual, então a
   paginação por keyset e o cache incremental abaixo seguem valendo. */
const SUPA_ENDPOINT = '/api/leadtime';

/* Headers da requisição de dados. Depende da sessão, então é função, não const:
   o token muda a cada refresh do Supabase Auth. */
async function supaHeaders(){
  const { data } = await hub.auth.getSession();
  const token = data && data.session ? data.session.access_token : null;
  if(!token) throw new Error('Sem sessão — faça login novamente.');
  return { 'Authorization': `Bearer ${token}` };
}

/* ================================================================
   ROSTER — preenchido em runtime por /api/config (ver bootData no fim)
   ================================================================
   Estas listas guardam os celulares pessoais da equipe. Ficavam hardcoded
   aqui e, como o arquivo é público, qualquer um os lia sem login.
   Agora chegam autenticados.

   ATENÇÃO: começam VAZIAS. Se o motor rodar antes do roster chegar,
   isGestorPhone() devolve false para todo mundo e todo gestor é
   classificado como cliente — corrompendo lead time e churn em silêncio.
   Por isso rosterReady() é obrigatório antes de fetchData(). */
let REPORT_TAGS = [];
const BIZ_START = 9, BIZ_END = 18;

// Dias sem mensagem humana a partir dos quais o grupo é dado como abandonado e o
// ticket aberto para de contar. Compartilhado pelos dois motores de lead time.
const ABANDONO_DIAS = 45;

/* ================================================================
   LEAD TIME — PHONE LISTS (preenchidas por applyRoster)
   ================================================================ */
// Nomes de gestor excluídos de todo o dashboard (lowercase)
let EXCLUDED_GESTORS = [];
// Alias de compatibilidade (casamento por substring contra a lista)
let EXCLUDED_GESTOR = '';
function isExcludedGestor(name){
  if(!name) return false;
  const n = String(name).toLowerCase();
  // Excecao de escopo: quem esta na lista de exclusao continua fora das contas
  // da agencia (a media do time nao muda), mas ve a PROPRIA carteira quando
  // abre o painel. Sem isto o painel dele viria vazio.
  const eu = nomeDeEscopo();
  if(eu && n === String(eu).toLowerCase()) return false;
  return EXCLUDED_GESTORS.some(g => n.includes(g));
}

// A coluna Gestor da planilha às vezes traz o setor no lugar da pessoa: em 3
// grupos ela diz "Vídeos" ou "Edição", e nos três o único do time que fala é o
// editor. Sem isto ele vira duas ou três barras/filtros diferentes, e o pedaço
// dele fica escondido atrás de um nome de setor. O nome sai do roster
// autenticado — este arquivo é público e não guarda nome de ninguém.
const GESTOR_E_O_EDITOR = new Set(['vídeos','videos','vídeo','video','edição','edicao']);
function nomeDoGestor(valor){
  const v = String(valor || '').trim();
  if(!GESTOR_E_O_EDITOR.has(v.toLowerCase())) return v;
  const tel = [...EDICAO_PHONES][0];
  const reg = tel && EQUIPE_POR_TELEFONE.get(tel);
  return reg ? reg.nome : v;
}

// Grupo fechado. O marcador é escrito à mão e aparece em 4 formatos na base:
//   "(FECHADO)F3F - X"  "( FECHADO ) F3F - X"  "F3F - (FECHADO) X"  "F3F - X (FECHADO)"
// Por isso a busca é solta, sem âncora e sem exigir os parênteses — o regex
// ancorado usado na área de churn (/^\(FECHADO\)\s*/) pega só 25 dos 45.
// Conferido contra os 334 grupos da base: 45 acertos, zero falso positivo.
// O nome manda: há grupo marcado FECHADO com Status "Ativo" na planilha.
function isGrupoFechado(groupName){
  return /fechado/i.test(String(groupName || ''));
}

// Mensagem só com emoji (reação: cliente rindo/reagindo, "🤣🤣🤣", "👍").
// De CLIENTE não abre atendimento — reagir não é pedido. De membro do time conta
// normal (é resposta). Global: os dois motores de lead time usam.
function soEmoji(txt){
  const s = String(txt || '').trim();
  if(!s) return false;
  // só emoji + modificadores (tom de pele, ZWJ, seletor de variação) e espaços
  return /^[\p{Extended_Pictographic}\p{Emoji_Presentation}‍️\u{1F3FB}-\u{1F3FF}\s]+$/u.test(s);
}

// Gestores: quando respondem, entram no resumo por gestor
const GESTOR_PHONES = new Set();

// Invalidadores: fecham o ticket pendente como "Resolvido por suporte",
// mas NÃO contam na média do gestor
const INVALIDATOR_PHONES = new Set();

// Edição / Webdesign / Estratégia: trilhas separadas de lead time
const EDICAO_PHONES = new Set();
const WEBDESIGN_PHONES = new Set();
const ESTRATEGIA_PHONES = new Set();

let AUTOMATION_NUMBER = '';
let _rosterLoaded = false;

/* Preenche as listas a partir do roster autenticado. Mutação in-place: os Sets
   são const e já estão capturados pelas closures do motor — reatribuir quebraria
   as referências. */
function applyRoster(r){
  REPORT_TAGS = r.reportTags || [];
  EXCLUDED_GESTORS = r.excludedGestors || [];
  EXCLUDED_GESTOR = EXCLUDED_GESTORS[0] || '';
  AUTOMATION_NUMBER = r.automation || '';

  const fill = (set, arr) => { set.clear(); (arr || []).forEach(p => set.add(p)); };
  fill(GESTOR_PHONES,      r.gestor);
  fill(INVALIDATOR_PHONES, r.invalidator);
  fill(EDICAO_PHONES,      r.edicao);
  fill(WEBDESIGN_PHONES,   r.webdesign);
  fill(ESTRATEGIA_PHONES,  r.estrategia);

  LT_CLIENT_OVERRIDE_GROUPS.clear();
  (r.ltClientOverrideGroups || []).forEach(g => LT_CLIENT_OVERRIDE_GROUPS.add(g));

  // Motor novo (aba 4) — mesmo roster, formato próprio. Vive noutro <script>,
  // já parseado quando isto roda (bootData é o último a executar).
  if(typeof EQUIPE_POR_TELEFONE !== 'undefined'){
    EQUIPE_POR_TELEFONE.clear();
    (r.equipe || []).forEach(e => EQUIPE_POR_TELEFONE.set(e.phone, { nome: e.nome, setor: e.setor }));
  }

  _rosterLoaded = GESTOR_PHONES.size > 0;
  return _rosterLoaded;
}

/* Busca o roster. Devolve false em qualquer falha — o chamador NÃO pode
   seguir para o motor, ver comentário em bootData. */
async function loadRoster(){
  try {
    const r = await fetch('/api/config', { headers: await supaHeaders(), signal: AbortSignal.timeout(15000) });
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const { roster } = await r.json();
    if(!roster) throw new Error('resposta sem roster');
    return applyRoster(roster);
  } catch(e){
    console.error('[F3F] Falha ao carregar roster:', e.message);
    return false;
  }
}

// TIME = GESTOR ∪ INVALIDATOR ∪ EDIÇÃO ∪ WEBDESIGN ∪ ESTRATÉGIA
function isTeamPhone(phone){ return GESTOR_PHONES.has(phone) || INVALIDATOR_PHONES.has(phone) || EDICAO_PHONES.has(phone) || WEBDESIGN_PHONES.has(phone) || ESTRATEGIA_PHONES.has(phone); }
function isGestorPhone(phone){ return GESTOR_PHONES.has(phone); }
function isInvalidatorPhone(phone){ return INVALIDATOR_PHONES.has(phone); }
function isEdicaoPhone(phone){ return EDICAO_PHONES.has(phone); }
function isWebdesignPhone(phone){ return WEBDESIGN_PHONES.has(phone); }
function isEstrategiaPhone(phone){ return ESTRATEGIA_PHONES.has(phone); }

// LID → telefone, aprendido dos próprios dados.
//
// O WhatsApp não escreve o telefone na marcação: escreve o LID interno da pessoa
// ("@249159827382448"). O roster só conhece telefone, então comparar "@"+telefone
// com o texto nunca casou — em 30 dias, 271 marcações apontaram para o time e
// nenhuma foi reconhecida. Como cada linha guarda sender_lid e Número lado a lado,
// quem já falou uma vez fica identificado, e a marcação passa a ser legível.
let LID_TO_PHONE = new Map();

// Telefones do time marcados nesta mensagem. Marcação de cliente não entra.
function telefonesMarcados(msgText){
  const out = [];
  const tokens = String(msgText || '').match(/@(\d{8,})/g) || [];
  tokens.forEach(tok => {
    const id = tok.slice(1);
    const tel = normalizePhone(LID_TO_PHONE.get(id) || id);
    if(tel && isTeamPhone(tel) && !out.includes(tel)) out.push(tel);
  });
  return out;
}

function setorDoTelefone(p){
  if(isEdicaoPhone(p))      return 'EDICAO';
  if(isWebdesignPhone(p))   return 'WEBDESIGN';
  if(isEstrategiaPhone(p))  return 'ESTRATEGIA';
  if(isInvalidatorPhone(p)) return 'ESTRATEGIA';
  if(isGestorPhone(p))      return 'GESTOR';
  return null;
}

// Detect @mentions in message text
function detectMentions(msgText){
  const mentions = { gestor: false, edicao: false, webdesign: false, estrategia: false };
  EDICAO_PHONES.forEach(p => { if(msgText.includes('@' + p)) mentions.edicao = true; });
  WEBDESIGN_PHONES.forEach(p => { if(msgText.includes('@' + p)) mentions.webdesign = true; });
  ESTRATEGIA_PHONES.forEach(p => { if(msgText.includes('@' + p)) mentions.estrategia = true; });
  GESTOR_PHONES.forEach(p => { if(msgText.includes('@' + p)) mentions.gestor = true; });
  return mentions;
}

// A mensagem citada, achada pelo id — quando o dado permite.
//
// Duas eras convivem na base. O n8n gravava o TEXTO da citação na coluna Reply, e
// achar o original só dava para fazer casando texto com texto (o que erra sempre
// que duas pessoas escrevem "ok"). A ingestão da UAZAPI não resolve o texto, mas
// grava reply_to_id: o id exato da mensagem citada. Onde ele existe, ele manda.
//
// Reação NÃO é citação. O reply_to_id de uma reação aponta para a mensagem que
// recebeu o emoji; tratar isso como resposta faria o time "atender" um cliente só
// por reagir — abrindo e fechando atendimento que nunca houve.
function citacaoPorId(row, idxById){
  if(gf(row,'type').trim() === 'Reação') return null;
  const rid = gf(row,'replyToId').trim();
  if(!rid || !idxById) return null;
  return idxById.get(rid) || null;
}

// Detect direction via Reply (quoted message) — looks up original sender's phone
function detectReplyTarget(replyText, msgIndexByGroup, citada){
  const result = { gestor: false, edicao: false, webdesign: false, estrategia: false };
  const entry = citada || (replyText && msgIndexByGroup ? (msgIndexByGroup.get(replyText) || [])[0] : null);
  if(!entry) return result;
  const originalPhone = entry.phone;
  if(isEdicaoPhone(originalPhone)) result.edicao = true;
  else if(isWebdesignPhone(originalPhone)) result.webdesign = true;
  else if(isEstrategiaPhone(originalPhone)) result.estrategia = true;
  else if(isGestorPhone(originalPhone)) result.gestor = true;
  return result;
}

// Detect if a Reply points to a CLIENT message (non-team sender)
// Returns { isClient, originalDt, originalPhone }
function detectReplyToClient(replyText, msgIndex, citada){
  const result = { isClient: false, originalDt: null, originalPhone: null };
  if(citada){
    if(!isTeamPhone(citada.phone) && citada.dt){
      return { isClient: true, originalDt: citada.dt, originalPhone: citada.phone };
    }
    return result;
  }
  if(!replyText || !msgIndex) return result;
  const entries = msgIndex.get(replyText);
  if(!entries || entries.length === 0) return result;
  // Find the latest matching entry from a client (non-team)
  for(let i = entries.length - 1; i >= 0; i--){
    const e = entries[i];
    const isTeam = isGestorPhone(e.phone) || isInvalidatorPhone(e.phone) || isEdicaoPhone(e.phone) || isWebdesignPhone(e.phone) || isEstrategiaPhone(e.phone);
    if(!isTeam && e.dt){
      result.isClient = true;
      result.originalDt = e.dt;
      result.originalPhone = e.phone;
      return result;
    }
  }
  return result;
}

// Número da automação: ignorado por completo — não abre, não fecha nem reseta
// ticket pendente, e não entra em métrica nenhuma.
// Declarado junto do roster (applyRoster) — vem de /api/config.

let rawRows      = [];
let groupData    = [];
let allGestors   = new Set(); // all unique gestor names from col H (full sheet)
let sortKey      = 'msgs';
let sortDir      = -1;

let dpStart    = null;
let dpEnd      = null;
let dpTmp = { start:null, end:null };
let dpSelecting = false;
let dpView  = { year:new Date().getFullYear(), month:new Date().getMonth() };

let chartLT         = null;
let chartRel        = null;
let COL             = {};

/* ================================================================
   DATE UTILITIES
   ================================================================ */
const today     = () => { const d=new Date(); d.setHours(0,0,0,0); return d; };
const addDays   = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const som       = d => new Date(d.getFullYear(),d.getMonth(),1);
const eom       = d => new Date(d.getFullYear(),d.getMonth()+1,0);
const sameDay   = (a,b) => a.toDateString()===b.toDateString();
const isWE      = d => d.getDay()===0||d.getDay()===6;

function fmtDate(d){
  if(!d) return '—';
  return `${p2(d.getDate())}/${p2(d.getMonth()+1)}/${d.getFullYear()}`;
}
const p2 = n => String(n).padStart(2,'0');

function fmtMins(m){
  if(m===null||m===undefined||isNaN(m)) return '—';
  m=Math.round(m);
  if(m<60) return `${m} min`;
  return `${Math.floor(m/60)}h${p2(m%60)}`;
}

/* ================================================================
   BUSINESS-HOURS MINUTES  (seg–sex 09:00–18:00, America/Sao_Paulo)
   Checklist:
   • 20:00 Ter → 09:30 Qua  = 30 min  ✓
   • 17:50 → 18:10 same day = 10 min  ✓
   • 17:50 Sex → 09:10 Seg  = 20 min  ✓
   • 3 msgs 10:00/02/05, resp 10:20  = 20 min (open at first client msg) ✓
   ================================================================ */
function advanceToNextBizOpen(d){
  // Push d forward until it sits inside a biz window
  let c = new Date(d);
  for(let guard = 0; guard < 20; guard++){
    const dow = c.getDay(); // 0=Sun … 6=Sat
    if(dow === 0){ c.setDate(c.getDate()+1); c.setHours(BIZ_START,0,0,0); continue; }
    if(dow === 6){ c.setDate(c.getDate()+2); c.setHours(BIZ_START,0,0,0); continue; }
    const h = c.getHours(), mi = c.getMinutes(), s = c.getSeconds();
    if(h < BIZ_START){ c.setHours(BIZ_START,0,0,0); continue; }
    if(h > BIZ_END || (h === BIZ_END && (mi > 0 || s > 0))){
      c.setDate(c.getDate()+1); c.setHours(BIZ_START,0,0,0); continue;
    }
    break;
  }
  return c;
}

function bizMins(start, end){
  if(!start || !end) return 0;
  // Clamp start to next biz moment
  let cur = advanceToNextBizOpen(new Date(start));
  // If end is before or equal to clamped start → 0
  if(end <= cur) return 0;
  let mins = 0;
  let safety = 0;
  while(cur < end && safety++ < 10000){
    const dow = cur.getDay();
    // Skip weekend (should not happen after advanceToNextBizOpen, but guard anyway)
    if(dow === 0 || dow === 6){ cur.setDate(cur.getDate()+(dow===6?2:1)); cur.setHours(BIZ_START,0,0,0); continue; }
    // End-of-biz wall for this day
    const dayClose = new Date(cur); dayClose.setHours(BIZ_END,0,0,0);
    // Effective slice end = min(end, dayClose)
    const sliceEnd = end < dayClose ? new Date(end) : dayClose;
    const delta = Math.round((sliceEnd - cur) / 60000);
    if(delta > 0) mins += delta;
    // Move cursor
    if(sliceEnd >= dayClose){
      // Roll to next business day 09:00
      cur.setDate(cur.getDate()+1); cur.setHours(BIZ_START,0,0,0);
      // Skip weekend
      while(cur.getDay()===0||cur.getDay()===6){ cur.setDate(cur.getDate()+1); }
    } else {
      cur = new Date(sliceEnd);
    }
  }
  return mins;
}

/* ================================================================
   FORA DO EXPEDIENTE — helpers
   ================================================================ */
function isForaExpediente(dt){
  if(!dt) return false;
  const dow = dt.getDay(); // 0=Sun, 6=Sat
  if(dow === 0 || dow === 6) return true;
  const h = dt.getHours();
  if(h < BIZ_START || h >= BIZ_END) return true;
  return false;
}

function nextBizOpen(dt){
  // Returns the next business-hour opening (09:00 on next weekday)
  const c = new Date(dt);
  // If currently before 09:00 on a weekday, next biz open is today 09:00
  const dow = c.getDay();
  if(dow >= 1 && dow <= 5 && c.getHours() < BIZ_START){
    c.setHours(BIZ_START, 0, 0, 0);
    return c;
  }
  // Otherwise, advance to next day and find first weekday
  c.setDate(c.getDate() + 1);
  c.setHours(BIZ_START, 0, 0, 0);
  while(c.getDay() === 0 || c.getDay() === 6){
    c.setDate(c.getDate() + 1);
  }
  return c;
}

function isoWeek(d){
  const t=new Date(d); t.setHours(0,0,0,0);
  t.setDate(t.getDate()+3-(t.getDay()+6)%7);
  const w1=new Date(t.getFullYear(),0,4);
  return `${t.getFullYear()}-W${p2(1+Math.round(((t-w1)/86400000-3+(w1.getDay()+6)%7)/7))}`;
}

function weekMonday(d){
  const r=new Date(d); r.setHours(0,0,0,0);
  const day=r.getDay(); r.setDate(r.getDate()-((day+6)%7));
  return r;
}

/* ================================================================
   SUPABASE — campo → chave interna
   Mapeamento das colunas da tabela "Controle de Mensagens"
   para as chaves internas usadas pelo restante do código.
   ================================================================ */
function normalizeGroupId(raw){
  return raw.replace(/@g\.us$/, '').replace(/-group$/, '');
}

// Pontual: neste grupo específico, mensagens vindas de números de suporte
// precisam abrir LT como cliente para não zerar o acompanhamento.
const LT_CLIENT_OVERRIDE_GROUPS = new Set(); // preenchido por applyRoster
function isLtClientOverrideGroup(groupId){
  return LT_CLIENT_OVERRIDE_GROUPS.has(normalizeGroupId((groupId || '').toString()));
}
function mapSupabaseRow(row){
  return {
    groupId:    normalizeGroupId((row['grupo_id']    ?? row['Grupo']         ?? '').toString()),
    sender:     (row['sender_nome'] ?? row['Nome']          ?? '').toString(),
    phone:      (row['phone']       ?? row['Número']        ?? '').toString(),
    msg:        (row['mensagem']    ?? row['Mensagem']      ?? '').toString(),
    datetime:   (row['horario']     ?? row['Horário']       ?? '').toString(),
    type:       (row['tipo']        ?? row['Tipo']          ?? '').toString(),
    groupName:  (row['group_nome']  ?? row['Nome do Grupo'] ?? '').toString(),
    gestorName: (row['gestor']      ?? row['Gestor']        ?? '').toString(),
    status:     (row['status']      ?? row['Status']        ?? '').toString(),
    reply:      (row['Reply']       ?? row['reply']         ?? '').toString(),
    senderLid:  (row['sender_lid']  ?? '').toString(),
    messageId:  (row['message_id']  ?? '').toString(),
    replyToId:  (row['reply_to_id'] ?? '').toString(),
  };
}

/* gf(row, key) — getter simples para as chaves internas mapeadas */
function gf(row, key){ return row ? (row[key] ?? '') : ''; }

/* ================================================================
   PARSE DATE/DATETIME  — suporte a ISO 8601 e DD/MM/YYYY HH:MM:SS
   ================================================================ */
function parseDateTimeStr(str){
  if(!str) return null;
  str = str.trim();
  // ISO 8601: 2026-02-14T10:30:00 or 2026-02-14 10:30:00
  if(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(str)){
    const d = new Date(str.replace(' ','T'));
    return isNaN(d) ? null : d;
  }
  // DD/MM/YYYY HH:MM:SS or DD/MM/YYYY HH:MM
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if(m){
    const d = new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5], +(m[6]||0));
    return isNaN(d) ? null : d;
  }
  // DD/MM/YYYY only
  const m2 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if(m2){
    const d = new Date(+m2[3], +m2[2]-1, +m2[1]);
    return isNaN(d) ? null : d;
  }
  return null;
}

function parseDateTime(row){ return parseDateTimeStr(gf(row,'datetime')); }
function parseDate(row){
  const d = parseDateTime(row);
  if(!d) return null;
  const day = new Date(d); day.setHours(0,0,0,0); return day;
}

/* ================================================================
   FETCH — Supabase REST API com paginação automática
   ================================================================ */
let _isFetching = false;
let _dataLoaded  = false;

function reloadData(){ _isFetching = false; _dataLoaded = false; fetchData(); }

/* ================================================================
   CACHE INCREMENTAL (IndexedDB)
   Guarda as linhas cruas já baixadas + o maior Horário visto.
   Nas próximas aberturas baixamos só o delta (Horário > último),
   reduzindo de ~96k registros para algumas centenas.
   ================================================================ */
const IDB_NAME='f3f-cache', IDB_STORE='kv', IDB_KEY='controle-mensagens', CACHE_VERSION=2;
function idbOpen(){
  return new Promise((res,rej)=>{
    let r;
    try { r = indexedDB.open(IDB_NAME, 1); } catch(e){ return rej(e); }
    r.onupgradeneeded = () => { if(!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE); };
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}
async function idbGet(){
  try{
    const db = await idbOpen();
    return await new Promise((res,rej)=>{
      const req = db.transaction(IDB_STORE,'readonly').objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => res(req.result || null);
      req.onerror   = () => rej(req.error);
    });
  }catch(_){ return null; }
}
async function idbSet(val){
  try{
    const db = await idbOpen();
    return await new Promise((res,rej)=>{
      const req = db.transaction(IDB_STORE,'readwrite').objectStore(IDB_STORE).put(val, IDB_KEY);
      req.onsuccess = () => res(true);
      req.onerror   = () => rej(req.error);
    });
  }catch(_){ return false; }
}

// Pool de concorrência: roda `worker(item)` sobre `items` com no máx. `conc` simultâneos.
async function runPool(items, worker, conc){
  const results = new Array(items.length);
  let i = 0;
  async function next(){
    while(i < items.length){ const idx = i++; results[idx] = await worker(items[idx], idx); }
  }
  await Promise.all(Array.from({length: Math.min(conc, items.length)}, next));
  return results;
}

async function fetchData(){
  if(_isFetching || _dataLoaded) return;
  _isFetching = true;
  setStatus('loading','Carregando…');

  try {
    // Guarda-chuva: sem roster, isGestorPhone() é false para todos e TODO gestor
    // vira "cliente" — lead time e churn saem errados sem erro nenhum na tela.
    // Nunca remover esta checagem.
    if(!_rosterLoaded){
      throw new Error('Roster não carregado — abortando para não corromper as métricas.');
    }
    const endpoint  = SUPA_ENDPOINT;
    const headers   = await supaHeaders();
    const pageSize  = 10000;
    const CONCURRENCY = 8;
    let pageError = null;

    // 1) Carrega o cache local (linhas cruas já baixadas) — chave incremental = maior id
    const cached = await idbGet();
    const useCache = cached && cached.v === CACHE_VERSION && Array.isArray(cached.rows) && cached.rows.length;
    let baseRows = useCache ? cached.rows : [];
    const sinceId = useCache && Number.isFinite(cached.maxId) ? cached.maxId : 0;
    if(sinceId) setStatus('loading','Atualizando…');

    // 2) Descobre o MAIOR id atual (usa o índice da PK — rápido, sem timeout)
    let maxId = null;
    try {
      const r = await fetch(`${endpoint}?select=id&order=id.desc&limit=1`, { headers, signal: AbortSignal.timeout(30000) });
      if(r.ok){ const j = await r.json(); if(Array.isArray(j) && j[0]) maxId = j[0].id; }
    } catch(_){}
    if(maxId != null) window._lastKnownMaxId = maxId; // p/ o auto-refresh saber se há dado novo

    // Baixa UMA janela de ids por keyset (id>=cursor & id<hi, ordenado por id). Sempre usa o
    // índice da chave primária → NÃO faz varredura por OFFSET, então não estoura statement timeout.
    async function fetchWindow(lo, hi){
      let rows = [], cursor = lo;
      while(cursor < hi){
        const url = `${endpoint}?select=*&id=gte.${cursor}&id=lt.${hi}&order=id.asc&limit=${pageSize}`;
        let page = null, lastErr = null;
        for(let attempt=1; attempt<=4; attempt++){
          try {
            const r = await fetch(url, { headers, signal: AbortSignal.timeout(45000) });
            if(!r.ok){ const body = await r.text().catch(()=>''); throw new Error(`HTTP ${r.status}: ${body}`); }
            const json = await r.json();
            if(!Array.isArray(json)) throw new Error('Resposta inesperada (não é array)');
            page = json; break;
          } catch(err){
            lastErr = err;
            console.warn(`[F3F] Falha janela id[${cursor},${hi}) tentativa ${attempt}: ${err.message}`);
            if(attempt < 4) await new Promise(res => setTimeout(res, 800 * attempt));
          }
        }
        if(page === null){ pageError = lastErr || new Error('Falha ao buscar janela'); break; }
        rows = rows.concat(page);
        if(page.length < pageSize) break;
        cursor = page[page.length - 1].id + 1;
      }
      return rows;
    }

    // 3) Baixa só os ids NOVOS (> sinceId), particionados em janelas paralelas
    let newRows = [];
    const start = sinceId ? sinceId + 1 : 0;
    if(maxId === null){
      pageError = new Error('Não foi possível obter o maior id (rede)');
    } else if(maxId < start){
      console.log('[F3F] Nada novo desde a última carga — usando cache.');
    } else {
      const span = maxId - start + 1;
      const W = Math.min(CONCURRENCY, Math.max(1, Math.ceil(span / pageSize)));
      const sliceSize = Math.ceil(span / W);
      const windows = [];
      for(let w = 0; w < W; w++){
        const lo = start + w * sliceSize;
        const hi = Math.min(lo + sliceSize, maxId + 1);
        if(lo <= maxId) windows.push([lo, hi]);
      }
      console.log(`[F3F] Baixando ids [${start}..${maxId}] em ${windows.length} janela(s) paralelas…`);
      const parts = await runPool(windows, (win) => fetchWindow(win[0], win[1]), CONCURRENCY);
      newRows = parts.flat();
    }

    // 4) Mescla delta + cache, removendo duplicatas por id (id sempre presente)
    let allRows;
    if(baseRows.length && newRows.length){
      const byId = new Map();
      for(const row of baseRows) byId.set(row.id, row);
      for(const row of newRows)  byId.set(row.id, row); // novos sobrescrevem
      allRows = Array.from(byId.values());
    } else {
      allRows = newRows.length ? newRows : baseRows;
    }

    if(!allRows.length){
      throw pageError || new Error('Nenhum registro retornado pela API');
    }

    // 5) Persiste o cache atualizado (apenas se não houve falha parcial nesta rodada)
    if(!pageError){
      let maxIdSeen = sinceId || 0;
      for(const row of allRows){ if(Number.isFinite(row.id) && row.id > maxIdSeen) maxIdSeen = row.id; }
      idbSet({ v: CACHE_VERSION, maxId: maxIdSeen, rows: allRows }).catch(()=>{});
    }

    // Mapeia para o formato interno (colunas fixas via mapSupabaseRow)
    rawRows = allRows.map(mapSupabaseRow);
    window.rawRows = rawRows;

    const sample = rawRows[0];
    console.log('[F3F] Primeira linha mapeada:', sample);
    console.log('[F3F] groupId=', gf(sample,'groupId'),
      '| sender=', gf(sample,'sender'),
      '| gestorName=', gf(sample,'gestorName'),
      '| datetime=', gf(sample,'datetime'),
      '| type=', gf(sample,'type'),
      '| groupName=', gf(sample,'groupName'),
      '| status=', gf(sample,'status'));

    console.log(`[F3F] Total carregado: ${rawRows.length} registros${pageError?' (parcial)':''}`);
    if(pageError){
      showError(`Carga parcial: ${rawRows.length} registros baixados antes de uma falha de rede (${pageError.message}). Os gráficos abaixo refletem os dados disponíveis. Recarregue para tentar buscar tudo novamente.`);
    } else {
      hideError();
    }
    applyFilter();
    setStatus(pageError?'warning':'ok', pageError ? `Parcial · ${rawRows.length} registros` : `OK · ${rawRows.length} registros`);
    _dataLoaded = !pageError;
    // Se o gráfico de risco do Churn estiver aguardando rawRows, re-renderiza agora.
    try {
      if(typeof renderChurnRiskChart === 'function' && _activeClientsData && _activeClientsData.ativos && _activeClientsData.ativos.length){
        const sel = document.getElementById('churn-plan-filter');
        renderChurnRiskChart(sel ? sel.value : 'all');
      }
    } catch(_){}
    // O churn de mai/26+ vem de rawRows (grupos FECHADO). Se a aba já foi aberta
    // antes dos dados chegarem, re-renderiza agora para preencher esses meses.
    try {
      if(window._churnInitialized && _churnRows && _churnRows.length && typeof churnRender === 'function'){
        churnRender();
      }
    } catch(_){}
  } catch(e){
    console.error('[F3F] Erro ao buscar dados:', e);
    _isFetching = false;
    setStatus('error','Erro ao carregar');
    showError(`Não foi possível carregar os dados: ${e.message}. Verifique sua conexão e tente recarregar.`);
    renderEmpty();
    return;
  }

  _isFetching = false;
}

/* ================================================================
   FILTER & AGGREGATE
   ================================================================ */

/* Extract plan from group name: last segment after the last " - " */
function extractPlan(name){
  if(!name) return '';
  const parts = name.split(' - ');
  return parts.length > 1 ? parts[parts.length - 1].trim() : '';
}

function applyFilter(){
  const planFilter   = document.getElementById('filter-plan')?.value   || '';
  const statusFilter = document.getElementById('filter-status')?.value || '';
  // Fora do admin o seletor de gestor nao vale: o filtro e a propria pessoa.
  const gestorFilter = nomeDeEscopo() || document.getElementById('filter-gestor')?.value || '';

  const filtered = rawRows.filter(row => {
    const d = parseDate(row);
    if(!d) return false;
    return d >= dpStart && d <= dpEnd;
  });

  aggregate(filtered, planFilter, gestorFilter, statusFilter);
}

function normalizePhone(p){ return p.replace(/\D/g,''); }

function aggregate(rows, planFilter, gestorFilter, statusFilter){
  /* ================================================================
     PASS 1 — Build LATEST metadata (name/plan/gestor/status) per
     group from the ENTIRE sheet (allSorted — dataset_completo),
     so we always reflect the most recent state regardless of the
     date filter. Also computes:
       • lastReport  — most recent !MFx command timestamp (from any gestor)
       • reportDays  — days since lastReport
       • prevReport  — "áudio enviado pelo gestor em até 1h após !MFx?"
     Exclusion: skip any group whose col-H gestor is "Denzel".
  ================================================================ */
  const TYPE_AUDIO = /audio|áudio|voz|voice|ptt/i;

  const allSorted = [...rawRows].sort((a, b) => {
    const da = parseDateTime(a), db = parseDateTime(b);
    if(!da && !db) return 0; if(!da) return -1; if(!db) return 1;
    return da - db;
  });

  // grpId → { name, plan, gestor, status,
  //            lastReportCmd (timestamp of latest !MFx by gestor),
  //            prevAudioMins (minutes from cmd to first audio, or null) }
  const grpMeta = {};
  const allGestorNames = new Set();

  // --- Sub-pass 1a: collect metadata (name/plan/gestor/status/lastReport) ---
  // Also collect all gestor-sent rows per group for prevReport calculation
  const grpGestorMsgsAll = {}; // grpId → [{dt, type}]

  allSorted.forEach(row => {
    const grpId      = gf(row,'groupId').trim(); if(!grpId) return;
    const gestorColH = nomeDoGestor(gf(row,'gestorName'));
    if(isExcludedGestor(gestorColH)) return;

    if(!grpMeta[grpId]) grpMeta[grpId] = {
      name: grpId, plan:'', gestor:'', status:'',
      lastReportCmd: null, prevAudioMins: null,
      lastVideoReport: null, videoReportDays: null
    };

    const grpName   = gf(row,'groupName').trim();
    const statusRaw = gf(row,'status').trim();
    if(grpName)    { grpMeta[grpId].name   = grpName; grpMeta[grpId].plan = extractPlan(grpName); }
    if(gestorColH) { grpMeta[grpId].gestor = gestorColH; allGestorNames.add(gestorColH); }
    if(statusRaw)  { grpMeta[grpId].status = statusRaw; }

    // Última mensagem do grupo na base inteira — a cobrança de relatório precisa
    // saber se o grupo ainda está vivo mesmo quando ninguém falou no período filtrado.
    const dtQualquer = parseDateTime(row);
    if(dtQualquer && (!grpMeta[grpId].ultimaMsg || dtQualquer > grpMeta[grpId].ultimaMsg)){
      grpMeta[grpId].ultimaMsg = dtQualquer;
    }

    // Video report detection
    const msgTextAll = gf(row,'msg').trim();
    if(msgTextAll.includes('Segue o seu relatório em vídeo referente')){
      const dtV = parseDateTime(row);
      if(dtV && (!grpMeta[grpId].lastVideoReport || dtV > grpMeta[grpId].lastVideoReport)){
        grpMeta[grpId].lastVideoReport = dtV;
        grpMeta[grpId].videoReportGestor = gestorColH;
      }
    }

    // Collect gestor-sent msgs for prevReport logic (ignore automation)
    const senderPhone = normalizePhone(gf(row,'phone'));
    if(senderPhone === AUTOMATION_NUMBER) return;
    if(!isGestorPhone(senderPhone)) return; // only gestor rows from here

    const dt = parseDateTime(row); if(!dt) return;
    if(!grpGestorMsgsAll[grpId]) grpGestorMsgsAll[grpId] = [];
    grpGestorMsgsAll[grpId].push({
      dt,
      type:    gf(row,'type').trim(),
      msgText: gf(row,'msg').trim()
    });
  });

  // --- Sub-pass 1b: compute lastReport + prevReport from dataset_completo ---
  Object.keys(grpMeta).forEach(grpId => {
    const meta    = grpMeta[grpId];
    const msgs    = (grpGestorMsgsAll[grpId] || []).slice().sort((a,b) => a.dt - b.dt);

    // Find the most recent !MFx command sent by the gestor.
    // reportDates guarda TODOS os envios, não só o último: o gráfico semanal
    // olha 2 meses para trás e, com só o último, toda semana antiga aparecia
    // com zero enviados mesmo tendo tido relatório.
    let lastCmdMsg = null;
    const reportDts = [];
    for(let i = msgs.length - 1; i >= 0; i--){
      if(REPORT_TAGS.some(t => msgs[i].msgText.includes(t))){
        if(!lastCmdMsg) lastCmdMsg = msgs[i];
        reportDts.push(msgs[i].dt);
      }
    }
    meta.lastReportCmd = lastCmdMsg ? lastCmdMsg.dt : null;
    meta.reportDates   = reportDts;

    // reportDays: days since lastReportCmd
    if(meta.lastReportCmd){
      const d0 = new Date(meta.lastReportCmd); d0.setHours(0,0,0,0);
      meta.reportDays = Math.floor((today().getTime() - d0.getTime()) / 86400000);
    } else {
      meta.reportDays = null;
    }

    // prevReport: did the gestor send an AUDIO within 1h after lastReportCmd?
    meta.prevAudioMins = null;
    if(lastCmdMsg){
      const window1h = new Date(lastCmdMsg.dt.getTime() + 60 * 60 * 1000);
      for(const m of msgs){
        if(m.dt <= lastCmdMsg.dt) continue;   // must be AFTER the cmd
        if(m.dt > window1h)        break;      // outside 1h window, stop
        if(TYPE_AUDIO.test(m.type)){
          meta.prevAudioMins = Math.round((m.dt - lastCmdMsg.dt) / 60000);
          break;
        }
      }
    }

    // Video report days
    if(meta.lastVideoReport){
      const d0v = new Date(meta.lastVideoReport); d0v.setHours(0,0,0,0);
      meta.videoReportDays = Math.floor((today().getTime() - d0v.getTime()) / 86400000);
    }
  });

  /* ================================================================
     PASS 2 — Process date-filtered rows in chronological order per
     group using the STATE-MACHINE lead-time algorithm.
     NOTE: reportDates/lastReport/prevReport are computed from
     dataset_completo in Pass 1 above; they are NOT re-computed here.

     State per group: { pendente_desde, pendente_phone, pendente_nome }

     A) Client msg → if no open ticket: open one (pendente_desde = now)
                     if ticket already open: do NOT reset the clock
     B) Team msg   → if ticket open: close it, compute bizMins
          • GESTOR     → enters gestor avg/chart
          • INVALIDATOR → closes as "suporte", does NOT enter gestor avg

     Sender classification uses phone numbers (cols C):
       isTeamPhone(phone)       → GESTOR or INVALIDATOR
       isGestorPhone(phone)     → GESTOR only
       isInvalidatorPhone(phone)→ INVALIDATOR only
       else                     → CLIENT
  ================================================================ */

  // Sort date-filtered rows chronologically
  const sortedRows = [...rows].sort((a, b) => {
    const da = parseDateTime(a), db = parseDateTime(b);
    if(!da && !db) return 0; if(!da) return -1; if(!db) return 1;
    return da - db;
  });

  const grpMap  = {};  // grpId → group object
  const grpState = {}; // grpId → { pendente_gestor:{desde,phone,nome}, pendente_edicao:{...}, pendente_webdesign:{...} }

  // Lead-time cases (all closed tickets in period)
  const ltCases = [];
  const ltCasesEdicao = [];
  const ltCasesWebdesign = [];
  const ltCasesEstrategia = [];

  function makeEmptyTrack(){ return { desde: null, phone: null, nome: null }; }
  function makeEmptyState(){ return { gestor: makeEmptyTrack(), edicao: makeEmptyTrack(), webdesign: makeEmptyTrack(), estrategia: makeEmptyTrack() }; }

  function closeTrack(track, grpId, dt, senderPhone, senderNome, tipo, gestorNome, targetArr, g){
    if(!track.desde) return;
    const leadMins = bizMins(track.desde, dt);
    const caso = {
      grpId,
      pendente_desde:    track.desde,
      pendente_phone:    track.phone,
      pendente_nome:     track.nome,
      respondido_em:     dt,
      respondente_phone: senderPhone,
      respondente_nome:  senderNome,
      tipo,
      gestor_nome:       gestorNome,
      leadMins,
    };
    targetArr.push(caso);
    if(tipo === 'GESTOR' && leadMins >= 0 && g){ g.leadTimes.push(leadMins); }
    track.desde = null; track.phone = null; track.nome = null;
  }

  // Build message text → {phone, dt} index per group for Reply lookup
  const msgIndexByGroup = {}; // grpId → Map<text, [{phone, dt}, ...]>
  sortedRows.forEach(row => {
    const grpId = gf(row,'groupId').trim(); if(!grpId) return;
    const txt   = gf(row,'msg').trim();     if(!txt) return;
    const phone = normalizePhone(gf(row,'phone'));
    const dt    = parseDateTime(row);
    if(!msgIndexByGroup[grpId]) msgIndexByGroup[grpId] = new Map();
    const m = msgIndexByGroup[grpId];
    if(!m.has(txt)) m.set(txt, []);
    m.get(txt).push({ phone, dt });
  });

  // Índice por message_id — o caminho exato para achar a mensagem citada.
  // Inclui mensagem sem texto (áudio, imagem, figurinha): citar uma foto é comum, e
  // o índice por texto nunca conseguiu enxergá-las. Inclui também a automação, que o
  // guard de reply-ao-bot precisa reconhecer.
  const msgByIdByGroup = {}; // grpId → Map<message_id, {phone, dt}>
  sortedRows.forEach(row => {
    const grpId = gf(row,'groupId').trim(); if(!grpId) return;
    const mid   = gf(row,'messageId').trim(); if(!mid) return;
    if(!msgByIdByGroup[grpId]) msgByIdByGroup[grpId] = new Map();
    msgByIdByGroup[grpId].set(mid, { phone: normalizePhone(gf(row,'phone')), dt: parseDateTime(row) });
  });

  sortedRows.forEach(row => {
    const grpId = gf(row,'groupId').trim(); if(!grpId) return;
    const meta  = grpMeta[grpId];
    if(!meta) return;
    if(isExcludedGestor(meta.gestor)) return;

    if(!grpMap[grpId]){
      grpMap[grpId] = {
        id: grpId, name: meta.name, plan: meta.plan,
        gestor: meta.gestor, status: meta.status,
        lastReport:    meta.lastReportCmd,
        reportDates:   meta.reportDates || [],
        reportDays:    meta.reportDays,
        prevAudioMins: meta.prevAudioMins,
        lastVideoReport: meta.lastVideoReport,
        videoReportDays: meta.videoReportDays,
        msgs: [], gestorMsgs: [], teamMsgs: [],
        lastMsgDt: null,
        leadTimes: [],
      };
      grpState[grpId] = makeEmptyState();
    }

    const g  = grpMap[grpId];
    const st = grpState[grpId];
    const dt = parseDateTime(row); if(!dt) return;

    const senderPhone = normalizePhone(gf(row,'phone'));
    const senderNome  = gf(row,'sender').trim();
    const msgText     = gf(row,'msg').trim();
    const typeRaw     = gf(row,'type').trim();

    if(senderPhone === AUTOMATION_NUMBER) return;

    const overrideAsClient = isLtClientOverrideGroup(grpId) && (from => INVALIDATOR_PHONES.has(from))(senderPhone);
    const fromGestor      = !overrideAsClient && isGestorPhone(senderPhone);
    const fromInvalidator = !overrideAsClient && isInvalidatorPhone(senderPhone);
    const fromEdicao      = !overrideAsClient && isEdicaoPhone(senderPhone);
    const fromWebdesign   = !overrideAsClient && isWebdesignPhone(senderPhone);
    const fromEstrategia  = !overrideAsClient && isEstrategiaPhone(senderPhone);
    const fromTeam        = fromGestor || fromInvalidator || fromEdicao || fromWebdesign || fromEstrategia;

    g.msgs.push({ dt, text: msgText, type: typeRaw, fromGestor, sender: senderNome });
    if(!g.lastMsgDt || dt > g.lastMsgDt) g.lastMsgDt = dt;

    if(fromGestor){
      g.gestorMsgs.push({ dt, text: msgText, type: typeRaw, gestor: meta.gestor });
    }
    // Guarda quem MANDOU, para "Respostas da equipe" contar por pessoa. Antes ela
    // lia gestorMsgs e rotulava pelo gestor do grupo, então mensagem do Diogo num
    // grupo do Guilherme virava resposta do Guilherme. E quem não é gestor de
    // tráfego — estratégia, edição, webdesign — nem aparecia, embora responda
    // cliente todo dia.
    if(fromTeam){
      g.teamMsgs.push({ dt, type: typeRaw, phone: senderPhone });
    }

    // Cliente fechado: não abre nem fecha trilha. Os dois guards ficam aqui, e não
    // no topo do loop junto de isExcludedGestor, de propósito — acima g.msgs e
    // g.gestorMsgs já foram preenchidos, então o grupo continua na tabela e nos
    // relatórios. Sai só do cronômetro, que é o que estava contando errado.
    //
    // O reset não é decoração. O marcador é escrito à mão no dia que o cliente sai,
    // então as linhas anteriores têm o nome antigo e passam por aqui: elas abrem
    // trilha, e as linhas de depois — que fechariam — são barradas por este guard.
    // Sem zerar, a trilha aberta na véspera fica pendente para sempre e conta
    // expediente até agora. São 38 grupos renomeados no meio da vida na base; o
    // corte de abandono só varre os parados há mais de 45 dias, então os fechados
    // recentes escapavam dos dois. Zerar aqui descarta a trilha órfã.
    // Idempotente: zerar o que já está zerado não faz nada.
    if(isGrupoFechado(gf(row,'groupName'))){
      grpState[grpId] = makeEmptyState();
      return;
    }

    // Clique de botão do cliente. As automações mandam prompt com botão; o clique
    // chega como Tipo "Botão" e hoje abre atendimento, como se o cliente tivesse
    // pedido algo. Confirmar um botão não é pedido. São 369 na base — e o tipo
    // basta: reply_to_id só existe em 39 deles (message_id falta em 94% das linhas).
    if(!fromTeam && typeRaw === 'Botão') return;

    // Reação e figurinha de cliente não abrem atendimento: reagir não é pedido.
    // Vale para todas as trilhas. De membro do time conta normal (não passa por
    // aqui, cai nos ramos de fromGestor/fromEdicao/etc. e fecha o ticket).
    //
    // Duas checagens, uma por era dos dados. A ingestão nova marca Tipo "Reação" e
    // "Figurinha" direto da UAZAPI — é exato. As linhas antigas, gravadas pelo n8n,
    // não têm esses tipos: reação virava Texto com o emoji (daí o soEmoji) e
    // figurinha virava Imagem, indistinguível de uma foto de verdade — por isso
    // figurinha antiga continua contando, e não há como consertar retroativamente.
    if(!fromTeam && (typeRaw === 'Reação' || typeRaw === 'Figurinha')) return;
    if(!fromTeam && soEmoji(msgText)) return;

    /* ── MULTI-TRACK STATE MACHINE ── */
    const mentions = detectMentions(msgText);
    const replyText = gf(row,'reply').trim();
    const citada = citacaoPorId(row, msgByIdByGroup[grpId]);
    // Citação existe se o id resolveu OU se a era n8n deixou o texto citado.
    const temCitacao = !!citada || !!replyText;
    const replyTarget = detectReplyTarget(replyText, msgIndexByGroup[grpId], citada);

    // Reply do cliente numa mensagem do BOT: resposta à automação (confirmar lembrete,
    // responder lista de presença), não pedido ao time. Não abre atendimento.
    if(!fromTeam && temCitacao){
      const alvo = citada ? [citada] : (msgIndexByGroup[grpId] && msgIndexByGroup[grpId].get(replyText));
      if(alvo && alvo.some(e => e.phone === AUTOMATION_NUMBER)) return;
    }

    // Merge mentions + reply target (OR logic)
    const hasEdicao      = mentions.edicao      || replyTarget.edicao;
    const hasWebdesign   = mentions.webdesign   || replyTarget.webdesign;
    const hasEstrategia  = mentions.estrategia  || replyTarget.estrategia;
    const hasGestor      = mentions.gestor      || replyTarget.gestor;

    if(!fromTeam){
      // ── CLIENT message ──
      if(hasEdicao){
        if(!st.edicao.desde){ st.edicao.desde = dt; st.edicao.phone = senderPhone; st.edicao.nome = senderNome; }
      }
      if(hasWebdesign){
        if(!st.webdesign.desde){ st.webdesign.desde = dt; st.webdesign.phone = senderPhone; st.webdesign.nome = senderNome; }
      }
      if(hasEstrategia){
        if(!st.estrategia.desde){ st.estrategia.desde = dt; st.estrategia.phone = senderPhone; st.estrategia.nome = senderNome; }
      }
      if(!hasEdicao && !hasWebdesign && !hasEstrategia){
        const categoryActive = st.edicao.desde || st.webdesign.desde || st.estrategia.desde;
        if(!categoryActive && !st.gestor.desde){ st.gestor.desde = dt; st.gestor.phone = senderPhone; st.gestor.nome = senderNome; }
      }
      if(hasGestor){
        if(!st.gestor.desde){ st.gestor.desde = dt; st.gestor.phone = senderPhone; st.gestor.nome = senderNome; }
      }

    } else if(fromGestor){
      // ── GESTOR message ──
      // Close gestor track
      closeTrack(st.gestor, grpId, dt, senderPhone, senderNome, 'GESTOR', meta.gestor, ltCases, g);
      // Check if gestor is dispatching to edição/webdesign (via mention OR reply)
      if(hasEdicao){
        if(!st.edicao.desde){ st.edicao.desde = dt; st.edicao.phone = senderPhone; st.edicao.nome = senderNome; }
      }
      if(hasWebdesign){
        if(!st.webdesign.desde){ st.webdesign.desde = dt; st.webdesign.phone = senderPhone; st.webdesign.nome = senderNome; }
      }
      if(hasEstrategia){
        if(!st.estrategia.desde){ st.estrategia.desde = dt; st.estrategia.phone = senderPhone; st.estrategia.nome = senderNome; }
      }

    } else if(fromEdicao){
      // ── EDIÇÃO message ──
      if(st.edicao.desde){
        // Track already open → close it normally (no quote required)
        closeTrack(st.edicao, grpId, dt, senderPhone, senderNome, 'EDICAO', '', ltCasesEdicao, null);
      } else if(temCitacao){
        // Track NOT open — check if replying to a client message → retroactive open+close
        const clientMsg = detectReplyToClient(replyText, msgIndexByGroup[grpId], citada);
        if(clientMsg.isClient && clientMsg.originalDt){
          const leadMins = bizMins(clientMsg.originalDt, dt);
          ltCasesEdicao.push({
            grpId, pendente_desde: clientMsg.originalDt, pendente_phone: clientMsg.originalPhone,
            pendente_nome: '', respondido_em: dt, respondente_phone: senderPhone,
            respondente_nome: senderNome, tipo: 'EDICAO', gestor_nome: meta.gestor || '', leadMins, aberto: false,
          });
        }
      }

    } else if(fromWebdesign){
      // ── WEBDESIGN message ──
      if(st.webdesign.desde){
        closeTrack(st.webdesign, grpId, dt, senderPhone, senderNome, 'WEBDESIGN', '', ltCasesWebdesign, null);
      } else if(temCitacao){
        const clientMsg = detectReplyToClient(replyText, msgIndexByGroup[grpId], citada);
        if(clientMsg.isClient && clientMsg.originalDt){
          const leadMins = bizMins(clientMsg.originalDt, dt);
          ltCasesWebdesign.push({
            grpId, pendente_desde: clientMsg.originalDt, pendente_phone: clientMsg.originalPhone,
            pendente_nome: '', respondido_em: dt, respondente_phone: senderPhone,
            respondente_nome: senderNome, tipo: 'WEBDESIGN', gestor_nome: meta.gestor || '', leadMins, aberto: false,
          });
        }
      }

    } else if(fromEstrategia){
      // ── ESTRATÉGIA message ──
      if(st.estrategia.desde){
        closeTrack(st.estrategia, grpId, dt, senderPhone, senderNome, 'ESTRATEGIA', '', ltCasesEstrategia, null);
      } else if(temCitacao){
        const clientMsg = detectReplyToClient(replyText, msgIndexByGroup[grpId], citada);
        if(clientMsg.isClient && clientMsg.originalDt){
          const leadMins = bizMins(clientMsg.originalDt, dt);
          ltCasesEstrategia.push({
            grpId, pendente_desde: clientMsg.originalDt, pendente_phone: clientMsg.originalPhone,
            pendente_nome: '', respondido_em: dt, respondente_phone: senderPhone,
            respondente_nome: senderNome, tipo: 'ESTRATEGIA', gestor_nome: meta.gestor || '', leadMins, aberto: false,
          });
        }
      }

    } else if(fromInvalidator){
      // ── INVALIDATOR message ── closes gestor track only
      closeTrack(st.gestor, grpId, dt, senderPhone, senderNome, 'INVALIDADOR', '', ltCases, null);
    }
  });

  /* ================================================================
     PASS 2.5 — Collect OPEN tickets (pending, not yet responded)
     ================================================================ */
  const agora = new Date();

  // Grupo abandonado: sem mensagem humana há mais de 45 dias.
  //
  // Ticket aberto conta até agora, então um grupo que parou de falar acumula
  // expediente para sempre e nunca fecha — 25 casos assim hoje, o mais antigo
  // aberto há 297 dias, somando ~1,6 milhão de minutos úteis e inflando a média
  // do gestor em cerca de dois terços. Não é atendimento pendente: é dado morto.
  //
  // O corte só vale para tickets ABERTOS. Ticket fechado em grupo abandonado é
  // história real e continua contando.
  //
  // 45 dias é folgado dos dois lados: os abandonados estão todos acima de 118
  // dias parados, e nenhum atendimento aberto legítimo passa de 31. O relatório
  // do gestor mantém o grupo vivo — g.lastMsgDt considera qualquer mensagem
  // humana, não só do cliente, porque cliente calado não é grupo morto.
  //
  // ABANDONO_DIAS vive no escopo do arquivo (perto de BIZ_START) — o motor da aba
  // de repasse usa a mesma constante.
  const grupoAbandonado = g =>
    !g.lastMsgDt || (agora - g.lastMsgDt) / 86400000 > ABANDONO_DIAS;

  // Open gestor tickets
  Object.keys(grpState).forEach(grpId => {
    const st = grpState[grpId];
    if(!st.gestor.desde) return;
    const g = grpMap[grpId]; if(!g) return;
    if(grupoAbandonado(g)) return;
    const leadMins = bizMins(st.gestor.desde, agora);
    ltCases.push({
      grpId, pendente_desde: st.gestor.desde, pendente_phone: st.gestor.phone,
      pendente_nome: st.gestor.nome, respondido_em: null, respondente_phone: null,
      respondente_nome: null, tipo: 'GESTOR', gestor_nome: g.gestor || '', leadMins, aberto: true,
    });
    if(leadMins >= 0) g.leadTimes.push(leadMins);
  });

  // Open edição tickets
  Object.keys(grpState).forEach(grpId => {
    const st = grpState[grpId];
    if(!st.edicao.desde) return;
    const g = grpMap[grpId]; if(!g) return;
    if(grupoAbandonado(g)) return;
    const leadMins = bizMins(st.edicao.desde, agora);
    ltCasesEdicao.push({
      grpId, pendente_desde: st.edicao.desde, pendente_phone: st.edicao.phone,
      pendente_nome: st.edicao.nome, respondido_em: null, respondente_phone: null,
      respondente_nome: null, tipo: 'EDICAO', gestor_nome: '', leadMins, aberto: true,
    });
  });

  // Open webdesign tickets
  Object.keys(grpState).forEach(grpId => {
    const st = grpState[grpId];
    if(!st.webdesign.desde) return;
    const g = grpMap[grpId]; if(!g) return;
    if(grupoAbandonado(g)) return;
    const leadMins = bizMins(st.webdesign.desde, agora);
    ltCasesWebdesign.push({
      grpId, pendente_desde: st.webdesign.desde, pendente_phone: st.webdesign.phone,
      pendente_nome: st.webdesign.nome, respondido_em: null, respondente_phone: null,
      respondente_nome: null, tipo: 'WEBDESIGN', gestor_nome: '', leadMins, aberto: true,
    });
  });

  // Open estratégia tickets
  Object.keys(grpState).forEach(grpId => {
    const st = grpState[grpId];
    if(!st.estrategia.desde) return;
    const g = grpMap[grpId]; if(!g) return;
    if(grupoAbandonado(g)) return;
    const leadMins = bizMins(st.estrategia.desde, agora);
    ltCasesEstrategia.push({
      grpId, pendente_desde: st.estrategia.desde, pendente_phone: st.estrategia.phone,
      pendente_nome: st.estrategia.nome, respondido_em: null, respondente_phone: null,
      respondente_nome: null, tipo: 'ESTRATEGIA', gestor_nome: '', leadMins, aberto: true,
    });
  });

  /* ================================================================
     PASS 2.6 — MOTOR NOVO DE TRILHAS  (regra completa em TRILHAS.md)
     ================================================================
     Trilha deixa de ser por SETOR e passa a ser por PESSOA:

       1. mensagem de cliente abre trilha. O dono é quem ela aponta — marcado
          com @ ou dono da mensagem citada. Sem apontar ninguém, fica sem dono.
       2. qualquer um do time que responder fecha, não importa o dono.
       3. marcar outro membro com @ é repasse: não fecha, transfere o dono e o
          cronômetro segue. Basta o @, não precisa citar.
       3b. quem repassou não fecha aquela trilha depois — senão a mensagem
          seguinte desfaria o próprio repasse.
       5. o tempo conta para quem fechou, não para o gestor do grupo.

     Roda sobre a série inteira (o estado depende do histórico), mas só entrega
     trilha ABERTA a partir do corte. Antes do corte quem manda é o motor antigo,
     logo acima — número que já foi apresentado não muda de valor retroativamente.
  */
  const TRILHA_NOVA_DESDE = new Date(2026, 6, 22, 0, 0, 0);   // 22/07/2026

  // Pendência só é cobrada a partir da última virada de regra. O que ficou aberto
  // sob a regra anterior é resíduo: mudou quem devia a resposta, então o passivo
  // velho não vai para a conta de ninguém — some da lista em vez de envelhecer.
  // Atendimento FECHADO de antes disso continua valendo, com o tempo que teve.
  // Data da virada "a trilha é do grupo, quem responde pega".
  const PENDENTE_SO_DESDE = new Date(2026, 6, 24, 0, 0, 0);   // 24/07/2026

  // O motor não pode enxergar só o período filtrado. Trilha é estado, e estado
  // depende do que veio antes: se a mensagem do cliente ficou fora da janela, a
  // trilha nunca abre — a pendência de ontem some ao filtrar hoje, e o atendimento
  // que começou ontem e foi respondido hoje não conta nem como fechado nem como
  // aberto, desaparece dos dois lados.
  //
  // Então ele roda sobre uma janela maior e o recorte de data é aplicado no
  // RESULTADO, mais abaixo. Começar em ABANDONO_DIAS antes do início do período
  // (ou da virada de regra, o que for mais antigo) cobre qualquer trilha viva —
  // grupo parado além disso já não conta pendência — sem varrer a base inteira.
  const inicioMotor = new Date(Math.min(+dpStart, +PENDENTE_SO_DESDE));
  inicioMotor.setDate(inicioMotor.getDate() - ABANDONO_DIAS);
  const rowsTrilha = allSorted.filter(row => {
    const d = parseDateTime(row);
    return d && d >= inicioMotor;
  });

  // Índices do motor, sobre a janela dele. Os de cima continuam como estão: são do
  // motor antigo, e alargar a entrada dele mudaria número já apresentado.
  const msgIndexTrilha = {};   // grpId → Map<texto, [{phone, dt}]>
  const msgByIdTrilha  = {};   // grpId → Map<message_id, {phone, dt}>
  LID_TO_PHONE = new Map();
  rowsTrilha.forEach(row => {
    const grpId = gf(row,'groupId').trim(); if(!grpId) return;
    const phone = normalizePhone(gf(row,'phone'));
    const dt    = parseDateTime(row);
    const txt   = gf(row,'msg').trim();
    if(txt){
      if(!msgIndexTrilha[grpId]) msgIndexTrilha[grpId] = new Map();
      const m = msgIndexTrilha[grpId];
      if(!m.has(txt)) m.set(txt, []);
      m.get(txt).push({ phone, dt });
    }
    const mid = gf(row,'messageId').trim();
    if(mid){
      if(!msgByIdTrilha[grpId]) msgByIdTrilha[grpId] = new Map();
      msgByIdTrilha[grpId].set(mid, { phone, dt });
    }
    const lid = gf(row,'senderLid').trim().split('@')[0];
    if(lid && phone) LID_TO_PHONE.set(lid, phone);
  });

  const novoCases = { GESTOR: [], EDICAO: [], WEBDESIGN: [], ESTRATEGIA: [] };
  const trilhasPorGrupo = {};   // grpId → [trilha, ...]

  const guardaCaso = (caso) => {
    const alvo = novoCases[caso.tipo] || novoCases.GESTOR;
    alvo.push(caso);
  };

  // Emite os casos de uma trilha (fechada ou aberta).
  //
  // Enquanto ABERTA a trilha é do grupo: não é atendimento de ninguém, então não
  // credita pessoa nenhuma. Antes, "sem dono" virava tipo GESTOR e o tempo corrido
  // caía na conta do gestor do grupo — o cliente escrevia para o estrategista sem
  // marcar e o gestor levava a demora.
  //
  // Ao FECHAR, quem respondeu pega para si e leva o tempo. A exceção é a marcação
  // múltipla: se o cliente chamou 2+ pessoas, cada uma recebe o tempo, um caso por
  // chamado, e `atendimentoId` amarra os irmãos para a média do grupo contar o
  // atendimento uma vez só.
  const emitir = (tr, fecha, grpId, meta, g) => {
    if(tr.desde < TRILHA_NOVA_DESDE) return;     // trilha velha é do motor antigo
    if(!fecha && tr.desde < PENDENTE_SO_DESDE) return;   // pendente de antes da virada
    const chamados = tr.donos || tr.chamados || [];
    const multi    = !!fecha && chamados.length >= 2;
    const leadMins = bizMins(tr.desde, fecha ? fecha.dt : agora);
    const atendimentoId = grpId + '|' + (+tr.desde);
    const base = {
      grpId, pendente_desde: tr.desde, pendente_phone: tr.phone, pendente_nome: tr.nome,
      respondido_em: fecha ? fecha.dt : null,
      respondente_phone: fecha ? fecha.phone : null,
      respondente_nome:  fecha ? fecha.nome  : null,
      gestor_nome: (meta && meta.gestor) || (g && g.gestor) || '', leadMins, aberto: !fecha,
      // de quem se espera a resposta enquanto pendente: null = do grupo
      dono_phone: fecha ? null : (chamados[0] || null),
    };
    const alvos = multi ? chamados : [null];
    alvos.forEach(quem => {
      const creditar = multi ? quem : (fecha ? fecha.phone : null);
      guardaCaso({
        ...base,
        creditar_phone: creditar,
        atendimentoId: multi ? atendimentoId : null,
        // Aberta vai para ltCases só para aparecer na lista de pendentes; o tipo
        // aqui não significa "atendimento do gestor" — nada dela entra em média.
        tipo: (creditar && setorDoTelefone(creditar)) || 'GESTOR',
      });
    });
  };

  rowsTrilha.forEach(row => {
    const grpId = gf(row,'groupId').trim(); if(!grpId) return;
    const meta  = grpMeta[grpId]; if(!meta) return;
    if(isExcludedGestor(meta.gestor)) return;
    const dt = parseDateTime(row); if(!dt) return;

    if(!trilhasPorGrupo[grpId]) trilhasPorGrupo[grpId] = [];
    let trilhas = trilhasPorGrupo[grpId];

    const senderPhone = normalizePhone(gf(row,'phone'));
    const senderNome  = gf(row,'sender').trim();
    const msgText     = gf(row,'msg').trim();
    const typeRaw     = gf(row,'type').trim();

    if(senderPhone === AUTOMATION_NUMBER) return;
    if(isGrupoFechado(gf(row,'groupName'))){ trilhasPorGrupo[grpId] = []; return; }

    const overrideAsClient = isLtClientOverrideGroup(grpId) && INVALIDATOR_PHONES.has(senderPhone);
    const fromTeam = !overrideAsClient && isTeamPhone(senderPhone);
    const citada = citacaoPorId(row, msgByIdTrilha[grpId]);
    const replyText = gf(row,'reply').trim();
    const citadaTexto = !citada && replyText && msgIndexTrilha[grpId]
      ? (msgIndexTrilha[grpId].get(replyText) || [])[0] : null;
    const alvoCitado = citada || citadaTexto;

    if(!fromTeam){
      // ── mensagem de CLIENTE: abre trilha ──
      // Mesmos guards do motor antigo: reagir, mandar figurinha, clicar botão ou
      // responder o robô não são pedido de atendimento.
      if(typeRaw === 'Botão') return;
      if(typeRaw === 'Reação' || typeRaw === 'Figurinha') return;
      if(soEmoji(msgText)) return;
      if(alvoCitado && alvoCitado.phone === AUTOMATION_NUMBER) return;

      // A trilha é do GRUPO, não de uma pessoa. Marcar alguém diz quem o cliente
      // chamou — entra em `chamados`, que é quem leva o crédito na marcação
      // múltipla —, mas não abre trilha separada: a conversa é uma só.
      //
      // Cada grupo tem uma trilha CORRENTE. Mensagem seguida do cliente cai nela;
      // é o que impede o mesmo cliente de aparecer quatro vezes na lista de
      // pendentes só porque marcou gente diferente ao longo da conversa.
      let chamados = telefonesMarcados(msgText);
      if(!chamados.length && alvoCitado && isTeamPhone(alvoCitado.phone)) chamados = [alvoCitado.phone];

      const corrente = trilhas.find(tr => !tr.repassada);
      if(corrente){
        // mesma conversa: acumula quem foi chamado, mantém o relógio da primeira
        chamados.forEach(p => { if(!corrente.chamados.includes(p)) corrente.chamados.push(p); });
      } else {
        // Trilha repassada saiu da corrente: já está endereçada e segue pendente
        // com o marcado. A mensagem nova do cliente começa outra, do grupo — mesmo
        // que fosse para a mesma pessoa, essa ainda não foi repassada.
        trilhas.push({ desde: dt, phone: senderPhone, nome: senderNome,
                       chamados, repassada: false, repassadaPor: new Set() });
      }
      return;
    }

    // ── mensagem do TIME ──
    // Fecha o que pode fechar; se marcou alguém do time, repassa em vez de fechar.
    const marcados = telefonesMarcados(msgText).filter(p => p !== senderPhone);
    const restantes = [];
    trilhas.forEach(tr => {
      if(tr.repassadaPor.has(senderPhone)){ restantes.push(tr); return; }  // quem repassou não fecha
      if(marcados.length){
        // Repasse: trava no marcado, o cronômetro segue e a trilha sai da corrente.
        // Quem repassou não fecha mais esta; as que nascerem depois, sim.
        tr.repassadaPor.add(senderPhone);
        tr.donos = marcados.slice();
        tr.repassada = true;
        restantes.push(tr);
        return;
      }
      emitir(tr, { dt, phone: senderPhone, nome: senderNome }, grpId, meta, grpMap[grpId]);
    });
    trilhasPorGrupo[grpId] = restantes;
  });

  // Trilhas que ficaram abertas
  Object.keys(trilhasPorGrupo).forEach(grpId => {
    const g = grpMap[grpId]; if(!g) return;
    if(grupoAbandonado(g) || isGrupoFechado(g.name)) return;
    trilhasPorGrupo[grpId].forEach(tr => emitir(tr, null, grpId, grpMeta[grpId], g));
  });

  // Troca: cada trilha é contada pelo modelo vigente no dia em que ABRIU.
  //
  // Dos antigos (motor de setor, pré-corte) ficam só os FECHADOS — esses são
  // atendimento real, com tempo medido, e o número já foi apresentado. Os que
  // ficaram ABERTOS no modelo antigo são descartados: eram trilha de setor que só
  // fechava por gente do mesmo setor, então respondida por outro (o estrategista
  // respondendo o cliente) ficava pendurada para sempre, contando expediente até
  // agora. Com a virada de modelo isso deixou de existir; um pendente que só o
  // motor velho enxergava não é atendimento aberto, é resíduo da regra antiga.
  // O recorte de data que antes cortava a ENTRADA do motor agora corta a SAÍDA.
  //
  // Fechado entra pela data em que foi respondido: é quando o atendimento
  // aconteceu. Assim a conversa que começou ontem 23h e foi respondida hoje 9h
  // conta hoje, em vez de sumir das duas pontas como sumia.
  //
  // Aberto é estado, não evento do período: aparece se já estava esperando no fim
  // da janela. Filtrando hoje, a pendência de ontem aparece — que é o ponto:
  // esconder quem espera há mais tempo é o oposto do que a lista serve. Olhando um
  // período passado, pendência que nasceu depois dele não aparece.
  const inicioDoPeriodo = new Date(dpStart); inicioDoPeriodo.setHours(0,0,0,0);
  const fimDoPeriodo    = new Date(dpEnd);   fimDoPeriodo.setHours(23,59,59,999);
  const dentroDoPeriodo = (c) => c.aberto
    ? c.pendente_desde <= fimDoPeriodo
    : (c.respondido_em >= inicioDoPeriodo && c.respondido_em <= fimDoPeriodo);

  const trocaEra = (arr, novos) => {
    const antigos = arr.filter(c => c.pendente_desde < TRILHA_NOVA_DESDE && !c.aberto);
    arr.splice(0, arr.length, ...antigos, ...novos.filter(dentroDoPeriodo));
  };

  trocaEra(ltCases,           novoCases.GESTOR);
  trocaEra(ltCasesEdicao,     novoCases.EDICAO);
  trocaEra(ltCasesWebdesign,  novoCases.WEBDESIGN);
  trocaEra(ltCasesEstrategia, novoCases.ESTRATEGIA);

  // g.leadTimes alimenta a média por grupo e foi montada pelo motor antigo, que só
  // contava a trilha do gestor. Refaz: antes do corte, mantém só GESTOR (não mexe no
  // que já foi apresentado); do corte em diante conta qualquer setor, porque agora
  // quem responde é quem atende.
  Object.values(grpMap).forEach(g => { g.leadTimes = []; });
  const atendVisto = new Set();   // multi-menção vira vários casos do MESMO atendimento
  [ltCases, ltCasesEdicao, ltCasesWebdesign, ltCasesEstrategia].forEach(arr => {
    arr.forEach(c => {
      const g = grpMap[c.grpId]; if(!g) return;
      if(!(c.leadMins >= 0)) return;
      // Trilha aberta é do grupo, não é atendimento de ninguém: fica fora da média
      // (que alimenta a barra do gestor via ltMap) até alguém pegar.
      if(c.aberto) return;
      if(c.pendente_desde < TRILHA_NOVA_DESDE && c.tipo !== 'GESTOR') return;
      // A média do grupo conta o atendimento uma vez, mesmo que o cliente tenha
      // marcado dois e ele apareça como dois casos (um por marcado).
      if(c.atendimentoId){
        if(atendVisto.has(c.atendimentoId)) return;
        atendVisto.add(c.atendimentoId);
      }
      g.leadTimes.push(c.leadMins);
    });
  });

  // Store open tickets per gestor for the chart (gestor track only)
  // Sai de ltCases já com as duas eras trocadas, e não mais do estado do motor
  // antigo: senão o gráfico continuaria mostrando como pendente a trilha que o
  // motor novo já fechou.
  //
  // Mesmos cortes de sempre: grupo parado há mais de ABANDONO_DIAS não é
  // "aguardando resposta", é grupo morto; e cliente que já saiu (FECHADO no nome)
  // não fica na fila do time.
  const openByGestor = {};
  ltCases.filter(c => c.aberto).forEach(c => {
    const g = grpMap[c.grpId]; if(!g) return;
    if(grupoAbandonado(g) || isGrupoFechado(g.name)) return;
    const gestorName = g.gestor || '—';
    if(!openByGestor[gestorName]) openByGestor[gestorName] = [];
    openByGestor[gestorName].push({
      grpId: c.grpId, grpName: g.name || c.grpId,
      pendente_desde: c.pendente_desde,
      pendente_nome: c.pendente_nome,
      leadMins: bizMins(c.pendente_desde, new Date())
    });
  });
  window._openByGestor = openByGestor;

  // Pendentes de edição, webdesign e estratégia — pelos mesmos casos já trocados
  // de era, e não mais pelo estado do motor antigo (grpState).
  //
  // Era daí que vinha trilha aberta que já não devia existir: essas três listas
  // liam direto a máquina de estado por setor, então passavam por fora do corte de
  // era, do descarte dos abertos pré-virada e do próprio motor novo — o mesmo
  // cliente aparecia várias vezes esperando, e trilha que o motor novo já tinha
  // fechado seguia na fila.
  const abertosDe = (arr) => {
    const out = [];
    arr.filter(c => c.aberto).forEach(c => {
      const g = grpMap[c.grpId]; if(!g) return;
      if(grupoAbandonado(g) || isGrupoFechado(g.name)) return;
      out.push({ grpId: c.grpId, grpName: g.name || c.grpId,
                 pendente_desde: c.pendente_desde,
                 leadMins: bizMins(c.pendente_desde, new Date()) });
    });
    return out;
  };
  window._openByEdicao     = abertosDe(ltCasesEdicao);
  window._openByWebdesign  = abertosDe(ltCasesWebdesign);
  window._openByEstrategia = abertosDe(ltCasesEstrategia);


  /* NOTE: lastReport, reportDays, prevAudioMins already set from
     dataset_completo in Pass 1 — don't overwrite them here.
  ================================================================ */
  Object.values(grpMap).forEach(g => {
    g.avgLT = g.leadTimes.length
      ? g.leadTimes.reduce((a,b) => a+b, 0) / g.leadTimes.length
      : null;

    g.prevReport_sort = g.prevAudioMins !== null ? g.prevAudioMins : null;

    if(g.lastMsgDt){
      const lastDate = new Date(g.lastMsgDt); lastDate.setHours(0,0,0,0);
      g.silenceDays = Math.floor((today() - lastDate) / 86400000);
    } else {
      g.silenceDays = null;
    }

    g.gestorLabel = g.gestor || '—';
  });

  /* ── Log summary for debugging ── */
  console.log(`[LT] ${ltCases.length} tickets gestor. EDICAO: ${ltCasesEdicao.length}, WEBDESIGN: ${ltCasesWebdesign.length}, ESTRATEGIA: ${ltCasesEstrategia.length}`);

  window._ltCases = ltCases;
  window._ltCasesEdicao = ltCasesEdicao;
  window._ltCasesWebdesign = ltCasesWebdesign;
  window._ltCasesEstrategia = ltCasesEstrategia;

  /* ================================================================
     LEAD TIME FORA DO HORÁRIO
     ================================================================ */
  const ltExtraCases = [];
  ltCases.forEach(caso => {
    if(caso.tipo !== 'GESTOR') return;
    if(!caso.pendente_desde || !caso.respondido_em) return;
    if(!isForaExpediente(caso.respondido_em)) return;
    const tempoReal = Math.round((caso.respondido_em - caso.pendente_desde) / 60000);
    ltExtraCases.push({ ...caso, leadMinsExtra: tempoReal });
  });
  window._ltExtraCases = ltExtraCases;

  const ltExtraByGestor = {};
  ltExtraCases.forEach(c => {
    const g = c.gestor_nome || '—';
    if(!ltExtraByGestor[g]) ltExtraByGestor[g] = { total: 0, tempos: [] };
    ltExtraByGestor[g].total++;
    ltExtraByGestor[g].tempos.push(c.leadMinsExtra);
  });
  Object.values(ltExtraByGestor).forEach(v => {
    v.media = v.tempos.length ? Math.round(v.tempos.reduce((a,b)=>a+b,0)/v.tempos.length) : 0;
  });
  window._ltExtraByGestor = ltExtraByGestor;

  console.log(`[LT-EXTRA] ${ltExtraCases.length} atendimentos fora do horário.`, ltExtraByGestor);

  // ── Save global gestor set & populate filter dropdowns ──
  allGestors = allGestorNames;
  populateFilters(Object.values(grpMap), allGestorNames);

  // ── Store active filters globally for charts/KPIs ──
  window._activeGestorFilter = gestorFilter;
  window._activePlanFilter   = planFilter;
  window._activeStatusFilter = statusFilter;

  // ── Apply filters ──
  const passaFiltros = (g) => {
    if(planFilter   && g.plan   !== planFilter)   return false;
    if(gestorFilter && g.gestor !== gestorFilter)  return false;
    if(statusFilter){
      const st = (g.status || '').toLowerCase().trim();
      if(statusFilter === 'ativo'   && st !== 'ativo')   return false;
      if(statusFilter === 'inativo' && st !== 'inativo') return false;
    }
    return true;
  };
  groupData = Object.values(grpMap).filter(passaFiltros);

  // Universo de grupos para a cobrança de relatório: sai do grpMeta, que é montado
  // com a base inteira, e não do groupData, que só tem quem falou no período.
  //
  // Relatório é obrigação nossa e não depende de o cliente escrever. Cliente calado
  // sumia da lista de "precisa enviar" justamente na semana em que ninguém falou com
  // ele — o sistema deixava de cobrar exatamente quem estava mais esquecido. São 14
  // grupos ativos hoje, calados de 9 a 38 dias e sem relatório na semana.
  //
  // Os dois cortes de sempre continuam: cliente que saiu (FECHADO no nome) e grupo
  // parado há mais de ABANDONO_DIAS não são cobrados — juntos, os 46 casos que
  // apareceriam indevidamente se o universo entrasse cru.
  const agoraUniverso = new Date();
  window._universoGrupos = Object.entries(grpMeta).map(([id, m]) => ({
    id, name: m.name || id, plan: m.plan || '', gestor: m.gestor || '', status: m.status || '',
    lastReport: m.lastReportCmd || null, reportDates: m.reportDates || [], reportDays: m.reportDays,
    ultimaMsg: m.ultimaMsg || null,
  })).filter(g => {
    if(isExcludedGestor(g.gestor)) return false;
    if(isGrupoFechado(g.name)) return false;
    if(!g.ultimaMsg || (agoraUniverso - g.ultimaMsg) / 86400000 > ABANDONO_DIAS) return false;
    return passaFiltros(g);
  });

  renderAll();
}


function populateFilters(allGroups, allGestorNames){
  // Plans — from all groups in current period
  const planSel = document.getElementById('filter-plan');
  const curPlan = planSel.value;
  const plans   = [...new Set(allGroups.map(g => g.plan).filter(Boolean))].sort();
  planSel.innerHTML = '<option value="">Todos os planos</option>' +
    plans.map(p => `<option value="${esc(p)}" ${p===curPlan?'selected':''}>${esc(p)}</option>`).join('');

  // Gestores — from ALL rows col H, excluding invalid values
  const gestSel = document.getElementById('filter-gestor');
  const curGest = gestSel.value;
  const INVALID_GESTORS = ['#n/a', '#ref!', '#valor!', 'n/a', ''];
  const gestores = allGestorNames
    ? [...allGestorNames].filter(g => g && !INVALID_GESTORS.includes(g.toLowerCase().trim())).sort()
    : [...new Set(allGroups.map(g => g.gestor).filter(g => g && !INVALID_GESTORS.includes(g.toLowerCase().trim())))].sort();
  gestSel.innerHTML = '<option value="">Todos os gestores</option>' +
    gestores.map(g => `<option value="${esc(g)}" ${g===curGest?'selected':''}>${esc(g)}</option>`).join('');
}

/* ================================================================
   RENDER ALL
   ================================================================ */
function renderAll(){
  renderKPIs();
  renderCharts();
  renderTable();
}

function renderEmpty(){
  document.getElementById('tbody').innerHTML=
    '<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text-2);">Nenhum dado disponível no período</td></tr>';
  document.getElementById('table-count').textContent='0 grupos';
}

/* ── KPIs ── */
function renderKPIs(){
  const totalMsgs = groupData.reduce((a,g) => a + g.msgs.length, 0);
  const active    = groupData.filter(g => /ativo/i.test(g.status)).length;
  const gestorSet = new Set(groupData.map(g => g.gestor).filter(Boolean));

  // PONTO 1: Lead Time Geral = média de TODOS os atendimentos (fechados + em aberto)
  // Comercial → minutos úteis, Fora do horário → tempo corrido, Em aberto → bizMins até agora
  // Respect gestor filter
  const ltCasesAll = window._ltCases || [];
  const activeGF = window._activeGestorFilter || '';
  const allLeadValues = [];
  ltCasesAll.forEach(caso => {
    if(caso.tipo !== 'GESTOR') return;
    if(!caso.pendente_desde) return;
    // Apply gestor filter to KPI
    if(activeGF){
      const gd = groupData.find(g => g.id === caso.grpId);
      if(!gd) return; // group filtered out
    }
    if(caso.aberto){
      // Open ticket: use elapsed time up to now (bizMins already calculated)
      allLeadValues.push(caso.leadMins);
    } else if(!caso.respondido_em){
      return;
    } else if(isForaExpediente(caso.respondido_em)){
      allLeadValues.push(Math.round((caso.respondido_em - caso.pendente_desde) / 60000));
    } else {
      allLeadValues.push(caso.leadMins);
    }
  });
  const avgLT = allLeadValues.length ? allLeadValues.reduce((a,b) => a+b, 0) / allLeadValues.length : null;

  // Edição LT
  const ltEdicaoAll = window._ltCasesEdicao || [];
  const edicaoValues = ltEdicaoAll.map(c => c.leadMins).filter(v => v != null);
  const avgLTEdicao = edicaoValues.length ? edicaoValues.reduce((a,b) => a+b, 0) / edicaoValues.length : null;

  // Webdesign LT
  const ltWebAll = window._ltCasesWebdesign || [];
  const webValues = ltWebAll.map(c => c.leadMins).filter(v => v != null);
  const avgLTWeb = webValues.length ? webValues.reduce((a,b) => a+b, 0) / webValues.length : null;

  // Estratégia LT
  const ltEstAll = window._ltCasesEstrategia || [];
  const estValues = ltEstAll.map(c => c.leadMins).filter(v => v != null);
  const avgLTEst = estValues.length ? estValues.reduce((a,b) => a+b, 0) / estValues.length : null;

  // Lead Time médio da EQUIPE: tráfego + edição + webdesign + estratégia num só
  // conjunto. avgLT sozinho é só tráfego; o card agora diz "da equipe", então o
  // número tem que ser da equipe inteira. Os 3 KPIs de setor abaixo seguem sendo
  // a quebra por setor.
  const equipeLeadValues = [...allLeadValues, ...edicaoValues, ...webValues, ...estValues];
  const avgLTEquipe = equipeLeadValues.length
    ? equipeLeadValues.reduce((a,b) => a+b, 0) / equipeLeadValues.length
    : null;

  set('kpi-msgs',      totalMsgs.toLocaleString('pt-BR'));
  set('kpi-active',    active || groupData.length);
  set('kpi-gestores',  gestorSet.size || '—');
  set('kpi-leadtime',  fmtMins(avgLTEquipe));
  set('kpi-lt-trafego', fmtMins(avgLT));
  set('kpi-lt-edicao', fmtMins(avgLTEdicao));
  set('kpi-lt-webdesign', fmtMins(avgLTWeb));
  set('kpi-lt-estrategia', fmtMins(avgLTEst));
}

const set = (id,v) => { document.getElementById(id).textContent = v; };

/* ── CHARTS ── */
// Stores drill-down data for click handlers (rebuilt each renderCharts call)
window._drillLT  = {}; // gestor → [caso, ...]
let _drillWks = {}; // wkey   → { needed:[g,...], sent:[g,...] }

// Escreve o valor de cada barra em cima dela, em 01h50m. Plugin inline de
// propósito: chartjs-plugin-datalabels seria mais um <script> de CDN só para
// isto, e o dashboard já demora para carregar. Barra zerada não recebe rótulo.
// Formato próprio: o fmtMins do resto do dash escreve "50 min" abaixo de 1h e
// "1h50" acima, o que deixa a fila de rótulos desalinhada. Aqui é sempre
// HHhMMm, com zero à esquerda, para as barras ficarem comparáveis de bate-pronto.
const hhmmBarra = m => {
  m = Math.max(0, Math.round(m));
  return `${String(Math.floor(m/60)).padStart(2,'0')}h${String(m%60).padStart(2,'0')}m`;
};
const rotuloBarras = {
  id: 'rotuloBarras',
  afterDatasetsDraw(chart){
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = "600 10px 'Poppins',sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    chart.data.datasets.forEach((ds, i) => {
      if(!chart.isDatasetVisible(i)) return;
      ctx.fillStyle = ds.borderColor || '#6b7280';
      chart.getDatasetMeta(i).data.forEach((barra, j) => {
        const v = ds.data[j];
        if(!v) return;
        ctx.fillText(hhmmBarra(v), barra.x, barra.y - 4);
      });
    });
    ctx.restore();
  }
};

function renderCharts(){
  // "#N/A", "-", vazio: lixo da coluna Gestor da planilha, não é pessoa. Mesma lista
  // que populateFilters usa — repetida aqui de propósito porque lá ela é local
  // àquela função (const dentro de populateFilters), fora do alcance daqui.
  const LIXO_GESTOR = ['#n/a', '#ref!', '#valor!', 'n/a', '', '-', '—'];
  const nomeValido = (n) => {
    const s = String(n||'').trim().toLowerCase();
    return s && !LIXO_GESTOR.includes(s);
  };

  // ── 1) Lead Time by Gestor ──
  window._drillLT = {};
  const ltMap = {};
  groupData.forEach(g => {
    if(!g.gestor || !g.leadTimes.length) return;
    if(!ltMap[g.gestor]) ltMap[g.gestor] = [];
    ltMap[g.gestor].push(...g.leadTimes);
  });

  // ── pessoas dos outros setores no mesmo gráfico ──
  // O gráfico se chama "Lead Time da equipe", então edição/webdesign/estratégia
  // entram junto dos gestores, cada pessoa como sua própria barra. Só quando não
  // há filtro de gestor ativo — esse filtro é específico de gestor de tráfego.
  // A barra é a pessoa, sem prefixo de setor: se alguém aparecer nas duas pontas
  // (é gestor e também atende outro setor), as duas viram uma barra só, que é o
  // lead time real daquela pessoa.
  if(!window._activeGestorFilter){
    const setoresEquipe = [
      window._ltCasesEdicao,
      window._ltCasesWebdesign,
      window._ltCasesEstrategia,
    ];
    setoresEquipe.forEach(cases => {
      (cases || []).forEach(caso => {
        if(caso.leadMins == null) return;
        if(caso.aberto) return;   // pendente é do grupo, não é atendimento de ninguém
        // Ancora no telefone (estável, vem do roster), não no nome do WhatsApp —
        // que a pessoa troca e faz a mesma virar duas barras. Em caso fechado de
        // marcação dupla, creditar_phone é o marcado — o tempo entra no painel de
        // cada um dos dois. Aberto segue como antes (respondente nulo → descartado).
        const tel = normalizePhone(
          (caso.aberto ? caso.respondente_phone : (caso.creditar_phone || caso.respondente_phone)) || '');
        const reg = EQUIPE_POR_TELEFONE.get(tel);
        // Sem telefone identificado (casos abertos por citação onde não dá para
        // saber quem respondeu): descarta. Barra "Sem nome" com média absurda só
        // sujaria o gráfico — melhor não inventar dono.
        if(!reg) return;
        const key = reg.nome;
        if(!ltMap[key]) ltMap[key] = [];
        ltMap[key].push(caso.leadMins);
        if(!window._drillLT[key]) window._drillLT[key] = [];
        const gd = groupData.find(x => x.id === caso.grpId);
        window._drillLT[key].push({ ...caso, grpNameCurrent: gd?.name || caso.grpId });
      });
    });
  }

  // Build _drillLT from ltCasesGlobal (set in aggregate)
  if(window._ltCases){
    window._ltCases.forEach(caso => {
      if(caso.tipo !== 'GESTOR') return;
      // Pendente não é atendimento do gestor da conta: enquanto ninguém pega, a
      // conversa é do grupo. Aparecia na lista dele como se fosse um caso seu — e
      // no N — mesmo esperando outra pessoa. Pendente tem lugar próprio, a tabela
      // "Grupos em Aberto".
      if(caso.aberto) return;
      const g = groupData.find(gd => gd.id === caso.grpId);
      if(!g) return; // filtered out
      const gname = caso.gestor_nome || g?.gestor || '—';
      if(!window._drillLT[gname]) window._drillLT[gname] = [];
      window._drillLT[gname].push({ ...caso, grpNameCurrent: g?.name || caso.grpId });
    });
  }
  // Collect gestor names — respect gestor filter
  const activeGF = window._activeGestorFilter || '';
  const allLtGestors = new Set([...Object.keys(ltMap)]);
  const extraByGRaw = window._ltExtraByGestor || {};
  // Filter extra by gestor if filter active
  const extraByG = {};
  Object.keys(extraByGRaw).forEach(g => {
    if(activeGF && g !== activeGF) return;
    extraByG[g] = extraByGRaw[g];
    allLtGestors.add(g);
  });
  // Remove gestors not matching filter
  if(activeGF){
    allLtGestors.forEach(g => { if(g !== activeGF) allLtGestors.delete(g); });
  }

  const ltLabels = [...allLtGestors].sort();
  const ltDataComercial = ltLabels.map(name => {
    const times = ltMap[name];
    if(!times || !times.length) return 0;
    return Math.round(times.reduce((a,b) => a+b, 0) / times.length);
  });
  const ltDataExtra = ltLabels.map(name => {
    const info = extraByG[name];
    if(!info || !info.tempos.length) return 0;
    return info.media;
  });
  const ltNComercial = ltLabels.map(name => (ltMap[name] || []).length);
  const ltNExtra = ltLabels.map(name => (extraByG[name]?.total || 0));

  const ltCtx = document.getElementById('chart-lt').getContext('2d');
  if(chartLT) chartLT.destroy();
  chartLT = new Chart(ltCtx, {
    type:'bar',
    plugins:[rotuloBarras],
    data:{
      labels: ltLabels.length ? ltLabels : ['Sem dados'],
      datasets:[
        {
          label:'Comercial (min úteis)',
          data:  ltLabels.length ? ltDataComercial : [0],
          backgroundColor:'rgba(8,102,255,0.12)',
          borderColor:'rgba(8,102,255,0.75)',
          borderWidth:2, borderRadius:8, borderSkipped:false,
          yAxisID:'y'
        },
        {
          label:'Fora do horário (min corridos)',
          data:  ltLabels.length ? ltDataExtra : [0],
          backgroundColor:'rgba(22,163,74,0.12)',
          borderColor:'rgba(22,163,74,0.75)',
          borderWidth:2, borderRadius:8, borderSkipped:false,
          yAxisID:'y1'
        }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ top:16 } },   // espaço para o rótulo da barra mais alta
      onHover:(e,els) => { ltCtx.canvas.style.cursor = els.length ? 'pointer' : 'default'; },
      onClick:(e, els) => {
        if(!els.length) return;
        const idx = els[0].index;
        const gname = ltLabels[idx];
        const casos = window._drillLT[gname] || [];
        openDrillLT(gname, casos);
      },
      plugins:{
        legend:{ position:'bottom', labels:{ color:CT().tick, font:{size:11,family:"'Poppins',sans-serif"}, boxWidth:10, padding:16 } },
        tooltip:{ callbacks:{
          label: function(c){
            const idx = c.dataIndex;
            const dsIdx = c.datasetIndex;
            if(dsIdx === 0){
              return ` Comercial: ${fmtMins(c.raw)} (n=${ltNComercial[idx]})`;
            } else {
              return ` Fora do horário: ${fmtMins(c.raw)} (n=${ltNExtra[idx]})`;
            }
          }
        }}
      },
      scales:{
        y:{ position:'left', title:{display:true,text:'Comercial (min úteis)',color:'rgba(8,102,255,0.75)',font:{size:10,weight:'600',family:"'Poppins',sans-serif"}}, grid:{color:CT().grid}, ticks:{color:'rgba(8,102,255,0.75)',font:{size:11,family:"'Poppins',sans-serif"}}, border:{display:false} },
        y1:{ position:'right', title:{display:true,text:'Fora do horário (min corridos)',color:'rgba(22,163,74,0.75)',font:{size:10,weight:'600',family:"'Poppins',sans-serif"}}, grid:{drawOnChartArea:false}, ticks:{color:'rgba(22,163,74,0.75)',font:{size:11,family:"'Poppins',sans-serif"}}, border:{display:false} },
        x:{ grid:{display:false}, ticks:{color:CT().tick,font:{size:10,family:"'Poppins',sans-serif"},maxRotation:25}, border:{display:false} }
      }
    }
  });

  // ── 2) Reports by Week ──
  // Janela fixa de 2 meses, de propósito fora do filtro de período: isto é
  // acompanhamento de cadência semanal, e com o filtro em 7 dias o gráfico
  // virava uma barra só. Muda o filtro, este gráfico não muda.
  const relFim = today();
  const relIni = new Date(relFim.getFullYear(), relFim.getMonth() - 2, relFim.getDate());
  _drillWks = {};
  const weeks = {};
  // Todo grupo ativo precisa de relatório na semana, tenha o cliente falado ou não.
  (window._universoGrupos || groupData).forEach(g => {
    if(!/ativo/i.test(g.status)) return;
    let d = new Date(weekMonday(relIni));
    while(d <= relFim){
      const wk = isoWeek(d);
      if(!weeks[wk]) weeks[wk] = { needed:0, sent:0 };
      if(!_drillWks[wk]) _drillWks[wk] = { needed:[], sent:[], label:'' };
      weeks[wk].needed++;
      _drillWks[wk].needed.push(g);
      d = addDays(d, 7);
    }
    // Uma semana com dois relatórios do mesmo grupo conta uma vez só, senão
    // "enviados" passa de "faltam enviar" e a barra empilhada fica sem sentido.
    new Set((g.reportDates || []).map(isoWeek)).forEach(wk => {
      if(!weeks[wk]) return;
      weeks[wk].sent++;
      _drillWks[wk].sent.push(g);
    });
  });
  const wkeys   = Object.keys(weeks).sort();
  const wkLabels= wkeys.map(w => {
    const [yr,wn]=w.split('-W');
    const lbl = `Sem ${wn}/${yr.slice(2)}`;
    if(_drillWks[w]) _drillWks[w].label = lbl;
    return lbl;
  });

  const relCtx = document.getElementById('chart-rel').getContext('2d');
  if(chartRel) chartRel.destroy();
  chartRel = new Chart(relCtx, {
    type:'bar',
    data:{
      labels: wkLabels.length ? wkLabels : ['Sem dados'],
      datasets:[
        { label:'Enviados', data:wkeys.map(w=>weeks[w].sent),
          backgroundColor:'rgba(22,163,74,0.6)', borderColor:'rgba(22,163,74,0.85)',
          borderWidth:2, borderRadius:6, borderSkipped:false },
        { label:'Faltam Enviar', data:wkeys.map(w=>Math.max(0, weeks[w].needed - weeks[w].sent)),
          backgroundColor:'rgba(239,68,68,0.18)', borderColor:'rgba(239,68,68,0.7)',
          borderWidth:2, borderRadius:6, borderSkipped:false }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      onHover:(e,els) => { relCtx.canvas.style.cursor = els.length ? 'pointer' : 'default'; },

      onClick:(e, els) => {
        if(!els.length) return;
        const idx   = els[0].index;
        const dsIdx = els[0].datasetIndex; // 0=Enviados, 1=Faltam Enviar
        const wk    = wkeys[idx];
        const lbl   = wkLabels[idx];
        const drill = _drillWks[wk] || { needed:[], sent:[], label:lbl };
        const missing = drill.needed.filter(g => !drill.sent.some(s => s.id === g.id));
        if(dsIdx === 0) openDrillWeekSent(lbl, drill.sent);
        else            openDrillWeekNeeded(lbl, missing, drill.sent);
      },
      plugins:{
        legend:{ position:'bottom', labels:{ color:CT().tick, font:{size:11,family:"'Poppins',sans-serif"}, boxWidth:10, padding:16 } },
        tooltip:{ callbacks:{ label:c=>`${c.dataset.label}: ${c.raw} · clique para detalhes` } }
      },
      scales:{
        y:{ stacked:true, grid:{color:CT().grid}, ticks:{color:CT().tick,font:{size:11,family:"'Poppins',sans-serif"}}, border:{display:false} },
        x:{ stacked:true, grid:{display:false},   ticks:{color:CT().tick,font:{size:10,family:"'Poppins',sans-serif"}}, border:{display:false} }
      }
    }
  });

  // ── 3) Gestor Responses by Type (Áudio / Texto / Mídia) ──
  // Figurinha, documento e contato passaram a existir como Tipo com a ingestão nova
  // e entram em mídia — sem isto cairiam no balde de texto e inflariam a coluna
  // Texto da tabela. Reação fica FORA da conta: reagir não é responder o cliente.
  const TYPE_AUDIO  = /audio|áudio|voz|voice|ptt/i;
  const TYPE_IMAGE  = /imagem|image|foto|photo|sticker|figurinha|video|vídeo|documento|document|contato|vcard/i;
  const TYPE_REACAO = /^reação$|^reacao$|^reaction$/i;

  const typeMap = {};
  // Only initialize gestors that match the filter (or all if no filter)
  const gestorsForTypeChart = activeGF
    ? [...allGestors].filter(n => n === activeGF)
    : [...allGestors];
  gestorsForTypeChart.forEach(name => { typeMap[name] = { audio:0, texto:0, imagem:0 }; });

  // Conta por QUEM MANDOU, não pelo gestor do grupo. Antes o nome vinha de
  // g.gestor, então mensagem do Diogo num grupo do Guilherme era contada como
  // resposta do Guilherme — e quem não é gestor de tráfego (estratégia, edição,
  // webdesign) não aparecia, embora responda cliente todo dia.
  groupData.forEach(g => {
    (g.teamMsgs || []).forEach(m => {
      const reg = EQUIPE_POR_TELEFONE.get(normalizePhone(m.phone || ''));
      const name = reg ? reg.nome : null;
      if(!name) return;                                  // sem nome no roster: não inventa dono
      if(isExcludedGestor(name)) return;                 // mesma lista de sempre fora do painel
      if(activeGF && name !== activeGF) return;          // respeita o filtro de gestor
      if(!typeMap[name]) typeMap[name] = { audio:0, texto:0, imagem:0 };
      const t = (m.type || '').trim();
      if(TYPE_REACAO.test(t))      return;              // reagir não é responder
      if(TYPE_AUDIO.test(t))       typeMap[name].audio++;
      else if(TYPE_IMAGE.test(t))  typeMap[name].imagem++;
      else                         typeMap[name].texto++;
    });
  });

  // Tabela (era gráfico de barras agrupadas): as três barras por pessoa obrigavam
  // a comparar altura para saber o mix, e a proporção — que é o que interessa
  // aqui — não aparecia em lugar nenhum. Agora vem o número e o percentual.
  const respostas = Object.keys(typeMap).filter(nomeValido).map(nome => {
    const t = typeMap[nome];
    const total = t.texto + t.audio + t.imagem;
    const pct = v => total ? Math.round(v * 100 / total) : 0;
    // O terceiro percentual é o resto, não um arredondamento próprio: com três
    // Math.round independentes a linha fecha 101% de vez em quando. A sobra cai
    // em mídia, que é sempre a menor fatia.
    const pTexto = pct(t.texto), pAudio = pct(t.audio);
    return { nome, total, texto:t.texto, audio:t.audio, midia:t.imagem,
             pTexto, pAudio, pMidia: total ? Math.max(0, 100 - pTexto - pAudio) : 0 };
  }).filter(r => r.total > 0)
    // Escopo: fora do admin, a pessoa ve so a propria linha.
    .filter(r => { const eu = nomeDeEscopo(); return !eu || r.nome === eu; })
    .sort((a,b) => b.total - a.total);

  const alvoResp = document.getElementById('respostas-table');
  if(alvoResp){
    if(!respostas.length){
      alvoResp.innerHTML = '<div class="open-vazio">Nenhuma resposta no período</div>';
    } else {
      // Uma barra por pessoa mostra a mistura texto/áudio/mídia de relance — a
      // tabela sozinha obrigava a comparar seis números para ver quem é de áudio.
      const COR = { texto:'rgba(8,102,255,0.85)', audio:'#15803d', midia:'#b45309' };
      const celula = (n, pct, cor) => `
        <td class="num" style="font-variant-numeric:tabular-nums;">${n.toLocaleString('pt-BR')}</td>
        <td class="num" style="font-variant-numeric:tabular-nums;color:${cor};font-weight:600;">${pct}%</td>`;

      alvoResp.innerHTML = `
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin:0 0 10px 2px;font-size:.68rem;color:var(--text-2);">
          ${[['Texto',COR.texto],['Áudio',COR.audio],['Mídia',COR.midia]].map(([l,c]) =>
            `<span style="display:inline-flex;align-items:center;gap:5px;"><span style="width:8px;height:8px;border-radius:2px;background:${c};display:inline-block;"></span>${l}</span>`).join('')}
        </div>
        <div style="overflow-x:auto;">
        <table class="open-table">
          <thead><tr>
            <th>Pessoa</th>
            <th style="min-width:120px;">Mistura</th>
            <th class="num">Texto</th><th class="num">%</th>
            <th class="num">Áudio</th><th class="num">%</th>
            <th class="num">Mídia</th><th class="num">%</th>
            <th class="num">Total</th>
          </tr></thead>
          <tbody>
            ${respostas.map(r => {
              const total = r.texto + r.audio + r.midia;
              const seg = (v, cor) => v ? `<div style="width:${(v*100/total).toFixed(2)}%;background:${cor};" title="${v}"></div>` : '';
              return `
              <tr>
                <td class="open-pessoa">${esc(r.nome)}</td>
                <td>
                  <div style="display:flex;height:7px;border-radius:99px;overflow:hidden;background:var(--m-line);min-width:110px;">
                    ${seg(r.texto,COR.texto)}${seg(r.audio,COR.audio)}${seg(r.midia,COR.midia)}
                  </div>
                </td>
                ${celula(r.texto, r.pTexto, COR.texto)}
                ${celula(r.audio, r.pAudio, COR.audio)}
                ${celula(r.midia, r.pMidia, COR.midia)}
                <td class="num" style="font-variant-numeric:tabular-nums;font-weight:600;">${total.toLocaleString('pt-BR')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        </div>`;
    }
  }

  // ── 5) Open Tickets by Gestor + Edição + Webdesign ──
  const openByG = window._openByGestor || {};
  const openEdic = window._openByEdicao || [];
  const openWeb = window._openByWebdesign || [];
  const openEst = window._openByEstrategia || [];

  // Uma linha por GRUPO esperando, não por pessoa: a trilha agora nasce do grupo,
  // então "quantas o Guilherme tem em aberto" dizia que a espera era dele quando
  // ninguém pegou ainda. O grupo é o que está de fato aguardando; a coluna "quem
  // pegou" só aparece quando a conversa foi endereçada — cliente marcou alguém, ou
  // houve repasse.
  const porGrupo = {};
  const junta = (lista) => (lista || []).forEach(t => {
    const k = t.grpId;
    if(!porGrupo[k]) porGrupo[k] = { grpId:k, grpName:t.grpName, esperas:[], desde:null };
    porGrupo[k].esperas.push(t);
    if(!porGrupo[k].desde || t.pendente_desde < porGrupo[k].desde) porGrupo[k].desde = t.pendente_desde;
  });
  Object.values(openByG).forEach(junta);
  junta(openEdic); junta(openWeb); junta(openEst);

  const nomeCurto = (n) => String(n||'').replace(/^\(?\s*FECHADO\s*\)?\s*/i,'').replace(/^F3F\s*-\s*/,'');
  const donoDoGrupo = (grpId) => {
    const g = groupData.find(x => x.id === grpId);
    return g ? (g.gestor || '') : '';
  };

  // mais tempo esperando primeiro: é o que precisa de atenção
  const linhas = Object.values(porGrupo).map(g => {
    const maior = Math.max(...g.esperas.map(t => t.leadMins));
    return { ...g, qtd:g.esperas.length, maior, conta: donoDoGrupo(g.grpId) };
  })
    // Escopo: fora do admin, so os grupos da propria carteira.
    .filter(l => { const eu = nomeDeEscopo(); return !eu || l.conta === eu; })
    .sort((a,b) => b.maior - a.maior);

  const alvo = document.getElementById('open-tickets-table');
  if(alvo){
    if(!linhas.length){
      alvo.innerHTML = '<div class="open-vazio">Nenhuma conversa aguardando resposta 🎉</div>';
    } else {
      alvo.innerHTML = `
        <div style="overflow-x:auto;">
        <table class="open-table">
          <thead><tr>
            <th>Grupo</th>
            <th>Gestor da conta</th>
            <th class="num">Esperando desde</th>
            <th class="num">Há quanto tempo</th>
          </tr></thead>
          <tbody>
            ${linhas.map(l => `
              <tr>
                <td class="open-pessoa">${esc(nomeCurto(l.grpName).substring(0,46))}${
                  l.qtd > 1 ? ` <span class="badge badge-amber" style="font-size:.55rem;">${l.qtd} conversas</span>` : ''}</td>
                <td style="color:var(--text-2);">${esc(l.conta || '—')}</td>
                <td class="num" style="white-space:nowrap;">${l.desde ? fmtDT(l.desde) : '—'}</td>
                <td class="num"><span class="open-qtd">${fmtMins(l.maior)}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
        </div>`;
    }
  }
}

/* ================================================================
   DRILL-DOWN — OVERLAY HELPERS
   ================================================================ */
function openDrill(title, sub, bodyHTML){
  document.getElementById('drill-title').textContent = title;
  document.getElementById('drill-sub').textContent   = sub;
  document.getElementById('drill-body').innerHTML    = bodyHTML;
  document.getElementById('drill-overlay').classList.add('open');
}
function closeDrill(){
  document.getElementById('drill-overlay').classList.remove('open');
}
function drillOverlayClick(e){
  if(e.target === document.getElementById('drill-overlay')) closeDrill();
}

/* ================================================================
   DRILL 1 — LEAD TIME POR GESTOR
   ================================================================ */
function openDrillLT(gestorName, casos){
  // PONTO 2: Primeiro nível — lista agrupada por GRUPO
  // Cada caso tem grpId, grpNameCurrent, leadMins, pendente_desde, respondido_em
  const grpAgg = {};
  casos.forEach(c => {
    const gid = c.grpId;
    if(!grpAgg[gid]){
      const gData = groupData.find(gd => gd.id === gid);
      grpAgg[gid] = {
        grpId: gid,
        grpName: c.grpNameCurrent || gid,
        plan: gData?.plan || '',
        status: gData?.status || '',
        casos: [],
        leadComercial: [],   // minutos úteis
        leadCorrido: [],     // relógio de parede
        lastInteraction: null,
      };
    }
    const agg = grpAgg[gid];
    agg.casos.push(c);
    // As duas medidas, separadas — antes viravam um número misto só, e não dava
    // para saber o que era hora de trabalho e o que era madrugada/fim de semana.
    // Comercial = minutos úteis. Corrido = relógio de parede.
    // Trilha aberta fica de fora: ainda é do grupo, não é atendimento de ninguém.
    if(!c.aberto){
      agg.leadComercial.push(c.leadMins);
      agg.leadCorrido.push(Math.round((c.respondido_em - c.pendente_desde) / 60000));
      if(!agg.lastInteraction || c.respondido_em > agg.lastInteraction) agg.lastInteraction = c.respondido_em;
    }
  });

  const mediaDe = (a) => a.length ? Math.round(a.reduce((x,y)=>x+y,0)/a.length) : 0;
  // Ordem por última interação, mais recente primeiro: a lista serve para
  // acompanhar o que está acontecendo agora, e ordenar pelo maior lead time
  // empurrava para o topo grupo que não fala há dias.
  const grpList = Object.values(grpAgg).sort((a,b) => {
    const da = a.lastInteraction ? +a.lastInteraction : 0;
    const db = b.lastInteraction ? +b.lastInteraction : 0;
    return db - da || mediaDe(b.leadComercial) - mediaDe(a.leadComercial);
  });

  const totalN = casos.filter(c => !c.aberto).length;
  const totalAvg      = mediaDe(grpList.flatMap(g => g.leadComercial));
  const totalAvgCorr  = mediaDe(grpList.flatMap(g => g.leadCorrido));

  // Store grpList for index-based click access
  window._drillLTGrpList = grpList;

  const rows = grpList.map((g,i) => {
    const avg     = mediaDe(g.leadComercial);
    const avgCorr = mediaDe(g.leadCorrido);
    const openCount = g.casos.filter(c => c.aberto).length;
    const statusBadge = /ativo/i.test(g.status)
      ? '<span class="badge badge-green" style="font-size:.6rem;">Ativo</span>'
      : g.status ? `<span class="badge badge-gray" style="font-size:.6rem;">${esc(g.status)}</span>` : '';
    const planBadge = g.plan ? `<span class="badge badge-blue" style="font-size:.6rem;">${esc(g.plan)}</span>` : '—';
    const lastDt = g.lastInteraction ? fmtDT(g.lastInteraction) : '—';
    const openBadge = openCount ? ` <span class="badge badge-amber" style="font-size:.58rem;">⏳ ${openCount} aberto${openCount>1?'s':''}</span>` : '';
    return `<tr class="clickable-row" onclick="openDrillLTGroupByIdx(${i})"${openCount ? ' style="background:#fffbeb;"' : ''}>
      <td style="font-size:.67rem;color:var(--text-2);">${i+1}</td>
      <td><div style="font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(g.grpName)}">${esc(g.grpName)}</div></td>
      <td>${planBadge}</td>
      <td style="text-align:center;">${g.leadComercial.length}${openBadge}</td>
      <td><strong style="color:${avg>60?'#b91c1c':'#15803d'}">${g.leadComercial.length?fmtMins(avg):'—'}</strong></td>
      <td><strong style="color:rgba(22,163,74,0.85)">${g.leadCorrido.length?fmtMins(avgCorr):'—'}</strong></td>
      <td style="white-space:nowrap;">${lastDt}</td>
      <td>${statusBadge}</td>
    </tr>`;
  }).join('');

  const body = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
      <span class="drill-count-pill">N = ${totalN}</span>
      <span class="drill-count-pill" style="background:#eff6ff;color:rgba(8,102,255,0.9);border-color:rgba(8,102,255,.2);">Comercial ${fmtMins(totalAvg)}</span>
      <span class="drill-count-pill" style="background:#f0fdf4;color:#15803d;border-color:rgba(22,163,74,.2);">Corrido ${fmtMins(totalAvgCorr)}</span>
      <span style="font-size:.72rem;color:var(--text-2);">👆 Clique em um grupo para ver os logs</span>
    </div>
    <div style="overflow-x:auto;">
    <table class="drill-table">
      <thead><tr>
        <th>#</th><th>Grupo</th><th>Plano</th>
        <th>Atendimentos</th>
        <th style="color:rgba(8,102,255,0.85);">LT Comercial</th>
        <th style="color:rgba(22,163,74,0.85);">LT Corrido</th>
        <th>Última interação</th><th>Status</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--text-2);">Nenhum caso</td></tr>'}</tbody>
    </table></div>`;

  openDrill(`Detalhes — Lead Time · ${gestorName}`,
    `Gestor: ${gestorName} · ${grpList.length} grupos · N = ${totalN} · Comercial ${fmtMins(totalAvg)} · Corrido ${fmtMins(totalAvgCorr)}`,
    body);

  // Store for second-level drill
  window._drillLTGrpData = grpAgg;
  window._drillLTGestorName = gestorName;
}

/* PONTO 2 — Index-based entry point */
function openDrillLTGroupByIdx(idx){
  const g = window._drillLTGrpList?.[idx];
  if(!g) return;
  openDrillLTGroup(window._drillLTGestorName, g.grpId);
}

/* PONTO 2 — Segundo nível: casos do grupo específico */
function openDrillLTGroup(gestorName, grpId){
  const agg = window._drillLTGrpData?.[grpId];
  if(!agg) return;
  const casos = agg.casos;
  // Pendente no topo (é o que precisa de ação), o resto por data — a interação mais
  // recente primeiro, para a lista acompanhar o que está acontecendo agora.
  const sorted = [...casos].sort((a,b) => {
    if(a.aberto && !b.aberto) return -1;
    if(!a.aberto && b.aberto) return 1;
    const da = a.aberto ? +a.pendente_desde : +a.respondido_em;
    const db = b.aberto ? +b.pendente_desde : +b.respondido_em;
    return db - da;
  });
  const n = sorted.length;

  const rows = sorted.map((c,i) => {
    const grpName = esc(c.grpNameCurrent || c.grpId);
    const client  = esc(c.pendente_phone || '—');
    const cliNome = esc(c.pendente_nome  || '—');
    const desde   = fmtDT(c.pendente_desde);
    // Lead Time Comercial = bizMins (always available)
    const ltComercial = c.leadMins;
    // Lead Time Corrido = real elapsed minutes
    const ltCorrido = c.aberto
      ? Math.round((new Date() - c.pendente_desde) / 60000)
      : (c.respondido_em ? Math.round((c.respondido_em - c.pendente_desde) / 60000) : null);

    if(c.aberto){
      return `<tr class="clickable-row" style="background:#fff7ed;" title="Clique para ver log" onclick="openDrillLog(${JSON.stringify(c.grpId)},${JSON.stringify(c.grpNameCurrent||c.grpId)},${c.pendente_desde?c.pendente_desde.getTime():0},0)">
        <td style="font-size:.67rem;color:var(--text-2);">${i+1}</td>
        <td><div>${cliNome}</div><div style="font-size:.65rem;color:var(--text-2);">${client}</div></td>
        <td style="white-space:nowrap;">${desde}</td>
        <td><span class="badge badge-amber" style="font-size:.65rem;">⏳ Em aberto</span></td>
        <td><strong style="color:rgba(8,102,255,0.85)">${fmtMins(ltComercial)}</strong></td>
        <td><strong style="color:rgba(22,163,74,0.85)">${fmtMins(ltCorrido)}</strong></td>
        <td><span style="color:var(--text-2);font-style:italic;font-size:.72rem;">Aguardando resposta</span></td>
      </tr>`;
    }

    const resp    = fmtDT(c.respondido_em);
    const respNum = esc(c.respondente_phone || '—');
    const respNom = esc(c.respondente_nome  || '—');
    return `<tr class="clickable-row" title="Clique para ver log" onclick="openDrillLog(${JSON.stringify(c.grpId)},${JSON.stringify(c.grpNameCurrent||c.grpId)},${c.pendente_desde?c.pendente_desde.getTime():0},${c.respondido_em?c.respondido_em.getTime():0})">
      <td style="font-size:.67rem;color:var(--text-2);">${i+1}</td>
      <td><div>${cliNome}</div><div style="font-size:.65rem;color:var(--text-2);">${client}</div></td>
      <td style="white-space:nowrap;">${desde}</td>
      <td style="white-space:nowrap;">${resp}</td>
      <td><strong style="color:rgba(8,102,255,0.85)">${fmtMins(ltComercial)}</strong></td>
      <td><strong style="color:rgba(22,163,74,0.85)">${fmtMins(ltCorrido)}</strong></td>
      <td><div>${respNom}</div><div style="font-size:.65rem;color:var(--text-2);">${respNum}</div></td>
    </tr>`;
  }).join('');

  const mediaLista = (a) => a.length ? Math.round(a.reduce((x,y)=>x+y,0)/a.length) : 0;
  const avgComercial = mediaLista(agg.leadComercial);
  const avgCorrido   = mediaLista(agg.leadCorrido);

  const body = `
    <div class="drill-breadcrumb">
      <button onclick="openDrillLT('${gestorName.replace(/'/g,"\\'")}', window._drillLT['${gestorName.replace(/'/g,"\\'")}'] || [])">← Voltar para ${esc(gestorName)}</button>
      <span>›</span>
      <span>${esc(agg.grpName)}</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
      <span class="drill-count-pill">N = ${n}</span>
      <span class="drill-count-pill" style="background:#eff6ff;color:rgba(8,102,255,0.9);border-color:rgba(8,102,255,.2);">Comercial ${fmtMins(avgComercial)}</span>
      <span class="drill-count-pill" style="background:#f0fdf4;color:#15803d;border-color:rgba(22,163,74,.2);">Corrido ${fmtMins(avgCorrido)}</span>
      <span style="font-size:.72rem;color:var(--text-2);">👆 Clique em um item para ver o log</span>
    </div>
    <div style="overflow-x:auto;">
    <table class="drill-table">
      <thead><tr>
        <th>#</th><th>Cliente</th>
        <th>Pendente desde</th><th>Respondido em</th>
        <th style="color:rgba(8,102,255,0.85);">LT Comercial</th>
        <th style="color:rgba(22,163,74,0.85);">LT Corrido</th>
        <th>Respondente</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--text-2);">Nenhum caso</td></tr>'}</tbody>
    </table></div>`;

  openDrill(`Detalhes — ${esc(agg.grpName)}`,
    `Gestor: ${gestorName} · Grupo: ${esc(agg.grpName)} · N = ${n}`,
    body);
}

/* ================================================================
   DRILL 2 — LOG COMPLETO DO GRUPO
   ================================================================ */
function openDrillLog(grpId, grpNameCurrent, pendenteMsTs, respondidoMsTs){
  const TYPE_AUDIO  = /audio|áudio|voz|voice|ptt/i;
  const TYPE_IMAGE  = /imagem|image|foto|photo|sticker|video|vídeo/i;

  const groupRows = rawRows.filter(row => gf(row,'groupId').trim() === grpId);
  groupRows.sort((a,b) => {
    const da = parseDateTime(a), db = parseDateTime(b);
    if(!da && !db) return 0; if(!da) return -1; if(!db) return 1;
    return da - db;
  });

  function buildLogHTML(showAuto){
    const filtered = showAuto
      ? groupRows
      : groupRows.filter(r => normalizePhone(gf(r,'phone')) !== AUTOMATION_NUMBER);

    if(!filtered.length) return '<div style="padding:24px;text-align:center;color:var(--text-2);">Nenhuma mensagem encontrada.</div>';

    const rows = filtered.map(row => {
      const dt    = parseDateTime(row);
      const phone = normalizePhone(gf(row,'phone'));
      const nome  = esc(gf(row,'sender').trim() || '—');
      const msg   = esc(gf(row,'msg').trim() || '');
      const tipo  = gf(row,'type').trim();
      const ts    = dt ? dt.getTime() : 0;

      let trClass = '';
      if(pendenteMsTs && dt && Math.abs(ts - pendenteMsTs) < 60000)  trClass = 'log-hl-open';
      if(respondidoMsTs && dt && Math.abs(ts - respondidoMsTs) < 60000) trClass = 'log-hl-closed';

      let typeBadge = '';
      if(TYPE_AUDIO.test(tipo))      typeBadge = '<span class="badge badge-blue" style="font-size:.6rem;">🎙 Áudio</span>';
      else if(TYPE_IMAGE.test(tipo)) typeBadge = '<span class="badge badge-gray" style="font-size:.6rem;">🖼 Mídia</span>';
      else if(tipo)                  typeBadge = `<span class="badge badge-gray" style="font-size:.6rem;">${esc(tipo)}</span>`;

      let roleBadge = '';
      if(phone === AUTOMATION_NUMBER)    roleBadge = '<span class="badge badge-amber" style="font-size:.58rem;">bot</span>';
      else if(isGestorPhone(phone))      roleBadge = '<span class="badge badge-green" style="font-size:.58rem;">gestor</span>';
      else if(isEdicaoPhone(phone))      roleBadge = '<span class="badge badge-purple" style="font-size:.58rem;">✏️ edição</span>';
      else if(isWebdesignPhone(phone))   roleBadge = '<span class="badge badge-orange" style="font-size:.58rem;">🎨 webdesign</span>';
      else if(isEstrategiaPhone(phone))  roleBadge = '<span class="badge" style="font-size:.58rem;background:rgba(6,182,212,0.15);color:rgb(6,182,212);">📊 estratégia</span>';
      else if(isInvalidatorPhone(phone)) roleBadge = '<span class="badge badge-blue" style="font-size:.58rem;">suporte</span>';
      else                               roleBadge = '<span class="badge badge-gray" style="font-size:.58rem;">cliente</span>';

      return `<tr class="${trClass}">
        <td style="white-space:nowrap;color:var(--text-2);font-size:.7rem;">${dt ? fmtDT(dt) : '—'}</td>
        <td><div style="font-weight:600;font-size:.75rem;">${nome}</div>
            <div style="font-size:.62rem;color:var(--text-2);">${esc(phone)}</div>
            <div style="margin-top:3px;">${roleBadge}</div></td>
        <td class="log-msg">${msg || '<span style="color:var(--text-2);font-style:italic;">(sem texto)</span>'}</td>
        <td>${typeBadge}</td>
      </tr>`;
    }).join('');

    return `<div style="overflow-x:auto;"><table class="log-table">
      <thead><tr><th>Horário</th><th>Remetente</th><th>Mensagem</th><th>Tipo</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  window._logBuilders = window._logBuilders || {};
  window._logBuilders[grpId] = buildLogHTML;

  const safeId = grpId.replace(/[^a-zA-Z0-9]/g,'_');
  const body = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
      <div style="font-size:.72rem;color:var(--text-2);">Histórico completo · ignora filtro de data · ${groupRows.length} mensagens totais</div>
      <label style="display:flex;align-items:center;gap:6px;font-size:.72rem;cursor:pointer;margin-left:auto;">
        <input type="checkbox" id="log-auto-${safeId}" onchange="logToggleAuto('${grpId}','${esc(grpNameCurrent)}',${pendenteMsTs},${respondidoMsTs},this.checked)">
        Mostrar automação
      </label>
    </div>
    ${pendenteMsTs||respondidoMsTs ? `<div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;">
      <span style="display:inline-flex;align-items:center;gap:5px;font-size:.7rem;"><span style="display:inline-block;width:12px;height:12px;background:#fff9c2;border-radius:2px;border:1px solid #fde047;"></span>Início pendência</span>
      <span style="display:inline-flex;align-items:center;gap:5px;font-size:.7rem;"><span style="display:inline-block;width:12px;height:12px;background:#d4f7e0;border-radius:2px;border:1px solid #86efac;"></span>Resposta do time</span>
    </div>` : ''}
    <div id="log-wrap-${safeId}">${buildLogHTML(false)}</div>`;

  openDrill(`Conversas — ${grpNameCurrent}`,
    `Grupo ID: ${grpId}`,
    body);
}

function logToggleAuto(grpId, grpNameCurrent, pendenteMsTs, respondidoMsTs, checked){
  const safeId  = grpId.replace(/[^a-zA-Z0-9]/g,'_');
  const builder = window._logBuilders?.[grpId];
  const wrap    = document.getElementById('log-wrap-' + safeId);
  if(builder && wrap) wrap.innerHTML = builder(checked);
}

/* ================================================================
   DRILL 3 — RELATÓRIOS NECESSÁRIOS
   ================================================================ */
function openDrillWeekNeeded(wkLabel, groups, enviados){
  // Resumo por gestor: quanto cada um já entregou da semana. A lista abaixo diz
  // quais grupos faltam; esta tabela diz o tamanho do buraco de cada um.
  const porGestor = {};
  const conta = (lista, campo) => (lista || []).forEach(g => {
    const nome = nomeDoGestor(g.gestor) || '—';
    if(!porGestor[nome]) porGestor[nome] = { enviados:0, faltam:0 };
    porGestor[nome][campo]++;
  });
  conta(enviados, 'enviados');
  conta(groups,   'faltam');

  const resumo = Object.entries(porGestor)
    .map(([nome, v]) => ({ nome, ...v, total: v.enviados + v.faltam,
                           pct: (v.enviados + v.faltam) ? Math.round(v.enviados * 100 / (v.enviados + v.faltam)) : 0 }))
    .sort((a,b) => a.pct - b.pct || b.faltam - a.faltam);

  const corPct = p => p >= 80 ? '#15803d' : p >= 50 ? '#b45309' : '#b91c1c';
  const resumoRows = resumo.map(r => `<tr>
      <td style="font-weight:600;">${esc(r.nome)}</td>
      <td class="num" style="color:#15803d;font-weight:600;">${r.enviados}</td>
      <td class="num" style="color:${r.faltam ? '#b91c1c' : 'var(--text-2)'};font-weight:600;">${r.faltam}</td>
      <td class="num">
        <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;">
          <div style="flex:0 0 72px;height:6px;border-radius:99px;background:var(--m-line);overflow:hidden;">
            <div style="width:${r.pct}%;height:100%;background:${corPct(r.pct)};border-radius:99px;"></div>
          </div>
          <strong style="color:${corPct(r.pct)};min-width:36px;">${r.pct}%</strong>
        </div>
      </td>
    </tr>`).join('');

  const totalEnv = resumo.reduce((s,r) => s + r.enviados, 0);
  const totalFal = resumo.reduce((s,r) => s + r.faltam, 0);
  const totalPct = (totalEnv + totalFal) ? Math.round(totalEnv * 100 / (totalEnv + totalFal)) : 0;

  const resumoTabela = resumo.length ? `
    <div style="margin-bottom:18px;">
      <div style="font-size:.72rem;font-weight:600;color:var(--text-2);margin-bottom:8px;">Resumo por gestor</div>
      <div style="overflow-x:auto;"><table class="drill-table">
        <thead><tr>
          <th>Gestor</th><th class="num">Relatórios Enviados</th>
          <th class="num">Relatórios que Faltam</th><th class="num">Porcentagem</th>
        </tr></thead>
        <tbody>${resumoRows}</tbody>
        <tfoot><tr style="border-top:2px solid var(--border,#e5e7eb);font-weight:700;">
          <td>Total</td><td class="num" style="color:#15803d;">${totalEnv}</td>
          <td class="num" style="color:${totalFal ? '#b91c1c' : 'var(--text-2)'};">${totalFal}</td>
          <td class="num"><strong style="color:${corPct(totalPct)};">${totalPct}%</strong></td>
        </tr></tfoot>
      </table></div>
    </div>` : '';

  const rows = groups.map(g => {
    const name = esc(g.name || g.id);
    const gest = esc(g.gestor || '—');
    let rptBadge = g.lastReport
      ? (g.reportDays <= 7
          ? `<span class="badge badge-green">${g.reportDays}d atrás</span>`
          : `<span class="badge badge-red">${g.reportDays}d atrás</span>`)
      : '<span class="badge badge-red">Sem relatório</span>';
    return `<tr>
      <td>${wkLabel}</td>
      <td><div style="font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${name}">${name}</div>
          <div style="font-size:.65rem;color:var(--text-2);">${esc(g.id)}</div></td>
      <td>${gest}</td>
      <td>Grupo ativo sem relatório na semana</td>
      <td>${rptBadge}</td>
    </tr>`;
  }).join('');

  const body = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <span class="drill-count-pill" style="background:#fef2f2;color:#dc2626;border-color:rgba(239,68,68,.2);">Faltam Enviar: ${groups.length}</span>
    </div>
    ${resumoTabela}
    <div style="font-size:.72rem;font-weight:600;color:var(--text-2);margin-bottom:8px;">Grupos que faltam</div>
    <div style="overflow-x:auto;"><table class="drill-table">
      <thead><tr><th>Semana</th><th>Grupo</th><th>Gestor</th><th>Motivo</th><th>Status Relatório</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="padding:24px;text-align:center;color:var(--text-2);">Nenhum grupo</td></tr>'}</tbody>
    </table></div>`;

   openDrill(`Detalhes — Faltam Enviar (${wkLabel})`,
    `${groups.length} grupo${groups.length!==1?'s':''} ainda não enviaram relatório nesta semana`,
    body);
}

/* ================================================================
   DRILL 4 — RELATÓRIOS ENVIADOS
   ================================================================ */
function openDrillWeekSent(wkLabel, groups){
  const rows = groups.map(g => {
    const name   = esc(g.name || g.id);
    const gest   = esc(g.gestor || '—');
    const cmdDt  = g.lastReport ? fmtDT(g.lastReport) : '—';

    let cmdUsed = '—';
    if(g.lastReport){
      const cmdRow = rawRows.find(row => {
        if(gf(row,'groupId').trim() !== g.id) return false;
        const dt = parseDateTime(row); if(!dt) return false;
        if(Math.abs(dt - g.lastReport) > 120000) return false;
        const msg = gf(row,'msg').trim();
        return REPORT_TAGS.some(t => msg.includes(t));
      });
      if(cmdRow){
        const msg = gf(cmdRow,'msg').trim();
        cmdUsed = REPORT_TAGS.find(t => msg.includes(t)) || '—';
      }
    }

    let prevRpt = g.lastReport === null ? '—'
      : g.prevAudioMins !== null
        ? `<span class="badge badge-green">✅ ${g.prevAudioMins} min</span>`
        : '<span class="badge badge-red">❌ Sem áudio</span>';

    const logBtn = `<button onclick="openDrillLog(${JSON.stringify(g.id)},${JSON.stringify(g.name)},0,0)" style="background:none;border:1px solid var(--border);border-radius:7px;padding:4px 10px;cursor:pointer;font-size:.7rem;font-weight:600;font-family:var(--font);color:var(--primary);">Ver log</button>`;

    return `<tr>
      <td>${wkLabel}</td>
      <td><div style="font-weight:600;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${name}">${name}</div>
          <div style="font-size:.65rem;color:var(--text-2);">${esc(g.id)}</div></td>
      <td>${gest}</td>
      <td style="white-space:nowrap;">${cmdDt}</td>
      <td><span class="badge badge-blue">${esc(cmdUsed)}</span></td>
      <td>${prevRpt}</td>
      <td>${logBtn}</td>
    </tr>`;
  }).join('');

  const body = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <span class="drill-count-pill" style="background:#f0fdf4;color:#15803d;border-color:rgba(22,163,74,.2);">Enviados: ${groups.length}</span>
    </div>
    <div style="overflow-x:auto;"><table class="drill-table">
      <thead><tr><th>Semana</th><th>Grupo</th><th>Gestor</th><th>Timestamp cmd</th><th>Comando</th><th>Áudio em 1h?</th><th>Log</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--text-2);">Nenhum grupo</td></tr>'}</tbody>
    </table></div>`;

  openDrill(`Detalhes — Relatórios Enviados (${wkLabel})`,
    `${groups.length} grupo${groups.length!==1?'s':''} enviaram relatório nesta semana`,
    body);
}

function fmtDT(d){
  if(!d) return '—';
  return `${p2(d.getDate())}/${p2(d.getMonth()+1)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}


/* ── TABLE ── */
function sortBy(key){
  if(sortKey===key) sortDir*=-1;
  else { sortKey=key; sortDir=-1; }
  renderTable();
}

function renderTable(){
  // PONTO 4: Use prevReport_sort for prevReport column sorting
  const sorted = [...groupData].sort((a,b) => {
    let sk = sortKey;
    let va = a[sk] ?? null, vb = b[sk] ?? null;
    if(va===null && vb===null) return 0;
    if(va===null) return 1;
    if(vb===null) return -1;
    if(typeof va==='string') return va.localeCompare(vb) * sortDir;
    return (va - vb) * sortDir;
  });

  set('table-count', `${sorted.length} grupo${sorted.length!==1?'s':''}`);

  // Update sort indicators
  const ths    = document.querySelectorAll('#thead th');
  const keyMap = ['name','plan','gestor','msgs','avgLT','silenceDays','reportDays'];
  ths.forEach((th,i) => {
    th.classList.remove('sort-asc','sort-desc');
    if(keyMap[i]===sortKey) th.classList.add(sortDir===-1?'sort-desc':'sort-asc');
  });

  if(!sorted.length){
    document.getElementById('tbody').innerHTML=
      '<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text-2);">Nenhum grupo no período selecionado</td></tr>';
    return;
  }

  document.getElementById('tbody').innerHTML = sorted.map((g,i) => {
    const statusBadge = /ativo/i.test(g.status)
      ? '<span class="badge badge-green" style="margin-top:5px;display:inline-flex;">Ativo</span>'
      : g.status
        ? `<span class="badge badge-gray" style="margin-top:5px;display:inline-flex;">${esc(g.status)}</span>`
        : '';

    let ltCell;
    if(g.avgLT !== null){
      ltCell = `<span style="font-weight:700;">${fmtMins(g.avgLT)}</span><div class="cell-sub">n=${g.leadTimes.length}</div>`;
    } else {
      ltCell = '<span style="color:var(--text-2);">—</span>';
    }

    // Silence days
    let silCell;
    if(g.silenceDays === null){
      silCell = '<span style="color:var(--text-2);">—</span>';
    } else if(g.silenceDays === 0){
      silCell = '<span class="badge badge-green">Hoje</span>';
    } else if(g.silenceDays === 1){
      silCell = '<span class="badge badge-green">1d atrás</span>';
    } else if(g.silenceDays === 2){
      silCell = `<span class="badge badge-amber">${g.silenceDays}d atrás</span>`;
    } else {
      silCell = `<span class="badge badge-red">${g.silenceDays}d atrás</span>`;
    }

    // ── "Status do Relatório" — usa lastReport do dataset_completo ──
    // PONTO 5: "0d" → "Hoje"
    let rptBadge;
    if(!g.lastReport){
      rptBadge = '<span class="badge badge-red">Sem relatório</span>';
    } else if(g.reportDays === 0){
      rptBadge = '<span class="badge badge-green">Hoje</span>';
    } else {
      rptBadge = g.reportDays <= 7
        ? `<span class="badge badge-green">${g.reportDays}d atrás</span>`
        : `<span class="badge badge-red">${g.reportDays}d atrás</span>`;
    }

    const planBadge = g.plan
      ? `<span class="badge badge-blue">${esc(g.plan)}</span>`
      : '<span style="color:var(--text-2);font-size:.73rem;">—</span>';

    return `<tr class="fade-up" style="animation-delay:${i*12}ms">
      <td>
        <div class="cell-name" title="${esc(g.name)}">${esc(g.name)}</div>
        ${statusBadge}
      </td>
      <td>${planBadge}</td>
      <td><div style="font-size:.8rem;font-weight:600;">${esc(g.gestorLabel)}</div></td>
      <td><strong>${g.msgs.length.toLocaleString('pt-BR')}</strong></td>
      <td>${ltCell}</td>
      <td>${silCell}</td>
      <td>${rptBadge}</td>
    </tr>`;
  }).join('');
}

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* renderProatividade removed — replaced by Lead Time Extra in chart */

/* ================================================================
   STATUS
   ================================================================ */
function setStatus(type,text){
  const p = document.getElementById('status-pill');
  p.className = 'status-pill ' + type;
  document.getElementById('status-text').textContent = text;
}
function showError(msg){
  const b = document.getElementById('error-banner');
  b.classList.add('show');
  document.getElementById('error-text').textContent = msg;
}
function hideError(){ document.getElementById('error-banner').classList.remove('show'); }

/* ================================================================
   DATE PICKER
   ================================================================ */
function initDates(){
  const t = today();
  // Default: last 7 days
  dpStart = addDays(t, -6);
  dpEnd   = t;
  dpTmp   = { start: dpStart, end: dpEnd };
  updateDateLabel();
}

function updateDateLabel(){
  const lbl=`${fmtDate(dpStart)} → ${fmtDate(dpEnd)}`;
  document.getElementById('btn-date-label').textContent=lbl;
  document.getElementById('dp-range-label').textContent=lbl;
}

function toggleDatePicker(){
  const ov=document.getElementById('dp-overlay');
  ov.classList.contains('open')?closeDatePicker():openDatePicker();
}

function openDatePicker(){
  dpTmp={start:dpStart,end:dpEnd};
  dpSelecting=false;
  dpView={year:dpStart.getFullYear(),month:dpStart.getMonth()};
  renderDP();
  // Rotulo do rodape sai de dpTmp, a mesma fonte que pinta os dias — o
  // #dp-range-label tambem e escrito por updateDateLabel (intervalo ja
  // aplicado), e os dois podiam divergir com o calendario aberto.
  updateDpLabel();
  document.getElementById('dp-overlay').classList.add('open');
}

function closeDatePicker(){ document.getElementById('dp-overlay').classList.remove('open'); }

function handleOverlayClick(e){
  if(e.target===document.getElementById('dp-overlay')) closeDatePicker();
}

function applyDatePicker(){
  if(dpTmp.start&&dpTmp.end){
    dpStart=dpTmp.start; dpEnd=dpTmp.end;
    updateDateLabel();
    closeDatePicker();
    applyFilter();
  }
}

function setShortcut(el,type){
  document.querySelectorAll('.dp-short').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  const t=today();
  switch(type){
    case 'today':     dpTmp={start:t,end:t}; break;
    case 'yesterday': dpTmp={start:addDays(t,-1),end:addDays(t,-1)}; break;
    case '7d':        dpTmp={start:addDays(t,-6),end:t}; break;
    case '14d':       dpTmp={start:addDays(t,-13),end:t}; break;
    case '30d':       dpTmp={start:addDays(t,-29),end:t}; break;
    case 'thisMonth': dpTmp={start:som(t),end:t}; break;
    case 'lastMonth': { const lm=new Date(t.getFullYear(),t.getMonth()-1,1); dpTmp={start:lm,end:eom(lm)}; break; }
    case 'custom':    return;
  }
  dpSelecting=false;
  dpView={year:dpTmp.start.getFullYear(),month:dpTmp.start.getMonth()};
  renderDP();
  updateDpLabel();
}

function updateDpLabel(){
  const s=dpTmp.start,e=dpTmp.end;
  document.getElementById('dp-range-label').textContent=
    s&&e?`${fmtDate(s)} → ${fmtDate(e)}`:s?`${fmtDate(s)} → …`:'Selecione um intervalo';
}

/* ── Calendar render ── */
const MONTH_NAMES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WD=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

function renderDP(){
  const left={year:dpView.year,month:dpView.month};
  const right={
    year:dpView.month===11?dpView.year+1:dpView.year,
    month:(dpView.month+1)%12
  };
  document.getElementById('dp-months').innerHTML=
    calHTML(left,'left')+calHTML(right,'right');

  document.getElementById('dp-prev')?.addEventListener('click',()=>{
    if(dpView.month===0){dpView.month=11;dpView.year--;}else dpView.month--;
    renderDP();
  });
  document.getElementById('dp-next')?.addEventListener('click',()=>{
    if(dpView.month===11){dpView.month=0;dpView.year++;}else dpView.month++;
    renderDP();
  });
}

function calHTML({year,month},side){
  const navPrev=side==='left'
    ?`<button class="dp-nav-btn" id="dp-prev">&#8249;</button>`
    :`<span style="width:30px;"></span>`;
  const navNext=side==='right'
    ?`<button class="dp-nav-btn" id="dp-next">&#8250;</button>`
    :`<span style="width:30px;"></span>`;

  const firstDay=new Date(year,month,1);
  const startWd=(firstDay.getDay()+6)%7; // Mon=0
  const daysInMonth=new Date(year,month+1,0).getDate();
  const prevMonthDays=new Date(year,month,0).getDate();
  const t=today();

  let days='';
  for(let i=startWd-1;i>=0;i--)
    days+=`<div class="dp-day other">${prevMonthDays-i}</div>`;

  for(let d=1;d<=daysInMonth;d++){
    const dt=new Date(year,month,d);
    const cls=dayClass(dt,t);
    days+=`<div class="dp-day${cls}" onclick="dpClick(${year},${month},${d})">${d}</div>`;
  }
  const total=startWd+daysInMonth;
  for(let d=1;d<=(7-total%7)%7;d++)
    days+=`<div class="dp-day other">${d}</div>`;

  return `<div class="dp-month">
    <div class="dp-month-header">
      ${navPrev}
      <span class="dp-month-title">${MONTH_NAMES[month]} ${year}</span>
      ${navNext}
    </div>
    <div class="dp-weekdays">${WD.map(w=>`<div class="dp-wd">${w}</div>`).join('')}</div>
    <div class="dp-days">${days}</div>
  </div>`;
}

function dayClass(dt,t){
  let cls='';
  if(sameDay(dt,t)) cls+=' today';
  const s=dpTmp.start,e=dpTmp.end;
  if(s&&e){
    const mn=s<e?s:e, mx=s<e?e:s;
    if(sameDay(dt,mn))   cls+=' range-start';
    else if(sameDay(dt,mx)) cls+=' range-end';
    else if(dt>mn&&dt<mx) cls+=' in-range';
  } else if(s&&sameDay(dt,s)) cls+=' range-start range-end';
  return cls;
}

function dpClick(year,month,day){
  const clicked=new Date(year,month,day);
  if(!dpSelecting||!dpTmp.start){
    dpTmp={start:clicked,end:null};
    dpSelecting=true;
    document.querySelectorAll('.dp-short').forEach(b=>b.classList.remove('active'));
    document.querySelector('[data-sh="custom"]').classList.add('active');
  } else {
    dpTmp.end=clicked;
    if(dpTmp.end<dpTmp.start){ const t=dpTmp.start; dpTmp.start=dpTmp.end; dpTmp.end=t; }
    dpSelecting=false;
  }
  updateDpLabel();
  renderDP();
}

/* ================================================================
   TAB SWITCHING
   ================================================================ */
function switchTab(tabId){
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  const btns = document.querySelectorAll('.tab-btn');
  const idx = tabId==='tab1' ? 0 : tabId==='tab2' ? 1 : 2;
  if(btns[idx]) btns[idx].classList.add('active');
  // O topo direito (contador de registros, período e recarregar) é da aba de
  // relatórios: mexe em rawRows e no filtro de datas, que o NPS não usa — ele
  // tem o próprio seletor de mês e o próprio botão de atualizar. Some no NPS.
  const topoDireita = document.querySelector('.topbar-right');
  if(topoDireita) topoDireita.style.display = (tabId === 'tab2') ? 'none' : 'flex';
  if(tabId === 'tab2') closeDatePicker();   // se o calendário estava aberto, fecha junto

  // Lazy init
  if(tabId==='tab2' && !window._npsInitialized){
    window._npsInitialized = true;
    npsInit();
  }
  if(tabId==='tab3' && !window._churnInitialized){
    window._churnInitialized = true;
    churnInit();
    // Garante que as mensagens (ABA 1) também sejam carregadas, pois o gráfico
    // de Área de Risco depende de rawRows para calcular dias sem mensagem.
    if((!window.rawRows || !rawRows.length) && !window._isFetching){
      try { fetchData(); } catch(_){}
    }
  }
}

/* ================================================================
   ABA 2 — NPS DOS CLIENTES
   ================================================================ */
const NPS_PUB_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT43xO8ZBg4o1_2z6sniZ1BogNIkQzWeXNwJ1PbnQ8WEAkjrO9c5TgwObZvqQsz1dR95A_gK7le1my8/pub';

const NPS_SHEETS = {
  "Formulário NPS - Janeiro": 870439944,
  "Formulário NPS - Fevereiro": 501408772,
  "Formulário NPS - Março": 1564651329,
  "Formulário NPS - Abril": 210580385,
  "Formulário NPS - Maio": 1474077717,
  "Formulário NPS - Julho": 1451590710,
};

const NPS_UTM_NAMES = {
  '1':'Yuri','2':'Raphael','3':'Gabriel',
  '4':'Guilherme','5':'Rafhael','6':'Diogo'
};

let npsGaugeGestor = null;
let npsGaugeAgencia = null;

function npsInit(){
  const sel = document.getElementById('nps-month-select');
  sel.innerHTML = '';
  const sheetKeys = Object.keys(NPS_SHEETS);
  sheetKeys.forEach((name,i)=>{
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name.replace('Formulário NPS - ','');
    if(i === sheetKeys.length - 1) opt.selected = true; // Default to latest month
    sel.appendChild(opt);
  });
  npsLoadMonth();
}

function npsSetStatus(type, text){
  const pill = document.getElementById('nps-status-pill');
  const span = document.getElementById('nps-status-text');
  pill.className = 'status-pill ' + type;
  span.textContent = text;
}

function npsShowError(msg){
  const b = document.getElementById('nps-error-banner');
  document.getElementById('nps-error-text').textContent = msg;
  b.style.display = 'flex';
}
function npsHideError(){
  document.getElementById('nps-error-banner').style.display = 'none';
}

async function npsLoadMonth(){
  const sel = document.getElementById('nps-month-select');
  const name = sel.value;
  const gid = NPS_SHEETS[name];
  if(!gid){ npsSetStatus('error','Mês não encontrado'); return; }

  npsSetStatus('loading','Carregando…');
  npsHideError();

  try {
    const url = NPS_PUB_BASE + '?gid=' + gid + '&single=true&output=csv';
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    if(text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')){
      throw new Error('Google retornou HTML em vez de CSV. Verifique se a planilha está publicada.');
    }
    const rows = npsParseCSV(text);
    if(rows.length < 2) throw new Error('CSV vazio ou inválido');

    // Auto-detect column indices from header row
    const header = rows[0] || [];
    let colGestor = -1, colFbGestor = -1, colAgencia = -1, colFbAgencia = -1, colUtm = -1;
    header.forEach((h, idx) => {
      const hl = (h||'').toLowerCase().trim();
      if(hl.includes('satisfeito com seu gestor') || hl.includes('satisfeito com o seu gestor')) colGestor = idx;
      else if(hl.includes('satisfeito') && (hl.includes('agência') || hl.includes('agencia'))) colAgencia = idx;
      if(hl === 'utm_source' || hl === 'utm\\_source' || hl === 'utm source') colUtm = idx;
    });
    // Feedback columns are typically right after the nota columns
    if(colGestor >= 0) colFbGestor = colGestor + 1;
    if(colAgencia >= 0) colFbAgencia = colAgencia + 1;

    // Fallback to hardcoded indices (January layout)
    if(colGestor < 0) colGestor = 3;
    if(colFbGestor < 0) colFbGestor = 4;
    if(colAgencia < 0) colAgencia = 5;
    if(colFbAgencia < 0) colFbAgencia = 6;
    if(colUtm < 0) colUtm = 7;

    console.log('[NPS] Detected columns:', { colGestor, colFbGestor, colAgencia, colFbAgencia, colUtm });

    const data = [];
    for(let i = 1; i < rows.length; i++){
      const r = rows[i];
      if(!r || r.length < colUtm + 1) continue;
      const utm = (r[colUtm]||'').toString().trim();
      if(!utm) continue;
      const notaGestor = parseFloat(r[colGestor]);
      const feedbackGestor = (r[colFbGestor]||'').trim();
      const notaAgencia = parseFloat(r[colAgencia]);
      const feedbackAgencia = (r[colFbAgencia]||'').trim();
      if(isNaN(notaGestor) && isNaN(notaAgencia)) continue;
      data.push({ utm, notaGestor, feedbackGestor, notaAgencia, feedbackAgencia });
    }

    if(data.length === 0) throw new Error('Nenhuma resposta válida encontrada');

    npsSetStatus('ok', 'OK — ' + data.length + ' respostas');
    npsRender(data);

  } catch(e){
    console.error('[NPS] Error:', e);
    npsSetStatus('error','Erro');
    npsShowError(e.message || 'Erro ao carregar dados');
  }
}

function npsParseCSV(text){
  const rows = [];
  let current = [];
  let cell = '';
  let inQuotes = false;
  for(let i = 0; i < text.length; i++){
    const ch = text[i];
    if(inQuotes){
      if(ch === '"'){
        if(text[i+1] === '"'){ cell += '"'; i++; }
        else inQuotes = false;
      } else { cell += ch; }
    } else {
      if(ch === '"') inQuotes = true;
      else if(ch === ',') { current.push(cell); cell = ''; }
      else if(ch === '\n' || (ch === '\r' && text[i+1] === '\n')){
        current.push(cell); cell = '';
        if(ch === '\r') i++;
        rows.push(current); current = [];
      } else if(ch === '\r'){
        current.push(cell); cell = '';
        rows.push(current); current = [];
      } else { cell += ch; }
    }
  }
  if(cell || current.length) { current.push(cell); rows.push(current); }
  return rows;
}

function npsCalc(notes){
  const valid = notes.filter(n=>!isNaN(n) && n >= 0 && n <= 10);
  const total = valid.length;
  if(total === 0) return { nps:0, promotores:0, neutros:0, detratores:0, total:0 };
  let p=0, n=0, d=0;
  valid.forEach(v=>{
    if(v >= 9) p++;
    else if(v >= 7) n++;
    else d++;
  });
  const nps = Math.round(((p - d) / total) * 100);
  return { nps, promotores:p, neutros:n, detratores:d, total };
}

function npsBadgeClass(nps){
  if(nps >= 50) return 'badge-green';
  if(nps >= 0)  return 'badge-amber';
  return 'badge-red';
}
function npsBadgeLabel(nps){
  if(nps >= 50) return 'Excelente';
  if(nps >= 0)  return 'Bom';
  return 'Crítico';
}
function npsGestorBadge(nps){
  if(nps >= 90) return { cls:'badge-green', label:'Excelência' };
  if(nps >= 70) return { cls:'badge-amber', label:'Muito bom' };
  return { cls:'badge-red', label:'A melhorar' };
}

function sanitize(str){
  return str.replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function npsRender(data){
  // Mesmo corte da aba de relatorios: cada gestor ve so as respostas dele.
  const meuNome = nomeDeEscopo();
  if(meuNome){
    data = data.filter(d => (NPS_UTM_NAMES[d.utm] || '') === meuNome);
  }

  // Overall NPS Gestor
  const gestorStats = npsCalc(data.map(d=>d.notaGestor));
  const agenciaStats = npsCalc(data.map(d=>d.notaAgencia));

  document.getElementById('nps-val-gestor').textContent = gestorStats.nps;
  document.getElementById('nps-val-agencia').textContent = agenciaStats.nps;

  document.getElementById('nps-badge-gestor').innerHTML = `<span class="badge ${npsBadgeClass(gestorStats.nps)}">${npsBadgeLabel(gestorStats.nps)}</span> <span style="font-size:.7rem;color:var(--text-2);margin-left:4px;">${gestorStats.total} respostas</span>`;
  document.getElementById('nps-badge-agencia').innerHTML = `<span class="badge ${npsBadgeClass(agenciaStats.nps)}">${npsBadgeLabel(agenciaStats.nps)}</span> <span style="font-size:.7rem;color:var(--text-2);margin-left:4px;">${agenciaStats.total} respostas</span>`;

  document.getElementById('nps-break-gestor').innerHTML = `
    <span><div class="dot-p"></div> ${gestorStats.promotores} Promotores</span>
    <span><div class="dot-n"></div> ${gestorStats.neutros} Neutros</span>
    <span><div class="dot-d"></div> ${gestorStats.detratores} Detratores</span>`;
  document.getElementById('nps-break-agencia').innerHTML = `
    <span><div class="dot-p"></div> ${agenciaStats.promotores} Promotores</span>
    <span><div class="dot-n"></div> ${agenciaStats.neutros} Neutros</span>
    <span><div class="dot-d"></div> ${agenciaStats.detratores} Detratores</span>`;

  // Draw gauges
  npsDrawGauge('gauge-gestor', gestorStats.nps);
  npsDrawGauge('gauge-agencia', agenciaStats.nps);

  // Per-gestor
  const byGestor = {};
  data.forEach(d=>{
    if(!byGestor[d.utm]) byGestor[d.utm] = [];
    byGestor[d.utm].push(d);
  });

  const grid = document.getElementById('nps-gestor-grid');
  let html = '';
  const sortedKeys = Object.keys(byGestor).sort((a,b)=>{
    const na = NPS_UTM_NAMES[a] || `utm_source ${a}`;
    const nb = NPS_UTM_NAMES[b] || `utm_source ${b}`;
    return na.localeCompare(nb);
  });

  sortedKeys.forEach(utm=>{
    const items = byGestor[utm];
    const name = NPS_UTM_NAMES[utm] || `utm_source ${utm}`;
    const stats = npsCalc(items.map(d=>d.notaGestor));
    const badge = npsGestorBadge(stats.nps);
    const feedbacks = items.filter(d=>d.feedbackGestor && d.feedbackGestor.length > 0);
    const uid = 'nps-fb-' + utm;

    html += `<div class="nps-gestor-card">
      <div class="nps-gestor-header">
        <div>
          <div class="nps-gestor-name">${sanitize(name)}</div>
          <div class="nps-gestor-meta">${stats.total} respostas · ${stats.promotores}P / ${stats.neutros}N / ${stats.detratores}D</div>
        </div>
        <div style="text-align:right;">
          <div class="nps-gestor-score" style="color:${stats.nps>=80?'#22c55e':stats.nps>=60?'#eab308':'#ef4444'}">${stats.nps}</div>
          <span class="badge ${badge.cls}">${badge.label}</span>
        </div>
      </div>
      ${feedbacks.length > 0 ? `
        <button class="btn-expand" onclick="document.getElementById('${uid}').style.display=document.getElementById('${uid}').style.display==='none'?'block':'none';this.textContent=this.textContent.includes('Ver')?'Ocultar feedbacks (${feedbacks.length})':'Ver feedbacks (${feedbacks.length})'">
          Ver feedbacks (${feedbacks.length})
        </button>
        <div class="nps-feedback-list" id="${uid}" style="display:none;">
          ${feedbacks.map(f=>`
            <div class="nps-feedback-item">
              <div class="nps-feedback-note">Nota: ${f.notaGestor}</div>
              ${sanitize(f.feedbackGestor)}
            </div>`).join('')}
        </div>` : '<div style="font-size:.72rem;color:var(--text-2);">Sem feedbacks</div>'}
    </div>`;
  });

  grid.innerHTML = html;
}

/* ── NPS GAUGE (half-donut with pointer) ── */
function npsDrawGauge(canvasId, npsValue){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);

  const cx = w / 2;
  const cy = h - 8;
  const radius = Math.min(cx - 10, cy - 10);
  const lineW = 18;

  // Segments: 0-60 red, 60-80 yellow, 80-100 green → total=100
  const segments = [
    { fraction: 60/100, color: '#ef4444' },  // 0-60 Vermelho
    { fraction: 20/100, color: '#eab308' },  // 60-80 Amarelo
    { fraction: 20/100, color: '#22c55e' },  // 80-100 Verde
  ];

  let startAngle = Math.PI; // 180deg = left
  segments.forEach(seg=>{
    const sweep = seg.fraction * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + sweep);
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'butt';
    ctx.stroke();
    startAngle += sweep;
  });

  // Pointer – scale 0..100 mapped to 0..1
  const t = Math.max(0, Math.min(1, npsValue / 100));
  const ang = Math.PI + (t * Math.PI);
  const pLen = radius - lineW/2 - 6;
  const px = cx + Math.cos(ang) * pLen;
  const py = cy + Math.sin(ang) * pLen;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, py);
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#111827';
  ctx.fill();
}

/* ================================================================
   INIT
   ================================================================ */
/* ================================================================
   ABA 3 — CHURN
   ================================================================ */
const CHURN_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSF5q4-3SSrwKbbCzWfGCXidDDVH7FuiXSGljbJU02eqbDUdrdm21dPTYBsPwaYb5jSvDT0xnZuxHy6/pub?gid=442069732&single=true&output=csv';
// Planilha "Controle dos Grupos" — fonte da verdade GLOBAL para Clientes Ativos
const ACTIVE_CLIENTS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK9DhrWACjloFOoAUsC26xHmJLgnpDXnjvN4IzROtUC4WTx-64d4wM661AtlgPJkbt_jOXQsxrCfDk/pub?output=csv';

let _churnRows = [];
let _churnCharts = { month:null, plan:null, tenure:null, gestor:null, risk:null };

// Plugin Chart.js: desenha valores absolutos no topo das barras
const churnBarValuePlugin = {
  id: 'churnBarValue',
  defaults: { enabled: false },
  afterDatasetsDraw(chart, args, opts){
    // opts vem de chart.options.plugins.churnBarValue (já mesclado com defaults).
    // Só age quando explicitamente enabled === true (evita quebrar outros gráficos
    // que não passam essa configuração — Chart.js usa proxies que NÃO são falsy).
    if(!opts || opts.enabled !== true) return;
    const { ctx } = chart;
    const dsIdx = typeof opts.datasetIndex === 'number' ? opts.datasetIndex : 0;
    const meta = chart.getDatasetMeta(dsIdx);
    if(!meta || meta.hidden) return;
    const values = Array.isArray(opts.values) ? opts.values : chart.data.datasets[dsIdx].data;
    const formatFn = (typeof opts.format === 'function') ? opts.format : null;
    ctx.save();
    ctx.fillStyle = opts.color || '#dc2626';
    ctx.font = `${opts.weight||700} ${opts.size||12}px Poppins, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    meta.data.forEach((bar, i) => {
      const v = values[i];
      if(v == null || v === 0) return;
      const label = formatFn ? formatFn(v, i) : String(v);
      ctx.fillText(label, bar.x, bar.y - 6);
    });
    ctx.restore();
  }
};
if(typeof Chart !== 'undefined' && !Chart.registry?.plugins?.get?.('churnBarValue')){
  try { Chart.register(churnBarValuePlugin); } catch(_){}
}
// Cache global dos grupos: { ativos: [{nome, gestor, plano}], gestorByName: Map<nomeNormalizado, gestor>, totalAtivos: N, ativosByGestor: {gestor: count} }
let _activeClientsData = null;

function churnSetStatus(state, text){
  const pill = document.getElementById('churn-status-pill');
  const txt  = document.getElementById('churn-status-text');
  if(!pill) return;
  pill.classList.remove('loading','success','error');
  pill.classList.add(state);
  txt.textContent = text;
}

function parseCsvLine(line){
  const out=[]; let cur=''; let inQ=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){ if(inQ && line[i+1]==='"'){ cur+='"'; i++; } else { inQ=!inQ; } }
    else if(c===',' && !inQ){ out.push(cur); cur=''; }
    else cur+=c;
  }
  out.push(cur);
  return out;
}

function parseCsv(text){
  const lines=[]; let cur=''; let inQ=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){ if(inQ && text[i+1]==='"'){ cur+='"'; i++; } else { inQ=!inQ; cur+=c; } }
    else if(c==='\n' && !inQ){ lines.push(cur); cur=''; }
    else if(c==='\r' && !inQ){ /* skip */ }
    else cur+=c;
  }
  if(cur) lines.push(cur);
  return lines.map(parseCsvLine);
}

function parseChurnDate(s){
  if(!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(!m) return null;
  let [_,d,mo,y] = m;
  if(y.length===2) y='20'+y;
  const dt = new Date(+y, +mo-1, +d);
  return isNaN(dt) ? null : dt;
}

function parseLTV(s){
  if(!s) return 0;
  const cleaned = String(s).replace(/[R$\s.]/g,'').replace(',','.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Normaliza nome (remove acentos, minúsculas, só alfa-num e espaço)
function normName(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
}

// Carrega planilha "Controle dos Grupos" — usado como fonte GLOBAL de Clientes Ativos
// Fallback: se a planilha não responder (CORS/offline/privada), usa a tabela `groups`
// do backend Supabase como fonte alternativa (mesma estrutura: id/nome/gestor/status/plano).
async function loadActiveClients(force){
  if(_activeClientsData && !force) return _activeClientsData;
  // 1) Tenta a planilha pública (fonte oficial)
  try {
    const url = force ? `${ACTIVE_CLIENTS_CSV_URL}&_=${Date.now()}` : ACTIVE_CLIENTS_CSV_URL;
    const res = await fetch(url);
    if(!res.ok) throw new Error('HTTP '+res.status);
    const rows = parseCsv(await res.text());
    if(rows.length<2) throw new Error('vazio');
    // Header: 0=Grupo, 3=Gestor Responsável, 14=Status, 17=Plano
    const ativos = [];
    const gestorByName = new Map();
    for(let i=1;i<rows.length;i++){
      const r = rows[i];
      if(!r[0] || !r[0].trim()) continue;
      const grupoRaw = r[0].trim();
      const gestor = (r[3]||'').trim();
      const status = (r[14]||'').trim();
      const plano = (r[17]||'').trim();
      // Extrai nome do cliente: "F3F - NOME - PLANO" (ignora prefixo (FECHADO))
      const limpo = grupoRaw.replace(/^\(FECHADO\)\s*/i,'').trim();
      const m = limpo.match(/^F3F\s*-\s*(.+?)\s*-\s*[^-]+$/);
      const nomeCliente = m ? m[1].trim() : limpo;
      const nm = normName(nomeCliente);
      // Excluir Denzel (regra global)
      if(isExcludedGestor(gestor)) continue;
      if(nm && gestor){
        gestorByName.set(nm, gestor);
        const toks = nm.split(' ');
        if(toks.length>=2) gestorByName.set(toks[0]+' '+toks[toks.length-1], gestor);
      }
      if(status==='Ativo'){
        ativos.push({ nome: nomeCliente, gestor: gestor||'Sem gestor', plano });
      }
    }
    if(!ativos.length) throw new Error('planilha sem ativos');
    const ativosByGestor = {};
    ativos.forEach(c => { ativosByGestor[c.gestor] = (ativosByGestor[c.gestor]||0)+1; });
    _activeClientsData = { ativos, gestorByName, totalAtivos: ativos.length, ativosByGestor, source:'sheet' };
    console.log('[ActiveClients] (planilha) total ativos:', ativos.length, 'por gestor:', ativosByGestor);
    return _activeClientsData;
  } catch(e){
    console.warn('[ActiveClients] planilha falhou, usando fallback Supabase groups:', e.message);
  }
  // 2) Fallback: tabela `groups` do backend (precisa estar autenticado para ler)
  try {
    const client = hub; // hub client (mesmo projeto); era window.__authClient do CDN
    if(!client) throw new Error('cliente auth indisponível');
    const { data, error } = await client.from('groups').select('id,nome,gestor,status,plano');
    if(error) throw error;
    const rows = data || [];
    const ativos = [];
    const gestorByName = new Map();
    for(const r of rows){
      const gestor = (r.gestor||'').trim();
      const plano  = (r.plano||'').trim();
      const status = (r.status||'').trim();
      const grupoRaw = (r.nome||'').trim();
      const limpo = grupoRaw.replace(/^\(FECHADO\)\s*/i,'').trim();
      const m = limpo.match(/^F3F\s*-\s*(.+?)\s*-\s*[^-]+$/);
      const nomeCliente = m ? m[1].trim() : limpo;
      const nm = normName(nomeCliente);
      if(isExcludedGestor(gestor)) continue;
      if(nm && gestor){
        gestorByName.set(nm, gestor);
        const toks = nm.split(' ');
        if(toks.length>=2) gestorByName.set(toks[0]+' '+toks[toks.length-1], gestor);
      }
      if(status==='Ativo' && nomeCliente){
        ativos.push({ nome: nomeCliente, gestor: gestor||'Sem gestor', plano });
      }
    }
    const ativosByGestor = {};
    ativos.forEach(c => { ativosByGestor[c.gestor] = (ativosByGestor[c.gestor]||0)+1; });
    _activeClientsData = { ativos, gestorByName, totalAtivos: ativos.length, ativosByGestor, source:'supabase' };
    console.log('[ActiveClients] (Supabase fallback) total ativos:', ativos.length);
    return _activeClientsData;
  } catch(e2){
    console.error('[ActiveClients] fallback Supabase também falhou:', e2);
    _activeClientsData = { ativos: [], gestorByName: new Map(), totalAtivos: 0, ativosByGestor: {}, source:'none', error: e2.message||String(e2) };
    return _activeClientsData;
  }
}

// Resolve gestor do cliente da planilha de churn pelo nome
function resolveGestorForChurn(nome){
  if(!_activeClientsData) return 'Sem gestor';
  const nm = normName(nome);
  if(_activeClientsData.gestorByName.has(nm)) return _activeClientsData.gestorByName.get(nm);
  const toks = nm.split(' ');
  if(toks.length>=2){
    const k = toks[0]+' '+toks[toks.length-1];
    if(_activeClientsData.gestorByName.has(k)) return _activeClientsData.gestorByName.get(k);
  }
  return 'Sem gestor';
}

async function churnInit(){
  await loadActiveClients(false);
  await churnLoad(false);
}

async function churnLoad(force){
  churnSetStatus('loading','Carregando planilha…');
  document.getElementById('churn-error-banner').style.display='none';
  try {
    if(force) await loadActiveClients(true);
    else if(!_activeClientsData) await loadActiveClients(false);
    const url = force ? `${CHURN_CSV_URL}&_=${Date.now()}` : CHURN_CSV_URL;
    const res = await fetch(url);
    if(!res.ok) throw new Error('HTTP '+res.status);
    const text = await res.text();
    const rows = parseCsv(text);
    if(rows.length<2) throw new Error('Planilha vazia');
    // Estrutura: 0=Nome, 7=Plano, 8=Entrada, 9=Saída, 10=Dias, 11=LTV, 12=Retornou?
    const data = [];
    for(let i=1;i<rows.length;i++){
      const r = rows[i];
      if(!r[0] || !r[0].trim()) continue;
      const nome = r[0].trim();
      const plano = (r[7]||'').trim() || '—';
      const entrada = parseChurnDate(r[8]);
      const saida = parseChurnDate(r[9]);
      const dias = parseInt(r[10],10);
      const ltv = parseLTV(r[11]);
      const retornouRaw = (r[12]||'').trim();
      const retornou = parseChurnDate(retornouRaw) ? true : (retornouRaw && retornouRaw.toLowerCase()!=='não' && retornouRaw.toLowerCase()!=='nao' ? true : false);
      // Coluna P (índice 15) = Gestor responsável (preenchido manualmente na planilha de churn).
      // Fallback: tenta resolver pelo cruzamento com a planilha de grupos ativos.
      const gestorPlanilha = (r[15]||'').trim();
      const gestor = gestorPlanilha || resolveGestorForChurn(nome);
      data.push({ nome, plano, gestor, entrada, saida, dias: isNaN(dias)?null:dias, ltv, retornou, retornouRaw, isChurn: !!saida });
    }
    _churnRows = data;
    // Popular filtro de planos
    const planSel = document.getElementById('churn-plan-select');
    const plans = [...new Set(data.filter(d=>d.isChurn).map(d=>d.plano))].sort();
    planSel.innerHTML = '<option value="all">Todos os planos</option>' + plans.map(p=>`<option value="${p}">${p}</option>`).join('');
    churnSetStatus('success', `${data.length} registros • ${data.filter(d=>d.isChurn).length} churns`);
    churnRender();
  } catch(e){
    console.error('[Churn] erro:', e);
    churnSetStatus('error','Falha ao carregar');
    document.getElementById('churn-error-banner').style.display='flex';
    document.getElementById('churn-error-text').textContent = 'Erro: '+e.message;
  }
}

// Calcula clientes ativos no INÍCIO de um mês específico — usando SOMENTE a planilha de churn.
// Lógica solicitada pelo usuário:
//   ativos_no_inicio_do_mes = (entradas com data < monthStart) − (cancelamentos com saída < monthStart)
// Considera tanto registros ativos quanto cancelados (ambos têm coluna Entrada).
// Ex.: para março, soma todas entradas até o fim de fevereiro e subtrai todos cancelamentos até o fim de fevereiro.
function churnActiveAtMonthStart(rows, monthStart, planFilter){
  const planOk = (d) => planFilter==='all' || d.plano===planFilter;
  const entradasAntes = rows.filter(d => d.entrada && d.entrada < monthStart && planOk(d)).length;
  const cancelAntes   = rows.filter(d => d.isChurn && d.saida && d.saida < monthStart && planOk(d)).length;
  const count = Math.max(0, entradasAntes - cancelAntes);
  const list = rows.filter(d => !d.isChurn && planOk(d));
  return { count, list };
}

// A planilha de churn era mantida à mão até abril/2026 — de maio em diante pararam.
// Deste mês em diante o churn vem do NOSSO banco (as mensagens): o cliente saiu no
// dia em que o grupo foi renomeado para "(FECHADO)". A data da 1ª mensagem já com o
// marcador é a data da saída. Antes de maio, segue a planilha.
const CHURN_DB_CUTOFF = new Date(2026, 4, 1); // 1º de maio de 2026

function gruposChurnPorMes(){
  const rows = window.rawRows || [];
  const byG = new Map();
  for(const r of rows){
    const g = gf(r,'groupId').trim(); if(!g) continue;
    const dt = parseDateTime(r); if(!dt) continue;
    if(!byG.has(g)) byG.set(g, []);
    byG.get(g).push({ dt, nome: gf(r,'groupName'), gestor: gf(r,'gestorName') });
  }
  // "F3F - NOME - PLANO" (com marcador de fechado em qualquer lugar) -> {nome, plano}
  const limpa = raw => {
    const s = String(raw||'').replace(/\(?\s*fechado\s*\)?/ig,' ').replace(/\s+/g,' ').trim();
    const m = s.match(/^F3F\s*-\s*(.+?)\s*-\s*([^-]+)$/i);
    return m ? { nome:m[1].trim(), plano:m[2].trim() } : { nome:s.replace(/^F3F\s*-\s*/i,'').trim() || '—', plano:'—' };
  };
  // Cliente que voltou não é churn. O retorno acontece de dois jeitos: o grupo é
  // renomeado de volta (tira o FECHADO), OU abrem um grupo NOVO para o mesmo cliente
  // (foi o caso da Gisele: grupo antigo fechado + grupo novo "FUNIL"). Os dois são
  // pegos casando o NOME do cliente: se há atividade em grupo aberto depois de fechar,
  // ele voltou. Guarda a última atividade aberta por cliente.
  const cliKey = raw => limpa(raw).nome.toLowerCase();
  const ativoAte = {};
  for(const arr of byG.values()){
    for(const m of arr){
      if(!isGrupoFechado(m.nome)){
        const c = cliKey(m.nome);
        if(c && (!ativoAte[c] || m.dt > ativoAte[c])) ativoAte[c] = m.dt;
      }
    }
  }

  const saidas = {}, items = {}, grupos = [];
  for(const [g, arr] of byG){
    arr.sort((a,b)=>a.dt-b.dt);
    const inicio = arr[0].dt;
    // Vale o ÚLTIMO estado do nome, não a primeira vez que o marcador apareceu.
    // 4 grupos foram renomeados de volta (tiraram o FECHADO) — um deles seguiu
    // com 67 mensagens por mais 50 dias. Pela regra antiga o grupo saía da base
    // de "ativos no dia 01" para sempre, mas também não contava como churn: o
    // cliente sumia da conta dos dois lados. Se a última mensagem não tem o
    // marcador, o grupo está aberto; se tem, a saída é o começo da sequência
    // fechada final.
    let idx = -1;
    if(isGrupoFechado(arr[arr.length-1].nome)){
      idx = arr.length - 1;
      while(idx > 0 && isGrupoFechado(arr[idx-1].nome)) idx--;
    }
    const bornFechado = idx === 0;               // já nasceu fechado -> não dá pra datar a saída
    let fim = idx >= 0 ? arr[idx].dt : null;
    if(idx > 0){
      const cli = cliKey(arr[idx].nome);
      const voltou = ativoAte[cli] && ativoAte[cli] > fim;   // ativo depois de fechar = voltou
      if(!voltou){
        const k = `${fim.getFullYear()}-${String(fim.getMonth()+1).padStart(2,'0')}`;
        saidas[k] = (saidas[k]||0) + 1;
        const { nome, plano } = limpa(arr[idx].nome);
        const gestor = [...arr].reverse().map(m=>m.gestor).find(x=>x && x.trim()) || '—';
        // shape compatível com o drill do gráfico mensal (churnOpenDrilldown).
        // entrada/dias/ltv = null: só sabemos a data de SAÍDA (a de entrada real não
        // está no grupo, só a 1ª mensagem da janela de dados — não é confiável).
        (items[k] = items[k] || []).push({ nome, gestor, plano, entrada:null, saida:fim, dias:null, ltv:null, isChurn:true });
      }
    }
    grupos.push({ inicio, fim, bornFechado });
  }
  // ativos no início de um mês: grupos que já existiam e ainda não tinham fechado
  const ativosNoInicio = (monthStart) => grupos.filter(a =>
    !a.bornFechado && a.inicio < monthStart && (!a.fim || a.fim >= monthStart)
  ).length;
  return { saidas, items, ativosNoInicio };
}

function churnRender(){
  const period = document.getElementById('churn-period-select').value;
  const planFilter = document.getElementById('churn-plan-select').value;
  const now = new Date();
  let cutoff = null;
  if(period==='ytd') cutoff = new Date(now.getFullYear(),0,1);
  else if(period==='12m'){ cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth()-12); }
  else if(period==='6m'){ cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth()-6); }
  else if(period==='3m'){ cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth()-3); }

  const all = _churnRows;
  const churns = all.filter(d => d.isChurn
    && (!cutoff || d.saida >= cutoff)
    && (planFilter==='all' || d.plano===planFilter));
  const ativos = all.filter(d => !d.isChurn && (planFilter==='all' || d.plano===planFilter));

  // ───── KPIs básicos ─────
  const total = churns.length;
  const ativosCount = ativos.length;
  const tempos = churns.map(d=>d.dias).filter(d=>d!=null && d>0);
  const avgTempo = tempos.length ? Math.round(tempos.reduce((a,b)=>a+b,0)/tempos.length) : 0;
  const ltvs = churns.map(d=>d.ltv).filter(v=>v>0);
  const avgLtv = ltvs.length ? ltvs.reduce((a,b)=>a+b,0)/ltvs.length : 0;
  const retornaram = churns.filter(d=>d.retornou).length;
  const taxaRetorno = total>0 ? (retornaram/total*100) : 0;

  // ───── Gráfico por mês: % CHURN baseado em ativos no início do mês ─────
  // Monta lista de meses do período
  const monthSet = new Set();
  churns.forEach(d => {
    monthSet.add(`${d.saida.getFullYear()}-${String(d.saida.getMonth()+1).padStart(2,'0')}`);
  });
  // Garante meses contínuos do cutoff até o mês atual
  if(cutoff){
    const cur = new Date(cutoff.getFullYear(), cutoff.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    while(cur <= end){
      monthSet.add(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`);
      cur.setMonth(cur.getMonth()+1);
    }
  }
  // period='all' não preenche meses contínuos, então jun/jul 2026 — que só têm dado
  // no banco, não na planilha (parou em maio) — ficavam de fora. Garante a era do
  // banco (a partir do corte) até o mês atual.
  if(!cutoff){
    const cur = new Date(CHURN_DB_CUTOFF.getFullYear(), CHURN_DB_CUTOFF.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    while(cur <= end){
      monthSet.add(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`);
      cur.setMonth(cur.getMonth()+1);
    }
  }
  const monthKeys = [...monthSet].sort();
  const monthData = monthKeys.map(k => {
    const [y,m] = k.split('-').map(Number);
    const monthStart = new Date(y, m-1, 1);
    const monthEnd = new Date(y, m, 1);
    const ai = churnActiveAtMonthStart(all, monthStart, planFilter);
    const cancelMes = all.filter(d => d.isChurn && d.saida >= monthStart && d.saida < monthEnd
      && (planFilter==='all' || d.plano===planFilter));
    const baseTotal = ai.count;
    const cancel = cancelMes.length;
    const pct = baseTotal>0 ? (cancel/baseTotal*100) : 0;
    return { key:k, monthStart, monthEnd, baseTotal, cancelMes, cancel, pct };
  });

  // De maio/2026 em diante, sobrescreve com o churn calculado do banco (grupos que
  // viraram FECHADO). A planilha parou de ser mantida nesse mês.
  const _dbChurn = gruposChurnPorMes();
  monthData.forEach(d => {
    if(d.monthStart >= CHURN_DB_CUTOFF){
      d.cancel     = _dbChurn.saidas[d.key] || 0;
      d.cancelMes  = _dbChurn.items[d.key] || [];
      d.baseTotal  = _dbChurn.ativosNoInicio(d.monthStart);
      d.pct        = d.baseTotal>0 ? (d.cancel/d.baseTotal*100) : 0;
      d.fonteDB    = true;
    }
  });

  // KPI Churn Rate = média ponderada (total cancelamentos / soma das bases)
  const sumBase = monthData.reduce((a,b)=>a+b.baseTotal,0);
  const sumCancel = monthData.reduce((a,b)=>a+b.cancel,0);
  const rateMedio = sumBase>0 ? (sumCancel/sumBase*100) : 0;

  // Total combinado: planilha (até abr/26) + grupos do banco (mai/26+). sumCancel já
  // soma os meses com a fonte certa em cada um.
  document.getElementById('churn-kpi-total').textContent = sumCancel;
  document.getElementById('churn-kpi-total-sub').textContent =
    (period==='all'?'todo o histórico':'no período') + ' · planilha + grupos';
  // ───── KPI: Clientes Ativos vem da planilha "Controle dos Grupos" (fonte da verdade global) ─────
  const totalAtivosGlobal = _activeClientsData ? _activeClientsData.totalAtivos : 0;
  document.getElementById('churn-kpi-active').textContent = totalAtivosGlobal;
  document.getElementById('churn-kpi-active-sub').textContent = 'na planilha de grupos';
  document.getElementById('churn-kpi-rate').textContent = rateMedio.toFixed(1)+'%';
  document.getElementById('churn-kpi-tempo').textContent = avgTempo+' d';
  document.getElementById('churn-kpi-ltv').textContent = 'R$ '+avgLtv.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0});
  document.getElementById('churn-kpi-retorno').textContent = taxaRetorno.toFixed(1)+'%';
  document.getElementById('churn-kpi-retorno-sub').textContent = `${retornaram} de ${total} (planilha)`;

  const monthLabels = monthData.map(d=>{
    const [y,m] = d.key.split('-');
    const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${names[+m-1]}/${y.slice(2)}`;
  });
  const monthCancelValues = monthData.map(d=>d.cancel);
  const monthPctValues = monthData.map(d=>+d.pct.toFixed(2));
  if(_churnCharts.month) _churnCharts.month.destroy();
  const ctxM = document.getElementById('chart-churn-month').getContext('2d');
  // Gradiente vermelho para barra de cancelamentos
  const gradRed = ctxM.createLinearGradient(0,0,0,300);
  gradRed.addColorStop(0,'rgba(220,38,38,.95)');
  gradRed.addColorStop(1,'rgba(220,38,38,.55)');
  _churnCharts.month = new Chart(ctxM, {
    type:'bar',
    data:{
      labels: monthLabels,
      datasets:[
        {
          type:'bar',
          label:'Cancelamentos',
          data: monthCancelValues,
          backgroundColor: gradRed,
          borderRadius:8,
          borderSkipped:false,
          maxBarThickness:46,
          yAxisID:'y',
          order:2
        },
        {
          type:'line',
          label:'% Churn',
          data: monthPctValues,
          borderColor:'#8b5cf6',
          backgroundColor:'rgba(8,102,255,.15)',
          borderWidth:2.5,
          tension:.35,
          pointBackgroundColor:'#fff',
          pointBorderColor:'#8b5cf6',
          pointBorderWidth:2,
          pointRadius:4,
          pointHoverRadius:6,
          fill:false,
          yAxisID:'y1',
          order:1
        }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ top:24 } },
      onClick: (evt, els) => {
        if(!els.length) return;
        const idx = els[0].index;
        const md = monthData[idx];
        churnOpenDrilldown(
          `Cancelamentos em ${monthLabels[idx]}`,
          `${md.cancel} de ${md.baseTotal} ativos no início do mês • ${md.pct.toFixed(1)}% de churn`,
          md.cancelMes
        );
      },
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ display:true, position:'top', labels:{ color:'#374151', font:{size:11}, boxWidth:14, usePointStyle:true } },
        churnBarValue:{
          enabled:true,
          datasetIndex:0,
          values: monthCancelValues,
          color:'#991b1b',
          size:13,
          weight:700,
          format:(v)=>String(v)
        },
        tooltip:{
          backgroundColor:'#111827', padding:10, titleFont:{size:12, weight:'600'}, bodyFont:{size:12},
          callbacks:{
            title: (items) => items.length ? monthLabels[items[0].dataIndex] : '',
            label: (ctx) => {
              const md = monthData[ctx.dataIndex];
              if(ctx.datasetIndex === 0){
                return `Cancelamentos: ${md.cancel}`;
              }
              return [
                `% Churn: ${md.pct.toFixed(1)}%`,
                `Ativos no início do mês: ${md.baseTotal}`
              ];
            }
          }
        }
      },
      scales:{
        y:{
          beginAtZero:true,
          position:'left',
          title:{ display:true, text:'Cancelamentos', color:CT().tick, font:{size:11} },
          ticks:{ color:CT().tick, precision:0, stepSize:1 },
          grid:{color:CT().grid}
        },
        y1:{
          beginAtZero:true,
          position:'right',
          title:{ display:true, text:'% Churn', color:CT().tick, font:{size:11} },
          ticks:{ color:CT().tick, callback:v=>v+'%' },
          grid:{ display:false }
        },
        x:{ ticks:{color:CT().tick}, grid:{display:false} }
      }
    }
  });

  // ───── Gráfico de ÁREA DE RISCO — clientes ativos por dias sem mensagem ─────
  renderChurnRiskChart(planFilter);

  // ───── Gráfico por plano (drill-down) ─────
  const byPlan = {};
  churns.forEach(d => { (byPlan[d.plano] = byPlan[d.plano] || []).push(d); });
  const planEntries = Object.entries(byPlan).sort((a,b)=>b[1].length-a[1].length);
  if(_churnCharts.plan) _churnCharts.plan.destroy();
  const ctxP = document.getElementById('chart-churn-plan').getContext('2d');
  _churnCharts.plan = new Chart(ctxP, {
    type:'doughnut',
    data:{ labels: planEntries.map(e=>e[0]), datasets:[{ data: planEntries.map(e=>e[1].length), backgroundColor:['#8b5cf6','#dc2626','#f59e0b','#10b981','#8b5cf6','#06b6d4','#ec4899','#64748b'] }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      onClick: (evt, els) => {
        if(!els.length) return;
        const idx = els[0].index;
        const [plano, list] = planEntries[idx];
        churnOpenDrilldown(`Cancelamentos do plano: ${plano}`, `${list.length} cancelamentos`, list);
      },
      plugins:{ legend:{ position:'right', labels:{ color:'#374151', font:{size:11}, boxWidth:12, padding:10 } } }
    }
  });

  // ───── Gráfico de Tempo de Permanência (drill-down) ─────
  const bucketDefs = [
    { label:'0-30 dias', test: d=>d<=30 },
    { label:'31-90 dias', test: d=>d>30 && d<=90 },
    { label:'91-180 dias', test: d=>d>90 && d<=180 },
    { label:'181-365 dias', test: d=>d>180 && d<=365 },
    { label:'365+ dias', test: d=>d>365 }
  ];
  const bucketLists = bucketDefs.map(b => ({ label:b.label, list: churns.filter(d => d.dias!=null && b.test(d.dias)) }));
  if(_churnCharts.tenure) _churnCharts.tenure.destroy();
  const ctxT = document.getElementById('chart-churn-tenure').getContext('2d');
  _churnCharts.tenure = new Chart(ctxT, {
    type:'bar',
    data:{ labels: bucketLists.map(b=>b.label), datasets:[{ label:'Clientes', data: bucketLists.map(b=>b.list.length), backgroundColor:['#fecaca','#fdba74','#fde68a','#bbf7d0','#a7f3d0'], borderRadius:6 }] },
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      onClick: (evt, els) => {
        if(!els.length) return;
        const idx = els[0].index;
        const b = bucketLists[idx];
        churnOpenDrilldown(`Cancelamentos: ${b.label}`, `${b.list.length} clientes`, b.list);
      },
      plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#111827' } },
      scales:{ x:{ beginAtZero:true, ticks:{stepSize:1, color:CT().tick}, grid:{color:CT().grid} }, y:{ ticks:{color:CT().tick}, grid:{display:false} } }
    }
  });

  // ───── Gráfico Churn por Gestor (barra = nº absoluto, linha = % churn) ─────
  renderChurnByGestorChart(churns);

  // ───── Tabela ─────
  const tbody = document.getElementById('churn-table-body');
  const sorted = [...churns].sort((a,b)=>b.saida-a.saida);
  if(sorted.length===0){
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-2);">Nenhum cancelamento no período selecionado</td></tr>';
  } else {
    const fmt = d => d ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` : '—';
    tbody.innerHTML = sorted.map(d => `
      <tr style="border-bottom:1px solid var(--m-line);">
        <td style="padding:10px 16px;font-weight:500;">${d.nome}</td>
        <td style="padding:10px 16px;color:var(--text-2);">${d.gestor||'—'}</td>
        <td style="padding:10px 16px;color:var(--text-2);">${d.plano}</td>
        <td style="padding:10px 16px;color:var(--text-2);">${fmt(d.entrada)}</td>
        <td style="padding:10px 16px;color:var(--text-2);">${fmt(d.saida)}</td>
        <td style="padding:10px 16px;text-align:right;font-variant-numeric:tabular-nums;">${d.dias!=null?d.dias:'—'}</td>
        <td style="padding:10px 16px;text-align:right;font-variant-numeric:tabular-nums;">R$ ${d.ltv.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
        <td style="padding:10px 16px;text-align:center;">${d.retornou?'<span style="background:#dbeafe;color:#1d4ed8;padding:3px 9px;border-radius:10px;font-size:.7rem;font-weight:600;">Sim</span>':'<span style="color:#9ca3af;">—</span>'}</td>
      </tr>
    `).join('');
  }
}

// ─────── Gráfico de Área de Risco ───────
// Para cada cliente ATIVO (planilha de grupos), encontra a última mensagem
// enviada PELO CLIENTE em rawRows (mensagens do time são desconsideradas).
// Bucketiza por dias desde essa última mensagem.
function renderChurnRiskChart(planFilter){
  const canvas = document.getElementById('chart-churn-risk');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const messageRows = Array.isArray(window.rawRows) && window.rawRows.length ? window.rawRows : rawRows;

  // Sem dados ainda? Mostra mensagem clara.
  const noActives = !_activeClientsData || !_activeClientsData.ativos.length;
  const noMsgs    = !messageRows || !messageRows.length;
  if(noActives || noMsgs){
    if(_churnCharts.risk){ _churnCharts.risk.destroy(); _churnCharts.risk = null; }
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.fillStyle = CT().tick;
    ctx.font = '13px Poppins, system-ui, sans-serif';
    ctx.textAlign = 'center';
    let msg;
    if(noActives && _activeClientsData && _activeClientsData.error){
      msg = 'Não foi possível carregar a lista de clientes ativos.';
    } else if(noActives){
      msg = 'Carregando clientes ativos…';
    } else if(window._isFetching){
      msg = 'Aguardando carga das mensagens (ABA 1)…';
    } else {
      msg = 'Falha ao carregar mensagens. Recarregue a página (ABA 1).';
    }
    ctx.fillText(msg, canvas.width/2, canvas.height/2);
    ctx.restore();
    return;
  }

  // Última mensagem do CLIENTE (não-time, não-automação) por grupo.
  // Index por nome normalizado do grupo via Coluna A da rawRows (group_nome).
  // Como o nome do grupo na planilha de churn é só o "nome do cliente", precisamos
  // casar com o group_nome do supabase ("F3F - {Nome} - {Plano}") por substring/normName.
  const lastClientMsgByName = new Map(); // normName(nomeCliente) -> Date
  for(let i=0; i<messageRows.length; i++){
    const r = messageRows[i];
    const phone = (r.phone || '').toString().trim();
    if(!phone) continue;
    if(phone === AUTOMATION_NUMBER) continue;
    if(isTeamPhone(phone)) continue;
    const dt = parseDateTime(r);
    if(!dt || isNaN(dt)) continue;
    const grpNome = (r.groupName || '').toString();
    if(!grpNome) continue;
    // Extrai nome do cliente do "F3F - NOME - PLANO"
    const limpo = grpNome.replace(/^\(FECHADO\)\s*/i,'').trim();
    const m = limpo.match(/^F3F\s*-\s*(.+?)\s*-\s*[^-]+$/);
    const nomeCliente = m ? m[1].trim() : limpo;
    const nm = normName(nomeCliente);
    if(!nm) continue;
    const prev = lastClientMsgByName.get(nm);
    if(!prev || dt > prev) lastClientMsgByName.set(nm, dt);
  }

  const now = new Date();
  // Filtra ativos pelo plano (se houver)
  const ativosFiltrados = _activeClientsData.ativos.filter(c =>
    planFilter==='all' || (c.plano||'').trim() === planFilter
  );

  // Para cada ativo, calcula dias desde a última mensagem dele
  const enriched = ativosFiltrados.map(c => {
    const nm = normName(c.nome);
    let last = lastClientMsgByName.get(nm);
    if(!last){
      const toks = nm.split(' ');
      if(toks.length>=2) last = lastClientMsgByName.get(toks[0]+' '+toks[toks.length-1]);
    }
    const days = last ? Math.floor((now - last) / 86400000) : null;
    return { ...c, lastMsg: last||null, days };
  });

  const ranked = enriched
    .filter(c => c.days != null)
    .sort((a,b) => (b.days||0) - (a.days||0))
    .slice(0, 15);

  const semRegistro = enriched.filter(c => c.days == null).sort((a,b)=> String(a.nome).localeCompare(String(b.nome)));
  const listForDrilldown = [...ranked, ...semRegistro];

  if(!ranked.length && !semRegistro.length){
    if(_churnCharts.risk){ _churnCharts.risk.destroy(); _churnCharts.risk = null; }
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.fillStyle = CT().tick;
    ctx.font = '13px Poppins, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nenhum cliente ativo encontrado para esta visualização.', canvas.width/2, canvas.height/2);
    ctx.restore();
    return;
  }

  const labels = ranked.map(c => {
    const nome = String(c.nome||'').trim();
    return nome.length > 20 ? nome.slice(0, 20) + '…' : nome;
  });
  const values = ranked.map(c => c.days || 0);
  const colors = ranked.map(c => c.days > 60 ? '#dc2626' : c.days > 30 ? '#f97316' : c.days > 15 ? '#f59e0b' : '#10b981');

  if(_churnCharts.risk) _churnCharts.risk.destroy();
  _churnCharts.risk = new Chart(ctx, {
    type:'bar',
    data:{ labels, datasets:[{
      label:'Clientes',
      data: values,
      backgroundColor: colors,
      borderRadius:8,
      borderSkipped:false,
      maxBarThickness:64
    }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ top:24 } },
      onClick:(evt, els) => {
        if(!els.length) return;
        const cliente = ranked[els[0].index];
        openRiskDrilldown({
          label:`Top clientes em risco`,
          color: colors[els[0].index],
          list: [cliente]
        });
      },
      plugins:{
        legend:{ display:false },
        churnBarValue:{
          enabled:true,
          datasetIndex:0,
          values,
          color:CT().tick,
          size:13,
          weight:700
        },
        tooltip:{
          backgroundColor:'#111827', padding:10,
          callbacks:{
            title:(items) => ranked[items[0].dataIndex]?.nome || items[0].label,
            label:(ctx) => `${ctx.parsed.y} dia${ctx.parsed.y===1?'':'s'} sem mensagem`,
            afterLabel:(ctx) => {
              const item = ranked[ctx.dataIndex];
              return [
                `Gestor: ${item?.gestor || '—'}`,
                `Plano: ${item?.plano || '—'}`,
                `Última msg: ${item?.lastMsg ? `${String(item.lastMsg.getDate()).padStart(2,'0')}/${String(item.lastMsg.getMonth()+1).padStart(2,'0')}/${item.lastMsg.getFullYear()}` : 'Sem registro'}`
              ];
            }
          }
        }
      },
      scales:{
        y:{ beginAtZero:true, ticks:{ color:CT().tick, precision:0, stepSize:1 }, grid:{ color:CT().grid }, title:{ display:true, text:'Dias sem mensagem', color:CT().tick, font:{size:11} } },
        x:{ ticks:{ color:'#374151', font:{size:11, weight:'600'} }, grid:{ display:false } }
      }
    }
  });

  canvas.onclick = () => openRiskDrilldown({
    label: ranked.length ? 'Clientes há mais tempo sem mensagem' : 'Clientes sem registro',
    color: '#dc2626',
    list: listForDrilldown
  });
}

// ─────── Gráfico Churn por Gestor ───────
// Para cada gestor: total bruto de cancelamentos no período + % de churn calculado como
// cancelados / (clientes ativos hoje + total de cancelados de TODOS os tempos do gestor).
// O denominador usa a base histórica completa (_churnRows), não apenas o período filtrado,
// para refletir a realidade da carteira do gestor.
function renderChurnByGestorChart(churnsPeriodo){
  const canvas = document.getElementById('chart-churn-gestor');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  // Cancelamentos NO PERÍODO (números absolutos exibidos)
  // Excluímos Felps/Mylla/Denzel apenas DESTE gráfico (continuam contando no geral)
  const churnsByGestor = {};
  churnsPeriodo.forEach(d => {
    const g = (d.gestor||'Sem gestor').trim() || 'Sem gestor';
    if(isExcludedGestor(g)) return;
    churnsByGestor[g] = (churnsByGestor[g]||0) + 1;
  });

  // Cancelamentos HISTÓRICOS (todos os tempos) — para denominador da %
  const churnsHistByGestor = {};
  _churnRows.filter(d=>d.isChurn).forEach(d => {
    const g = (d.gestor||'Sem gestor').trim() || 'Sem gestor';
    if(isExcludedGestor(g)) return;
    churnsHistByGestor[g] = (churnsHistByGestor[g]||0) + 1;
  });

  // Ativos hoje por gestor (planilha de grupos)
  const ativosByGestorRaw = (_activeClientsData && _activeClientsData.ativosByGestor) || {};
  const ativosByGestor = {};
  Object.keys(ativosByGestorRaw).forEach(g => {
    if(!isExcludedGestor(g)) ativosByGestor[g] = ativosByGestorRaw[g];
  });

  // Universo de gestores: união de quem tem churn no período, churn histórico ou ativos hoje
  const gestores = new Set([
    ...Object.keys(churnsByGestor),
    ...Object.keys(churnsHistByGestor),
    ...Object.keys(ativosByGestor)
  ]);
  // Remove "Sem gestor" se ficar vazio em todos os campos
  const linhas = [...gestores].map(g => {
    const churnPeriodo = churnsByGestor[g]||0;
    const churnHist = churnsHistByGestor[g]||0;
    const ativos = ativosByGestor[g]||0;
    const totalJaTeve = ativos + churnHist; // base histórica
    const pct = totalJaTeve>0 ? (churnHist/totalJaTeve)*100 : 0;
    return { gestor:g, churnPeriodo, churnHist, ativos, totalJaTeve, pct };
  })
  .filter(l => l.churnPeriodo>0 || l.churnHist>0 || l.ativos>0)
  .sort((a,b) => b.churnPeriodo - a.churnPeriodo || b.churnHist - a.churnHist);

  if(_churnCharts.gestor) _churnCharts.gestor.destroy();
  if(linhas.length===0){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = CT().tick; ctx.font = '13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Sem dados de gestor disponíveis', canvas.width/2, canvas.height/2);
    return;
  }

  const labels = linhas.map(l=>l.gestor);
  const dataChurn = linhas.map(l=>l.churnPeriodo);
  const dataPct = linhas.map(l=>+l.pct.toFixed(1));

  // Gradiente vermelho para barras
  const gradRed = ctx.createLinearGradient(0,0,0,300);
  gradRed.addColorStop(0,'#dc2626'); gradRed.addColorStop(1,'#fecaca');

  _churnCharts.gestor = new Chart(ctx, {
    type:'bar',
    data:{
      labels,
      datasets:[
        {
          type:'bar',
          label:'Cancelamentos no período',
          data: dataChurn,
          backgroundColor: gradRed,
          borderRadius:6,
          yAxisID:'y',
          order:2
        },
        {
          type:'line',
          label:'% Churn (histórico)',
          data: dataPct,
          borderColor:'#8b5cf6',
          backgroundColor:'#8b5cf6',
          tension:0.35,
          pointRadius:4,
          pointHoverRadius:6,
          borderWidth:2.5,
          yAxisID:'y1',
          order:1
        }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      onClick: (evt, els) => {
        if(!els.length) return;
        const idx = els[0].index;
        const g = labels[idx];
        const list = churnsPeriodo.filter(d => (d.gestor||'Sem gestor') === g);
        const linha = linhas[idx];
        churnOpenDrilldown(
          `Cancelamentos do gestor: ${g}`,
          `${list.length} no período • ${linha.churnHist} histórico • ${linha.ativos} ativos hoje • ${linha.pct.toFixed(1)}% churn`,
          list
        );
      },
      plugins:{
        legend:{ position:'top', labels:{ color:'#374151', font:{size:11}, boxWidth:12, padding:10 } },
        tooltip:{
          backgroundColor:'#111827',
          callbacks:{
            afterBody: (items) => {
              if(!items.length) return '';
              const idx = items[0].dataIndex;
              const l = linhas[idx];
              return [
                `Ativos hoje: ${l.ativos}`,
                `Cancelados (histórico): ${l.churnHist}`,
                `Total que já teve: ${l.totalJaTeve}`,
                `% Churn: ${l.pct.toFixed(1)}%`
              ];
            }
          }
        },
        churnBarValue:{ datasetIndex:0, color:'#991b1b' }
      },
      scales:{
        y:{
          beginAtZero:true,
          position:'left',
          title:{ display:true, text:'Cancelamentos', color:CT().tick, font:{size:11} },
          ticks:{ color:CT().tick, precision:0, stepSize:1 },
          grid:{ color:CT().grid }
        },
        y1:{
          beginAtZero:true,
          position:'right',
          title:{ display:true, text:'% Churn', color:CT().tick, font:{size:11} },
          ticks:{ color:CT().tick, callback:v=>v+'%' },
          grid:{ display:false }
        },
        x:{ ticks:{ color:'#374151', font:{size:11, weight:'600'} }, grid:{ display:false } }
      }
    }
  });
}

// Drill-down do gráfico de risco
function openRiskDrilldown(bucket){
  let modal = document.getElementById('churn-drill-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'churn-drill-modal';
    // classe so para as variaveis de tema: o modal e filho do <body>, fora do
    // escopo .gestor-app, entao as cores dele vem de .gestor-modal (gestor.css).
    modal.className = 'gestor-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(4px);';
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
  }
  const fmt = d => d ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` : '—';
  const list = bucket.list;
  modal.innerHTML = `
    <div style="background:var(--m-surface);border-radius:16px;max-width:880px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
        <div>
          <div style="font-size:1.05rem;font-weight:700;color:var(--m-text);display:flex;align-items:center;gap:10px;">
            <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${bucket.color};"></span>
            Área de Risco · ${bucket.label}
          </div>
          <div style="font-size:.78rem;color:var(--m-text-2);margin-top:4px;">${list.length} cliente${list.length===1?'':'s'} ativo${list.length===1?'':'s'} nesta faixa</div>
        </div>
        <button onclick="document.getElementById('churn-drill-modal').remove()" style="background:var(--m-line);border:none;border-radius:8px;width:32px;height:32px;font-size:1.1rem;cursor:pointer;color:var(--m-text-strong);">×</button>
      </div>
      <div style="overflow:auto;flex:1;">
        ${list.length===0 ? '<div style="padding:40px;text-align:center;color:var(--m-text-3);">Sem clientes nesta faixa</div>' : `
        <table style="width:100%;border-collapse:collapse;font-size:.78rem;">
          <thead style="position:sticky;top:0;background:var(--m-head);">
            <tr style="border-bottom:1px solid var(--border);">
              <th style="text-align:left;padding:10px 16px;color:var(--m-text-2);font-weight:600;">Cliente</th>
              <th style="text-align:left;padding:10px 16px;color:var(--m-text-2);font-weight:600;">Gestor</th>
              <th style="text-align:left;padding:10px 16px;color:var(--m-text-2);font-weight:600;">Plano</th>
              <th style="text-align:left;padding:10px 16px;color:var(--m-text-2);font-weight:600;">Última msg do cliente</th>
              <th style="text-align:right;padding:10px 16px;color:var(--m-text-2);font-weight:600;">Dias</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(c => `
              <tr style="border-bottom:1px solid var(--m-line);">
                <td style="padding:10px 16px;font-weight:500;">${c.nome}</td>
                <td style="padding:10px 16px;color:var(--m-text-2);">${c.gestor||'—'}</td>
                <td style="padding:10px 16px;color:var(--m-text-2);">${c.plano||'—'}</td>
                <td style="padding:10px 16px;color:var(--m-text-2);">${fmt(c.lastMsg)}</td>
                <td style="padding:10px 16px;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:${c.days!=null && c.days>30?'#dc2626':'#0f172a'};">${c.days!=null?c.days:'—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
      </div>
    </div>`;
}

// ─────── Modal de Drill-down (Churn) ───────
function churnOpenDrilldown(title, subtitle, list){
  let modal = document.getElementById('churn-drill-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'churn-drill-modal';
    // classe so para as variaveis de tema: o modal e filho do <body>, fora do
    // escopo .gestor-app, entao as cores dele vem de .gestor-modal (gestor.css).
    modal.className = 'gestor-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(4px);';
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
  }
  const fmt = d => d ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` : '—';
  const sorted = [...list].sort((a,b)=> (b.saida||0) - (a.saida||0));
  modal.innerHTML = `
    <div style="background:var(--m-surface);border-radius:16px;max-width:920px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
        <div>
          <div style="font-size:1.05rem;font-weight:700;color:var(--m-text);">${title}</div>
          <div style="font-size:.78rem;color:var(--m-text-2);margin-top:4px;">${subtitle}</div>
        </div>
        <button onclick="document.getElementById('churn-drill-modal').remove()" style="background:var(--m-line);border:none;border-radius:8px;width:32px;height:32px;font-size:1.1rem;cursor:pointer;color:var(--m-text-strong);">×</button>
      </div>
      <div style="overflow:auto;flex:1;">
        ${sorted.length===0 ? '<div style="padding:40px;text-align:center;color:var(--m-text-3);">Sem registros</div>' : `
        <table style="width:100%;border-collapse:collapse;font-size:.78rem;">
          <thead style="position:sticky;top:0;background:var(--m-head);">
            <tr style="border-bottom:1px solid var(--border);">
              <th style="text-align:left;padding:10px 16px;color:var(--m-text-2);font-weight:600;">Cliente</th>
              <th style="text-align:left;padding:10px 16px;color:var(--m-text-2);font-weight:600;">Gestor</th>
              <th style="text-align:left;padding:10px 16px;color:var(--m-text-2);font-weight:600;">Plano</th>
              <th style="text-align:left;padding:10px 16px;color:var(--m-text-2);font-weight:600;">Entrada</th>
              <th style="text-align:left;padding:10px 16px;color:var(--m-text-2);font-weight:600;">Saída</th>
              <th style="text-align:right;padding:10px 16px;color:var(--m-text-2);font-weight:600;">Dias</th>
              <th style="text-align:right;padding:10px 16px;color:var(--m-text-2);font-weight:600;">LTV</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(d => `
              <tr style="border-bottom:1px solid var(--m-line);">
                <td style="padding:10px 16px;font-weight:500;">${d.nome}</td>
                <td style="padding:10px 16px;color:var(--m-text-2);">${d.gestor||'—'}</td>
                <td style="padding:10px 16px;color:var(--m-text-2);">${d.plano||'—'}</td>
                <td style="padding:10px 16px;color:var(--m-text-2);">${fmt(d.entrada)}</td>
                <td style="padding:10px 16px;color:var(--m-text-2);">${fmt(d.saida)}</td>
                <td style="padding:10px 16px;text-align:right;font-variant-numeric:tabular-nums;">${d.dias!=null?d.dias:'—'}</td>
                <td style="padding:10px 16px;text-align:right;font-variant-numeric:tabular-nums;">R$ ${(d.ltv||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
      </div>
    </div>
  `;
}

function init(){
  initDates();
  const btn7d = document.querySelector('[data-sh="7d"]');
  if(btn7d) btn7d.classList.add('active');
  // fetchData() NÃO é chamado aqui. Antes era, no parse, sem checar login —
  // então quem abrisse a URL baixava a base inteira sem nunca digitar a senha.
  // Agora o carregamento é disparado por bootData(), depois de sessão + roster.
}

// init() e chamado por initGestor(), depois do innerHTML.

/* ============================================================================
   BOOT — versao modulo. A ORDEM CONTINUA OBRIGATORIA: roster -> motor.
   Sem sessao nao se chega aqui: o RSC de /gestor ja redirecionou pro /login
   do hub. Sem onAuthStateChange, sem overlay.
   ============================================================================ */
let _booted = false;
let _autoRefreshTimer = null;

async function bootData(){
  if(_booted) return;
  setStatus('loading','Carregando configuração…');
  const ok = await loadRoster();
  if(!ok){
    setStatus('error','Falha ao carregar configuração da equipe');
    const el = document.getElementById('status-text');
    if(el) el.title = 'Sem o roster o dashboard classificaria todo gestor como cliente. Recarregue a página.';
    return;
  }
  _booted = true;
  fetchData();
  startAutoRefresh();
}

async function autoRefreshTick(){
  if(document.visibilityState !== 'visible' || _isFetching) return;
  try {
    const r = await fetch(`${SUPA_ENDPOINT}?select=id&order=id.desc&limit=1`, { headers: await supaHeaders(), signal: AbortSignal.timeout(15000) });
    if(!r.ok) return;
    const j = await r.json();
    const maxId = Array.isArray(j) && j[0] ? j[0].id : null;
    if(maxId != null && maxId !== window._lastKnownMaxId){ reloadData(); }
  } catch(_){ /* rede instável: tenta de novo no próximo tick */ }
}
function startAutoRefresh(){
  if(_autoRefreshTimer) return;
  _autoRefreshTimer = setInterval(autoRefreshTick, 30000);
}

// Handlers inline do markup resolvem em window.
const WINDOW_FNS = { switchTab, applyFilter, sortBy, toggleDatePicker, reloadData,
  applyDatePicker, closeDatePicker, setShortcut, closeDrill, drillOverlayClick,
  handleOverlayClick, churnLoad, churnRender, npsLoadMonth,
  // Estas o proprio engine escreve em runtime, dentro de template strings. No
  // dashboard original tudo era escopo global e o onclick inline resolvia; como
  // modulo ES, sem passar por window elas ficam invisiveis para o HTML.
  dpClick, openDrillLT, openDrillLTGroupByIdx, openDrillLog, logToggleAuto };

export function initGestor(rootEl){
  rootEl.innerHTML = GESTOR_MARKUP;
  Object.assign(window, WINDOW_FNS);
  init();
  // Reentrada via navegacao SPA: modulo ja carregado, dados possivelmente em
  // memoria — re-renderiza do que existe e deixa o auto-refresh atualizar.
  if(_booted){
    try { if(typeof rawRows !== 'undefined' && rawRows.length){ applyFilter(); } } catch(_){}
    startAutoRefresh();
    return;
  }
  bootData();
}

export function destroyGestor(){
  if(_autoRefreshTimer){ clearInterval(_autoRefreshTimer); _autoRefreshTimer = null; }
  for (const c of [typeof chartLT !== 'undefined' ? chartLT : null,
                   typeof chartRel !== 'undefined' ? chartRel : null]){
    try { c && c.destroy(); } catch(_){}
  }
  try { chartLT = null; chartRel = null; } catch(_){}
  try {
    if(typeof _churnCharts !== 'undefined'){
      for (const k of Object.keys(_churnCharts)){ try { _churnCharts[k] && _churnCharts[k].destroy(); } catch(_){} _churnCharts[k] = null; }
    }
  } catch(_){}
  try { window._npsInitialized = false; window._churnInitialized = false; } catch(_){}
  for (const k of Object.keys(WINDOW_FNS)) { try { delete window[k]; } catch(_){} }
}
