/** Painel real com API controlada; não altera banco ou VPS. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  req = createRequire(
    resolve(process.env.KATUA_VALIDATION_TOOLS, "package.json"),
  ),
  { chromium } = req("playwright"),
  chromiumBuild = (await import(req.resolve("@sparticuz/chromium"))).default;
chromiumBuild.setGraphicsMode = false;
const out = await mkdtemp(
    resolve(
      process.env.KATUA_VALIDATION_OUTPUT_ROOT || "/tmp",
      "katua-inventory-history-",
    ),
  ),
  results = [];
let browser, server;
const lot = (id, status, more = {}) => ({
  id,
  lotCode: id,
  status,
  unit: "KG",
  quantity: 50,
  availableQuantity: status === "AVAILABLE" ? 50 : 0,
  processingStage: "ARMAZENADO",
  createdAt: "2026-10-22T12:00:00Z",
  updatedAt: "2026-10-22T13:00:00Z",
  origin: "Gerado a partir de coleta",
  originCollectionId: "collection-paper",
  originCollectionWasteEntryId: "entry-paper",
  ...more,
});
const items = [
  {
    id: "paper",
    name: "Papelão",
    category: "Reciclável",
    unit: "KG",
    status: "ACTIVE",
    wasteClass: "CLASS_II_A",
    lots: [
      lot("LOT-VALIDO", "SOLD"),
      lot("LOT-CANCEL-1", "CANCELLED", {
        notes: "Lote anulado devido à alteração para TRIAGE.",
      }),
      lot("LOT-CANCEL-2", "CANCELLED", {
        notes: "Material molhado. Alteração para RESERVATION.",
      }),
      lot("LOT-CANCEL-3", "CANCELLED", {
        notes: "Lote anulado devido à alteração para DISPOSAL.",
      }),
    ],
  },
  {
    id: "cancel-only",
    name: "Vidro anulado",
    category: "Reciclável",
    unit: "LITER",
    status: "ACTIVE",
    lots: [
      lot("LOT-VIDRO-CANCEL", "CANCELLED", {
        unit: "LITER",
        notes: "Ajuste do cadastro.",
        originCollectionId: null,
        originCollectionWasteEntryId: null,
      }),
    ],
  },
  {
    id: "metal",
    name: "Metal",
    category: "Reciclável",
    unit: "KG",
    status: "ACTIVE",
    lots: [
      lot("LOT-METAL", "AVAILABLE", { quantity: 10, availableQuantity: 10 }),
      lot("LOT-RESERVA", "RESERVED", { quantity: 5, availableQuantity: 5 }),
    ],
  },
  {
    id: "empty",
    name: "Material novo",
    category: "Outros",
    unit: "UNIT",
    status: "ACTIVE",
    lots: [],
  },
];
const initial = JSON.stringify(items),
  mutations = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
    console.log("PASS", name);
  } catch (e) {
    results.push({ name, status: "FAIL", error: e.message });
    console.error("FAIL", name, e.message);
    for (const c of browser?.contexts() || [])
      for (const p of c.pages())
        await p
          .screenshot({
            path: join(out, `failure-${results.length}.png`),
            fullPage: true,
          })
          .catch(() => {});
  }
}
try {
  server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "5179",
      "--strictPort",
    ],
    {
      cwd: root,
      env: { ...process.env, VITE_API_BASE_URL: "http://127.0.0.1:3339" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  await new Promise((r, j) => {
    let logs = "",
      timer = setTimeout(() => j(Error(logs)), 30000);
    const consume = (b) => {
      logs += b;
      if (logs.includes("Local:")) {
        clearTimeout(timer);
        r();
      }
    };
    server.stdout.on("data", consume);
    server.stderr.on("data", consume);
  });
  browser = await chromium.launch({
    executablePath: process.env.KATUA_CHROMIUM_PATH,
    args: chromiumBuild.args.filter((a) => a !== "--single-process"),
    headless: true,
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    }),
    user = {
      id: "owner-local",
      role: "COOPERATIVE",
      displayName: "Cooperativa QA",
      cooperative: { id: "coop-local", name: "Cooperativa QA" },
    };
  await context.addInitScript((user) => {
    localStorage.setItem("auth_token", "local-qa");
    localStorage.setItem("auth_user", JSON.stringify(user));
  }, user);
  await context.route("http://127.0.0.1:3339/**", async (r) => {
    const u = new URL(r.request().url()),
      p = u.pathname;
    let body = { success: true };
    if (r.request().method() !== "GET") mutations.push(p);
    if (p === "/auth/me") body = { user };
    else if (p === "/waste-stock/items") body = { items };
    else if (p === "/notifications")
      body = {
        userId: user.id,
        notifications: [],
        unreadCount: 0,
        nextCursor: null,
      };
    await r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await check(
    "Visão principal conta um lote válido de papelão e oculta as três anulações",
    async () => {
      await page.goto("http://127.0.0.1:5179/waste-stock");
      await page
        .getByRole("button", { name: "Lotes válidos (3)", exact: true })
        .waitFor();
      assert.equal(
        await page.getByText("Vidro anulado", { exact: true }).count(),
        0,
      );
      const row = page
        .locator("tr")
        .filter({ has: page.getByText("Papelão", { exact: true }) });
      await row
        .getByRole("button", { name: "Ver lotes (1)", exact: true })
        .click();
      await page.getByText("LOT-VALIDO", { exact: true }).waitFor();
      assert.equal(
        await page.getByText("LOT-CANCEL-1", { exact: true }).count(),
        0,
      );
      await page.screenshot({
        path: join(out, "estoque-lotes-validos.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "CSV operacional exclui cancelados e mantém os lotes válidos",
    async () => {
      const dl = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Exportar filtrados (CSV)" })
        .click();
      const d = await dl,
        csv = await readFile(await d.path(), "utf8");
      assert.equal(d.suggestedFilename(), "katua-estoque-filtrado.csv");
      assert.ok(csv.includes("LOT-VALIDO"));
      assert.ok(!csv.includes("LOT-CANCEL"));
      assert.ok(!csv.includes("LOT-VIDRO-CANCEL"));
    },
  );
  await check(
    "Atalho do material abre histórico separado com motivos e sem edição",
    async () => {
      await page
        .getByRole("button", { name: "Ver histórico (3)", exact: true })
        .click();
      await page.waitForURL(/view=history.*itemId=paper/);
      await page
        .getByRole("heading", {
          name: "Histórico de Cancelamentos",
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("button", { name: "Ver registros (3)", exact: true })
        .click();
      await page.getByText("LOT-CANCEL-1", { exact: true }).waitFor();
      assert.equal(
        await page.getByText("LOT-VALIDO", { exact: true }).count(),
        0,
      );
      assert.equal(
        await page.getByText("LOT-VIDRO-CANCEL", { exact: true }).count(),
        0,
      );
      assert.equal(
        await page
          .getByRole("link", { name: "Consultar lote", exact: true })
          .count(),
        3,
      );
      assert.equal(
        await page
          .getByRole("link", { name: "Ver / editar lote", exact: true })
          .count(),
        0,
      );
      await page.getByText(/Material molhado/).waitFor();
      await page.screenshot({
        path: join(out, "historico-papelao.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "CSV histórico contém apenas anulações e seus motivos",
    async () => {
      const dl = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Exportar filtrados (CSV)" })
        .click();
      const d = await dl,
        csv = await readFile(await d.path(), "utf8");
      assert.equal(d.suggestedFilename(), "katua-historico-cancelamentos.csv");
      assert.ok(csv.includes("Material molhado"));
      assert.ok(csv.includes("sem saldo"));
      assert.ok(!csv.includes("LOT-VALIDO"));
      assert.ok(!csv.includes("LOT-VIDRO-CANCEL"));
    },
  );
  await check(
    "Histórico preserva filtro de material na recarga e permite ver todos",
    async () => {
      await page.reload();
      await page
        .getByRole("button", { name: "Ver registros (3)", exact: true })
        .waitFor();
      assert.equal(
        await page.getByText("Vidro anulado", { exact: true }).count(),
        0,
      );
      await page
        .getByRole("button", { name: "Ver todos os materiais", exact: true })
        .click();
      await page.getByText("Vidro anulado", { exact: true }).waitFor();
      assert.equal(await page.getByText("Metal", { exact: true }).count(), 0);
    },
  );
  await check(
    "Busca histórica encontra o motivo e oculta lotes irmãos",
    async () => {
      await page.getByLabel("Buscar material, código ou lote").fill("molhado");
      await page
        .getByRole("button", { name: "Ver registros (1)", exact: true })
        .click();
      await page.getByText("LOT-CANCEL-2", { exact: true }).waitFor();
      assert.equal(
        await page.getByText("LOT-CANCEL-1", { exact: true }).count(),
        0,
      );
      await page
        .getByRole("button", { name: "Limpar filtros", exact: true })
        .click();
    },
  );
  await check(
    "Consulta de lote cancelado é somente leitura e retorna ao histórico",
    async () => {
      if (
        await page
          .getByRole("button", { name: "Ver registros (3)", exact: true })
          .count()
      )
        await page
          .getByRole("button", { name: "Ver registros (3)", exact: true })
          .click();
      await page
        .getByRole("link", { name: "Consultar lote", exact: true })
        .first()
        .click();
      await page
        .getByRole("heading", {
          name: "Consulta do Lote Cancelado",
          exact: true,
        })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Salvar lote", exact: true })
          .count(),
        0,
      );
      await page
        .getByRole("link", { name: "Voltar ao histórico", exact: true })
        .click();
      await page.waitForURL(/view=history.*itemId=paper/);
      await page
        .getByRole("button", { name: "Ver registros (3)", exact: true })
        .waitFor();
    },
  );
  await check(
    "Voltar aos lotes válidos restaura contador e navegação de catálogo",
    async () => {
      await page
        .getByRole("button", { name: "Lotes válidos (3)", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Ver lotes (1)", exact: true })
        .waitFor();
      assert.equal(
        await page.getByText("Vidro anulado", { exact: true }).count(),
        0,
      );
      await page.goto("http://127.0.0.1:5179/waste-type-list");
      await page.getByText("Vidro anulado", { exact: true }).waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: /Histórico de cancelamentos/ })
          .count(),
        0,
      );
    },
  );
  await check(
    "Histórico cabe no celular e não gera mutações de dados",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(
        "http://127.0.0.1:5179/waste-stock?view=history&itemId=paper",
      );
      await page
        .getByRole("button", { name: "Ver registros (3)", exact: true })
        .click();
      const bounds = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert.ok(bounds.scroll <= bounds.width + 1, JSON.stringify(bounds));
      assert.equal(JSON.stringify(items), initial);
      assert.deepEqual(mutations, []);
      assert.deepEqual(errors, []);
      await page.screenshot({
        path: join(out, "historico-mobile.png"),
        fullPage: true,
      });
    },
  );
} finally {
  await writeFile(
    join(out, "results.json"),
    JSON.stringify(
      {
        passed: results.filter((r) => r.status === "PASS").length,
        failed: results.filter((r) => r.status === "FAIL").length,
        checks: results,
      },
      null,
      2,
    ),
  );
  console.log("EVIDENCE", out);
  await browser?.close();
  server?.kill();
}
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
