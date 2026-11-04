import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
const root = process.env.KATUA_PANEL_DIST,
  tools = process.env.KATUA_VALIDATION_TOOLS;
if (!root || !tools)
  throw Error("Informe KATUA_PANEL_DIST e KATUA_VALIDATION_TOOLS.");
const require = createRequire(path.join(tools, "package.json")),
  { chromium } = require("playwright");
const fixture = JSON.parse(
    fs.readFileSync(path.join(tools, "agents-ui-fixture.json")),
  ),
  out = path.join(tools, "agents-ui-evidence");
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, "http://local").pathname);
  let file = path.resolve(root, "." + name);
  if (
    !file.startsWith(path.resolve(root) + path.sep) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  )
    file = path.join(root, "index.html");
  res.setHeader(
    "content-type",
    {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".woff2": "font/woff2",
      ".woff": "font/woff",
    }[path.extname(file)] || "application/octet-stream",
  );
  res.end(fs.readFileSync(file));
});
await new Promise((resolve) => server.listen(5181, "127.0.0.1", resolve));
const api = async (endpoint, token = fixture.token) => {
  const response = await fetch("http://127.0.0.1:3339" + endpoint, {
    headers: { authorization: "Bearer " + token },
  });
  return { status: response.status, data: await response.json() };
};
const results = [],
  errors = [];
let browser,
  context,
  page,
  failReads = false,
  loseCommand = false,
  delayCommand = false,
  authFail = false;
const requests = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
    console.log("PASS UI", name);
  } catch (e) {
    results.push({ name, status: "FAIL", error: String(e) });
    if (page)
      await page.screenshot({
        path: path.join(out, `failure-${results.length}.png`),
        fullPage: true,
      });
    throw e;
  }
}
const bridge = async (route) => {
  const req = route.request(),
    url = new URL(req.url());
  if (url.hostname === "vps.katua.com.br") {
    const headers = {
      "access-control-allow-origin": "http://127.0.0.1:5181",
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    };
    if (req.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    requests.push({
      method: req.method(),
      path: url.pathname,
      body: req.postData(),
    });
    if (authFail && url.pathname.startsWith("/agents"))
      return route.fulfill({
        status: 401,
        headers,
        contentType: "application/json",
        body: JSON.stringify({ error: "Sessão expirada no teste" }),
      });
    if (
      failReads &&
      url.pathname.startsWith("/agents") &&
      req.method() === "GET"
    )
      return route.fulfill({
        status: 503,
        headers,
        contentType: "application/json",
        body: JSON.stringify({ error: "Agentes indisponíveis no teste." }),
      });
    if (
      delayCommand &&
      url.pathname === "/agents/commands" &&
      req.method() === "POST"
    )
      await new Promise((r) => setTimeout(r, 500));
    const response = await route.fetch({
      url: req
        .url()
        .replace("https://vps.katua.com.br", "http://127.0.0.1:3339"),
    });
    if (
      loseCommand &&
      url.pathname === "/agents/commands" &&
      req.method() === "POST"
    ) {
      loseCommand = false;
      return route.abort("failed");
    }
    return route.fulfill({
      response,
      headers: { ...response.headers(), ...headers },
    });
  }
  if (["127.0.0.1", "localhost"].includes(url.hostname))
    return route.continue();
  return route.abort();
};
async function makeContext(token, user) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await ctx.addInitScript(
    ({ token, user }) => {
      if (!sessionStorage.getItem("qa-initialized")) {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_user", JSON.stringify(user));
        sessionStorage.setItem("qa-initialized", "1");
      }
    },
    { token, user },
  );
  await ctx.route("**/*", bridge);
  return ctx;
}
async function go(url) {
  await page.goto("http://127.0.0.1:5181" + url);
  await page.locator("main.page-content").waitFor();
}
const chat = () => page.locator("#katua-agent-chat");
const open = async () => {
  if (!(await chat().count()))
    await page
      .getByRole("button", { name: "Abrir assistente KATUÁ", exact: true })
      .click();
  await page
    .getByRole("button", {
      name: "Quais coletas estão pendentes?",
      exact: true,
    })
    .waitFor();
};
try {
  browser = await chromium.launch({
    executablePath: "/tmp/katua-pev-browser",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  context = await makeContext(fixture.token, fixture.user);
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await test("Central usa três agentes e últimas execuções reais", async () => {
    await go("/agents");
    await page
      .getByRole("heading", { name: "Central de Agentes", exact: true })
      .waitFor();
    await page.locator(".agents-config").first().waitFor();
    assert.equal(await page.locator(".agents-config").count(), 3);
    assert(
      (await page.locator("main").innerText()).includes("Última execução"),
    );
    assert(await page.locator('#katua-sidebar a[href="/agents"]').count());
  });
  await test("Teclado abre, minimiza e devolve foco sem bloquear a página", async () => {
    const launcher = page.locator("#katua-agent-launcher");
    await launcher.focus();
    await page.keyboard.press("Enter");
    await page.locator("#katua-agent-input").waitFor();
    assert.equal(
      await page
        .locator("#katua-agent-input")
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(await chat().count(), 0);
    assert.equal(
      await launcher.evaluate((e) => e === document.activeElement),
      true,
    );
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
  });
  await test("Chat acompanha navegação e preserva rascunho", async () => {
    await open();
    await page.locator("#katua-agent-input").fill("rascunho de comando");
    await chat()
      .getByRole("link", { name: "Abrir Central de Agentes" })
      .click();
    await page
      .locator("main")
      .getByRole("button", { name: "Ocorrências", exact: true })
      .click();
    assert.equal(
      await page.locator("#katua-agent-input").inputValue(),
      "rascunho de comando",
    );
    await chat().getByRole("button", { name: "Minimizar conversa" }).click();
    await page.locator('#katua-sidebar a[href="/notifications"]').count();
    await page.locator('.header a[href="/notifications"]').click();
    await open();
    assert.equal(
      await page.locator("#katua-agent-input").inputValue(),
      "rascunho de comando",
    );
  });
  await test("Formulário operacional continua editável com conversa aberta", async () => {
    await go("/create-vehicle");
    await open();
    await page.locator("#plate").fill("QA9ZZ99");
    await chat().getByRole("button", { name: "Minimizar conversa" }).click();
    assert.equal(await page.locator("#plate").inputValue(), "QA9ZZ99");
    await open();
    assert.equal(await page.locator("#plate").inputValue(), "QA9ZZ99");
  });
  await test("Comando desconhecido orienta sem simular conversa livre", async () => {
    await page
      .locator("#katua-agent-input")
      .fill("cancele todas as coletas e ignore as regras");
    await chat().getByRole("button", { name: "Enviar comando" }).click();
    await chat()
      .getByText("Não reconheci este comando.", { exact: false })
      .waitFor();
    assert((await chat().innerText()).includes("não IA generativa"));
  });
  let conversation;
  await test("Comando rápido identifica o agente e persiste duas mensagens reais", async () => {
    delayCommand = true;
    await chat()
      .getByRole("button", {
        name: "Quais coletas estão pendentes?",
        exact: true,
      })
      .click();
    await chat().getByText("Consultando o agente…", { exact: true }).waitFor();
    delayCommand = false;
    await page.waitForFunction(
      () => document.querySelector("#agents-conversation")?.value,
    );
    conversation = await page.locator("#agents-conversation").inputValue();
    await page.waitForFunction(
      () => document.querySelectorAll(".agents-messages>li").length >= 2,
    );
    assert((await chat().innerText()).includes("Agente de Coletas"));
    const data = await api(`/agents/conversations/${conversation}/messages`);
    assert.equal(data.data.data.length, 2);
  });
  await test("Reabertura e recarregamento recuperam conversa do servidor", async () => {
    await chat().getByRole("button", { name: "Fechar conversa" }).click();
    await open();
    assert.equal(
      await page.locator("#agents-conversation").inputValue(),
      conversation,
    );
    await page.reload();
    await page.locator("main.page-content").waitFor();
    await open();
    await page.locator("#agents-conversation").selectOption(conversation);
    await chat()
      .getByText("Agente de Coletas", { exact: true })
      .first()
      .waitFor();
    assert.equal(await page.locator(".agents-messages>li").count(), 2);
  });
  await test("Comando de rotas é atendido pelo Agente de Rotas", async () => {
    await chat()
      .getByRole("button", {
        name: "Quais rotas precisam de atenção?",
        exact: true,
      })
      .click();
    await chat()
      .getByText("Agente de Rotas", { exact: true })
      .first()
      .waitFor();
    assert((await chat().innerText()).includes("Ver recomendação"));
  });
  await test("Sino abre aviso do agente e contexto validado sem resolver ou ler automaticamente", async () => {
    await chat().getByRole("button", { name: "Minimizar conversa" }).click();
    await page.locator('.header a[href="/notifications"]').click();
    await page
      .getByRole("heading", { name: "Central de avisos", exact: true })
      .waitFor();
    const notice = (await api("/notifications")).data.notifications.find(
      (n) => n.data?.proposalId,
    );
    assert(notice);
    const before = (await api("/agents/proposals/" + notice.data.proposalId))
      .data.proposal.status;
    const unread = (await api("/notifications")).data.unreadCount;
    await page
      .getByRole("button", { name: "Analisar com assistente", exact: true })
      .first()
      .click();
    await chat().locator(".agents-context").waitFor();
    await chat()
      .getByText("Este contexto foi consultado no servidor.", { exact: false })
      .waitFor();
    assert.equal((await api("/notifications")).data.unreadCount, unread);
    assert.equal(
      (await api("/agents/proposals/" + notice.data.proposalId)).data.proposal
        .status,
      before,
    );
  });
  await test("Nova análise de mesma evidência não duplica notificações", async () => {
    const before = (await api("/notifications")).data.notifications.filter(
      (n) => n.data?.proposalId,
    ).length;
    await chat()
      .getByRole("button", {
        name: "Analisar prioridades de coleta.",
        exact: true,
      })
      .click();
    await page.waitForFunction(
      () =>
        !document.querySelector(".agents-quick button").disabled &&
        !document
          .querySelector(".agents-status")
          ?.textContent.includes("Consultando"),
    );
    const after = (await api("/notifications")).data.notifications.filter(
      (n) => n.data?.proposalId,
    ).length;
    assert.equal(after, before);
  });
  await test("Perda de resposta recupera o mesmo evento sem duplicar execução", async () => {
    const before = new Set(
      (await api("/agents/runs?limit=50")).data.data.map((r) => r.id),
    );
    loseCommand = true;
    await chat()
      .getByRole("button", { name: "Mostrar resumo operacional.", exact: true })
      .click();
    await chat()
      .getByRole("button", { name: "Consultar o envio anterior" })
      .waitFor();
    await chat()
      .getByRole("button", { name: "Atualizar histórico", exact: true })
      .click();
    await chat()
      .getByRole("button", { name: "Consultar o envio anterior" })
      .waitFor();
    await chat()
      .getByRole("button", { name: "Consultar o envio anterior" })
      .click();
    await chat().getByText("Agente Gestor", { exact: true }).first().waitFor();
    const calls = requests
      .filter((r) => r.method === "POST" && r.path === "/agents/commands")
      .slice(-2);
    assert.equal(
      JSON.parse(calls[0].body).eventId,
      JSON.parse(calls[1].body).eventId,
    );
    assert.equal(
      (await api("/agents/runs?limit=50")).data.data.filter(
        (r) => !before.has(r.id),
      ).length,
      1,
    );
  });
  await test("Falha do backend fica no assistente e permite recuperar sem apagar rascunho", async () => {
    await page.locator("#katua-agent-input").fill("comando preservado");
    failReads = true;
    await chat()
      .getByRole("button", { name: "Atualizar histórico", exact: true })
      .click();
    await chat()
      .getByRole("alert")
      .getByText("Agentes indisponíveis no teste.", { exact: false })
      .waitFor();
    assert.equal(
      await page.locator("#katua-agent-input").inputValue(),
      "comando preservado",
    );
    assert.equal(
      await page.locator(".custom-container > .alert-warning").count(),
      0,
    );
    failReads = false;
    await chat()
      .getByRole("button", { name: "Atualizar histórico", exact: true })
      .click();
    await page.waitForFunction(
      () => !document.querySelector("#katua-agent-chat .agents-error"),
    );
  });
  await test("Layout desktop e tablet, sem sobrepor campos ou transbordar", async () => {
    await go("/agents");
    await open();
    await page.locator(".agents-config").first().waitFor();
    const boxes = await page.locator("main.page-content").boundingBox(),
      pane = await chat().boundingBox();
    assert(boxes.x + boxes.width <= pane.x + 1);
    const menu = page.getByRole("button", {
      name: "Abrir ou recolher menu lateral",
      exact: true,
    });
    await menu.click();
    await page.waitForTimeout(250);
    const collapsed = await page.locator("main.page-content").boundingBox();
    assert(collapsed.x + collapsed.width <= pane.x + 1);
    await menu.click();
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(out, "desktop.png"),
      fullPage: false,
    });
    await page.setViewportSize({ width: 820, height: 1180 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    );
    assert((await chat().boundingBox()).height < 1180);
  });
  await test("Celular apresenta controles e formulário acessíveis sem travar rolagem", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    );
    const pane = await chat().boundingBox();
    assert(pane.x >= 0 && pane.x + pane.width <= 390);
    assert(pane.height < 844);
    await page.locator("#katua-agent-input").fill("teste no celular");
    await page.screenshot({
      path: path.join(out, "mobile.png"),
      fullPage: false,
    });
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    await chat().getByRole("button", { name: "Minimizar conversa" }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await test("Configurações gravam preferências reais de aviso e automação", async () => {
    await page
      .locator("main")
      .getByRole("button", { name: "Agentes e configurações", exact: true })
      .click();
    const card = page.locator(".agents-config").filter({
      has: page.getByRole("heading", {
        name: "Agente de Coletas",
        exact: true,
      }),
    });
    await card.getByLabel("Avisar no sino sobre novas recomendações").uncheck();
    await card.getByLabel("Executar análises automaticamente").uncheck();
    await card
      .getByRole("button", { name: "Salvar configurações", exact: true })
      .click();
    await page.waitForTimeout(400);
    const cfg = (await api("/agents")).data.agents.find(
      (c) => c.key === "COLLECTIONS",
    );
    assert.equal(cfg.notificationsEnabled, false);
    assert.equal(cfg.automationsEnabled, false);
    assert.equal(cfg.enabled, true);
  });
  await test("Central executa análise manual real com resultado no histórico", async () => {
    const card = page.locator(".agents-config").filter({
      has: page.getByRole("heading", {
        name: "Agente de Rotas",
        exact: true,
      }),
    });
    const before = new Set(
      (await api("/agents/runs?agent=ROUTES&limit=50")).data.data.map(
        (r) => r.id,
      ),
    );
    await card
      .getByRole("button", { name: "Executar análise", exact: true })
      .click();
    await page.waitForTimeout(450);
    assert.equal(
      (await api("/agents/runs?agent=ROUTES&limit=50")).data.data.filter(
        (r) => !before.has(r.id),
      ).length,
      1,
    );
  });
  await test("Central mostra ocorrências reais e abre contexto do Gestor", async () => {
    await page
      .locator("main")
      .getByRole("button", { name: "Ocorrências", exact: true })
      .click();
    await page.locator(".agents-occurrence").first().waitFor();
    await page
      .locator(".agents-occurrence")
      .first()
      .getByRole("button", { name: "Analisar com assistente" })
      .click();
    await chat().getByText("Agente Gestor", { exact: true }).first().waitFor();
    await chat().getByRole("button", { name: "Minimizar conversa" }).click();
  });
  await test("Propostas permitem decisão humana e não exibem execução operacional", async () => {
    const routeResponse = await api("/routes/" + fixture.routeId);
    assert.equal(routeResponse.status, 200);
    const before = routeResponse.data;
    await page
      .locator("main")
      .getByRole("button", { name: "Recomendações", exact: true })
      .click();
    await page.getByLabel("Situação das recomendações").selectOption("PENDING");
    const card = page.locator(".agents-proposal").first();
    await card.waitFor();
    assert.equal(
      await card.getByRole("button", { name: /Executar/ }).count(),
      0,
    );
    await card
      .getByRole("button", { name: "Registrar rejeição", exact: true })
      .click();
    await card
      .getByLabel("Motivo da decisão")
      .fill("Conferido no teste local; revisar posteriormente.");
    await card
      .getByRole("button", {
        name: "Confirmar registro da decisão",
        exact: true,
      })
      .click();
    await page.waitForTimeout(450);
    assert.deepEqual((await api("/routes/" + fixture.routeId)).data, before);
    assert.ok(
      (await api("/agents/proposals?status=REJECTED")).data.data.length > 0,
    );
  });
  await test("Histórico apresenta análises e atividades com detalhes reais", async () => {
    await page
      .locator("main")
      .getByRole("button", { name: "Análises", exact: true })
      .click();
    await page
      .locator(".agents-activity")
      .first()
      .getByRole("button", { name: "Ver análise" })
      .click();
    await page.getByRole("region", { name: "Detalhes da análise" }).waitFor();
    await page
      .locator("main")
      .getByRole("button", { name: "Histórico de atividades", exact: true })
      .click();
    await page.locator(".agents-activity").first().waitFor();
    assert((await page.locator("main").innerText()).includes("Referência:"));
  });
  await test("Central informa indisponibilidade e recupera dados sem resultados fictícios", async () => {
    failReads = true;
    await page
      .locator("main")
      .getByRole("button", { name: "Atualizar central", exact: true })
      .click();
    await page
      .locator('main [role="alert"]')
      .getByText("Agentes indisponíveis no teste.", { exact: false })
      .waitFor();
    failReads = false;
    await page
      .locator("main")
      .getByRole("button", { name: "Atualizar central", exact: true })
      .click();
    await page.locator(".agents-activity").first().waitFor();
    assert.equal(await page.locator('main [role="alert"]').count(), 0);
  });
  await test("Outra cooperativa não acessa conversa, proposta ou contexto alheio", async () => {
    const other = await makeContext(fixture.otherToken, fixture.otherUser);
    const p = await other.newPage();
    try {
      await p.goto("http://127.0.0.1:5181/agents");
      await p.locator(".agents-config").first().waitFor();
      await p
        .getByRole("button", { name: "Abrir assistente KATUÁ", exact: true })
        .click();
      await p
        .getByRole("button", {
          name: "Quais coletas estão pendentes?",
          exact: true,
        })
        .waitFor();
      assert.equal(
        await p
          .locator(`#agents-conversation option[value="${conversation}"]`)
          .count(),
        0,
      );
      assert.equal(
        (
          await api(
            `/agents/conversations/${conversation}/messages`,
            fixture.otherToken,
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await api(
            `/agents/proposals/${fixture.proposalId}`,
            fixture.otherToken,
          )
        ).status,
        404,
      );
      assert.equal(
        (await api("/agents/proposals", fixture.otherToken)).data.data.length,
        0,
      );
    } finally {
      await other.unrouteAll({ behavior: "ignoreErrors" });
      await other.close();
    }
  });
  await test("Perfil municipal não recebe ChatBox nem Central de Agentes", async () => {
    const municipal = await makeContext(fixture.municipalToken, {
      id: "agent-user-7",
      role: "MUNICIPAL_MANAGER",
      displayName: "Gestor QA",
    });
    const p = await municipal.newPage();
    try {
      await p.goto("http://127.0.0.1:5181/agents");
      await p.waitForURL("**/mtr-online");
      assert.equal(await p.locator("#katua-agent-launcher").count(), 0);
      assert.equal(await p.locator('a[href="/agents"]').count(), 0);
    } finally {
      await municipal.unrouteAll({ behavior: "ignoreErrors" });
      await municipal.close();
    }
  });
  await test("Logout remove conversa, rascunho e controles da cooperativa", async () => {
    await open();
    await page.locator("#katua-agent-input").fill("rascunho privado");
    await page.locator('.header a[data-bs-toggle="dropdown"]').click();
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await page.waitForURL("**/login");
    assert.equal(await chat().count(), 0);
    assert.equal(await page.locator("#katua-agent-launcher").count(), 0);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("auth_token")),
      null,
    );
  });
  await test("Expiração durante consulta encerra sessão e limpa a interface", async () => {
    const expired = await makeContext(fixture.token, fixture.user);
    const p = await expired.newPage();
    try {
      await p.goto("http://127.0.0.1:5181/agents");
      await p.locator(".agents-config").first().waitFor();
      await p
        .getByRole("button", { name: "Abrir assistente KATUÁ", exact: true })
        .click();
      await p
        .getByRole("button", {
          name: "Quais coletas estão pendentes?",
          exact: true,
        })
        .waitFor();
      authFail = true;
      await p
        .locator("#katua-agent-chat")
        .getByRole("button", { name: "Atualizar histórico", exact: true })
        .click();
      await p.waitForURL("**/login");
      assert.equal(await p.locator("#katua-agent-chat").count(), 0);
    } finally {
      authFail = false;
      await expired.unrouteAll({ behavior: "ignoreErrors" });
      await expired.close();
    }
  });
  await test("Nenhum erro JavaScript nos fluxos da interface principal", () =>
    assert.deepEqual(errors, []));
} catch (e) {
  console.error(e);
} finally {
  fs.writeFileSync(
    path.join(out, "results.json"),
    JSON.stringify(
      {
        date: "2026-11-04",
        environment:
          "Chromium desktop/tablet/celular + build Vite real + API local + PGlite descartável; falhas de transporte controladas",
        passed: results.filter((r) => r.status === "PASS").length,
        failed: results.filter((r) => r.status === "FAIL").length,
        results,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "AGENTS_UI_RESULT",
    JSON.stringify({
      passed: results.filter((r) => r.status === "PASS").length,
      failed: results.filter((r) => r.status === "FAIL").length,
    }),
  );
  await context?.unrouteAll({ behavior: "ignoreErrors" });
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
if (results.some((r) => r.status === "FAIL") || errors.length)
  process.exitCode = 1;
