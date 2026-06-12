// COTOU — UI primitives
// Depends on React (global), uses CSS classes from styles.css

const { useState, useEffect, useRef, useCallback } = React;

/* =========================================================
   Button
   ========================================================= */
function Button({ variant = 'secondary', size, icon, iconRight, children, className = '', ...props }) {
  const cls = ['btn', `btn-${variant}`, size && `btn-${size}`, className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...props}>
      {icon && <i className={`bi ${icon}`}></i>}
      {children}
      {iconRight && <i className={`bi ${iconRight}`}></i>}
    </button>
  );
}

/* =========================================================
   Badge / StatusBadge
   ========================================================= */
function Badge({ children, className = '', icon }) {
  return (
    <span className={`badge ${className}`}>
      {icon && <i className={`bi ${icon}`} style={{ fontSize: 11 }}></i>}
      {children}
    </span>
  );
}
function StatusBadge({ status }) {
  const meta = window.STATUS_META[status];
  if (!meta) return null;
  return (
    <span className={`badge badge-${status}`}>
      <span className="dot-sm"></span>
      {meta.label}
    </span>
  );
}
function RoleBadge({ role }) {
  const meta = window.ROLE_META[role];
  if (!meta) return null;
  return (
    <span className={`badge badge-role-${role}`}>
      <i className={`bi ${meta.icon}`} style={{ fontSize: 10 }}></i>
      {meta.label}
    </span>
  );
}

/* =========================================================
   Plate
   ========================================================= */
function Plate({ value }) {
  if (!value) return <span className="faint">—</span>;
  return <span className="plate">{String(value).toUpperCase()}</span>;
}

/* =========================================================
   Field
   ========================================================= */
function Field({ label, hint, children, error }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-hint" style={{ color: '#dc2626' }}>{error}</span>}
    </label>
  );
}

/* =========================================================
   Modal
   ========================================================= */
function Modal({ open, onClose, title, icon, children, footer, size }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal${size === 'lg' ? ' modal-lg' : size === 'md' ? ' modal-md' : ''}`} onClick={e => e.stopPropagation()}>
        {title && (
          <div className="modal-head">
            {icon && <i className={`bi ${icon}`} style={{ fontSize: 18, color: 'var(--text-muted)' }}></i>}
            <h3>{title}</h3>
            <button className="icon-btn" onClick={onClose} style={{ marginLeft: 'auto' }}>
              <i className="bi bi-x-lg" style={{ fontSize: 14 }}></i>
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* =========================================================
   Toasts
   ========================================================= */
function Toasts() {
  const { state, dispatch } = useStore();
  useEffect(() => {
    const timers = state.toasts.map(t =>
      setTimeout(() => dispatch({ type: 'dismiss_toast', id: t.id }), t.duration || 3200)
    );
    return () => timers.forEach(clearTimeout);
  }, [state.toasts]);
  if (!state.toasts.length) return null;
  const iconMap = { success: 'bi-check-circle-fill', error: 'bi-exclamation-circle-fill', info: 'bi-bell-fill' };
  const colorMap = { success: '#16a34a', error: '#dc2626', info: 'var(--brand)' };
  return (
    <div className="toast-host">
      {state.toasts.map(t => (
        <div
          key={t.id}
          className={`toast ${t.type}${t.quotationId ? ' toast-clickable' : ''}`}
          onClick={() => {
            if (t.quotationId) {
              dispatch({ type: 'navigate', name: 'quotation-detail', params: { id: t.quotationId } });
              dispatch({ type: 'dismiss_toast', id: t.id });
            }
          }}
        >
          <i className={`bi ${iconMap[t.type] || 'bi-info-circle-fill'}`} style={{ color: colorMap[t.type] || 'var(--text-muted)' }}></i>
          <div className="toast-body">
            <div className="toast-title">{t.message}</div>
            {t.detail && <div className="toast-detail">{t.detail}</div>}
            {t.quotationId && <span className="toast-action">Ver cotação →</span>}
          </div>
          <button className="toast-close" title="Fechar" onClick={e => { e.stopPropagation(); dispatch({ type: 'dismiss_toast', id: t.id }); }}>
            <i className="bi bi-x"></i>
          </button>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   Guided Tour
   ========================================================= */

const TOUR_STEPS = {
  vendas: [
    { navigate: 'dashboard',     target: 'dashboard',     title: 'Bem-vindo ao COTOU!',      icon: 'bi-grid',           desc: 'Esta é sua central de comando. Veja em tempo real: cotações abertas, em andamento, respondidas por compras e aguardando aprovação do cliente.' },
    { navigate: 'dashboard',     target: 'notif-bell',    title: 'Notificações',              icon: 'bi-bell',           desc: 'O sino acende quando compras responde uma cotação. Clique para ver os alertas e ir direto para o orçamento pronto — nunca perca uma resposta.' },
    { navigate: 'new-quotation', target: 'new-quotation', title: 'Abrir nova cotação',        icon: 'bi-plus-square',    desc: 'Clique aqui para iniciar uma cotação. O sistema notifica o time de compras automaticamente e acompanha todo o processo até a entrega da peça.' },
    { navigate: 'new-quotation', target: 'form-stepper',  title: 'Fluxo em 4 etapas',        icon: 'bi-list-ol',        desc: 'Toda cotação segue 4 passos: (1) Dados do cliente, (2) Veículo, (3) Peças solicitadas, (4) Observações. Avance uma etapa de cada vez.' },
    { navigate: 'new-quotation', target: 'form-step1',    title: 'Etapa 1 — Cliente',        icon: 'bi-person',         desc: 'Preencha nome e WhatsApp com DDD. O número é essencial: ao enviar o orçamento aprovado, o app abre o WhatsApp diretamente na conversa com o cliente.' },
    { navigate: 'quotations',    target: 'quotations',    title: 'Lista de cotações',         icon: 'bi-list-ul',        desc: 'Todas as suas cotações abertas em um lugar. Cada linha mostra cliente, veículo, peças e status atual. Clique em qualquer linha para ver detalhes e ações.' },
    { navigate: 'quotations',    target: 'filter-tabs',   title: 'Filtrar por status',        icon: 'bi-funnel',         desc: 'Use as abas para focar: Pendente (aguarda compras), Em cotação (sendo trabalhada), Cotada (pronta p/ enviar ao cliente), Peça chegou (finalização).' },
    { navigate: 'customers',     target: 'customers',     title: 'Clientes',                  icon: 'bi-people',         desc: 'Histórico completo de cada cliente: todas as cotações passadas, valores e dados de contato. Clique em um nome para ver o histórico de atendimento.' },
    { navigate: 'dashboard',     target: 'wa-strip',      title: 'Seu WhatsApp',              icon: 'bi-whatsapp',       desc: 'Conecte seu WhatsApp para enviar orçamentos direto do sistema. Clique em "Conectar" e escaneie o QR Code com seu celular — leva menos de 1 minuto.' },
    { navigate: 'dashboard',     target: 'tour-help',     title: 'Pronto!',                   icon: 'bi-question-circle',desc: 'Você conhece todas as funções de vendas! Clique aqui a qualquer momento para rever este tour. Boas vendas!' },
  ],
  compras: [
    { navigate: 'dashboard',     target: 'dashboard',     title: 'Bem-vindo ao COTOU!',      icon: 'bi-grid',           desc: 'Sua visão geral: veja quantas cotações estão na fila e o gráfico de atividade dos últimos 14 dias. Ideal para organizar a prioridade do dia.' },
    { navigate: 'dashboard',     target: 'notif-bell',    title: 'Notificações',              icon: 'bi-bell',           desc: 'Quando vendas abre uma nova cotação, você recebe um alerta imediatamente. Clique para ver e ir direto para a cotação que precisa de atenção.' },
    { navigate: 'quotations',    target: 'quotations',    title: 'Fila de trabalho',          icon: 'bi-list-ul',        desc: 'Aqui ficam todas as cotações aguardando sua resposta. Veja cliente, veículo, peças solicitadas e o vendedor que abriu. Clique em qualquer linha para abrir.' },
    { navigate: 'quotations',    target: 'filter-tabs',   title: 'Aba Pendentes',             icon: 'bi-funnel',         desc: 'Fique na aba "Pendentes" para ver sua fila de trabalho. "Em cotação" mostra as que você já assumiu. As mais antigas aparecem primeiro — priorize-as.' },
    { navigate: 'quotations',    target: 'quotation-table', title: 'Assumir e preencher',     icon: 'bi-bag-check',      desc: 'Clique em uma cotação pendente → pressione "Assumir e cotar" para ficar responsável → preencha o preço unitário e prazo de entrega de cada peça.' },
    { navigate: 'suppliers',     target: 'suppliers',     title: 'Fornecedores',              icon: 'bi-truck',          desc: 'Fornecedores cadastrados com telefone para consulta rápida. Use para ligar ou enviar mensagem pedindo preço antes de preencher a cotação.' },
    { navigate: 'catalog',       target: 'catalog',       title: 'Catálogo de peças',         icon: 'bi-box-seam',       desc: 'Preços de referência das peças mais cotadas. Consulte aqui antes de responder para ter uma base de custo sem precisar ligar para o fornecedor.' },
    { navigate: 'dashboard',     target: 'wa-strip',      title: 'WhatsApp',                  icon: 'bi-whatsapp',       desc: 'Conecte seu WhatsApp para enviar a consulta de preço gerada pelo sistema direto para o fornecedor com um clique, sem copiar e colar.' },
    { navigate: 'dashboard',     target: 'tour-help',     title: 'Pronto!',                   icon: 'bi-question-circle',desc: 'Você já conhece tudo! Clique aqui para rever o tour quando quiser. Bom trabalho!' },
  ],
  admin: [
    { navigate: 'dashboard',      target: 'dashboard',          title: 'Bem-vindo ao COTOU!',      icon: 'bi-grid',           desc: 'Visão completa do sistema: todas as cotações, KPIs do dia e gráfico dos últimos 14 dias. Acompanhe o desempenho do time em tempo real.' },
    { navigate: 'dashboard',      target: 'notif-bell',         title: 'Notificações',              icon: 'bi-bell',           desc: 'Central de alertas: novas cotações, respostas de compras e aprovações de clientes. Clique para ver e navegar direto para qualquer evento.' },
    { navigate: 'admin-users',    target: 'admin-users',        title: 'Gerenciar usuários',        icon: 'bi-people',         desc: 'Cadastre e gerencie toda a equipe. Cada membro tem um papel: Vendas (abre cotações), Compras (responde preços) ou Admin (gestão total).' },
    { navigate: 'admin-users',    target: 'user-create-btn',    title: 'Criar usuário',             icon: 'bi-person-plus',    desc: 'Clique em "Novo usuário" para adicionar um membro. Defina nome de exibição, login, senha inicial e papel. O membro pode alterar a senha depois.' },
    { navigate: 'suppliers',      target: 'suppliers',          title: 'Fornecedores',              icon: 'bi-truck',          desc: 'Cadastro de fornecedores disponível para o time de compras durante a cotação. Mantenha nome, telefone e observações sempre atualizados.' },
    { navigate: 'suppliers',      target: 'supplier-create-btn',title: 'Adicionar fornecedor',      icon: 'bi-plus-circle',    desc: 'Clique em "Novo Fornecedor" para cadastrar um parceiro. O time de compras terá o contato disponível na hora de cotar, sem precisar procurar.' },
    { navigate: 'catalog',        target: 'catalog',            title: 'Catálogo de peças',         icon: 'bi-box-seam',       desc: 'Mantenha o catálogo com as peças mais cotadas e preços de referência. Isso agiliza o preenchimento e serve como guia de custo para compras.' },
    { navigate: 'admin-settings', target: 'admin-settings',     title: 'Configurações',             icon: 'bi-gear',           desc: 'Configure o sistema: edite o template da mensagem WhatsApp enviada ao cliente com o orçamento aprovado, ajustando ao estilo do seu negócio.' },
    { navigate: 'admin-settings', target: 'wa-template',        title: 'Template WhatsApp',         icon: 'bi-whatsapp',       desc: 'Escolha ou personalize o modelo de mensagem. Variáveis como [NOME DO CLIENTE], [VEÍCULO] e [LISTA DE PEÇAS] são substituídas automaticamente.' },
    { navigate: 'dashboard',      target: 'tour-help',          title: 'Tudo configurado!',         icon: 'bi-question-circle',desc: 'O sistema está pronto. Clique aqui para rever o tour a qualquer momento. Boa gestão!' },
  ],
};

function GuidedTour({ onClose }) {
  const { currentUser, dispatch } = useStore();
  const role = currentUser?.role || 'vendas';
  const steps = TOUR_STEPS[role] || TOUR_STEPS.vendas;
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState(null);
  const tooltipRef = useRef(null);

  const current = steps[step];
  const total = steps.length;

  // Navigate to the right screen, then measure the target element
  useEffect(() => {
    if (current.navigate) {
      dispatch({ type: 'navigate', name: current.navigate });
    }
    const delay = current.navigate ? 120 : 0;
    const tid = setTimeout(() => {
      function measure() {
        const el = document.querySelector(`[data-tour="${current.target}"]`);
        if (!el) { setSpot(null); return; }
        const r = el.getBoundingClientRect();
        setSpot({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
      measure();
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }, delay);
    return () => clearTimeout(tid);
  }, [step, current.target, current.navigate]);

  // Tooltip placement: sidebar → right; content area → below, flips above if near bottom
  function tooltipPos() {
    if (!spot) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
    const PAD = 16;
    const TW = 300;
    const TH = 230;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isSidebar = spot.left < 260;
    if (isSidebar) {
      const top = Math.min(Math.max(PAD, spot.top + spot.height / 2 - TH / 2), vh - TH - PAD);
      return { top, left: spot.left + spot.width + PAD };
    }
    const left = Math.min(Math.max(PAD, spot.left + spot.width / 2 - TW / 2), vw - TW - PAD);
    const belowTop = spot.top + spot.height + PAD;
    const aboveTop = spot.top - TH - PAD;
    if (belowTop + TH > vh - PAD && aboveTop > PAD) return { top: aboveTop, left };
    return { top: belowTop, left };
  }

  const pos = tooltipPos();
  const isSidebar = spot && spot.left < 260;

  const next = () => { if (step < total - 1) setStep(s => s + 1); else onClose(); };
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  return ReactDOM.createPortal(
    <>
      {/* Dark overlay — click closes */}
      <div className="tour-overlay" onClick={onClose} />

      {/* Spotlight hole */}
      {spot && (
        <div className="tour-spotlight" style={{
          top:    spot.top    - 7,
          left:   spot.left   - 7,
          width:  spot.width  + 14,
          height: spot.height + 14,
        }} />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="tour-tooltip"
        style={{ top: pos.top, left: pos.left, width: 300 }}
        onClick={e => e.stopPropagation()}
      >
        <button className="tour-close" onClick={onClose} title="Fechar tour"><i className="bi bi-x-lg"></i></button>

        <div className="tour-badge">
          <i className={`bi ${current.icon}`}></i>
          {step + 1} de {total}
        </div>
        <h3>{current.title}</h3>
        <p>{current.desc}</p>

        {/* Dots */}
        <div className="tour-dots">
          {steps.map((_, i) => (
            <button key={i} className={`tour-dot ${i === step ? 'on' : ''}`} onClick={() => setStep(i)} title={steps[i].title} />
          ))}
        </div>

        {/* Nav */}
        <div className="tour-nav">
          {step > 0
            ? <button className="btn btn-ghost btn-sm" onClick={prev} style={{ gap: 5 }}><i className="bi bi-arrow-left"></i> Anterior</button>
            : <span style={{ fontSize: 11.5, color: 'var(--text-faint)', cursor: 'pointer' }} onClick={onClose}>Pular tour</span>
          }
          <button className="btn btn-primary btn-sm" onClick={next} style={{ gap: 5 }}>
            {step < total - 1 ? <>Próximo <i className="bi bi-arrow-right"></i></> : <><i className="bi bi-check2"></i> Entendido!</>}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* =========================================================
   Empty state
   ========================================================= */
function EmptyState({ icon = 'bi-inbox', title, message, action }) {
  return (
    <div className="empty">
      <i className={`bi ${icon}`}></i>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{title}</div>
      {message && <div style={{ fontSize: 12.5, marginTop: 4 }}>{message}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

/* =========================================================
   Timeline (cotação lifecycle)
   ========================================================= */
function StatusTimeline({ quotation }) {
  if (quotation.status === 'cancelado') {
    return (
      <div className="row" style={{ padding: 12, background: 'var(--st-cancelado-bg)', borderRadius: 'var(--r-md)', color: 'var(--st-cancelado)' }}>
        <i className="bi bi-x-circle"></i>
        <span className="semibold">Cotação cancelada</span>
      </div>
    );
  }
  const order = ['pendente', 'em_cotacao', 'cotado', 'peca_chegou'];
  const currentIdx = order.indexOf(quotation.status);
  return (
    <div className="timeline">
      {order.map((s, idx) => {
        const meta = STATUS_META[s];
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={s} className={`timeline-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
            <span className="timeline-dot">
              {isDone ? <i className="bi bi-check2"></i> : <i className={`bi ${meta.icon}`}></i>}
            </span>
            <div className="timeline-label">{meta.label}</div>
            <div className="timeline-sub">
              {idx === 0 && fmt.date(quotation.created_at)}
              {idx === 1 && quotation.buyer_name && (currentIdx >= 1 ? quotation.buyer_name : '—')}
              {idx === 2 && currentIdx >= 2 && '✓'}
              {idx === 3 && currentIdx >= 3 && '✓'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   Autocomplete
   ========================================================= */
function PartAutocomplete({ value, onChange, onPick, placeholder = 'Buscar peça por nome ou código…' }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  const q = (value || '').toLowerCase().trim();
  const matches = q.length >= 1
    ? state.parts.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)).slice(0, 8)
    : [];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="input-group">
        <i className="bi bi-search input-icon"></i>
        <input
          className="input"
          value={value || ''}
          onChange={e => { onChange(e.target.value); setOpen(true); setHl(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (!open) return;
            if (e.key === 'ArrowDown') { setHl(h => Math.min(h + 1, matches.length - 1)); e.preventDefault(); }
            if (e.key === 'ArrowUp') { setHl(h => Math.max(h - 1, 0)); e.preventDefault(); }
            if (e.key === 'Enter' && matches[hl]) { onPick(matches[hl]); setOpen(false); e.preventDefault(); }
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={placeholder}
        />
      </div>
      {open && matches.length > 0 && (
        <div className="autocomplete scrollbar-thin">
          {matches.map((p, i) => (
            <div
              key={p.id}
              className={`autocomplete-item ${i === hl ? 'hl' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); onPick(p); setOpen(false); }}
              onMouseEnter={() => setHl(i)}
            >
              <i className="bi bi-gear-fill" style={{ color: 'var(--text-faint)' }}></i>
              <div style={{ flex: 1 }}>
                <div className="semibold">{p.name}</div>
                <div className="faint tiny">
                  <span className="code">{p.code}</span> · {p.category} · {fmt.brl(p.default_price)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Confirm dialog
   ========================================================= */
function ConfirmDialog({ open, onClose, title, message, confirmLabel = 'Confirmar', tone = 'primary', onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon="bi-question-circle"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{message}</div>
    </Modal>
  );
}

Object.assign(window, {
  Button, Badge, StatusBadge, RoleBadge, Plate, Field, Modal, Toasts,
  EmptyState, StatusTimeline, PartAutocomplete, ConfirmDialog, GuidedTour,
});

