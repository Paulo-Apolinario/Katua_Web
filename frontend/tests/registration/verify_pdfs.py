"""Validate exported PDF files from browser.mjs. Requires PyMuPDF (fitz)."""
import json
import sys
from pathlib import Path
import fitz

root = Path(sys.argv[1])
checks = []
for kind, name in [("collectors", "Catador ficha QA"), ("generators", "Gerador ficha QA"), ("drivers", "Motorista ficha QA")]:
    expected = json.loads((root / f"{kind}-expected.json").read_text())
    for scope in ["one", "all"]:
        path = root / f"{kind}-{scope}.pdf"
        pdf = fitz.open(path)
        content = "\n".join(page.get_text() for page in pdf)
        assert pdf.page_count and "Ficha cadastral" in content
        assert "Cooperativa de operações QA" in content and name in content
        assert "30/10/2026" in content
        assert "undefined" not in content and "NaN" not in content
        assert "passwordHash" not in content and "unused-local" not in content
        for record in expected:
            if scope == "all":
                assert record["id"] in content, (path.name, "missing", record["name"])
            elif record["name"] != name:
                assert record["id"] not in content, (path.name, "unexpected", record["name"])
        for page in pdf:
            assert page.rect.width - 1 < 595.3 < page.rect.width + 1
            for x0, y0, x1, y1, *_ in page.get_text("words"):
                assert x0 >= 43 and x1 <= 552 and y0 >= 20 and y1 <= 821, (path.name, page.number, x0, y0, x1, y1)
        if kind == "collectors":
            assert "FINAL-OBSERVACAO-QA" in content
            assert "Data de Filiação" in content and "INS-023" in content and "Fundador" in content
            assert pdf.page_count > 1
        if kind == "generators":
            assert "529.982.247-25" in content and "Gerador residencial cadastrado" in content
        if kind == "drivers":
            assert "01234567890" in content
            if scope == "all": assert pdf.page_count >= 13
        pdf[0].get_pixmap(matrix=fitz.Matrix(1.2, 1.2)).save(str(root / f"{kind}-{scope}-first.png"))
        pdf[-1].get_pixmap(matrix=fitz.Matrix(1.2, 1.2)).save(str(root / f"{kind}-{scope}-last.png"))
        checks.append({"file": path.name, "pages": pdf.page_count, "records": len(expected) if scope == "all" else 1})
(root / "pdf-validation.json").write_text(json.dumps({"passed": len(checks), "checks": checks}, indent=2))
print(json.dumps(checks, indent=2))
