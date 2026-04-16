function abrirRelatorios() {
  document.getElementById('equipe-conteudo').innerHTML = `
    <div class="secao">
      <div class="secao-titulo">Relatório de Obra</div>

      <div class="grid-3">
        <button class="btn-primario" onclick="novoRelatorio()">Novo relatório</button>
        <button class="btn-secundario" onclick="listarRelatorios()">Editar/Excluir</button>
        <button class="btn-secundario" onclick="filtrarRelatorios()">Filtros</button>
      </div>

      <div id="lista-relatorios"></div>
    </div>
  `;
}

function novoRelatorio() {
  abrirModalCustom(`
    <h3>Novo Relatório</h3>

    <input placeholder="Nome da obra" id="r-obra">
    <input type="date" id="r-data">

    <input placeholder="Funcionário" id="r-func">
    <input type="number" placeholder="Rendimento (R$)" id="r-valor">

    <button onclick="salvarRelatorio()">Salvar</button>
  `);
}

function salvarRelatorio() {
  const r = {
    obra: document.getElementById('r-obra').value,
    data: document.getElementById('r-data').value,
    funcionario: document.getElementById('r-func').value,
    valor: parseFloat(document.getElementById('r-valor').value)
  };

  let lista = JSON.parse(localStorage.getItem('relatorios') || '[]');
  lista.push(r);
  localStorage.setItem('relatorios', JSON.stringify(lista));

  fecharModal();
}

function filtrarRelatorios() {
  abrirModalCustom(`
    <h3>Filtrar</h3>

    <input placeholder="Funcionário">
    <input type="date">
    <input type="month">

    <button>Aplicar</button>
  `);
}