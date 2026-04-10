// ===== ESTADO =====
let linhaId = 0;
let orcamentoEditandoId = null;
let descontoAplicado = 0;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    const hoje = new Date();
    const validade = new Date();
    validade.setDate(hoje.getDate() + 30);
    document.getElementById('campo-data').value = hoje.toISOString().split('T')[0];
    document.getElementById('campo-validade').value = validade.toISOString().split('T')[0];
    adicionarLinha();
    adicionarLinha();
    renderizarHistorico();
    atualizarNumeroDisplay();
});

// ===== ABAS =====
function mudarAba(aba, btn) {
    document.querySelectorAll('.aba').forEach(a => a.classList.remove('ativo'));
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('ativo'));
    document.getElementById('aba-' + aba).classList.add('ativo');
    btn.classList.add('ativo');
    if (aba === 'historico') renderizarHistorico();
}

// ===== NUMERO DO ORCAMENTO =====
function proximoNumero() {
    const hist = getHistorico();
    const nums = hist.map(o => parseInt(o.numero)).filter(n => !isNaN(n));
    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}

function atualizarNumeroDisplay() {
    const num = orcamentoEditandoId
        ? getHistorico().find(o => o.id === orcamentoEditandoId)?.numero || proximoNumero()
        : proximoNumero();
    document.getElementById('display-numero').textContent = '#' + String(num).padStart(3, '0');
}

// ===== LINHAS DA TABELA =====
function adicionarLinha(desc = '', area = '', material = '', custoMaterial = '', custoMao = '', total = 0) {
    linhaId++;
    const id = linhaId;
    const tbody = document.getElementById('linhas-tbody');
    const tr = document.createElement('tr');

    tr.dataset.id = id;

    tr.innerHTML = `
<td class="col-desc">
<select onchange="calcularLinha(${id})">
${[
            'BWC(s)',
            'Lavabo(s)',
            'Sacada(s)',
            'Piscina',
            'Terraço',
            'Laje',
            'Calha',
            'Reservatório',
            'Outro'
        ].map(v => `<option ${v === desc ? 'selected' : ''}>${v}</option>`).join('')}
</select>
</td>

<td class="col-area">
<input type="number"
placeholder="Área m²"
step="0.01"
value="${area}"
oninput="calcularLinha(${id})">
</td>

<td class="col-material">
<select onchange="calcularLinha(${id})">
<option value="">Selecione</option>
<option ${material === 'Manta Asfáltica' ? 'selected' : ''}>Manta Asfáltica</option>
<option ${material === 'Membrana Líquida' ? 'selected' : ''}>Membrana Líquida</option>
<option ${material === 'Poliuretano' ? 'selected' : ''}>Poliuretano</option>
<option ${material === 'Cristalizante' ? 'selected' : ''}>Cristalizante</option>
</select>
</td>

<td class="col-qtd">
<input type="number"
placeholder="Material m²"
step="0.01"
value="${custoMaterial}"
oninput="calcularLinha(${id})">
</td>

<td class="col-unit">
<input type="number"
placeholder="Mão obra m²"
step="0.01"
value="${custoMao}"
oninput="calcularLinha(${id})">
</td>

<td class="col-total">
<span id="total-${id}">${formatarMoeda(total)}</span>
</td>

<td class="col-acao">
<button class="btn-remover" onclick="removerLinha(${id})">×</button>
</td>
`;

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
    const custoMaterial = parseFloat(inputs[1].value) || 0;
    const custoMaoObra = parseFloat(inputs[2]?.value || 0) || 0;

    // cálculos separados
    const subtotalMaterial = area * custoMaterial;
    const subtotalMaoObra = area * custoMaoObra;

    const total = subtotalMaterial + subtotalMaoObra;

    tr.querySelector(`#total-${id}`).textContent = formatarMoeda(total);

    calcularTotais();
}

function calcularTotais() {
    let subtotalMaterial = 0;
    let subtotalMaoObra = 0;
    let totalGeral = 0;

    document.querySelectorAll('#linhas-tbody tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input[type=number]');

        const area = parseFloat(inputs[0].value) || 0;
        const material = parseFloat(inputs[1].value) || 0;
        const maoObra = parseFloat(inputs[2]?.value || 0) || 0;

        const subMat = area * material;
        const subMao = area * maoObra;

        subtotalMaterial += subMat;
        subtotalMaoObra += subMao;
        totalGeral += subMat + subMao;
    });

    // MOSTRAR NA TELA
    document.getElementById('disp-subtotal-material').textContent =
        formatarMoeda(subtotalMaterial);

    document.getElementById('disp-subtotal-mao').textContent =
        formatarMoeda(subtotalMaoObra);

    document.getElementById('disp-total').textContent =
        formatarMoeda(totalGeral);

    limparDescontoCalculo();

    return {
        subtotalMaterial,
        subtotalMaoObra,
        totalGeral
    };
}

// ===== DESCONTO =====
function toggleDesconto() {
    const form = document.getElementById('form-desconto');
    form.classList.toggle('visivel');
}

function aplicarDesconto() {
    const pct = parseFloat(document.getElementById('input-desconto').value);
    if (isNaN(pct) || pct <= 0 || pct >= 100) { mostrarToast('Informe um percentual entre 0 e 100.', 'erro'); return; }
    let subtotal = 0;
    document.querySelectorAll('#linhas-tbody tr').forEach(tr => {
        const inputs = tr.querySelectorAll('input[type=number]');
        const qtd = parseFloat(inputs[0].value) || 0;
        const unit = parseFloat(inputs[1].value) || 0;
        subtotal += qtd * unit;
    });
    descontoAplicado = pct;
    const descValor = subtotal * pct / 100;
    const comDesc = subtotal - descValor;
    const cartoes = document.getElementById('desc-cartoes');
    cartoes.innerHTML = `
    <div class="desc-cartao" style="background:#2563a8">
      <span class="dc-label">Total com ${pct}% desconto</span>
      <span class="dc-valor">${formatarMoeda(comDesc)}</span>
      <span class="dc-economia">Economia de ${formatarMoeda(descValor)}</span>
    </div>
    <div class="desc-cartao" style="background:#e05c20">
      <span class="dc-label">Valor do desconto</span>
      <span class="dc-valor">${formatarMoeda(descValor)}</span>
      <span class="dc-economia">Sobre ${formatarMoeda(subtotal)}</span>
    </div>
  `;
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
        const desc = tr.children[0].querySelector('select').value;
        const area = parseFloat(tr.children[1].querySelector('input').value) || 0;
        const material = tr.children[2].querySelector('select').value;
        const custoMaterial = parseFloat(tr.children[3].querySelector('input').value) || 0;
        const custoMao = parseFloat(tr.children[4].querySelector('input').value) || 0;

        const subtotalMaterial = area * custoMaterial;
        const subtotalMao = area * custoMao;
        const total = subtotalMaterial + subtotalMao;

        linhas.push({
            desc,
            area,
            material,
            custoMaterial,
            custoMao,
            subtotalMaterial,
            subtotalMao,
            total
        });
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

// ===== SALVAR =====
function getHistorico() {
    try { return JSON.parse(localStorage.getItem('confidere_historico') || '[]'); } catch { return []; }
}
function setHistorico(h) { localStorage.setItem('confidere_historico', JSON.stringify(h)); }

function salvarOrcamento() {
    const dados = coletarDados();
    if (!dados.cliente) { mostrarToast('Informe o nome do cliente.', 'erro'); return; }
    const hist = getHistorico();

    if (orcamentoEditandoId) {
        const idx = hist.findIndex(o => o.id === orcamentoEditandoId);
        if (idx !== -1) {
            const atual = hist[idx];
            const revBase = atual.revisoes ? atual.revisoes.length + 1 : 1;
            if (!atual.revisoes) atual.revisoes = [];
            atual.revisoes.push({ ...atual, revisoes: undefined, savedAt: atual.savedAt });
            const revLabel = 'REV ' + numeroRomano(revBase);
            hist[idx] = { ...dados, id: orcamentoEditandoId, numero: atual.numero, savedAt: new Date().toISOString(), revisao: revLabel, revisoes: atual.revisoes };
        }
    } else {
        const num = proximoNumero();
        hist.push({ ...dados, id: Date.now(), numero: num, savedAt: new Date().toISOString(), revisao: null, revisoes: [] });
    }

    setHistorico(hist);
    mostrarToast('Orçamento salvo com sucesso!', 'sucesso');
    orcamentoEditandoId = null;
    document.getElementById('display-rev').innerHTML = '';
    atualizarNumeroDisplay();
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
    const hist = getHistorico();
    const orc = hist.find(o => o.id === id);
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
    (orc.linhas || []).forEach(l =>
        adicionarLinha(
            l.desc,
            l.area,
            l.material,
            l.custoMaterial,
            l.custoMao,
            l.total
        )
    );
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
    abrirModal('Excluir Orçamento', 'Esta ação é irreversível. Deseja excluir este orçamento?', () => {
        const hist = getHistorico().filter(o => o.id !== id);
        setHistorico(hist);
        renderizarHistorico();
        mostrarToast('Orçamento excluído.', 'erro');
    });
}

// ===== HISTORICO =====
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
          <button class="btn-mini editar" onclick="editarOrcamento(${o.id})">✎ Editar</button>
          <button class="btn-mini excluir" onclick="confirmarExcluir(${o.id})">× Excluir</button>
        </div>
      </div>
    </div>`;
}

// ===== PDF — gerado programaticamente com jsPDF (sem html2canvas) =====
function gerarPDF() {
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        mostrarToast('Biblioteca PDF não carregada. Recarregue a página.', 'erro');
        return;
    }

    const dados = coletarDados();
    if (!dados.cliente) {
        mostrarToast('Informe o nome do cliente antes de gerar o PDF.', 'erro');
        return;
    }

    mostrarToast('Gerando PDF...', '');

    // Suporte a ambos os modos de importação da lib
    const { jsPDF: JsPDF } = window.jspdf || {};
    const Doc = JsPDF || jsPDF;
    const doc = new Doc({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const numDisplay = document.getElementById('display-numero').textContent;
    const dataFmt = dados.data ? new Date(dados.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
    const validFmt = dados.validade ? new Date(dados.validade + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

    // Dimensões da página
    const PW = 210; // largura A4 mm
    const ML = 14;  // margem esquerda
    const MR = 14;  // margem direita
    const CW = PW - ML - MR; // largura útil

    // Cores
    const C_AZUL_ESC = [26, 58, 92];
    const C_AZUL_MED = [37, 99, 168];
    const C_AZUL_CLA = [74, 144, 217];
    const C_AZUL_FADE = [232, 240, 250];
    const C_LARANJA = [224, 92, 32];
    const C_BRANCO = [255, 255, 255];
    const C_TEXTO = [26, 24, 20];
    const C_CINZA = [107, 102, 96];
    const C_BORDA = [216, 212, 204];
    const C_ZEBRA = [245, 247, 250];

    let y = 0; // cursor vertical

    // ── CABEÇALHO ──────────────────────────────────────────────────
    const HEADER_H = 28;
    doc.setFillColor(...C_AZUL_ESC);
    doc.rect(0, 0, PW, HEADER_H, 'F');

    // Logo "CONFIDERE"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...C_BRANCO);
    doc.text('CONFI', ML, 16);
    const confidW = doc.getTextWidth('CONFI');
    doc.setTextColor(...C_AZUL_CLA);
    doc.text('DERE', ML + confidW, 16);

    // Subtítulo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(200, 210, 225);
    doc.text('IMPERMEABILIZAÇÕES & REVESTIMENTOS', ML, 22);

    // Número do orçamento (direita)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 200, 220);
    doc.text('ORÇAMENTO', PW - MR, 11, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...C_AZUL_CLA);
    doc.text(numDisplay, PW - MR, 22, { align: 'right' });

    y = HEADER_H;

    // ── DADOS DO CLIENTE ──────────────────────────────────────────
    const INFO_H = 26;
    doc.setFillColor(...C_AZUL_FADE);
    doc.rect(0, y, PW, INFO_H, 'F');

    const campos = [
        { label: 'CLIENTE', val: dados.cliente || '—' },
        { label: 'TIPO DE OBRA', val: dados.obra || '—' },
        { label: 'LOCAL', val: [dados.endereco, dados.estado].filter(Boolean).join(', ') || '—' },
        { label: 'DATA', val: dataFmt },
        { label: 'VÁLIDO ATÉ', val: validFmt },
    ];

    const colW = CW / 3;
    campos.forEach((c, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = ML + col * colW;
        const cy = y + 7 + row * 11;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...C_AZUL_MED);
        doc.text(c.label, cx, cy);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...C_TEXTO);
        const maxW = colW - 4;
        const truncated = truncarTexto(doc, c.val, maxW);
        doc.text(truncated, cx, cy + 5);
    });

    y += INFO_H + 4;

    // ── TABELA DE ITENS ───────────────────────────────────────────
    // Cabeçalho da tabela
    const COL_DESC = 40;
    const COL_UNID = 16;
    const COL_MAT = 28;
    const COL_CMAT = 16;
    const COL_CMO = 20;
    const COL_TMAT = 30;
    const COL_TMAO = 30;
    const ROW_H = 8;

    const cols = [
        { label: 'Descrição', w: COL_DESC, align: 'left' },
        { label: 'Área m²', w: COL_UNID, align: 'center' },
        { label: 'Material', w: COL_MAT, align: 'left' },
        { label: 'Custo Material', w: COL_CMAT, align: 'right' },
        { label: 'Mão de Obra', w: COL_CMO, align: 'right' },
        { label: 'Total Material', w: COL_TMAT, align: 'right' },
        { label: 'Total Mão Obra', w: COL_TMAO, align: 'right' },
    ];

    // Fundo cabeçalho tabela
    doc.setFillColor(...C_AZUL_ESC);
    doc.rect(ML, y, CW, ROW_H, 'F');

    let cx = ML;
    cols.forEach(col => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C_BRANCO);
        const tx = col.align === 'right' ? cx + col.w - 2
            : col.align === 'center' ? cx + col.w / 2
                : cx + 2;
        doc.text(col.label, tx, y + 5.5, { align: col.align });
        cx += col.w;
    });

    y += ROW_H;

    // Linhas de dados
    const linhasFiltradas = dados.linhas.filter(l => l.desc || l.total > 0);

    if (linhasFiltradas.length === 0) {
        doc.setFillColor(...C_ZEBRA);
        doc.rect(ML, y, CW, ROW_H, 'F');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...C_CINZA);
        doc.text('Nenhum item adicionado', ML + 2, y + 5.5);
        y += ROW_H;
    } else {
        linhasFiltradas.forEach((l, i) => {
            // Verifica quebra de página
            if (y + ROW_H > 270) {
                doc.addPage();
                y = 14;
            }

            const bg = i % 2 === 0 ? C_ZEBRA : C_BRANCO;
            doc.setFillColor(...bg);
            doc.rect(ML, y, CW, ROW_H, 'F');

            // Borda inferior suave
            doc.setDrawColor(...C_BORDA);
            doc.setLineWidth(0.2);
            doc.line(ML, y + ROW_H, ML + CW, y + ROW_H);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...C_TEXTO);

            let ccx = ML;

            // DESCRIÇÃO
            const descricao = `${l.desc || '-'} - ${l.area || 0} m²`;
            doc.text(
                truncarTexto(doc, descricao, COL_DESC - 4),
                ccx + 2,
                y + 5.5
            );
            ccx += COL_DESC;

            // ÁREA m²
            doc.text(
                String(l.area || 0),
                ccx + COL_UNID / 2,
                y + 5.5,
                { align: 'center' }
            );
            ccx += COL_UNID;

            // MATERIAL
            doc.text(
                truncarTexto(doc, l.material || '-', COL_MAT - 4),
                ccx + 2,
                y + 5.5
            );
            ccx += COL_MAT;

            // CUSTO MATERIAL
            doc.text(
                formatarMoeda(l.custoMaterial || 0),
                ccx + COL_CMAT - 2,
                y + 5.5,
                { align: 'right' }
            );
            ccx += COL_CMAT;

            // MÃO DE OBRA
            doc.text(
                formatarMoeda(l.custoMao || 0),
                ccx + COL_CMO - 2,
                y + 5.5,
                { align: 'right' }
            );
            ccx += COL_CMO;

            // TOTAL MATERIAL
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...C_AZUL_ESC);

            doc.text(
                formatarMoeda(l.subtotalMaterial),
                ccx + COL_TMAT - 2,
                y + 5.5,
                { align: 'right' }
            );

            ccx += COL_TMAT;

            // TOTAL MÃO OBRA
            doc.text(
                formatarMoeda(l.subtotalMao),
                ccx + COL_TMAO - 2,
                y + 5.5,
                { align: 'right' }
            );

            // Reset
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C_TEXTO);

            // Se material existe, aumentar a altura da linha ligeiramente
            y += l.material ? ROW_H + 2 : ROW_H;
        });
    }

    // Linha separadora totais
    doc.setDrawColor(...C_AZUL_ESC);
    doc.setLineWidth(0.5);
    doc.line(ML, y, ML + CW, y);
    y += 1;

    const totais = calcularTotais();

    const subtotalMaterial = totais.subtotalMaterial;
    const subtotalMao = totais.subtotalMaoObra;
    const totalGeral = totais.totalGeral;


    // Subtotal Material
    if (y + 7 > 270) { doc.addPage(); y = 14; }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C_CINZA);

    doc.text(
        'Subtotal Material',
        ML + CW - COL_TMAO - 30,
        y + 6,
        { align: 'right' }
    );

    doc.setTextColor(...C_TEXTO);
    doc.text(
        formatarMoeda(subtotalMaterial),
        ML + CW - 2,
        y + 6,
        { align: 'right' }
    );

    y += 6;


    // Subtotal Mão de Obra
    doc.setTextColor(...C_CINZA);

    doc.text(
        'Subtotal Mão de Obra',
        ML + CW - COL_TMAO - 30,
        y + 6,
        { align: 'right' }
    );

    doc.setTextColor(...C_TEXTO);
    doc.text(
        formatarMoeda(subtotalMao),
        ML + CW - 2,
        y + 6,
        { align: 'right' }
    );

    y += 8;

    // Desconto (se houver)
    if (dados.desconto) {
        if (y + 7 > 270) { doc.addPage(); y = 14; }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...C_LARANJA);
        doc.text(`Desconto (${dados.desconto}%)`, ML + CW - COL_TMAO - 30, y + 6, { align: 'right' });
        doc.text(`- ${formatarMoeda(dados.subtotal * dados.desconto / 100)}`, ML + CW - 2, y + 6, { align: 'right' });
        y += 7;
    }

    // Total geral
    if (y + 10 > 270) { doc.addPage(); y = 14; }
    doc.setFillColor(...C_AZUL_ESC);
    doc.rect(ML, y, CW, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C_BRANCO);
    doc.text('TOTAL GERAL', ML + CW - COL_TMAO - 30, y + 8, { align: 'right' });
    doc.setFontSize(13);
    doc.setTextColor(...C_AZUL_CLA);
    doc.text(formatarMoeda(dados.totalComDesconto), ML + CW - 2, y + 8.5, { align: 'right' });
    y += 16;

    // ── OBSERVAÇÕES ───────────────────────────────────────────────
    if (dados.obs && dados.obs.trim()) {
        if (y + 16 > 270) { doc.addPage(); y = 14; }

        // Caixa de obs
        const obsLinhas = doc.splitTextToSize(dados.obs.trim(), CW - 8);
        const obsH = Math.max(16, obsLinhas.length * 5 + 12);

        doc.setFillColor(...C_AZUL_FADE);
        doc.setDrawColor(...C_AZUL_MED);
        doc.setLineWidth(0.8);

        // borda esquerda destaque
        doc.setFillColor(...C_AZUL_FADE);
        doc.rect(ML, y, CW, obsH, 'F');
        doc.setFillColor(...C_AZUL_MED);
        doc.rect(ML, y, 3, obsH, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...C_AZUL_MED);
        doc.text('OBSERVAÇÕES', ML + 6, y + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(68, 68, 68);
        doc.text(obsLinhas, ML + 6, y + 12);

        y += obsH + 6;
    }

    // ── RODAPÉ ────────────────────────────────────────────────────
    if (y + 10 > 275) { doc.addPage(); y = 14; }

    doc.setDrawColor(...C_BORDA);
    doc.setLineWidth(0.3);
    doc.line(ML, y, ML + CW, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C_CINZA);
    doc.text('Confidere Impermeabilizações', ML, y);
    doc.text(`Orçamento válido até ${validFmt}`, ML + CW, y, { align: 'right' });

    // ── SALVAR ────────────────────────────────────────────────────
    const nomeArq = `Orcamento_${numDisplay.replace('#', '')}_${(dados.cliente || 'cliente').replace(/\s+/g, '_')}.pdf`;
    doc.save(nomeArq);
    mostrarToast('PDF gerado com sucesso!', 'sucesso');
}

// Trunca texto para caber na largura máxima (em mm)
function truncarTexto(doc, texto, maxW) {
    if (!texto) return '';
    if (doc.getTextWidth(texto) <= maxW) return texto;
    let t = texto;
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) {
        t = t.slice(0, -1);
    }
    return t + '…';
}

// ===== UTILITÁRIOS =====
function formatarMoeda(v) {
    return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mostrarToast(msg, tipo = '') {
    const t = document.getElementById('toast');
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
