import { describe, expect, it } from "vitest";

import { GESTOR_ROSTER, resolveIdentity } from "@/lib/panels";

const CREATOR_ID = "6373ebcb-f65b-43e7-bd62-96b61aa404a6";

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
