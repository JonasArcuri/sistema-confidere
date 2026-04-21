// ===== GESTÃO DE EQUIPE — com Firestore =====
import { DB } from './firebase.js';

// ===== ESTADO GESTÃO =====
let calMes = new Date().getMonth();
let calAno = new Date().getFullYear();

// Dados carregados via Firestore (populados por auth.js no login)
window.agendamentos = window.agendamentos || [];
window.funcionarios = window.funcionarios || [];
window.relatorios   = window.relatorios   || [];

// Atalhos para evitar quebrar código existente
Object.defineProperty(window, 'agendamentos', {
  get() { return this._agendamentos || []; },
  set(v) { this._agendamentos = v; }
});
Object.defineProperty(window, 'funcionarios', {
  get() { return this._funcionarios || []; },
  set(v) { this._funcionarios = v; }
});
Object.defineProperty(window, 'relatorios', {
  get() { return this._relatorios || []; },
  set(v) { this._relatorios = v; }
});

// ===== SUBABAS GESTÃO =====
function mudarSubAba(sub, btn) {
  document.querySelectorAll('.gestao-sub-aba').forEach(a => a.classList.remove('ativo'));
  document.querySelectorAll('.gestao-sub-tab').forEach(b => b.classList.remove('ativo'));
  document.getElementById('sub-' + sub).classList.add('ativo');
  btn.classList.add('ativo');
  if (sub === 'calendario')  renderizarCalendario();
  if (sub === 'funcionarios') renderizarFuncionarios();
  if (sub === 'relatorios')  renderizarRelatorios();
  if (sub === 'insumos')     { popularSelectFuncionariosIns?.(); renderizarInsumos?.(); }
  if (sub === 'obras')       renderizarObras?.();
}

// ========== CALENDÁRIO ==========
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function renderizarCalendario() {
  document.getElementById('cal-mes-label').textContent = `${MESES[calMes]} ${calAno}`;
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  DIAS_SEMANA.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-dia-semana';
    el.textContent = d;
    grid.appendChild(el);
  });

  const primeiroDia = new Date(calAno, calMes, 1).getDay();
  const totalDias = new Date(calAno, calMes + 1, 0).getDate();
  const hoje = new Date();

  for (let i = 0; i < primeiroDia; i++) {
    const el = document.createElement('div');
    el.className = 'cal-celula vazia';
    grid.appendChild(el);
  }

  for (let dia = 1; dia <= totalDias; dia++) {
    const el = document.createElement('div');
    el.className = 'cal-celula';
    const dataStr = `${calAno}-${String(calMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    if (dia === hoje.getDate() && calMes === hoje.getMonth() && calAno === hoje.getFullYear()) {
      el.classList.add('hoje');
    }

    const eventos = getEventosDia(dataStr);
    const relDia  = relatorios.filter(r => r.data === dataStr);
    const insDia  = (window.insumos || []).filter(i => i.data === dataStr);

    el.innerHTML = `<span class="cal-num">${dia}</span>`;

    eventos.slice(0, 2).forEach(ev => {
      const badge = document.createElement('div');
      badge.className = 'cal-evento agendamento';
      badge.textContent = ev.cliente || ev.titulo;
      el.appendChild(badge);
    });
    if (eventos.length > 2) {
      const more = document.createElement('div');
      more.className = 'cal-mais';
      more.textContent = `+${eventos.length - 2}`;
      el.appendChild(more);
    }

    relDia.slice(0, 1).forEach(rel => {
      const badge = document.createElement('div');
      badge.className = 'cal-evento relatorio';
      badge.textContent = rel.obra;
      el.appendChild(badge);
    });

    insDia.slice(0, 1).forEach(ins => {
      const badge = document.createElement('div');
      badge.className = 'cal-evento insumo';
      badge.textContent = ins.descricao || ins.tipo;
      el.appendChild(badge);
    });

    el.addEventListener('click', () => abrirDiaDetalhe(dataStr, dia));
    grid.appendChild(el);
  }
}

function getEventosDia(dataStr) {
  return agendamentos.filter(a => a.data === dataStr);
}

function calAnterior() {
  calMes--;
  if (calMes < 0) { calMes = 11; calAno--; }
  renderizarCalendario();
}

function calProximo() {
  calMes++;
  if (calMes > 11) { calMes = 0; calAno++; }
  renderizarCalendario();
}

function calHoje() {
  const hoje = new Date();
  calMes = hoje.getMonth();
  calAno = hoje.getFullYear();
  renderizarCalendario();
}

function abrirDiaDetalhe(dataStr, dia) {
  const eventos = getEventosDia(dataStr);
  const rels = relatorios.filter(r => r.data === dataStr);
  const ins  = (window.insumos || []).filter(i => i.data === dataStr);

  let html = `<div class="detalhe-data-titulo">${dia} de ${MESES[calMes]}, ${calAno}</div>`;

  if (eventos.length === 0 && rels.length === 0 && ins.length === 0) {
    html += `<p class="detalhe-vazio">Nenhum evento neste dia.</p>`;
  }

  if (eventos.length > 0) {
    html += `<div class="detalhe-secao-label">Agendamentos</div>`;
    eventos.forEach(ev => {
      html += `<div class="detalhe-item agend">
        <div class="detalhe-item-titulo">📅 ${ev.cliente}</div>
        <div class="detalhe-item-meta">${ev.local || ''}</div>
        ${ev.obs ? `<div class="detalhe-item-obs">${ev.obs}</div>` : ''}
        <button class="btn-mini excluir" onclick="excluirAgendamento('${ev.id}')">Excluir</button>
      </div>`;
    });
  }

  if (rels.length > 0) {
    html += `<div class="detalhe-secao-label">Relatórios de Obra</div>`;
    rels.forEach(rel => {
      const nomesFunc = rel.funcionariosNomes || funcionarios.find(f => f.id === rel.funcionarioId)?.nome || rel.funcionarioNome || '-';
      html += `<div class="detalhe-item relat">
        <div class="detalhe-item-titulo">🔧 ${rel.obra}</div>
        <div class="detalhe-item-meta">Funcionário(s): ${nomesFunc}</div>
        <div class="detalhe-item-meta">Rendimento: <strong>${formatarMoeda(rel.rendimento)}</strong></div>
        ${rel.obs ? `<div class="detalhe-item-obs">${rel.obs}</div>` : ''}
        <button class="btn-mini excluir" onclick="excluirRelatorio('${rel.id}')">Excluir</button>
      </div>`;
    });
  }

  if (ins.length > 0) {
    const TIPO_LABELS = { veiculo: 'Veículo', trajeto: 'Trajeto', material: 'Material', ferramenta: 'Ferramenta' };
    html += `<div class="detalhe-secao-label">Insumos / Despesas</div>`;
    ins.forEach(i => {
      const func = funcionarios.find(f => f.id === i.funcionarioId);
      html += `<div class="detalhe-item" style="border-left-color:#7c5cbf;">
        <div class="detalhe-item-titulo">🧾 ${i.descricao || TIPO_LABELS[i.tipo] || i.tipo}</div>
        <div class="detalhe-item-meta">Tipo: ${TIPO_LABELS[i.tipo] || i.tipo}${func ? ' · ' + func.nome : ''}</div>
        <div class="detalhe-item-meta">Valor: <strong>${formatarMoeda(i.valor)}</strong></div>
        ${i.obs ? `<div class="detalhe-item-obs">${i.obs}</div>` : ''}
        <button class="btn-mini excluir" onclick="excluirInsumo('${i.id}')">Excluir</button>
      </div>`;
    });
  }

  document.getElementById('detalhe-corpo').innerHTML = html;
  document.getElementById('modal-detalhe-dia').classList.add('aberto');
}

function fecharDetalheDia() {
  document.getElementById('modal-detalhe-dia').classList.remove('aberto');
}

// ===== AGENDAMENTOS =====
async function excluirAgendamento(id) {
  try {
    await DB.excluirAgendamento(id);
    agendamentos = agendamentos.filter(a => a.id !== id);
    mostrarToast('Agendamento removido.', '');
    fecharDetalheDia();
    renderizarCalendario();
  } catch {
    mostrarToast('Erro ao excluir agendamento.', 'erro');
  }
}

async function excluirRelatorio(id) {
  try {
    await DB.excluirRelatorio(id);
    relatorios = relatorios.filter(r => r.id !== id);
    mostrarToast('Relatório removido.', '');
    fecharDetalheDia();
    renderizarCalendario();
    renderizarRelatorios();
  } catch {
    mostrarToast('Erro ao excluir relatório.', 'erro');
  }
}

// ===== MODAL NOVO AGENDAMENTO =====
function abrirModalAgendamento() {
  popularSelectFuncionariosAgend();
  document.getElementById('agend-id-edit').value = '';
  document.getElementById('agend-cliente').value = '';
  document.getElementById('agend-data').value = new Date().toISOString().split('T')[0];
  document.getElementById('agend-local').value = '';
  document.getElementById('agend-obs').value = '';
  document.getElementById('modal-agendamento').classList.add('aberto');
}

function fecharModalAgendamento() {
  document.getElementById('modal-agendamento').classList.remove('aberto');
}

function popularSelectFuncionariosAgend() {
  const sel = document.getElementById('agend-funcionario');
  sel.innerHTML = '<option value="">Selecione (opcional)</option>';
  funcionarios.forEach(f => {
    sel.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
  });
}

async function salvarAgendamento() {
  const cliente = document.getElementById('agend-cliente').value.trim();
  const data    = document.getElementById('agend-data').value;
  const local   = document.getElementById('agend-local').value.trim();
  const obs     = document.getElementById('agend-obs').value.trim();
  const funcId  = document.getElementById('agend-funcionario').value;
  const idEdit  = document.getElementById('agend-id-edit').value;

  if (!cliente || !data) {
    mostrarToast('Informe cliente e data.', 'erro');
    return;
  }

  const dados = { cliente, data, local, obs, funcionarioId: funcId };

  try {
    if (idEdit) {
      await DB.salvarAgendamento(dados, idEdit);
      const idx = agendamentos.findIndex(a => a.id === idEdit);
      if (idx >= 0) agendamentos[idx] = { ...agendamentos[idx], ...dados };
      mostrarToast('Agendamento atualizado!', 'sucesso');
    } else {
      const newId = await DB.salvarAgendamento(dados);
      agendamentos.push({ id: newId, ...dados });
      mostrarToast('Agendamento salvo!', 'sucesso');
    }
    fecharModalAgendamento();
    renderizarCalendario();
  } catch {
    mostrarToast('Erro ao salvar agendamento.', 'erro');
  }
}

// ===== FUNCIONÁRIOS =====
function renderizarFuncionarios() {
  const cont = document.getElementById('func-lista');
  if (funcionarios.length === 0) {
    cont.innerHTML = `<div class="hist-vazio"><div class="icone">👷</div><p>Nenhum funcionário cadastrado.</p></div>`;
    return;
  }

  cont.innerHTML = funcionarios.map(f => {
    const admFmt = f.admissao ? new Date(f.admissao + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
    return `<div class="func-card">
      <div>
        <div class="func-card-nome">${f.nome}</div>
        <div class="func-card-meta">
          <span class="func-tipo-badge">${f.tipoSalario || 'Custo Mensal'}</span>
          ${f.salario ? `${formatarMoeda(f.salario)}` : ''}
        </div>
        <div class="func-card-meta">📅 Admissão: ${admFmt}</div>
        ${f.telefone ? `<div class="func-card-meta">📱 ${f.telefone}</div>` : ''}
      </div>
      <div class="func-card-acoes">
        <button class="btn-mini editar" onclick="editarFuncionario('${f.id}')">Editar</button>
        <button class="btn-mini excluir" onclick="confirmarExcluirFuncionario('${f.id}')">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

function abrirModalFuncionario(id = null) {
  const form = document.getElementById('modal-funcionario');
  document.getElementById('modal-func-titulo').textContent = id ? 'Editar Funcionário' : 'Novo Funcionário';
  document.getElementById('func-id-edit').value = id || '';
  document.getElementById('func-nome').value = '';
  document.getElementById('func-admissao').value = '';
  document.getElementById('func-salario').value = '';
  document.getElementById('func-tipo-salario').value = 'Custo Mensal';
  document.getElementById('func-telefone').value = '';

  if (id) {
    const f = funcionarios.find(x => x.id === id);
    if (f) {
      document.getElementById('func-nome').value = f.nome;
      document.getElementById('func-admissao').value = f.admissao || '';
      document.getElementById('func-salario').value = f.salario || '';
      document.getElementById('func-tipo-salario').value = f.tipoSalario || 'Custo Mensal';
      document.getElementById('func-telefone').value = f.telefone || '';
    }
  }
  form.classList.add('aberto');
}

function fecharModalFuncionario() {
  document.getElementById('modal-funcionario').classList.remove('aberto');
}

function editarFuncionario(id) { abrirModalFuncionario(id); }

async function salvarFuncionario() {
  const nome       = document.getElementById('func-nome').value.trim();
  const admissao   = document.getElementById('func-admissao').value;
  const salario    = parseFloat(document.getElementById('func-salario').value) || 0;
  const tipoSalario = document.getElementById('func-tipo-salario').value;
  const telefone   = document.getElementById('func-telefone').value.trim();
  const idEdit     = document.getElementById('func-id-edit').value;

  if (!nome) { mostrarToast('Informe o nome do funcionário.', 'erro'); return; }

  const dados = { nome, admissao, salario, tipoSalario, telefone };

  try {
    if (idEdit) {
      await DB.salvarFuncionario(dados, idEdit);
      const idx = funcionarios.findIndex(f => f.id === idEdit);
      if (idx >= 0) funcionarios[idx] = { ...funcionarios[idx], ...dados };
      mostrarToast('Funcionário atualizado!', 'sucesso');
    } else {
      const newId = await DB.salvarFuncionario(dados);
      funcionarios.push({ id: newId, ...dados });
      mostrarToast('Funcionário cadastrado!', 'sucesso');
    }
    fecharModalFuncionario();
    renderizarFuncionarios();
    popularSelectFuncionariosRel();
  } catch {
    mostrarToast('Erro ao salvar funcionário.', 'erro');
  }
}

function confirmarExcluirFuncionario(id) {
  const f = funcionarios.find(x => x.id === id);
  abrirModal('Excluir Funcionário', `Excluir "${f?.nome}"? Esta ação não pode ser desfeita.`, async () => {
    try {
      await DB.excluirFuncionario(id);
      funcionarios = funcionarios.filter(x => x.id !== id);
      renderizarFuncionarios();
      popularSelectFuncionariosRel();
      mostrarToast('Funcionário removido.', '');
    } catch {
      mostrarToast('Erro ao excluir funcionário.', 'erro');
    }
  });
}

// ===== RELATÓRIOS =====
function renderizarRelatorios() {
  aplicarFiltrosRelatorio();
}

function aplicarFiltrosRelatorio() {
  const filtroFunc = document.getElementById('filtro-rel-func')?.value || '';
  const filtroMes  = document.getElementById('filtro-rel-mes')?.value  || '';
  const filtroDia  = document.getElementById('filtro-rel-dia')?.value  || '';

  let lista = [...relatorios];
  if (filtroFunc) lista = lista.filter(r => r.funcionarioId === filtroFunc);
  if (filtroMes)  lista = lista.filter(r => r.data && r.data.startsWith(filtroMes));
  if (filtroDia)  lista = lista.filter(r => r.data === filtroDia);

  lista.sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  const cont = document.getElementById('rel-lista');
  if (lista.length === 0) {
    cont.innerHTML = `<div class="hist-vazio"><div class="icone">📋</div><p>Nenhum relatório encontrado.</p></div>`;
    return;
  }

  cont.innerHTML = lista.map(rel => {
    const nomesFunc = rel.funcionariosNomes || funcionarios.find(f => f.id === rel.funcionarioId)?.nome || rel.funcionarioNome || '-';
    const dataFmt = rel.data ? new Date(rel.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
    return `<div class="rel-card">
      <div class="rel-card-header">
        <div class="rel-card-info">
          <div class="rel-card-obra">${rel.obra}</div>
          <div class="rel-card-meta">📅 ${dataFmt}</div>
          <div class="rel-card-meta">👷 ${nomesFunc}</div>
          ${rel.obs ? `<div class="rel-card-obs">${rel.obs}</div>` : ''}
        </div>
        <div class="rel-card-valor">
          <div class="rel-card-valor-label">Rendimento</div>
          <div class="rel-card-valor-num">${formatarMoeda(rel.rendimento)}</div>
        </div>
      </div>
      <div class="rel-card-acoes">
        <button class="btn-mini editar" onclick="editarRelatorio('${rel.id}')">Editar</button>
        <button class="btn-mini excluir" onclick="confirmarExcluirRelatorio('${rel.id}')">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

function popularSelectFuncionariosRel() {
  ['rel-funcionario', 'filtro-rel-func', 'agend-funcionario'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const atual = sel.value;
    if (selId === 'filtro-rel-func') {
      sel.innerHTML = '<option value="">Todos os funcionários</option>';
    } else if (selId === 'agend-funcionario') {
      sel.innerHTML = '<option value="">Selecione (opcional)</option>';
    } else {
      sel.innerHTML = '<option value="">Selecione o funcionário</option>';
    }
    funcionarios.forEach(f => {
      sel.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
    });
    if (atual) sel.value = atual;
  });
}

function abrirModalRelatorio(id = null) {
  popularSelectFuncionariosRel();
  document.getElementById('rel-id-edit').value = id || '';
  document.getElementById('rel-obra').value = '';
  document.getElementById('rel-data').value = new Date().toISOString().split('T')[0];
  document.getElementById('rel-funcionario').value = '';
  document.getElementById('rel-rendimento').value = '';
  document.getElementById('rel-obs').value = '';
  document.getElementById('modal-rel-titulo').textContent = id ? 'Editar Relatório' : 'Novo Relatório de Obra';

  if (id) {
    const rel = relatorios.find(r => r.id === id);
    if (rel) {
      document.getElementById('rel-obra').value = rel.obra;
      document.getElementById('rel-data').value = rel.data || '';
      document.getElementById('rel-funcionario').value = rel.funcionarioId || '';
      document.getElementById('rel-rendimento').value = rel.rendimento || '';
      document.getElementById('rel-obs').value = rel.obs || '';
    }
  }
  document.getElementById('modal-relatorio').classList.add('aberto');
}

function fecharModalRelatorio() {
  document.getElementById('modal-relatorio').classList.remove('aberto');
}

function editarRelatorio(id) { abrirModalRelatorio(id); }

async function salvarRelatorio() {
  const obra       = document.getElementById('rel-obra').value.trim();
  const data       = document.getElementById('rel-data').value;
  const funcId     = document.getElementById('rel-funcionario').value;
  const rendimento = parseFloat(document.getElementById('rel-rendimento').value) || 0;
  const obs        = document.getElementById('rel-obs').value.trim();
  const idEdit     = document.getElementById('rel-id-edit').value;

  if (!obra || !data) { mostrarToast('Preencha obra e data.', 'erro'); return; }

  const func = funcionarios.find(f => f.id === funcId);
  const dados = { obra, data, funcionarioId: funcId, funcionarioNome: func?.nome || '', rendimento, obs };

  try {
    if (idEdit) {
      await DB.salvarRelatorio(dados, idEdit);
      const idx = relatorios.findIndex(r => r.id === idEdit);
      if (idx >= 0) relatorios[idx] = { ...relatorios[idx], ...dados };
      mostrarToast('Relatório atualizado!', 'sucesso');
    } else {
      const newId = await DB.salvarRelatorio(dados);
      relatorios.push({ id: newId, ...dados, criadoEm: new Date().toISOString() });
      mostrarToast('Relatório salvo!', 'sucesso');
    }
    fecharModalRelatorio();
    renderizarRelatorios();
    renderizarCalendario();
  } catch {
    mostrarToast('Erro ao salvar relatório.', 'erro');
  }
}

function confirmarExcluirRelatorio(id) {
  const rel = relatorios.find(r => r.id === id);
  abrirModal('Excluir Relatório', `Excluir relatório "${rel?.obra}"?`, async () => {
    try {
      await DB.excluirRelatorio(id);
      relatorios = relatorios.filter(r => r.id !== id);
      renderizarRelatorios();
      renderizarCalendario();
      mostrarToast('Relatório excluído.', '');
    } catch {
      mostrarToast('Erro ao excluir relatório.', 'erro');
    }
  });
}

function limparFiltrosRel() {
  document.getElementById('filtro-rel-func').value = '';
  document.getElementById('filtro-rel-mes').value = '';
  document.getElementById('filtro-rel-dia').value = '';
  aplicarFiltrosRelatorio();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  popularSelectFuncionariosRel();
  renderizarCalendario();
});

// Exportar funções para escopo global (usadas via onclick no HTML)
Object.assign(window, {
  mudarSubAba, renderizarCalendario, calAnterior, calProximo, calHoje,
  abrirDiaDetalhe, fecharDetalheDia, excluirAgendamento,
  abrirModalAgendamento, fecharModalAgendamento, salvarAgendamento,
  renderizarFuncionarios, abrirModalFuncionario, fecharModalFuncionario,
  editarFuncionario, salvarFuncionario, confirmarExcluirFuncionario,
  renderizarRelatorios, aplicarFiltrosRelatorio, popularSelectFuncionariosRel,
  abrirModalRelatorio, fecharModalRelatorio, editarRelatorio,
  salvarRelatorio, confirmarExcluirRelatorio, excluirRelatorio, limparFiltrosRel,
  getEventosDia
});
