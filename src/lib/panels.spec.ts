import { describe, expect, it } from "vitest";

import { GESTOR_ROSTER, memberToAccess, resolveIdentity, type HubMemberRow } from "@/lib/panels";

const CREATOR_ID = "6373ebcb-f65b-43e7-bd62-96b61aa404a6";

function member(overrides: Partial<HubMemberRow>): HubMemberRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "pessoa@exemplo.com",
    nome: "Pessoa",
    areas: [],
    is_admin: false,
    avatar_url: null,
    ...overrides,
  };
}

describe("memberToAccess", () => {
  it("admin abre os três painéis na ordem da sidebar e mantém editorName Admin", () => {
    const a = memberToAccess(member({ areas: ["gestor", "editor", "creator"], is_admin: true, nome: "Arthur Eiras" }));
    expect(a.isAdmin).toBe(true);
    expect(a.panels).toEqual(["gestor", "editor", "creator"]);
    expect(a.editorName).toBe("Admin");
  });

  it("uma área abre um painel só, com o nome exato para o filtro de texto livre", () => {
    const a = memberToAccess(member({ areas: ["editor"], nome: "Damião" }));
    expect(a.panels).toEqual(["editor"]);
    expect(a.editorName).toBe("Damião");
    expect(a.gestorName).toBeUndefined();
    expect(a.isAdmin).toBe(false);
  });

  it("multi-área (caso Denzel) abre os dois painéis", () => {
    const a = memberToAccess(member({ areas: ["gestor", "creator"], nome: "Denzel" }));
    expect(a.panels).toEqual(["gestor", "creator"]);
    expect(a.gestorName).toBe("Denzel");
    expect(a.editorName).toBeUndefined();
  });

  it("normaliza o email e expõe avatar quando existe", () => {
    const a = memberToAccess(member({ email: "  Pessoa@Exemplo.com ", avatar_url: "https://x/y.webp" }));
    expect(a.email).toBe("pessoa@exemplo.com");
    expect(a.avatarUrl).toBe("https://x/y.webp");
    expect(memberToAccess(member({})).avatarUrl).toBeUndefined();
  });
});

describe("resolveIdentity", () => {
  it("admin abre os três painéis", () => {
    const a = resolveIdentity("agenciaf3f@gmail.com", CREATOR_ID);
    expect(a.isAdmin).toBe(true);
    expect(a.panels).toEqual(["creator", "editor", "gestor"]);
  });

  it("editor abre só o painel de edição, com o nome exato do banco", () => {
    const a = resolveIdentity("iriacridesdamiaopinhas@gmail.com");
    expect(a.panels).toEqual(["editor"]);
    expect(a.editorName).toBe("Damião");
    expect(a.isAdmin).toBe(false);
  });

  it("designer do creator sem perfil não abre o painel creator", () => {
    const semPerfil = resolveIdentity("diegobrandotheworld472@gmail.com");
    expect(semPerfil.panels).toEqual(["gestor"]);

    const comPerfil = resolveIdentity("diegobrandotheworld472@gmail.com", CREATOR_ID);
    expect(comPerfil.panels).toEqual(["creator", "gestor"]);
  });

  it("email fora do mapa e sem perfil não abre painel nenhum", () => {
    expect(resolveIdentity("estranho@exemplo.com").panels).toEqual([]);
  });

  it("normaliza caixa e espaço em volta do email", () => {
    const a = resolveIdentity("  LucasMaiaSCT2187@Gmail.com  ");
    expect(a.email).toBe("lucasmaiasct2187@gmail.com");
    expect(a.editorName).toBe("Lucas");
  });

  it("editorName bate caractere a caractere com video_edits.editor_name", () => {
    // A coluna é texto livre, sem FK: um acento ou espaço a mais e o editor
    // loga e vê a lista vazia. Estes são os valores que existem no banco.
    expect(resolveIdentity("iriacridesdamiaopinhas@gmail.com").editorName).toBe("Damião");
    expect(resolveIdentity("lucasmaiasct2187@gmail.com").editorName).toBe("Lucas");
  });

  it("roster do gestor tem os 9 nomes do env ROSTER", () => {
    expect(GESTOR_ROSTER).toHaveLength(9);
    expect(GESTOR_ROSTER.filter((m) => m.setor === "TRAFEGO")).toHaveLength(6);
  });
});
