// ===== GESTÃO DE EQUIPE =====

// ===== ESTADO GESTÃO =====
let calMes = new Date().getMonth();
let calAno = new Date().getFullYear();
let agendamentos = JSON.parse(localStorage.getItem('confidere_agendamentos') || '[]');
let funcionarios = JSON.parse(localStorage.getItem('confidere_funcionarios') || '[]');
let relatorios = JSON.parse(localStorage.getItem('confidere_relatorios') || '[]');

// ===== SUBABAS GESTÃO =====
function mudarSubAba(sub, btn) {
    document.querySelectorAll('.gestao-sub-aba').forEach(a => a.classList.remove('ativo'));
    document.querySelectorAll('.gestao-sub-tab').forEach(b => b.classList.remove('ativo'));
    document.getElementById('sub-' + sub).classList.add('ativo');
    btn.classList.add('ativo');
    if (sub === 'calendario') renderizarCalendario();
    if (sub === 'funcionarios') renderizarFuncionarios();
    if (sub === 'relatorios') renderizarRelatorios();
}

// ========== CALENDÁRIO ==========
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function renderizarCalendario() {
    document.getElementById('cal-mes-label').textContent = `${MESES[calMes]} ${calAno}`;
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    // Cabeçalho dias da semana
    DIAS_SEMANA.forEach(d => {
        const el = document.createElement('div');
        el.className = 'cal-dia-semana';
        el.textContent = d;
        grid.appendChild(el);
    });

    const primeiroDia = new Date(calAno, calMes, 1).getDay();
    const totalDias = new Date(calAno, calMes + 1, 0).getDate();
    const hoje = new Date();

    // Células vazias antes do primeiro dia
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
        const relDia = relatorios.filter(r => r.data === dataStr);

        el.innerHTML = `<span class="cal-num">${dia}</span>`;

        if (eventos.length > 0) {
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
        }

        if (relDia.length > 0) {
            relDia.slice(0, 1).forEach(rel => {
                const badge = document.createElement('div');
                badge.className = 'cal-evento relatorio';
                badge.textContent = rel.obra;
                el.appendChild(badge);
            });
        }

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

    let html = `<div class="detalhe-data-titulo">${dia} de ${MESES[calMes]}, ${calAno}</div>`;

    if (eventos.length === 0 && rels.length === 0) {
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
            const func = funcionarios.find(f => f.id === rel.funcionarioId);
            html += `<div class="detalhe-item relat">
                <div class="detalhe-item-titulo">🔧 ${rel.obra}</div>
                <div class="detalhe-item-meta">Funcionário: ${func ? func.nome : rel.funcionarioNome || '-'}</div>
                <div class="detalhe-item-meta">Rendimento: <strong>${formatarMoeda(rel.rendimento)}</strong></div>
                ${rel.obs ? `<div class="detalhe-item-obs">${rel.obs}</div>` : ''}
                <button class="btn-mini excluir" onclick="excluirRelatorio('${rel.id}')">Excluir</button>
            </div>`;
        });
    }

    document.getElementById('detalhe-corpo').innerHTML = html;
    document.getElementById('modal-detalhe-dia').classList.add('aberto');
}

function fecharDetalheDia() {
    document.getElementById('modal-detalhe-dia').classList.remove('aberto');
}

function excluirAgendamento(id) {
    agendamentos = agendamentos.filter(a => a.id !== id);
    localStorage.setItem('confidere_agendamentos', JSON.stringify(agendamentos));
    mostrarToast('Agendamento removido.', '');
    fecharDetalheDia();
    renderizarCalendario();
}

function excluirRelatorio(id) {
    relatorios = relatorios.filter(r => r.id !== id);
    localStorage.setItem('confidere_relatorios', JSON.stringify(relatorios));
    mostrarToast('Relatório removido.', '');
    fecharDetalheDia();
    renderizarCalendario();
    renderizarRelatorios();
}

// ===== MODAL NOVO AGENDAMENTO =====
function abrirModalAgendamento() {
    popularSelectFuncionariosAgend();
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

function salvarAgendamento() {
    const cliente = document.getElementById('agend-cliente').value.trim();
    const data = document.getElementById('agend-data').value;
    const local = document.getElementById('agend-local').value.trim();
    const obs = document.getElementById('agend-obs').value.trim();
    const funcId = document.getElementById('agend-funcionario').value;

    if (!cliente || !data) {
        mostrarToast('Preencha cliente e data.', 'erro');
        return;
    }

    const agend = {
        id: 'ag_' + Date.now(),
        cliente,
        data,
        local,
        obs,
        funcionarioId: funcId,
        criadoEm: new Date().toISOString()
    };

    agendamentos.push(agend);
    localStorage.setItem('confidere_agendamentos', JSON.stringify(agendamentos));
    fecharModalAgendamento();
    renderizarCalendario();
    mostrarToast('Agendamento salvo!', 'sucesso');
}

// ========== FUNCIONÁRIOS ==========
function renderizarFuncionarios() {
    const cont = document.getElementById('func-lista');
    if (funcionarios.length === 0) {
        cont.innerHTML = `<div class="hist-vazio"><div class="icone">👷</div><p>Nenhum funcionário cadastrado.</p></div>`;
        return;
    }
    cont.innerHTML = funcionarios.map(f => {
        const admissao = f.admissao ? new Date(f.admissao + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        return `<div class="func-card">
            <div class="func-card-info">
                <div class="func-card-nome">${f.nome}</div>
                <div class="func-card-meta">Admissão: ${admissao}</div>
                <div class="func-card-meta">
                    Salário: <strong>${formatarMoeda(f.salario)}</strong>
                    <span class="func-tipo-badge">${f.tipoSalario}</span>
                </div>
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
    document.getElementById('func-id-edit').value = id || '';
    document.getElementById('func-nome').value = '';
    document.getElementById('func-admissao').value = '';
    document.getElementById('func-salario').value = '';
    document.getElementById('func-tipo-salario').value = 'Custo Mensal';
    document.getElementById('func-telefone').value = '';
    document.getElementById('modal-func-titulo').textContent = id ? 'Editar Funcionário' : 'Novo Funcionário';

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

function editarFuncionario(id) {
    abrirModalFuncionario(id);
}

function salvarFuncionario() {
    const nome = document.getElementById('func-nome').value.trim();
    const admissao = document.getElementById('func-admissao').value;
    const salario = parseFloat(document.getElementById('func-salario').value) || 0;
    const tipoSalario = document.getElementById('func-tipo-salario').value;
    const telefone = document.getElementById('func-telefone').value.trim();
    const idEdit = document.getElementById('func-id-edit').value;

    if (!nome) { mostrarToast('Informe o nome do funcionário.', 'erro'); return; }

    if (idEdit) {
        const idx = funcionarios.findIndex(f => f.id === idEdit);
        if (idx >= 0) {
            funcionarios[idx] = { ...funcionarios[idx], nome, admissao, salario, tipoSalario, telefone };
        }
    } else {
        funcionarios.push({ id: 'f_' + Date.now(), nome, admissao, salario, tipoSalario, telefone });
    }

    localStorage.setItem('confidere_funcionarios', JSON.stringify(funcionarios));
    fecharModalFuncionario();
    renderizarFuncionarios();
    mostrarToast(idEdit ? 'Funcionário atualizado!' : 'Funcionário cadastrado!', 'sucesso');
}

function confirmarExcluirFuncionario(id) {
    const f = funcionarios.find(x => x.id === id);
    abrirModal('Excluir Funcionário', `Excluir "${f?.nome}"? Esta ação não pode ser desfeita.`, () => {
        funcionarios = funcionarios.filter(x => x.id !== id);
        localStorage.setItem('confidere_funcionarios', JSON.stringify(funcionarios));
        renderizarFuncionarios();
        mostrarToast('Funcionário removido.', '');
    });
}

// ========== RELATÓRIOS DE OBRA ==========
function renderizarRelatorios() {
    aplicarFiltrosRelatorio();
}

function aplicarFiltrosRelatorio() {
    const filtroFunc = document.getElementById('filtro-rel-func')?.value || '';
    const filtroMes = document.getElementById('filtro-rel-mes')?.value || '';
    const filtroDia = document.getElementById('filtro-rel-dia')?.value || '';

    let lista = [...relatorios];
    if (filtroFunc) lista = lista.filter(r => r.funcionarioId === filtroFunc);
    if (filtroMes) lista = lista.filter(r => r.data && r.data.startsWith(filtroMes));
    if (filtroDia) lista = lista.filter(r => r.data === filtroDia);

    lista.sort((a, b) => b.data.localeCompare(a.data));

    const cont = document.getElementById('rel-lista');
    if (lista.length === 0) {
        cont.innerHTML = `<div class="hist-vazio"><div class="icone">📋</div><p>Nenhum relatório encontrado.</p></div>`;
        return;
    }

    cont.innerHTML = lista.map(rel => {
        const func = funcionarios.find(f => f.id === rel.funcionarioId);
        const dataFmt = rel.data ? new Date(rel.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        return `<div class="rel-card">
            <div class="rel-card-header">
                <div class="rel-card-info">
                    <div class="rel-card-obra">${rel.obra}</div>
                    <div class="rel-card-meta">📅 ${dataFmt}</div>
                    <div class="rel-card-meta">👷 ${func ? func.nome : rel.funcionarioNome || '-'}</div>
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
    ['rel-funcionario', 'filtro-rel-func'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const atual = sel.value;
        if (selId === 'filtro-rel-func') {
            sel.innerHTML = '<option value="">Todos os funcionários</option>';
        } else {
            sel.innerHTML = '<option value="">Selecione o funcionário</option>';
        }
        funcionarios.forEach(f => {
            sel.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
        });
        sel.value = atual;
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

function editarRelatorio(id) {
    abrirModalRelatorio(id);
}

function salvarRelatorio() {
    const obra = document.getElementById('rel-obra').value.trim();
    const data = document.getElementById('rel-data').value;
    const funcId = document.getElementById('rel-funcionario').value;
    const rendimento = parseFloat(document.getElementById('rel-rendimento').value) || 0;
    const obs = document.getElementById('rel-obs').value.trim();
    const idEdit = document.getElementById('rel-id-edit').value;

    if (!obra || !data) { mostrarToast('Preencha obra e data.', 'erro'); return; }

    const func = funcionarios.find(f => f.id === funcId);
    const novoRel = { obra, data, funcionarioId: funcId, funcionarioNome: func?.nome || '', rendimento, obs };

    if (idEdit) {
        const idx = relatorios.findIndex(r => r.id === idEdit);
        if (idx >= 0) relatorios[idx] = { ...relatorios[idx], ...novoRel };
    } else {
        relatorios.push({ id: 'rel_' + Date.now(), ...novoRel, criadoEm: new Date().toISOString() });
    }

    localStorage.setItem('confidere_relatorios', JSON.stringify(relatorios));
    fecharModalRelatorio();
    renderizarRelatorios();
    renderizarCalendario();
    mostrarToast(idEdit ? 'Relatório atualizado!' : 'Relatório salvo!', 'sucesso');
}

function confirmarExcluirRelatorio(id) {
    const rel = relatorios.find(r => r.id === id);
    abrirModal('Excluir Relatório', `Excluir relatório "${rel?.obra}"?`, () => {
        relatorios = relatorios.filter(r => r.id !== id);
        localStorage.setItem('confidere_relatorios', JSON.stringify(relatorios));
        renderizarRelatorios();
        renderizarCalendario();
        mostrarToast('Relatório excluído.', '');
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
