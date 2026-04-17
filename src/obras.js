// ===== OBRAS =====
import { DB } from './firebase.js';

// Estado global
window.obras = window.obras || [];
Object.defineProperty(window, 'obras', {
  get() { return this._obras || []; },
  set(v) { this._obras = v; }
});

// ===== FILTRO ATUAL =====
let filtroObrasStatus = 'todos'; // 'todos' | 'execucao' | 'finalizada'

// ===== RENDERIZAR OBRAS =====
function renderizarObras() {
  let lista = [...obras];
  if (filtroObrasStatus === 'execucao')  lista = lista.filter(o => o.status !== 'finalizada');
  if (filtroObrasStatus === 'finalizada') lista = lista.filter(o => o.status === 'finalizada');

  lista.sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  // Atualizar botões de filtro
  document.querySelectorAll('.obras-filtro-btn').forEach(btn => {
    btn.classList.toggle('ativo', btn.dataset.filtro === filtroObrasStatus);
  });

  const cont = document.getElementById('obras-lista');
  if (!cont) return;

  if (lista.length === 0) {
    cont.innerHTML = `<div class="hist-vazio"><div class="icone">🏗️</div><p>Nenhuma obra cadastrada.</p></div>`;
    return;
  }

  cont.innerHTML = lista.map(obra => {
    const dataFmt = obra.data ? new Date(obra.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
    const isFinali = obra.status === 'finalizada';
    return `<div class="obra-card ${isFinali ? 'finalizada' : ''}">
      <div class="obra-card-header">
        <div class="obra-card-info">
          <div class="obra-card-nome">🏗️ ${obra.nome}</div>
          <div class="obra-card-meta">🏢 ${obra.construtora || '-'}</div>
          <div class="obra-card-meta">📍 ${obra.local || '-'} · 📅 ${dataFmt}</div>
        </div>
        <div class="obra-status-badge ${isFinali ? 'finalizada' : 'execucao'}">
          ${isFinali ? 'Finalizada' : 'Em Execução'}
        </div>
      </div>
      <div class="obra-card-acoes">
        <button class="btn-mini editar" onclick="editarObra('${obra.id}')">Editar</button>
        ${isFinali
          ? `<button class="btn-mini ver" onclick="marcarObraExecucao('${obra.id}')">Reabrir</button>`
          : `<button class="btn-mini" style="background:#e8f5e9;color:#2e7d32;border:none;" onclick="marcarObraFinalizada('${obra.id}')">Finalizar</button>`
        }
        <button class="btn-mini excluir" onclick="confirmarExcluirObra('${obra.id}')">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

function setFiltroObras(status, btn) {
  filtroObrasStatus = status;
  renderizarObras();
}

// ===== MODAL OBRA =====
function abrirModalObra(id = null) {
  document.getElementById('obra-id-edit').value = id || '';
  document.getElementById('obra-nome').value = '';
  document.getElementById('obra-construtora').value = '';
  document.getElementById('obra-data').value = new Date().toISOString().split('T')[0];
  document.getElementById('obra-local').value = '';
  document.getElementById('modal-obra-titulo').textContent = id ? 'Editar Obra' : 'Adicionar Obra';

  if (id) {
    const obra = obras.find(o => o.id === id);
    if (obra) {
      document.getElementById('obra-nome').value = obra.nome || '';
      document.getElementById('obra-construtora').value = obra.construtora || '';
      document.getElementById('obra-data').value = obra.data || '';
      document.getElementById('obra-local').value = obra.local || '';
    }
  }
  document.getElementById('modal-obra').classList.add('aberto');
}

function fecharModalObra() {
  document.getElementById('modal-obra').classList.remove('aberto');
}

function editarObra(id) { abrirModalObra(id); }

async function salvarObra() {
  const nome       = document.getElementById('obra-nome').value.trim();
  const construtora = document.getElementById('obra-construtora').value.trim();
  const data       = document.getElementById('obra-data').value;
  const local      = document.getElementById('obra-local').value.trim();
  const idEdit     = document.getElementById('obra-id-edit').value;

  if (!nome) { mostrarToast('Informe o nome da obra.', 'erro'); return; }

  const dados = { nome, construtora, data, local, status: idEdit ? (obras.find(o=>o.id===idEdit)?.status || 'execucao') : 'execucao' };

  try {
    if (idEdit) {
      await DB.salvarObra(dados, idEdit);
      const idx = obras.findIndex(o => o.id === idEdit);
      if (idx >= 0) obras[idx] = { ...obras[idx], ...dados };
      mostrarToast('Obra atualizada!', 'sucesso');
    } else {
      const newId = await DB.salvarObra(dados);
      obras.push({ id: newId, ...dados });
      mostrarToast('Obra adicionada!', 'sucesso');
    }
    fecharModalObra();
    renderizarObras();
    // Atualizar select de obras no modal de relatório
    popularSelectObrasRel();
  } catch (err) {
    console.error(err);
    mostrarToast('Erro ao salvar obra.', 'erro');
  }
}

async function marcarObraFinalizada(id) {
  try {
    await DB.salvarObra({ status: 'finalizada' }, id);
    const idx = obras.findIndex(o => o.id === id);
    if (idx >= 0) obras[idx].status = 'finalizada';
    renderizarObras();
    mostrarToast('Obra marcada como finalizada.', 'sucesso');
  } catch { mostrarToast('Erro ao atualizar obra.', 'erro'); }
}

async function marcarObraExecucao(id) {
  try {
    await DB.salvarObra({ status: 'execucao' }, id);
    const idx = obras.findIndex(o => o.id === id);
    if (idx >= 0) obras[idx].status = 'execucao';
    renderizarObras();
    mostrarToast('Obra reaberta.', 'sucesso');
  } catch { mostrarToast('Erro ao atualizar obra.', 'erro'); }
}

function confirmarExcluirObra(id) {
  const obra = obras.find(o => o.id === id);
  abrirModal('Excluir Obra', `Excluir "${obra?.nome}"? Esta ação não pode ser desfeita.`, async () => {
    try {
      await DB.excluirObra(id);
      obras = obras.filter(o => o.id !== id);
      renderizarObras();
      popularSelectObrasRel();
      mostrarToast('Obra removida.', '');
    } catch { mostrarToast('Erro ao excluir obra.', 'erro'); }
  });
}

// ===== POPULAR SELECT OBRAS NO RELATÓRIO =====
function popularSelectObrasRel() {
  const sel = document.getElementById('rel-obra-select');
  if (!sel) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">Digitar manualmente...</option>';
  obras.forEach(o => {
    sel.innerHTML += `<option value="${o.id}" data-nome="${o.nome}">${o.nome}${o.construtora ? ' — ' + o.construtora : ''}</option>`;
  });
  if (atual) sel.value = atual;
  // Sincronizar com campo texto
  sincronizarObraTexto();
}

function sincronizarObraTexto() {
  const sel = document.getElementById('rel-obra-select');
  const input = document.getElementById('rel-obra');
  if (!sel || !input) return;
  sel.addEventListener('change', () => {
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.dataset.nome) {
      input.value = opt.dataset.nome;
      input.style.display = 'none';
    } else {
      input.value = '';
      input.style.display = '';
    }
  });
}

// ===== MULTI-FUNCIONÁRIOS NO RELATÓRIO =====
// Gerencia lista de funcionários selecionados para o relatório
let relFuncionariosSelected = [];

function popularCheckboxFuncionariosRel() {
  const cont = document.getElementById('rel-funcionarios-check');
  if (!cont) return;
  cont.innerHTML = '';
  if (funcionarios.length === 0) {
    cont.innerHTML = '<div style="font-size:13px;color:var(--cinza-texto)">Nenhum funcionário cadastrado.</div>';
    return;
  }
  funcionarios.forEach(f => {
    const checked = relFuncionariosSelected.includes(f.id) ? 'checked' : '';
    cont.innerHTML += `
      <label class="func-check-item">
        <input type="checkbox" value="${f.id}" ${checked} onchange="toggleFuncRel(this)">
        <span>${f.nome}</span>
      </label>`;
  });
}

function toggleFuncRel(cb) {
  if (cb.checked) {
    if (!relFuncionariosSelected.includes(cb.value)) relFuncionariosSelected.push(cb.value);
  } else {
    relFuncionariosSelected = relFuncionariosSelected.filter(id => id !== cb.value);
  }
}

// Patch: abrirModalRelatorio já existe em gestao.js, vamos estender
const _abrirModalRelatorioOriginal = window.abrirModalRelatorio;
window.abrirModalRelatorio = function(id = null) {
  relFuncionariosSelected = [];
  if (id) {
    const rel = window.relatorios?.find(r => r.id === id);
    if (rel && rel.funcionariosIds) relFuncionariosSelected = [...rel.funcionariosIds];
    else if (rel && rel.funcionarioId) relFuncionariosSelected = [rel.funcionarioId];
  }
  if (_abrirModalRelatorioOriginal) _abrirModalRelatorioOriginal(id);
  popularCheckboxFuncionariosRel();
  popularSelectObrasRel();
  // Quando obra selecionada mudar, atualizar campo texto
  const sel = document.getElementById('rel-obra-select');
  if (sel) {
    sel.onchange = () => {
      const opt = sel.options[sel.selectedIndex];
      const input = document.getElementById('rel-obra');
      if (opt && opt.dataset.nome) {
        input.value = opt.dataset.nome;
        input.style.display = 'none';
      } else {
        input.value = '';
        input.style.display = '';
      }
    };
  }
};

// Patch: salvarRelatorio para incluir multi-funcionários
const _salvarRelatorioOriginal = window.salvarRelatorio;
window.salvarRelatorio = async function() {
  // Injetar funcionariosIds antes de chamar original
  // Usamos um campo hidden para passar os IDs
  const hiddenInput = document.getElementById('rel-funcionarios-ids-hidden');
  if (hiddenInput) hiddenInput.value = JSON.stringify(relFuncionariosSelected);

  // Chamar lógica customizada diretamente
  const obra       = document.getElementById('rel-obra').value.trim();
  const data       = document.getElementById('rel-data').value;
  const rendimento = parseFloat(document.getElementById('rel-rendimento').value) || 0;
  const obs        = document.getElementById('rel-obs').value.trim();
  const idEdit     = document.getElementById('rel-id-edit').value;

  // Obra pelo select ou campo manual
  const selObra = document.getElementById('rel-obra-select');
  const obraId  = selObra?.value || '';

  if (!obra && !obraId) { mostrarToast('Preencha o nome da obra.', 'erro'); return; }
  if (!data) { mostrarToast('Informe a data.', 'erro'); return; }

  const obraFinal = obra || obras.find(o => o.id === obraId)?.nome || '';
  const funcsNomes = relFuncionariosSelected
    .map(id => funcionarios.find(f => f.id === id)?.nome)
    .filter(Boolean).join(', ');

  const dados = {
    obra: obraFinal,
    obraId,
    data,
    funcionarioId:  relFuncionariosSelected[0] || '',
    funcionarioNome: funcsNomes,
    funcionariosIds: relFuncionariosSelected,
    funcionariosNomes: funcsNomes,
    rendimento,
    obs
  };

  try {
    if (idEdit) {
      await DB.salvarRelatorio(dados, idEdit);
      const idx = window.relatorios.findIndex(r => r.id === idEdit);
      if (idx >= 0) window.relatorios[idx] = { ...window.relatorios[idx], ...dados };
      mostrarToast('Relatório atualizado!', 'sucesso');
    } else {
      const newId = await DB.salvarRelatorio(dados);
      window.relatorios.push({ id: newId, ...dados, criadoEm: new Date().toISOString() });
      mostrarToast('Relatório salvo!', 'sucesso');
    }
    window.fecharModalRelatorio?.();
    window.renderizarRelatorios?.();
    window.renderizarCalendario?.();
  } catch (err) {
    console.error(err);
    mostrarToast('Erro ao salvar relatório.', 'erro');
  }
};

// Exportar para escopo global
Object.assign(window, {
  renderizarObras, setFiltroObras,
  abrirModalObra, fecharModalObra, editarObra, salvarObra,
  marcarObraFinalizada, marcarObraExecucao, confirmarExcluirObra,
  popularSelectObrasRel, popularCheckboxFuncionariosRel, toggleFuncRel
});
