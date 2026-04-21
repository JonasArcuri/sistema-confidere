// ===== ESTADO =====
import { DB } from './firebase.js';

let linhaId = 0;
let orcamentoEditandoId = null;
let descontoAplicado = 0;
let logoBase64 = null;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    const hoje = new Date();
    const validade = new Date();
    validade.setDate(hoje.getDate() + 30);
    document.getElementById('campo-data').value = hoje.toISOString().split('T')[0];
    document.getElementById('campo-validade').value = validade.toISOString().split('T')[0];
    adicionarLinha();
    adicionarLinha();
    atualizarNumeroDisplay();
});

// ===== LOGO =====
// Logo agora é salva no Firestore (via DB.salvarLogo) em vez de localStorage
function carregarLogo(event) {
    const file = event.target.files[0];
    if (!file) return;
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
        mostrarToast('Imagem muito grande. Use até 2MB.', 'erro');
        return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
        const b64 = e.target.result;
        logoBase64 = b64;
        aplicarLogoNaTela(b64);
        try {
            await DB.salvarLogo(b64);
            mostrarToast('Logotipo salvo!', 'sucesso');
        } catch {
            mostrarToast('Logo carregada (erro ao salvar no servidor).', 'erro');
        }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function aplicarLogoNaTela(src) {
    const navImg = document.getElementById('nav-logo-img');
    const navTexto = document.getElementById('nav-logo-texto');
    const navArea = document.querySelector('.nav-logo-area');
    navImg.src = src;
    navImg.style.display = 'block';
    navTexto.style.display = 'none';
    navArea.classList.add('com-logo');
    document.getElementById('btn-remover-logo').style.display = 'flex';

    const headerImg = document.getElementById('header-logo-img');
    const headerTexto = document.getElementById('header-logo-texto');
    headerImg.src = src;
    headerImg.style.display = 'block';
    headerTexto.style.display = 'none';
}

async function removerLogo() {
    logoBase64 = null;
    try { await DB.removerLogo(); } catch { /* silencioso */ }

    const navImg = document.getElementById('nav-logo-img');
    const navTexto = document.getElementById('nav-logo-texto');
    const navArea = document.querySelector('.nav-logo-area');
    navImg.src = '';
    navImg.style.display = 'none';
    navTexto.style.display = '';
    navArea.classList.remove('com-logo');
    document.getElementById('btn-remover-logo').style.display = 'none';

    const headerImg = document.getElementById('header-logo-img');
    const headerTexto = document.getElementById('header-logo-texto');
    headerImg.src = '';
    headerImg.style.display = 'none';
    headerTexto.style.display = '';

    mostrarToast('Logotipo removido.', '');
}

// ===== ABAS =====
function mudarAba(aba, btn) {
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('ativo'));
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('ativo'));
    document.getElementById('aba-' + aba).classList.add('ativo');
    btn.classList.add('ativo');
    if (aba === 'historico') renderizarHistorico();
    if (aba === 'gestao') {
        renderizarCalendario();
        popularSelectFuncionariosRel();
    }
}

// ===== NÚMERO DO ORÇAMENTO =====
function proximoNumero() {
    const hist = getHistorico();
    const nums = hist.map(o => parseInt(o.numero)).filter(n => !isNaN(n));
    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}

function atualizarNumeroDisplay() {
    const num = orcamentoEditandoId
        ? (getHistorico().find(o => o.id === orcamentoEditandoId)?.numero || proximoNumero())
        : proximoNumero();
    document.getElementById('display-numero').textContent = '#' + String(num).padStart(3, '0');
}

// ===== LINHAS DA TABELA =====
// Listas de opções
const _OPCOES_DESC = [
    'BWC(s)', 'BWC Suite', 'Lavabo(s)', 'Sacada(s)', 'Caixa d Água', 'Cisterna', 'Terraço(s)',
    'Janelas Etapa 1', 'Janelas Etapa 2', 'Piscina', 'Piscina Infantil(s)',
    'Piscina Cobertura 1', 'Piscina Cobertura 2', 'Piscina Giardinho 1', 'Piscina Giardinho 2',
    'Rampa Mezanino', 'Teto Cisterna', 'Teto Caixa Da Água', 'Laje Caixa Da Água',
    'Muro Contenção', 'Floreira(s)', 'Barrilete'
];
const _OPCOES_MATERIAL = [
    'Manta Asfáltica 4mm Anti Raiz', 'Manta Asfáltica 3mm Aluminizada', 'Manta Asfáltica 4mm TIPO 3 PP',
    'Manta Asfáltica 4mm TIPO 3 AA', 'Manta Asfáltica 3mm PP', 'Membrana Líquida', 'Poliuretano',
    'Sistema Icobit', 'Membrana Cimenticia', 'Membrana Cimenticia com Prot UV', 'Regularização Substrato',
    'Proteção Mecanica', 'Membrana Acrilica com Prot UV', 'Cintamento Perimetral', 'Cristalização', 'Tamponamento'
];

// Estado dos materiais selecionados por linha
const _materiaisSelecionados = {};
// Estado das descrições personalizadas por linha
const _descPersonalizada = {};

function _getMateriais(id) { return _materiaisSelecionados[id] || []; }
function _setMateriais(id, arr) { _materiaisSelecionados[id] = arr; }

function toggleMaterialLinha(id, valor, cb) {
    const atual = _getMateriais(id);
    if (cb.checked) {
        if (!atual.includes(valor)) atual.push(valor);
    } else {
        const idx = atual.indexOf(valor);
        if (idx >= 0) atual.splice(idx, 1);
    }
    _setMateriais(id, atual);
    _atualizarResumoDeMateriais(id);
}

function toggleMaterialManual(id, cb) {
    const inputManual = document.getElementById(`mat-manual-input-${id}`);
    if (inputManual) inputManual.style.display = cb.checked ? 'block' : 'none';
    if (!cb.checked) {
        // remover valor manual dos selecionados
        const atual = _getMateriais(id);
        const manual = inputManual?.value?.trim();
        if (manual) {
            const idx = atual.indexOf(manual);
            if (idx >= 0) atual.splice(idx, 1);
            _setMateriais(id, atual);
        }
    }
    _atualizarResumoDeMateriais(id);
}

function atualizarMaterialManual(id) {
    const inputManual = document.getElementById(`mat-manual-input-${id}`);
    const cbManual = document.getElementById(`mat-manual-cb-${id}`);
    if (!inputManual || !cbManual?.checked) return;
    const valor = inputManual.value.trim();
    // Remover valor manual anterior e adicionar novo
    const atual = _getMateriais(id).filter(v => !_OPCOES_MATERIAL.includes(v) && v !== '');
    // Retirar entradas manuais antigas — mantemos apenas as do predefinido + este novo
    const predefinidos = _getMateriais(id).filter(v => _OPCOES_MATERIAL.includes(v));
    _setMateriais(id, valor ? [...predefinidos, valor] : predefinidos);
    _atualizarResumoDeMateriais(id);
}

function _atualizarResumoDeMateriais(id) {
    const resumo = document.getElementById(`mat-resumo-${id}`);
    const lista = _getMateriais(id);
    if (resumo) resumo.textContent = lista.length > 0 ? lista.join(', ') : 'Nenhum selecionado';
}

function toggleDropdownMaterial(id) {
    const dropdown = document.getElementById(`mat-dropdown-${id}`);
    if (!dropdown) return;
    const aberto = dropdown.style.display === 'block';
    // Fechar todos os outros dropdowns abertos
    document.querySelectorAll('.mat-dropdown-panel').forEach(d => d.style.display = 'none');
    dropdown.style.display = aberto ? 'none' : 'block';
}

function toggleDropdownDesc(id) {
    const dropdown = document.getElementById(`desc-dropdown-${id}`);
    if (!dropdown) return;
    const aberto = dropdown.style.display === 'block';
    document.querySelectorAll('.desc-dropdown-panel').forEach(d => d.style.display = 'none');
    dropdown.style.display = aberto ? 'none' : 'block';
}

function selecionarDesc(id, valor) {
    _descPersonalizada[id] = valor;
    const btn = document.getElementById(`desc-btn-${id}`);
    if (btn) btn.textContent = valor;
    document.getElementById(`desc-dropdown-${id}`).style.display = 'none';
    // Esconder campo manual se selecionar predefinido
    const manual = document.getElementById(`desc-manual-${id}`);
    if (manual) manual.style.display = 'none';
}

function toggleDescManual(id) {
    const manual = document.getElementById(`desc-manual-${id}`);
    if (!manual) return;
    const visivel = manual.style.display === 'block';
    manual.style.display = visivel ? 'none' : 'block';
    document.getElementById(`desc-dropdown-${id}`).style.display = 'none';
    if (!visivel) manual.focus();
}

function atualizarDescManual(id) {
    const manual = document.getElementById(`desc-manual-${id}`);
    const btn = document.getElementById(`desc-btn-${id}`);
    if (!manual || !btn) return;
    const valor = manual.value.trim();
    _descPersonalizada[id] = valor || '';
    btn.textContent = valor || 'Selecione o serviço';
}

function getDescLinha(id) {
    return _descPersonalizada[id] || '';
}

// Fecha dropdowns ao clicar fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.desc-dropdown-wrapper') && !e.target.closest('.desc-dropdown-panel')) {
        document.querySelectorAll('.desc-dropdown-panel').forEach(d => d.style.display = 'none');
    }
    if (!e.target.closest('.mat-dropdown-wrapper') && !e.target.closest('.mat-dropdown-panel')) {
        document.querySelectorAll('.mat-dropdown-panel').forEach(d => d.style.display = 'none');
    }
});

function adicionarLinha(desc = '', area = '', material = '', custoMaterial = '', custoMao = '', total = 0) {
    linhaId++;
    const id = linhaId;
    const tbody = document.getElementById('linhas-tbody');
    const tr = document.createElement('tr');
    tr.dataset.id = id;

    const areaNum = parseFloat(area) || 0;
    const matNum = parseFloat(custoMaterial) || 0;
    const maoNum = parseFloat(custoMao) || 0;
    const initSubMat = areaNum * matNum;
    const initSubMao = areaNum * maoNum;

    // Inicializar estado de materiais — suporta string única ou array
    const matArray = Array.isArray(material)
        ? material
        : (material ? [material] : []);
    _setMateriais(id, matArray);

    // Inicializar descrição
    _descPersonalizada[id] = desc || '';

    // Separar material manual de predefinidos para restaurar checkboxes
    const matPredefinidos = matArray.filter(v => _OPCOES_MATERIAL.includes(v));
    const matManual = matArray.find(v => !_OPCOES_MATERIAL.includes(v) && v !== '') || '';

    const descPredefinida = _OPCOES_DESC.includes(desc) ? desc : '';
    const descManualVal = !_OPCOES_DESC.includes(desc) ? desc : '';

    tr.innerHTML = `
<td class="col-desc">
  <div class="desc-dropdown-wrapper" style="position:relative">
    <button type="button" id="desc-btn-${id}" class="desc-select-btn" onclick="toggleDropdownDesc(${id})">${desc || 'Selecione o serviço'}</button>
    <div id="desc-dropdown-${id}" class="desc-dropdown-panel" style="display:none;position:absolute;z-index:200;background:#fff;border:1px solid #d0ccc7;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);min-width:220px;max-height:260px;overflow-y:auto;padding:6px 0">
      ${_OPCOES_DESC.map(v => `<div class="desc-opt${v === descPredefinida ? ' selecionado' : ''}" onclick="selecionarDesc(${id},'${v.replace(/'/g, "\\'")}');calcularLinha(${id})" style="padding:7px 14px;cursor:pointer;font-size:13px">${v}</div>`).join('')}
      <div class="desc-opt" onclick="toggleDescManual(${id})" style="padding:7px 14px;cursor:pointer;font-size:13px;color:#1a3a5c;font-weight:600;border-top:1px solid #eee">✏️ Digitar manualmente...</div>
    </div>
    <input type="text" id="desc-manual-${id}" placeholder="Digite o serviço..." value="${descManualVal}" oninput="atualizarDescManual(${id});calcularLinha(${id})" style="display:${descManualVal ? 'block' : 'none'};margin-top:4px;width:100%;box-sizing:border-box;padding:5px 8px;border:1px solid #c0bdb8;border-radius:6px;font-size:13px">
  </div>
</td>
<td class="col-area">
  <input type="number" placeholder="Área m²" step="0.01" value="${area}" oninput="calcularLinha(${id})">
</td>
<td class="col-material">
  <div class="mat-dropdown-wrapper" style="position:relative">
    <button type="button" class="mat-select-btn" onclick="toggleDropdownMaterial(${id})">Selecionar materiais ▾</button>
    <div id="mat-resumo-${id}" class="mat-resumo" style="font-size:11px;color:#555;margin-top:3px;line-height:1.3">${matArray.length > 0 ? matArray.join(', ') : 'Nenhum selecionado'}</div>
    <div id="mat-dropdown-${id}" class="mat-dropdown-panel" style="display:none;position:absolute;z-index:200;background:#fff;border:1px solid #d0ccc7;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);min-width:260px;max-height:280px;overflow-y:auto;padding:8px 0">
      ${_OPCOES_MATERIAL.map(v => `
        <label class="mat-check-item" style="display:flex;align-items:center;gap:8px;padding:6px 14px;cursor:pointer;font-size:13px">
          <input type="checkbox" value="${v}" ${matPredefinidos.includes(v) ? 'checked' : ''} onchange="toggleMaterialLinha(${id},'${v.replace(/'/g, "\\'")}',this);calcularLinha(${id})">
          <span>${v}</span>
        </label>`).join('')}
      <div style="border-top:1px solid #eee;margin:4px 0"></div>
      <label class="mat-check-item" style="display:flex;align-items:center;gap:8px;padding:6px 14px;cursor:pointer;font-size:13px;color:#1a3a5c;font-weight:600">
        <input type="checkbox" id="mat-manual-cb-${id}" ${matManual ? 'checked' : ''} onchange="toggleMaterialManual(${id},this)">
        <span>✏️ Digitar manualmente</span>
      </label>
      <input type="text" id="mat-manual-input-${id}" placeholder="Digite o material..." value="${matManual}" oninput="atualizarMaterialManual(${id})" style="display:${matManual ? 'block' : 'none'};margin:2px 14px 8px;width:calc(100% - 28px);box-sizing:border-box;padding:5px 8px;border:1px solid #c0bdb8;border-radius:6px;font-size:13px">
    </div>
  </div>
</td>
<td class="col-qtd">
  <input type="number" placeholder="Material m²" step="0.01" value="${custoMaterial}" oninput="calcularLinha(${id})">
</td>
<td class="col-unit">
  <input type="number" placeholder="Mão obra m²" step="0.01" value="${custoMao}" oninput="calcularLinha(${id})">
</td>
<td class="col-subtmat">
  <span id="submat-${id}" class="subtot-mat${initSubMat > 0 ? ' ativo' : ''}">${formatarMoeda(initSubMat)}</span>
</td>
<td class="col-subtmao">
  <span id="submao-${id}" class="subtot-mao${initSubMao > 0 ? ' ativo' : ''}">${formatarMoeda(initSubMao)}</span>
</td>
<td class="col-total">
  <span id="total-${id}">${formatarMoeda(total)}</span>
</td>
<td class="col-acao">
  <button class="btn-remover" onclick="removerLinha(${id})">×</button>
</td>`;

    tbody.appendChild(tr);
}

function removerLinha(id) {
    const tr = document.querySelector(`tr[data-id="${id}"]`);
    if (tr) tr.remove();
    calcularTotais();
}

function calcularLinha(id) {
    const tr = document.querySelector(`tr[data-id="${id}"]`);
    if (!tr) return;
    const inputs = tr.querySelectorAll('input[type=number]');
    const area = parseFloat(inputs[0].value) || 0;
    const custoMat = parseFloat(inputs[1].value) || 0;
    const custoMao = parseFloat(inputs[2]?.value || 0) || 0;
    const subMat = area * custoMat;
    const subMao = area * custoMao;
    const total = subMat + subMao;

    const elSubMat = tr.querySelector(`#submat-${id}`);
    const elSubMao = tr.querySelector(`#submao-${id}`);
    if (elSubMat) { elSubMat.textContent = formatarMoeda(subMat); elSubMat.classList.toggle('ativo', subMat > 0); }
    if (elSubMao) { elSubMao.textContent = formatarMoeda(subMao); elSubMao.classList.toggle('ativo', subMao > 0); }
    tr.querySelector(`#total-${id}`).textContent = formatarMoeda(total);
    calcularTotais();
}

function calcularTotais() {
    let subtotalMaterial = 0, subtotalMaoObra = 0, totalGeral = 0;
    document.querySelectorAll('#linhas-tbody tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input[type=number]');
        const area = parseFloat(inputs[0].value) || 0;
        const material = parseFloat(inputs[1].value) || 0;
        const maoObra = parseFloat(inputs[2]?.value || 0) || 0;
        subtotalMaterial += area * material;
        subtotalMaoObra += area * maoObra;
        totalGeral += area * material + area * maoObra;
    });
    document.getElementById('disp-subtotal-material').textContent = formatarMoeda(subtotalMaterial);
    document.getElementById('disp-subtotal-mao').textContent = formatarMoeda(subtotalMaoObra);
    document.getElementById('disp-total').textContent = formatarMoeda(totalGeral);
    limparDescontoCalculo();
    return { subtotalMaterial, subtotalMaoObra, totalGeral };
}

// ===== DESCONTO =====
function toggleDesconto() { document.getElementById('form-desconto').classList.toggle('visivel'); }

function aplicarDesconto() {
    const pct = parseFloat(document.getElementById('input-desconto').value);
    if (isNaN(pct) || pct <= 0 || pct >= 100) { mostrarToast('Informe um percentual entre 0 e 100.', 'erro'); return; }
    const { totalGeral } = calcularTotais();
    descontoAplicado = pct;
    const descValor = totalGeral * pct / 100;
    const comDesc = totalGeral - descValor;
    document.getElementById('desc-cartoes').innerHTML = `
    <div class="desc-cartao" style="background:#2563a8">
      <span class="dc-label">Total com ${pct}% desconto</span>
      <span class="dc-valor">${formatarMoeda(comDesc)}</span>
      <span class="dc-economia">Economia de ${formatarMoeda(descValor)}</span>
    </div>
    <div class="desc-cartao" style="background:#e05c20">
      <span class="dc-label">Valor do desconto</span>
      <span class="dc-valor">${formatarMoeda(descValor)}</span>
      <span class="dc-economia">Sobre ${formatarMoeda(totalGeral)}</span>
    </div>`;
    document.getElementById('resultados-desconto').classList.add('visivel');
}

function limparDesconto() {
    descontoAplicado = 0;
    limparDescontoCalculo();
    document.getElementById('form-desconto').classList.remove('visivel');
    document.getElementById('input-desconto').value = '';
}

function limparDescontoCalculo() {
    descontoAplicado = 0;
    document.getElementById('resultados-desconto').classList.remove('visivel');
}

// ===== COLETA DOS DADOS =====
function coletarDados() {
    const linhas = [];
    document.querySelectorAll('#linhas-tbody tr').forEach(tr => {
        const rowId = parseInt(tr.dataset.id);
        const desc = getDescLinha(rowId);
        const area = parseFloat(tr.children[1].querySelector('input').value) || 0;
        const materialArr = _getMateriais(rowId);
        const material = materialArr.join(', ');
        const custoMaterial = parseFloat(tr.children[3].querySelector('input').value) || 0;
        const custoMao = parseFloat(tr.children[4].querySelector('input').value) || 0;
        const subtotalMaterial = area * custoMaterial;
        const subtotalMao = area * custoMao;
        const total = subtotalMaterial + subtotalMao;
        linhas.push({ desc, area, material, materialArr, custoMaterial, custoMao, subtotalMaterial, subtotalMao, total });
    });
    const subtotal = linhas.reduce((a, l) => a + l.total, 0);
    return {
        cliente: document.getElementById('campo-cliente').value,
        obra: document.getElementById('campo-obra').value,
        endereco: document.getElementById('campo-endereco').value,
        estado: document.getElementById('campo-estado').value,
        data: document.getElementById('campo-data').value,
        validade: document.getElementById('campo-validade').value,
        obs: document.getElementById('campo-obs').value,
        linhas, subtotal,
        desconto: descontoAplicado,
        totalComDesconto: descontoAplicado ? subtotal * (1 - descontoAplicado / 100) : subtotal
    };
}

// ===== HISTÓRICO — usa Firestore via window._orcamentosFirestore =====
function getHistorico() {
    return window._orcamentosFirestore || [];
}

function setHistorico(lista) {
    window._orcamentosFirestore = lista;
}

// ===== SALVAR ORÇAMENTO =====
async function salvarOrcamento() {
    const dados = coletarDados();
    if (!dados.cliente) { mostrarToast('Informe o nome do cliente.', 'erro'); return; }

    try {
        if (orcamentoEditandoId) {
            const hist = getHistorico();
            const atual = hist.find(o => o.id === orcamentoEditandoId);
            if (atual) {
                const revBase = (atual.revisoes || []).length + 1;
                if (!atual.revisoes) atual.revisoes = [];
                atual.revisoes.push({ ...atual, revisoes: undefined, savedAt: atual.savedAt });
                const revLabel = 'REV ' + numeroRomano(revBase);
                const updated = { ...dados, numero: atual.numero, savedAt: new Date().toISOString(), revisao: revLabel, revisoes: atual.revisoes };
                await DB.salvarOrcamento(updated, orcamentoEditandoId);
                const idx = hist.findIndex(o => o.id === orcamentoEditandoId);
                if (idx >= 0) hist[idx] = { id: orcamentoEditandoId, ...updated };
                setHistorico(hist);
            }
        } else {
            const num = proximoNumero();
            const novoOrc = { ...dados, numero: num, savedAt: new Date().toISOString(), revisao: null, revisoes: [] };
            const newId = await DB.salvarOrcamento(novoOrc);
            const hist = getHistorico();
            hist.push({ id: newId, ...novoOrc });
            setHistorico(hist);
        }
        mostrarToast('Orçamento salvo com sucesso!', 'sucesso');
        orcamentoEditandoId = null;
        document.getElementById('display-rev').innerHTML = '';
        atualizarNumeroDisplay();
    } catch (err) {
        console.error(err);
        mostrarToast('Erro ao salvar orçamento.', 'erro');
    }
}

function numeroRomano(n) {
    const romanos = [['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]];
    let res = '';
    for (const [r, v] of romanos) { while (n >= v) { res += r; n -= v; } }
    return res;
}

// ===== NOVO ORÇAMENTO =====
function novoOrcamento() {
    orcamentoEditandoId = null;
    document.getElementById('campo-cliente').value = '';
    document.getElementById('campo-obra').value = '';
    document.getElementById('campo-endereco').value = '';
    document.getElementById('campo-estado').value = '';
    document.getElementById('campo-obs').value = '';
    document.getElementById('display-rev').innerHTML = '';
    const hoje = new Date();
    const validade = new Date();
    validade.setDate(hoje.getDate() + 30);
    document.getElementById('campo-data').value = hoje.toISOString().split('T')[0];
    document.getElementById('campo-validade').value = validade.toISOString().split('T')[0];
    document.getElementById('linhas-tbody').innerHTML = '';
    linhaId = 0;
    adicionarLinha();
    adicionarLinha();
    limparDesconto();
    calcularTotais();
    atualizarNumeroDisplay();
    mudarAba('orcamento', document.querySelector('.nav-tab'));
}

// ===== EDITAR =====
function editarOrcamento(id) {
    const orc = getHistorico().find(o => o.id === id);
    if (!orc) return;
    orcamentoEditandoId = id;
    document.getElementById('campo-cliente').value = orc.cliente || '';
    document.getElementById('campo-obra').value = orc.obra || '';
    document.getElementById('campo-endereco').value = orc.endereco || '';
    document.getElementById('campo-estado').value = orc.estado || '';
    document.getElementById('campo-data').value = orc.data || '';
    document.getElementById('campo-validade').value = orc.validade || '';
    document.getElementById('campo-obs').value = orc.obs || '';
    document.getElementById('linhas-tbody').innerHTML = '';
    linhaId = 0;
    (orc.linhas || []).forEach(l => adicionarLinha(l.desc, l.area, l.materialArr || (l.material ? [l.material] : []), l.custoMaterial, l.custoMao, l.total));
    descontoAplicado = orc.desconto || 0;
    limparDescontoCalculo();
    calcularTotais();
    document.getElementById('display-numero').textContent = '#' + String(orc.numero).padStart(3, '0');
    const revLabel = orc.revisoes && orc.revisoes.length > 0
        ? 'REV ' + numeroRomano(orc.revisoes.length + 1) + ' (próxima ao salvar)'
        : '';
    document.getElementById('display-rev').innerHTML = revLabel ? `<div class="orca-rev-badge">${revLabel}</div>` : '';
    mudarAba('orcamento', document.querySelector('.nav-tab'));
    mostrarToast('Orçamento carregado para edição.', 'sucesso');
}

// ===== EXCLUIR =====
function confirmarExcluir(id) {
    abrirModal('Excluir Orçamento', 'Esta ação é irreversível. Deseja excluir este orçamento?', async () => {
        try {
            await DB.excluirOrcamento(id);
            setHistorico(getHistorico().filter(o => o.id !== id));
            renderizarHistorico();
            mostrarToast('Orçamento excluído.', 'erro');
        } catch {
            mostrarToast('Erro ao excluir orçamento.', 'erro');
        }
    });
}

// ===== HISTÓRICO =====
let filtroBusca = '';

function filtrarHistorico(v) {
    filtroBusca = v.toLowerCase();
    renderizarHistorico();
}

function renderizarHistorico() {
    const hist = getHistorico().slice().reverse();
    const cont = document.getElementById('hist-conteudo');
    const filtrados = filtroBusca
        ? hist.filter(o => (o.cliente || '').toLowerCase().includes(filtroBusca) || String(o.numero).includes(filtroBusca))
        : hist;
    if (filtrados.length === 0) {
        cont.innerHTML = `<div class="hist-vazio"><div class="icone">📋</div><p>Nenhum orçamento encontrado.<br>Crie seu primeiro orçamento na aba <strong>Novo Orçamento</strong>.</p></div>`;
        return;
    }
    cont.innerHTML = `<div class="hist-lista">${filtrados.map(o => renderItemHistorico(o)).join('')}</div>`;
}

function renderItemHistorico(o) {
    const nRevs = (o.revisoes || []).length;
    const dataFmt = o.data ? new Date(o.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
    const savedFmt = o.savedAt ? new Date(o.savedAt).toLocaleDateString('pt-BR') : '';
    const revBadge = o.revisao ? `<span class="hist-rev-badge">${o.revisao}</span>` : '';
    const nRevBadge = nRevs > 0 ? `<span class="hist-rev-badge" style="background:#6b6660">${nRevs} rev.</span>` : '';
    return `
    <div class="hist-item ${o.revisao ? 'rev' : ''}">
      <div class="hist-item-header">
        <div class="hist-item-info">
          <div class="hist-item-num">#${String(o.numero).padStart(3, '0')} ${revBadge} ${nRevBadge}</div>
          <div class="hist-item-cliente">${o.cliente || '(sem nome)'}</div>
          <div class="hist-item-meta">${o.obra || ''} ${o.estado ? '· ' + o.estado : ''} ${dataFmt ? '· ' + dataFmt : ''} ${savedFmt ? '· Salvo em ' + savedFmt : ''}</div>
        </div>
        <div class="hist-item-total">${formatarMoeda(o.totalComDesconto || o.subtotal || 0)}</div>
        <div class="hist-item-acoes">
          <button class="btn-mini editar" onclick="editarOrcamento('${o.id}')">✎ Editar</button>
          <button class="btn-mini excluir" onclick="confirmarExcluir('${o.id}')">× Excluir</button>
        </div>
      </div>
    </div>`;
}

// ===== UTILITÁRIOS =====
function formatarMoeda(v) {
    return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mostrarToast(msg, tipo = '') {
    const t = document.getElementById('toast');
    if (!msg) { t.classList.remove('visivel'); return; }
    t.textContent = msg;
    t.className = 'toast ' + tipo;
    t.classList.add('visivel');
    setTimeout(() => t.classList.remove('visivel'), 3200);
}

function abrirModal(titulo, msg, cb) {
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-msg').textContent = msg;
    document.getElementById('modal-confirmar').onclick = () => { cb(); fecharModal(); };
    document.getElementById('modal-overlay').classList.add('aberto');
}

function fecharModal() {
    document.getElementById('modal-overlay').classList.remove('aberto');
}

document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) fecharModal();
});

// ===== ORIENTAÇÃO DO PDF =====
let pdfOrientacao = 'portrait'; // 'portrait' | 'landscape'

function setPdfOrientacao(valor, btn) {
    pdfOrientacao = valor;
    document.querySelectorAll('.pdf-layout-btn').forEach(b => b.classList.remove('ativo'));
    if (btn) btn.classList.add('ativo');
}

// ===== PDF =====
function gerarPDF() {
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        mostrarToast('Biblioteca PDF não carregada. Recarregue a página.', 'erro');
        return;
    }
    const dados = coletarDados();
    if (!dados.cliente) { mostrarToast('Informe o nome do cliente antes de gerar o PDF.', 'erro'); return; }
    mostrarToast('Gerando PDF...', '');

    const { jsPDF: JsPDF } = window.jspdf || {};
    const Doc = JsPDF || jsPDF;
    const isLandscape = pdfOrientacao === 'landscape';
    const doc = new Doc({ unit: 'mm', format: 'a4', orientation: pdfOrientacao });

    const numDisplay = document.getElementById('display-numero').textContent;
    const dataFmt = dados.data ? new Date(dados.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
    const validFmt = dados.validade ? new Date(dados.validade + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

    const PW = isLandscape ? 297 : 210;
    const PH = isLandscape ? 210 : 297;
    const ML = 14, MR = 14, CW = PW - ML - MR;
    const C_AZUL_ESC = [26, 58, 92], C_AZUL_MED = [37, 99, 168], C_AZUL_CLA = [74, 144, 217];
    const C_AZUL_FADE = [232, 240, 250], C_LARANJA = [224, 92, 32];
    const C_BRANCO = [255, 255, 255], C_TEXTO = [26, 24, 20];
    const C_CINZA = [107, 102, 96], C_BORDA = [216, 212, 204], C_ZEBRA = [245, 247, 250];

    let y = 0;
    const HEADER_H = 28;
    doc.setFillColor(...C_AZUL_ESC);
    doc.rect(0, 0, PW, HEADER_H, 'F');

    if (logoBase64) {
        try {
            const fmt = logoBase64.startsWith('data:image/png') ? 'PNG' : logoBase64.startsWith('data:image/svg') ? 'SVG' : 'JPEG';
            doc.addImage(logoBase64, fmt === 'SVG' ? 'PNG' : fmt, ML, 5, 40, 18, undefined, 'FAST');
        } catch { _pdfLogoTexto(doc, ML, C_BRANCO, C_AZUL_CLA); }
    } else {
        _pdfLogoTexto(doc, ML, C_BRANCO, C_AZUL_CLA);
    }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C_AZUL_CLA);
    doc.text('ORÇAMENTO', PW - MR, 14, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...C_BRANCO);
    doc.text(numDisplay, PW - MR, 24, { align: 'right' });
    y = HEADER_H + 8;

    // Cliente
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C_CINZA);
    doc.text('CLIENTE', ML, y); doc.text('DATA', ML + CW * 0.55, y); doc.text('VALIDADE', ML + CW * 0.78, y);
    y += 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C_TEXTO);
    doc.text(dados.cliente || '—', ML, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(dataFmt, ML + CW * 0.55, y);
    doc.text(validFmt, ML + CW * 0.78, y);
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C_CINZA);
    if (dados.endereco) { doc.text(dados.endereco + (dados.estado ? ', ' + dados.estado : ''), ML, y); y += 5; }
    if (dados.obra) { doc.text(dados.obra, ML, y); y += 5; }
    doc.setDrawColor(...C_BORDA); doc.setLineWidth(0.3); doc.line(ML, y, ML + CW, y); y += 5;

    // Tabela — larguras responsivas por orientação
    // Paisagem tem +87mm de largura útil, distribuímos nas colunas de texto
    const COL_UNID  = 14;
    const COL_CMAT  = isLandscape ? 22 : 18;
    const COL_CMO   = isLandscape ? 22 : 18;
    const COL_TMAT  = isLandscape ? 24 : 20;
    const COL_TMAO  = isLandscape ? 24 : 20;
    const COL_FIXED = COL_UNID + COL_CMAT + COL_CMO + COL_TMAT + COL_TMAO; // colunas numéricas fixas
    const COL_FLEX  = CW - COL_FIXED; // espaço restante para desc + material
    const COL_DESC  = Math.round(COL_FLEX * 0.45);
    const COL_MAT   = COL_FLEX - COL_DESC;

    // Espaçamento interno das células
    const PAD_X  = 3.5; // padding horizontal dentro de cada célula
    const PAD_Y  = 3.5; // padding vertical (topo e base)
    const LINE_H = 5.0; // altura por linha de texto (leading)
    const HDR_H  = 10;  // altura do cabeçalho

    // Helper: quebra texto respeitando largura máxima da coluna
    function wrapText(doc, text, maxW) {
        if (!text) return ['-'];
        return doc.splitTextToSize(String(text), maxW);
    }

    // Retorna a baseline Y da primeira linha de um bloco centralizado verticalmente
    function vCenter(rowY, rowH, nLines) {
        const blockH = nLines * LINE_H;
        return rowY + (rowH - blockH) / 2 + LINE_H * 0.75;
    }

    const cols = [
        { label: 'Descrição do Serviço', w: COL_DESC, align: 'left'   },
        { label: 'm²',                   w: COL_UNID, align: 'center' },
        { label: 'Material',             w: COL_MAT,  align: 'left'   },
        { label: 'Mat./m²',              w: COL_CMAT, align: 'right'  },
        { label: 'M.O./m²',              w: COL_CMO,  align: 'right'  },
        { label: 'Total Mat.',           w: COL_TMAT, align: 'right'  },
        { label: 'Total M.O.',           w: COL_TMAO, align: 'right'  },
    ];

    // ── Cabeçalho ──
    doc.setFillColor(...C_AZUL_ESC);
    doc.rect(ML, y, CW, HDR_H, 'F');
    let cx = ML;
    cols.forEach(col => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C_BRANCO);
        const tx = col.align === 'right'  ? cx + col.w - PAD_X
                 : col.align === 'center' ? cx + col.w / 2
                 : cx + PAD_X;
        doc.text(col.label, tx, y + HDR_H / 2 + 1.5, { align: col.align });
        cx += col.w;
    });
    y += HDR_H;

    // ── Linhas da tabela ──
    const linhasFiltradas = dados.linhas.filter(l => l.desc || l.total > 0);
    if (linhasFiltradas.length === 0) {
        const emptyH = LINE_H + PAD_Y * 2;
        doc.setFillColor(...C_ZEBRA); doc.rect(ML, y, CW, emptyH, 'F');
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...C_CINZA);
        doc.text('Nenhum item adicionado', ML + PAD_X, vCenter(y, emptyH, 1));
        y += emptyH;
    } else {
        linhasFiltradas.forEach((l, i) => {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);

            // Calcular quebras de texto para colunas multiline
            const descLines = wrapText(doc, l.desc || '-', COL_DESC - PAD_X * 2);
            const areaText  = String(l.area || 0);

            // Materiais: array salvo (multi-checkbox) ou string separada por vírgula
            const matItems = (l.materialArr && l.materialArr.length > 0)
                ? l.materialArr
                : (l.material ? l.material.split(', ') : ['-']);
            const matLines = matItems.flatMap(m => wrapText(doc, m.trim(), COL_MAT - PAD_X * 2));

            // Altura da linha = bloco mais alto + padding superior + inferior
            const nLines = Math.max(descLines.length, matLines.length, 1);
            const rowH   = nLines * LINE_H + PAD_Y * 2;

            // Quebra de página antecipada
            if (y + rowH > PH - 27) { doc.addPage(); y = 14; }

            // Fundo zebrado
            doc.setFillColor(...(i % 2 === 0 ? C_ZEBRA : C_BRANCO));
            doc.rect(ML, y, CW, rowH, 'F');

            // Borda inferior
            doc.setDrawColor(...C_BORDA); doc.setLineWidth(0.25);
            doc.line(ML, y + rowH, ML + CW, y + rowH);

            // Divisores verticais entre colunas
            doc.setDrawColor(210, 205, 198); doc.setLineWidth(0.15);
            let sepX = ML;
            cols.forEach((col, ci) => {
                sepX += col.w;
                if (ci < cols.length - 1) doc.line(sepX, y + 1.5, sepX, y + rowH - 1.5);
            });

            // Baselines centralizadas verticalmente para cada bloco
            const descBase = vCenter(y, rowH, descLines.length);
            const matBase  = vCenter(y, rowH, matLines.length);
            const midY     = vCenter(y, rowH, 1); // linha única

            let ccx = ML;

            // DESC — centralizado verticalmente, texto à esquerda
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C_TEXTO);
            descLines.forEach((line, li) => {
                doc.text(line, ccx + PAD_X, descBase + li * LINE_H);
            });
            ccx += COL_DESC;

            // ÁREA — centralizado horizontal e verticalmente
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C_CINZA);
            doc.text(areaText, ccx + COL_UNID / 2, midY, { align: 'center' });
            ccx += COL_UNID;

            // MATERIAL — centralizado verticalmente, fonte levemente menor, cor azul
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(...C_AZUL_ESC);
            matLines.forEach((line, li) => {
                doc.text(line, ccx + PAD_X, matBase + li * LINE_H);
            });
            ccx += COL_MAT;

            // VALORES NUMÉRICOS — todos centralizados verticalmente, alinhados à direita
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C_TEXTO);
            doc.text(formatarMoeda(l.custoMaterial || 0), ccx + COL_CMAT - PAD_X, midY, { align: 'right' }); ccx += COL_CMAT;
            doc.text(formatarMoeda(l.custoMao      || 0), ccx + COL_CMO  - PAD_X, midY, { align: 'right' }); ccx += COL_CMO;

            doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_AZUL_ESC);
            doc.text(formatarMoeda(l.subtotalMaterial), ccx + COL_TMAT - PAD_X, midY, { align: 'right' }); ccx += COL_TMAT;
            doc.text(formatarMoeda(l.subtotalMao),      ccx + COL_TMAO - PAD_X, midY, { align: 'right' });

            doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_TEXTO);
            y += rowH;
        });
    }

    doc.setDrawColor(...C_AZUL_ESC); doc.setLineWidth(0.5); doc.line(ML, y, ML + CW, y); y += 1;
    const totais = calcularTotais();
    [
        ['Subtotal Material', totais.subtotalMaterial],
        ['Subtotal Mão de Obra', totais.subtotalMaoObra],
    ].forEach(([label, val]) => {
        if (y + 7 > PH - 27) { doc.addPage(); y = 14; }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C_CINZA);
        doc.text(label, ML + CW - COL_TMAO - 30, y + 6, { align: 'right' });
        doc.setTextColor(...C_TEXTO); doc.text(formatarMoeda(val), ML + CW - 2, y + 6, { align: 'right' }); y += 6;
    });
    y += 2;
    if (dados.desconto) {
        if (y + 7 > PH - 27) { doc.addPage(); y = 14; }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C_LARANJA);
        doc.text(`Desconto (${dados.desconto}%)`, ML + CW - COL_TMAO - 30, y + 6, { align: 'right' });
        doc.text(`- ${formatarMoeda(dados.subtotal * dados.desconto / 100)}`, ML + CW - 2, y + 6, { align: 'right' }); y += 7;
    }
    if (y + 10 > PH - 27) { doc.addPage(); y = 14; }
    doc.setFillColor(...C_AZUL_ESC); doc.rect(ML, y, CW, 12, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C_BRANCO);
    doc.text('TOTAL GERAL', ML + CW - COL_TMAO - 30, y + 8, { align: 'right' });
    doc.setFontSize(13); doc.setTextColor(...C_AZUL_CLA);
    doc.text(formatarMoeda(dados.totalComDesconto), ML + CW - 2, y + 8.5, { align: 'right' }); y += 16;

    if (dados.obs && dados.obs.trim()) {
        if (y + 16 > PH - 27) { doc.addPage(); y = 14; }
        const obsLinhas = doc.splitTextToSize(dados.obs.trim(), CW - 8);
        const obsH = Math.max(16, obsLinhas.length * 5 + 12);
        doc.setFillColor(...C_AZUL_FADE); doc.setDrawColor(...C_AZUL_MED); doc.setLineWidth(0.8);
        doc.rect(ML, y, CW, obsH, 'F');
        doc.setFillColor(...C_AZUL_MED); doc.rect(ML, y, 3, obsH, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...C_AZUL_MED);
        doc.text('OBSERVAÇÕES', ML + 6, y + 6);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(68, 68, 68);
        doc.text(obsLinhas, ML + 6, y + 12); y += obsH + 6;
    }

    if (y + 10 > PH - 22) { doc.addPage(); y = 14; }
    doc.setDrawColor(...C_BORDA); doc.setLineWidth(0.3); doc.line(ML, y, ML + CW, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C_CINZA);
    doc.text('Confidere Impermeabilizações', ML, y);
    doc.text(`Orçamento válido até ${validFmt}`, ML + CW, y, { align: 'right' });

    const nomeArq = `Orcamento_${numDisplay.replace('#', '')}_${(dados.cliente || 'cliente').replace(/\s+/g, '_')}.pdf`;
    doc.save(nomeArq);
    mostrarToast('PDF gerado com sucesso!', 'sucesso');
}

function _pdfLogoTexto(doc, ML, C_BRANCO, C_AZUL_CLA) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...C_BRANCO);
    doc.text('CONFI', ML, 16);
    doc.setTextColor(...C_AZUL_CLA);
    doc.text('DERE', ML + doc.getTextWidth('CONFI'), 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(200, 210, 225);
    doc.text('IMPERMEABILIZAÇÕES', ML, 22);
}

function truncarTexto(doc, texto, maxW) {
    if (!texto) return '';
    if (doc.getTextWidth(texto) <= maxW) return texto;
    let t = texto;
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) { t = t.slice(0, -1); }
    return t + '…';
}

// Exportar funções para uso global (onclick no HTML)
Object.assign(window, {
    mudarAba, adicionarLinha, removerLinha, calcularLinha, calcularTotais,
    toggleDesconto, aplicarDesconto, limparDesconto,
    salvarOrcamento, novoOrcamento, editarOrcamento, confirmarExcluir,
    filtrarHistorico, renderizarHistorico,
    carregarLogo, removerLogo,
    gerarPDF, setPdfOrientacao, formatarMoeda, mostrarToast, abrirModal, fecharModal,
    getHistorico, setHistorico, proximoNumero, atualizarNumeroDisplay,
    logoBase64,
    // Descrição do serviço (dropdown + manual)
    toggleDropdownDesc, selecionarDesc, toggleDescManual, atualizarDescManual, getDescLinha,
    // Material (multi-checkbox + manual)
    toggleDropdownMaterial, toggleMaterialLinha, toggleMaterialManual, atualizarMaterialManual
});

// Proxy para logoBase64 (precisa ser acessível por referência)
Object.defineProperty(window, 'logoBase64', {
    get() { return logoBase64; },
    set(v) { logoBase64 = v; },
    configurable: true
});
