const form = document.getElementById("uploadForm");
const resultDiv = document.getElementById("result");
const tbody = document.querySelector("#reportTable tbody");
const lexList = document.getElementById("lexErrors");
const synList = document.getElementById("synErrors");
const btnAll = document.getElementById("btnAll");
const multi = document.getElementById("multi");
const multiReports = document.getElementById("multiReports");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const res = await fetch("/api/validate", { method: "POST", body: fd });
  const data = await res.json();
  renderSingle(data);
});

btnAll.addEventListener("click", async () => {
  const res = await fetch("/api/validate/all");
  const data = await res.json();
  renderMulti(data);
});

function renderSingle(data) {
  resultDiv.classList.remove("hidden");
  tbody.innerHTML = "";
  const keys = [
    "funciones",
    "parametrosValidos",
    "parametrosInvalidos",
    "asignacionesValidas",
    "asignacionesInvalidas",
    "ifValidos",
    "ifInvalidos",
    "doValidos",
    "doInvalidos",
    "condicionesValidas",
    "condicionesInvalidas",
  ];
  keys.forEach(k => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${k}</td><td>${data[k] ?? "-"}</td>`;
    tbody.appendChild(tr);
  });

  lexList.innerHTML = "";
  (data.erroresLexicos || []).forEach(e => {
    const li = document.createElement("li");
    li.textContent = e;
    lexList.appendChild(li);
  });

  synList.innerHTML = "";
  (data.erroresSintacticos || []).forEach(e => {
    const li = document.createElement("li");
    li.textContent = e;
    synList.appendChild(li);
  });
}

function renderMulti(arr) {
  multi.classList.remove("hidden");
  multiReports.innerHTML = "";
  arr.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    const r = item.report;
    card.innerHTML = `
      <h4>${item.file}</h4>
      <p>Funciones: ${r.funciones}</p>
      <p>Params OK/Bad: ${r.parametrosValidos} / ${r.parametrosInvalidos}</p>
      <p>Asigs OK/Bad: ${r.asignacionesValidas} / ${r.asignacionesInvalidas}</p>
      <p>If OK/Bad: ${r.ifValidos} / ${r.ifInvalidos}</p>
      <p>Do OK/Bad: ${r.doValidos} / ${r.doInvalidos}</p>
      <p>Cond OK/Bad: ${r.condicionesValidas} / ${r.condicionesInvalidas}</p>
      <details>
        <summary>Errores</summary>
        <strong>Léxicos</strong>
        <ul>${(r.erroresLexicos||[]).map(e => `<li>${e}</li>`).join("")}</ul>
        <strong>Sintácticos</strong>
        <ul>${(r.erroresSintacticos||[]).map(e => `<li>${e}</li>`).join("")}</ul>
      </details>
    `;
    multiReports.appendChild(card);
  });
}
