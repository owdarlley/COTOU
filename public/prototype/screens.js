// COTOU — Misc screens: Dashboard, Catalog, Notifications, Admin

const { useState, useMemo } = React;

/* =========================================================
   Dashboard
   ========================================================= */
function Dashboard() {
  const { state, dispatch, currentUser, unreadCount } = useStore();

  // Filter cotações by role
  const visible = currentUser.role === 'vendas'
    ? state.quotations.filter(q => q.created_by_user_id === currentUser.id)
    : state.quotations;

  const counts = {
    pendente: visible.filter(q => q.status === 'pendente').length,
    em_cotacao: visible.filter(q => q.status === 'em_cotacao').length,
    cotado: visible.filter(q => q.status === 'cotado').length,
    peca_chegou: visible.filter(q => q.status === 'peca_chegou').length,
    cancelado: visible.filter(q => q.status === 'cancelado').length,
  };
  const total = visible.length;
  const active = counts.pendente + counts.em_cotacao + counts.cotado;
  const revenue = visible.reduce((s, q) => s + calcTotals(q.items).grandTotal, 0);
  const approvedCount = visible.filter(q => q.customer_approved === 1).length;
  const respondedCount = visible.filter(q => ['cotado', 'peca_chegou'].includes(q.status)).length;
  const approveRate = respondedCount ? Math.round((approvedCount / respondedCount) * 100) : 0;

  // Real 14-day chart data grouped from quotations in store
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (13 - i));
      const ymd = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit' });
      const dayQ = visible.filter(q => (q.created_at || '').slice(0, 10) === ymd);
      return { label, value: dayQ.length, won: dayQ.filter(q => ['cotado', 'peca_chegou'].includes(q.status)).length };
    });
  }, [visible]);
  const maxBar = Math.max(...chartData.map(d => d.value), 1);

  // Donut for status mix
  const statusMix = [
    { k: 'pendente',    label: 'Pendentes',   value: counts.pendente,    color: 'var(--st-pendente)' },
    { k: 'em_cotacao',  label: 'Em cotação',  value: counts.em_cotacao,  color: 'var(--st-em-cotacao)' },
    { k: 'cotado',      label: 'Cotadas',     value: counts.cotado,      color: 'var(--st-cotado)' },
    { k: 'peca_chegou', label: 'Peça chegou', value: counts.peca_chegou, color: 'var(--st-peca)' },
  ].filter(s => s.value > 0);
  const mixTotal = statusMix.reduce((s, x) => s + x.value, 0) || 1;

  // Recent cotações
  const recent = [...visible].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  // Greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">{greet}, {currentUser.name.split(' ')[0]}.</h2>
          <p className="page-sub">
            {currentUser.role === 'vendas' && `Você tem ${plural(counts.pendente, 'cotação pendente', 'cotações pendentes')} e ${plural(counts.cotado, 'cotação aguardando', 'cotações aguardando')} envio ao cliente.`}
            {currentUser.role === 'compras' && `${plural(counts.pendente, 'cotação esperando', 'cotações esperando')} você assumir.`}
            {currentUser.role === 'admin' && `${plural(total, 'cotação no sistema', 'cotações no sistema')}, ${plural(active, 'ativa', 'ativas')}.`}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {(currentUser.role === 'vendas' || currentUser.role === 'admin') && (
            <Button variant="primary" icon="bi-plus-lg" onClick={() => dispatch({ type: 'navigate', name: 'new-quotation' })}>
              Nova cotação
            </Button>
          )}
        </div>
      </div>

      {/* KPI grid */}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <Stat
          label="Pendentes"
          value={counts.pendente}
          icon="bi-hourglass-split"
          color="var(--st-pendente)"
          deltaUp={counts.pendente > 0}
          deltaText={counts.pendente > 0 ? `${counts.pendente} aguardando` : 'nada pendente'}
          onClick={() => dispatch({ type: 'navigate', name: 'quotations', params: { filter: 'pendente' } })}
        />
        <Stat
          label="Em cotação"
          value={counts.em_cotacao}
          icon="bi-currency-exchange"
          color="var(--st-em-cotacao)"
          deltaText="sendo trabalhadas"
          onClick={() => dispatch({ type: 'navigate', name: 'quotations', params: { filter: 'em_cotacao' } })}
        />
        <Stat
          label="Cotadas"
          value={counts.cotado}
          icon="bi-check2-square"
          color="var(--st-cotado)"
          deltaText="prontas pra cliente"
          onClick={() => dispatch({ type: 'navigate', name: 'quotations', params: { filter: 'cotado' } })}
        />
        <Stat
          label="Receita estimada"
          value={fmt.brlShort(revenue)}
          icon="bi-graph-up-arrow"
          color="var(--brand)"
          deltaText={`em ${total} cotações`}
        />
      </div>

      {/* Chart + Donut */}
      <div className="grid-side" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <i className="bi bi-bar-chart" style={{ color: 'var(--text-muted)' }}></i>
            <h3>Cotações abertas — últimos 14 dias</h3>
            <div className="row" style={{ marginLeft: 'auto', gap: 12 }}>
              <span className="row tiny faint" style={{ gap: 5 }}><span style={{ width: 8, height: 8, background: 'var(--surface-3)', borderRadius: 2 }}></span> Abertas</span>
              <span className="row tiny faint" style={{ gap: 5 }}><span style={{ width: 8, height: 8, background: 'var(--brand)', borderRadius: 2 }}></span> Concluídas</span>
            </div>
          </div>
          <div className="card-pad">
            <div className="chart-bar-grid">
              {chartData.map((d, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', gap: 2 }} title={`${d.label}: ${d.value} abertas`}>
                  <div className="chart-bar" style={{ height: `${(d.value / maxBar) * 100}%` }}></div>
                  <div className="chart-bar alt" style={{ height: `${(d.won / maxBar) * 30}%`, marginTop: -2 }}></div>
                </div>
              ))}
            </div>
            <div className="chart-xrow" style={{ marginTop: 8 }}>
              {chartData.map((d, i) => (
                <div key={i} className="chart-bar-label">{d.label}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <i className="bi bi-pie-chart" style={{ color: 'var(--text-muted)' }}></i>
            <h3>Status</h3>
          </div>
          <div className="card-pad" style={{ textAlign: 'center' }}>
            <DonutChart segments={statusMix} total={mixTotal} active={active} />
            <div className="col" style={{ gap: 6, marginTop: 16, textAlign: 'left' }}>
              {statusMix.map(s => (
                <div key={s.k} className="row between">
                  <span className="row tiny" style={{ gap: 8 }}>
                    <span style={{ width: 8, height: 8, background: s.color, borderRadius: 2 }}></span>
                    {s.label}
                  </span>
                  <span className="mono small bold">{s.value}</span>
                </div>
              ))}
              {statusMix.length === 0 && <div className="empty tiny" style={{ padding: 16 }}>Sem dados</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Approve rate + recent */}
      <div className="grid-side">
        <div className="card">
          <div className="card-head">
            <i className="bi bi-clock-history" style={{ color: 'var(--text-muted)' }}></i>
            <h3>Cotações recentes</h3>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => dispatch({ type: 'navigate', name: 'quotations' })}>
              Ver todas <i className="bi bi-arrow-right"></i>
            </button>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon="bi-inbox" title="Sem cotações recentes" />
          ) : (
            <div className="tbl-wrap"><table className="tbl">
              <tbody>
                {recent.map(q => {
                  const totals = calcTotals(q.items);
                  return (
                    <tr
                      key={q.id} className="clickable"
                      onClick={() => dispatch({ type: 'navigate', name: 'quotation-detail', params: { id: q.id } })}
                    >
                      <td style={{ width: 130 }}><span className="mono semibold" style={{ fontSize: 12 }}>{q.quote_number}</span></td>
                      <td>
                        <div className="semibold">{q.customer_name}</div>
                        <div className="tiny faint">{q.vehicle.make} {q.vehicle.model}</div>
                      </td>
                      <td><Plate value={q.vehicle.plate} /></td>
                      <td><span className="mono small">{totals.grandTotal > 0 ? fmt.brl(totals.grandTotal) : <span className="faint">—</span>}</span></td>
                      <td><StatusBadge status={q.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>

        <div className="col" style={{ gap: 16 }}>
          {/* Approve rate */}
          <div className="card card-pad">
            <div className="row between">
              <div>
                <div className="tiny faint" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--mono)' }}>Taxa de aprovação</div>
                <div className="bold" style={{ fontSize: 36, lineHeight: 1, marginTop: 8 }}>{approveRate}<span style={{ fontSize: 22, color: 'var(--text-muted)' }}>%</span></div>
                <div className="tiny faint" style={{ marginTop: 4 }}>{approvedCount} de {respondedCount} cotadas</div>
              </div>
              <ProgressRing value={approveRate} />
            </div>
          </div>

          {/* Quick actions */}
          <div className="card">
            <div className="card-head">
              <i className="bi bi-lightning-charge-fill" style={{ color: 'var(--brand)' }}></i>
              <h3>Atalhos rápidos</h3>
            </div>
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {currentUser.role === 'vendas' && (
                <QuickAction icon="bi-plus-square-fill" label="Abrir nova cotação" onClick={() => dispatch({ type: 'navigate', name: 'new-quotation' })} />
              )}
              <QuickAction icon="bi-clipboard-data" label="Ver fila de cotações" onClick={() => dispatch({ type: 'navigate', name: 'quotations' })} />
              <QuickAction icon="bi-box-seam" label="Catálogo de peças" onClick={() => dispatch({ type: 'navigate', name: 'catalog' })} />
              <QuickAction icon="bi-bell-fill" label={`Notificações${unreadCount ? ` (${unreadCount})` : ''}`} onClick={() => dispatch({ type: 'navigate', name: 'notifications' })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, color, deltaUp, deltaText, onClick }) {
  return (
    <div className="stat" onClick={onClick} style={onClick ? { cursor: 'pointer' } : null}>
      <div className="stat-icon" style={{ color: color || 'var(--text-muted)' }}>
        <i className={`bi ${icon}`}></i>
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-delta ${deltaUp != null ? (deltaUp ? 'up' : 'down') : ''}`}>
        {deltaText}
      </div>
    </div>
  );
}

function DonutChart({ segments, total, active }) {
  const R = 56, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={160} height={160} className="ring" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={R} className="ring-bg" strokeWidth="14"></circle>
        {segments.map((s, i) => {
          const len = (s.value / total) * C;
          const dash = `${len} ${C - len}`;
          const el = (
            <circle key={s.k} cx="80" cy="80" r={R} fill="none"
              stroke={s.color} strokeWidth="14"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              style={{ transition: 'stroke-dasharray 320ms' }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
        <div className="bold" style={{ fontSize: 28, lineHeight: 1 }}>{active}</div>
        <div className="tiny faint" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>Ativas</div>
      </div>
    </div>
  );
}

function ProgressRing({ value }) {
  const R = 28, C = 2 * Math.PI * R;
  const dash = `${(value / 100) * C} ${C}`;
  return (
    <svg width="72" height="72" className="ring" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={R} className="ring-bg" strokeWidth="6"></circle>
      <circle cx="36" cy="36" r={R} className="ring-fg" strokeWidth="6" strokeDasharray={dash} />
    </svg>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="row" style={{
      width: '100%', padding: '10px 12px', borderRadius: 'var(--r-md)',
      border: '1px solid var(--border)', background: 'var(--surface)',
      cursor: 'pointer', fontSize: 13, fontWeight: 600,
      gap: 10, transition: 'background 120ms, border-color 120ms',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
    >
      <i className={`bi ${icon}`} style={{ color: 'var(--brand)', fontSize: 15 }}></i>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      <i className="bi bi-arrow-right faint" style={{ fontSize: 12 }}></i>
    </button>
  );
}

/* =========================================================
   Catalog
   ========================================================= */
function CatalogScreen() {
  const { state, dispatch, currentUser } = useStore();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // part or 'new' or null
  const [deleting, setDeleting] = useState(null);

  const canEdit = currentUser.role === 'compras' || currentUser.role === 'admin';
  const list = q.trim()
    ? state.parts.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase()))
    : state.parts;
  const categories = [...new Set(state.parts.map(p => p.category))];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Catálogo de peças</h2>
          <p className="page-sub">{state.parts.length} peças cadastradas em {categories.length} categorias.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: 13 }}></i>
            <input className="input" placeholder="Buscar peça…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 280, width: '100%', paddingLeft: 34 }} />
          </div>
          {canEdit && (
            <Button variant="primary" icon="bi-plus-lg" onClick={() => setEditing('new')}>Nova peça</Button>
          )}
        </div>
      </div>

      <div className="card">
        {list.length === 0 ? (
          <EmptyState icon="bi-box" title="Nenhuma peça encontrada" />
        ) : (
          <div className="tbl-wrap"><table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Código</th>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th style={{ width: 120 }}>Preço padrão</th>
                {canEdit && <th style={{ width: 90 }}></th>}
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id}>
                  <td><span className="mono semibold small">{p.code}</span></td>
                  <td className="semibold">{p.name}</td>
                  <td className="small muted">{p.description}</td>
                  <td><Badge>{p.category}</Badge></td>
                  <td><span className="mono">{fmt.brl(p.default_price)}</span></td>
                  {canEdit && (
                    <td>
                      <div className="row" style={{ gap: 4 }}>
                        <button className="icon-btn" onClick={() => setEditing(p)} title="Editar">
                          <i className="bi bi-pencil" style={{ fontSize: 13 }}></i>
                        </button>
                        <button className="icon-btn" onClick={() => setDeleting(p)} title="Excluir">
                          <i className="bi bi-trash3" style={{ fontSize: 13, color: '#b91c1c' }}></i>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {editing && <PartModal key={editing === 'new' ? 'new' : editing.id} part={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Remover peça?"
        message={deleting ? `A peça "${deleting.name}" (${deleting.code}) será removida do catálogo.` : ''}
        confirmLabel="Remover"
        tone="danger"
        onConfirm={() => { dispatch({ type: 'delete_part', id: deleting.id }); setDeleting(null); }}
      />
    </div>
  );
}

function PartModal({ part, onClose }) {
  const { dispatch, state } = useStore();
  const [form, setForm] = useState(part || { code: '', name: '', description: '', category: '', default_price: 0 });
  const categories = [...new Set(state.parts.map(p => p.category))];
  function save() {
    const data = { ...form, default_price: Number(form.default_price) || 0 };
    if (part) dispatch({ type: 'update_part', id: part.id, payload: data });
    else dispatch({ type: 'add_part', payload: data });
    onClose();
  }
  return (
    <Modal open onClose={onClose} title={part ? 'Editar peça' : 'Nova peça'} icon="bi-box-seam"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" icon="bi-check2" disabled={!form.code || !form.name} onClick={save}>Salvar</Button>
      </>}>
      <div className="col" style={{ gap: 14 }}>
        <div className="grid-2">
          <Field label="Código *">
            <input className="input mono" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="PF-1023" />
          </Field>
          <Field label="Categoria">
            <input className="input" list="cats" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Freios" />
            <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
          </Field>
        </div>
        <Field label="Nome *">
          <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Pastilha de Freio Dianteira" />
        </Field>
        <Field label="Descrição">
          <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Kit com 4 pastilhas" />
        </Field>
        <Field label="Preço padrão (R$)">
          <input className="input mono" type="number" step="0.01" value={form.default_price} onChange={e => setForm({ ...form, default_price: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

/* =========================================================
   Notifications page
   ========================================================= */
function NotificationsScreen() {
  const { myNotifs, dispatch } = useStore();
  const unread = myNotifs.filter(n => !n.read_at);
  const read = myNotifs.filter(n => n.read_at);

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <div className="page-head">
        <div>
          <h2 className="page-title">Notificações</h2>
          <p className="page-sub">{unread.length > 0 ? plural(unread.length, 'nova notificação', 'novas notificações') : 'Tudo em dia'}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {unread.length > 0 && (
            <Button variant="secondary" icon="bi-check2-all" onClick={() => dispatch({ type: 'mark_all_read' })}>
              Marcar tudo como lido
            </Button>
          )}
          {myNotifs.length > 0 && (
            <Button variant="danger" icon="bi-trash" onClick={() => {
              if (!confirm('Limpar todas as notificações?')) return;
              dispatch({ type: 'clear_notifications' });
              fetch(`${PLATE_PROXY_URL}/api/notificacoes`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
            }}>
              Limpar tudo
            </Button>
          )}
        </div>
      </div>

      {unread.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="row tiny faint" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--mono)', marginBottom: 10 }}>
            <span>Não lidas</span>
            <span className="badge" style={{ background: 'var(--brand)', color: '#fff' }}>{unread.length}</span>
          </div>
          <div className="card">
            {unread.map((n, i) => (
              <NotifRow key={n.id} n={n} last={i === unread.length - 1} />
            ))}
          </div>
        </div>
      )}

      {read.length > 0 && (
        <div>
          <div className="row tiny faint" style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--mono)', marginBottom: 10 }}>
            <span>Lidas</span>
          </div>
          <div className="card">
            {read.map((n, i) => (
              <NotifRow key={n.id} n={n} last={i === read.length - 1} />
            ))}
          </div>
        </div>
      )}

      {myNotifs.length === 0 && (
        <div className="card">
          <EmptyState icon="bi-bell-slash" title="Sem notificações" message="Quando algo acontecer, você verá aqui." />
        </div>
      )}
    </div>
  );
}

function NotifRow({ n, last }) {
  const { dispatch } = useStore();
  return (
    <div
      className="notif-item"
      style={{ borderBottom: last ? 0 : '1px solid var(--border)', padding: '14px 18px' }}
      onClick={() => {
        dispatch({ type: 'mark_notification_read', id: n.id });
        if (n.quotation_id) dispatch({ type: 'navigate', name: 'quotation-detail', params: { id: n.quotation_id } });
      }}
    >
      <div className={`notif-icon ${!n.read_at ? 'unread' : ''}`}>
        <i className={`bi ${
          n.type === 'nova_cotacao' ? 'bi-plus-square' :
          n.type === 'cotacao_respondida' ? 'bi-currency-exchange' :
          n.type === 'peca_chegou' ? 'bi-box-seam' :
          n.type === 'cotacao_atualizada' ? 'bi-arrow-repeat' :
          n.type === 'nova_mensagem' ? 'bi-chat-dots-fill' : 'bi-bell'}`}></i>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row between">
          <div className="notif-title">{n.title}</div>
          <span className="tiny faint mono">{n.time_label || fmt.ago(n.created_at)}</span>
        </div>
        <div className="notif-msg">{n.message}</div>
      </div>
      {!n.read_at && <div className="notif-unread-dot"></div>}
    </div>
  );
}

/* =========================================================
   Admin users
   ========================================================= */
function AdminUsersScreen() {
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState(null);
  const [connectUserId, setConnectUserId] = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [q, setQ] = useState('');
  const list = q.trim()
    ? state.users.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
    : state.users;

  async function reloadUsers() {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${PLATE_PROXY_URL}/admin/usuarios`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) dispatch({ type: 'logout' });
        return;
      }
      const data = await res.json();
      if (!data.ok || !data.users) return;
      const users = data.users.map(u => ({
        id: u.id, name: u.name, email: u.email, role: u.role,
        active: !!u.active, phone_whatsapp: u.phone_whatsapp || '',
        whatsapp_instance: u.whatsapp_instance_name || null,
        whatsapp_connected: !!u.whatsapp_connected_at,
        created_at: u.created_at,
      }));
      dispatch({ type: 'set_users', users });
    } catch (_) {} finally {
      setLoadingUsers(false);
    }
  }

  React.useEffect(() => { reloadUsers(); }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Usuários</h2>
          <p className="page-sub">{state.users.filter(u => u.active).length} ativos de {state.users.length} cadastrados</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} style={{ width: 240 }} />
          <Button variant="primary" icon="bi-person-plus" data-tour="user-create-btn" onClick={() => setEditing('new')}>Novo usuário</Button>
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap"><table className="tbl" style={{ opacity: loadingUsers ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Função</th>
              <th>WhatsApp</th>
              <th>Status</th>
              <th>Criado</th>
              <th style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <div className="avatar" style={{ background: u.active ? 'var(--brand)' : 'var(--surface-3)', color: u.active ? 'var(--brand-text)' : 'var(--text-faint)' }}>
                      {u.name.split(' ').map(s => s[0]).slice(0, 2).join('')}
                    </div>
                    <div className="semibold">{u.name}</div>
                  </div>
                </td>
                <td><span className="mono small">{u.email}</span></td>
                <td><RoleBadge role={u.role} /></td>
                <td>
                  {u.whatsapp_connected
                    ? <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                        <Badge className="badge-cotado" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span className="dot-sm" style={{ background: '#16a34a' }}></span> Conectado
                        </Badge>
                        <button className="icon-btn" title="Desconectar" disabled={disconnectingId === u.id}
                          onClick={async () => {
                            setDisconnectingId(u.id);
                            try {
                              await fetch(`${PLATE_PROXY_URL}/api/whatsapp/instancia/desconectar?targetUserId=${u.id}`, { method: 'DELETE', credentials: 'include' });
                              dispatch({ type: 'whatsapp_disconnect', userId: u.id });
                            } catch (_) {
                              dispatch({ type: 'toast', tone: 'error', message: 'Erro ao desconectar. Tente novamente.' });
                            } finally {
                              setDisconnectingId(null);
                            }
                          }}>
                          <i className={`bi ${disconnectingId === u.id ? 'bi-arrow-clockwise' : 'bi-x-circle'}`}
                             style={{ fontSize: 14, color: 'var(--text-faint)', animation: disconnectingId === u.id ? 'spin 1s linear infinite' : 'none' }}></i>
                        </button>
                      </div>
                    : <Button variant="ghost" size="sm" icon="bi-whatsapp"
                        onClick={() => setConnectUserId(u.id)}>Conectar</Button>
                  }
                </td>
                <td>
                  {u.active
                    ? <Badge className="badge-cotado"><span className="dot-sm"></span> Ativo</Badge>
                    : <Badge className="badge-cancelado"><span className="dot-sm"></span> Inativo</Badge>}
                </td>
                <td><span className="tiny mono faint">{fmt.date(u.created_at)}</span></td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    <button className="icon-btn" onClick={() => setEditing(u)} title="Editar">
                      <i className="bi bi-pencil" style={{ fontSize: 13 }}></i>
                    </button>
                    <button className="icon-btn" onClick={async () => {
                      const endpoint = u.active ? 'desativar' : 'ativar';
                      await fetch(`${PLATE_PROXY_URL}/admin/usuarios/${u.id}/${endpoint}`, { method: 'POST', credentials: 'include' }).catch(() => {});
                      dispatch({ type: 'toggle_user_active', id: u.id });
                    }} title={u.active ? 'Desativar' : 'Ativar'}>
                      <i className={`bi ${u.active ? 'bi-pause-circle' : 'bi-play-circle'}`} style={{ fontSize: 13 }}></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {editing && <UserModal key={editing === 'new' ? 'new' : editing.id} user={editing === 'new' ? null : editing} onClose={() => { setEditing(null); reloadUsers(); }} />}
      {connectUserId && <WhatsAppConnectModal userId={connectUserId} onClose={() => { setConnectUserId(null); reloadUsers(); }} />}
    </div>
  );
}

function UserModal({ user, onClose }) {
  const { dispatch } = useStore();
  const [form, setForm] = useState(user || { name: '', email: '', role: 'vendas', phone_whatsapp: '', new_password: '' });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      if (user) {
        const res = await fetch(`${PLATE_PROXY_URL}/admin/usuarios/${user.id}`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, role: form.role, phone_whatsapp: form.phone_whatsapp, new_password: form.new_password || undefined }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { dispatch({ type: 'toast', tone: 'error', message: data.error || 'Erro ao salvar.' }); return; }
      } else {
        const res = await fetch(`${PLATE_PROXY_URL}/admin/usuarios`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, email: form.email, password: form.new_password, role: form.role, phone_whatsapp: form.phone_whatsapp }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { dispatch({ type: 'toast', tone: 'error', message: data.error || 'Erro ao criar usuário.' }); return; }
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }
  function pwStrength(pw) {
    if (!pw) return null;
    const ok = pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
    return ok ? 'ok' : 'weak';
  }
  const pwStatus = pwStrength(form.new_password);
  const pwRequired = !user;
  const valid = form.name && form.email && form.role &&
    (!pwRequired || (form.new_password && pwStatus === 'ok')) &&
    (!form.new_password || pwStatus === 'ok');
  return (
    <Modal open onClose={onClose} title={user ? 'Editar usuário' : 'Novo usuário'} icon="bi-person"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" icon="bi-check2" disabled={!valid || saving} onClick={save}>{saving ? 'Salvando…' : 'Salvar'}</Button>
      </>}>
      <div className="col" style={{ gap: 14 }}>
        <Field label="Nome *">
          <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="João Vendas" autoFocus />
        </Field>
        <div className="grid-2">
          <Field label="E-mail *">
            <input className="input mono" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="usuario@cotou.com.br" />
          </Field>
          <Field label="Função *">
            <select className="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="vendas">Vendas</option>
              <option value="compras">Compras</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
        </div>
        <div className="grid-2">
          <Field label="WhatsApp">
            <input className="input mono" value={form.phone_whatsapp} onChange={e => setForm({ ...form, phone_whatsapp: e.target.value })} placeholder="11999998888" />
          </Field>
          <Field label={user ? 'Nova senha (opcional)' : 'Senha *'}>
            <input className="input" type="password" value={form.new_password || ''}
              onChange={e => setForm({ ...form, new_password: e.target.value })}
              placeholder="•••••••"
              style={form.new_password && pwStatus === 'weak' ? { borderColor: 'var(--danger)' } : {}} />
            {form.new_password && pwStatus === 'weak' && (
              <div className="tiny" style={{ color: 'var(--danger)', marginTop: 4 }}>
                Mín. 8 caracteres, 1 maiúscula e 1 número.
              </div>
            )}
            {!form.new_password && (
              <div className="tiny faint" style={{ marginTop: 4 }}>Mín. 8 caracteres, 1 maiúscula e 1 número.</div>
            )}
          </Field>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="bi bi-whatsapp" style={{ color: '#16a34a', fontSize: 16 }}></i>
          <div className="tiny" style={{ color: 'var(--text-faint)' }}>
            A instância WhatsApp é criada automaticamente ao salvar o usuário.<br/>
            O usuário deverá escanear o QR Code na barra lateral para conectar.
          </div>
        </div>
      </div>
    </Modal>
  );
}

const PREDEFINED_TEMPLATES = [
  {
    id: 'padrao',
    name: 'Padrão',
    description: 'Amigável e completo',
    text: DEFAULT_WA_TEMPLATE,
  },
  {
    id: 'formal',
    name: 'Formal',
    description: 'Tom profissional',
    text: `Prezado(a) [NOME DO CLIENTE],

Sua cotação está disponível. Confira os detalhes abaixo:

*Veículo:* [VEÍCULO] — Placa [PLACA]

*Peças cotadas:*
[LISTA DE PEÇAS]

[MÃO DE OBRA]*Total: R$ [TOTAL]*
[PRAZO DE ENTREGA]

Confirme o pedido respondendo esta mensagem.

Atenciosamente,
Equipe de Atendimento`,
  },
  {
    id: 'direto',
    name: 'Direto',
    description: 'Curto e objetivo',
    text: `Olá, [NOME DO CLIENTE]! Sua cotação ficou pronta ✅

[VEÍCULO] — Placa [PLACA]

[LISTA DE PEÇAS]

[MÃO DE OBRA]*Total: R$ [TOTAL]*
[PRAZO DE ENTREGA]

Confirma o pedido?`,
  },
  {
    id: 'detalhado',
    name: 'Detalhado',
    description: 'Com número de cotação',
    text: `Olá, [NOME DO CLIENTE]! 😊

Sua cotação *[NÚMERO DA COTAÇÃO]* está pronta!

🚗 *Veículo:* [VEÍCULO]
🔑 *Placa:* [PLACA]

📦 *Itens cotados:*
[LISTA DE PEÇAS]

[MÃO DE OBRA]💰 *Total: R$ [TOTAL]*
[PRAZO DE ENTREGA]

Responda *SIM* para confirmar o pedido 👍`,
  },
];

function renderWAText(text) {
  return text.split('\n').map((line, li) => (
    <React.Fragment key={li}>
      {li > 0 && <br />}
      {line.split(/(\*[^*\n]+\*)/g).map((seg, si) =>
        /^\*[^*]+\*$/.test(seg)
          ? <strong key={si}>{seg.slice(1, -1)}</strong>
          : seg
      )}
    </React.Fragment>
  ));
}

function AdminSettingsScreen() {
  const { state, dispatch } = useStore();
  const currentText = state.settings?.whatsapp_template || DEFAULT_WA_TEMPLATE;
  const matchId = (PREDEFINED_TEMPLATES.find(t => t.text === currentText) || PREDEFINED_TEMPLATES[0]).id;
  const [selectedId, setSelectedId] = useState(matchId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selected = PREDEFINED_TEMPLATES.find(t => t.id === selectedId) || PREDEFINED_TEMPLATES[0];

  const SAMPLE_Q = { customer_name: 'João Silva', quote_number: 'COT-2026-0001', vehicle: { make: 'Toyota', model: 'Corolla', plate: 'ABC1D23' } };
  const SAMPLE_I = [
    { part_name: 'Filtro de óleo', part_code: 'FO-001', total_price: 45, delivery_days: 2, quantity: 1, labor_cost_compras: 0 },
    { part_name: 'Pastilha de freio', total_price: 120, delivery_days: null, quantity: 1, labor_cost_compras: 80 },
  ];
  const preview = renderTemplate({ whatsapp_template: selected.text }, SAMPLE_Q, SAMPLE_I);

  async function save() {
    setSaving(true);
    try {
      await fetch(`${PLATE_PROXY_URL}/api/admin/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_template: selected.text }),
      });
    } catch (_) {}
    dispatch({ type: 'update_settings', payload: { whatsapp_template: selected.text } });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <React.Fragment>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

      {/* ── Seleção ── */}
      <div className="card" data-tour="wa-template" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Modelo da mensagem</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
            Escolha o estilo da mensagem enviada ao cliente.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '14px 18px', flex: 1 }}>
          {PREDEFINED_TEMPLATES.map(tpl => {
            const active = selectedId === tpl.id;
            return (
              <div key={tpl.id} onClick={() => setSelectedId(tpl.id)}
                style={{ borderRadius: 10, border: active ? '2px solid var(--brand)' : '1.5px solid var(--border)', padding: '12px 14px', cursor: 'pointer', background: active ? 'rgba(37,99,235,.04)' : 'var(--surface)', position: 'relative', transition: 'border-color .15s' }}>
                {active && (
                  <i className="bi bi-check-circle-fill" style={{ position: 'absolute', top: 9, right: 10, color: 'var(--brand)', fontSize: 14 }}></i>
                )}
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, paddingRight: active ? 18 : 0 }}>{tpl.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 10 }}>{tpl.description}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {tpl.text.replace(/\*/g, '').split('\n').filter(l => l.trim()).slice(0, 3).join(' · ')}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--surface-2)' }}>
          <Button variant="primary"
            icon={saving ? 'bi-arrow-clockwise' : saved ? 'bi-check-lg' : 'bi-floppy'}
            onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Preview da mensagem</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>Como o cliente vai receber o texto.</div>
        </div>

        <div style={{ flex: 1, background: 'var(--wa-bg)', overflowY: 'auto', padding: '14px 12px' }}>
          <div style={{ background: 'var(--wa-bubble)', borderRadius: '8px 8px 0 8px', padding: '9px 12px', maxWidth: '86%', marginLeft: 'auto', boxShadow: '0 1px 1px rgba(0,0,0,.1)' }}>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: '#111' }}>
              {renderWAText(preview)}
            </div>
            <div style={{ textAlign: 'right', marginTop: 4, fontSize: 10.5, color: '#667781', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              <i className="bi bi-check2-all" style={{ color: '#53bdeb', fontSize: 14 }}></i>
            </div>
          </div>
        </div>

        <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 11.5, color: 'var(--text-faint)', flexShrink: 0 }}>
          Preview com dados fictícios — a mensagem real usa as informações de cada cotação.
        </div>
      </div>

    </div>

    {/* ── Zona de perigo ── */}
    <div className="card card-pad" style={{ marginTop: 20, borderColor: 'var(--error)' }}>
      <div className="bold" style={{ color: 'var(--error)' }}>Zona de perigo</div>
      <p className="tiny faint" style={{ margin: '6px 0 12px' }}>
        Apaga todos os dados do protótipo e restaura os dados de demonstração.
      </p>
      <Button variant="danger" icon="bi-trash3"
        onClick={() => { localStorage.removeItem('cotou_state'); location.reload(); }}>
        Resetar para dados iniciais
      </Button>
    </div>

    </React.Fragment>
  );
}

/* =========================================================
   Fornecedores — tela + modal
   ========================================================= */
/* =========================================================
   Customers Screen
   ========================================================= */
function CustomersScreen() {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState('');
  const [editCustomer, setEditCustomer] = useState(null);
  const [detailCustomer, setDetailCustomer] = useState(null);

  const customers = (state.customers || []).filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  function statsFor(phone) {
    const qs = (state.quotations || []).filter(q => q.customer_phone === phone);
    const last = qs.reduce((m, q) => (!m || q.created_at > m) ? q.created_at : m, null);
    const total = qs.reduce((s, q) => s + calcTotals(q.items).grandTotal, 0);
    return { count: qs.length, last, total };
  }

  const TH = ({ children, w, className }) => (
    <th className={className} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600,
      color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', width: w }}>
      {children}
    </th>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div className="row between" style={{ marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Clientes</div>
            <div className="small faint" style={{ marginTop: 2 }}>Histórico de atendimento e dados de contato</div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <input className="input" placeholder="Buscar por nome ou telefone…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
        </div>

        {customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-faint)' }}>
            <i className="bi bi-person-lines-fill" style={{ fontSize: 36, marginBottom: 12, display: 'block' }}></i>
            <div className="bold" style={{ marginBottom: 4 }}>Nenhum cliente encontrado</div>
            <div className="small">Os clientes aparecem automaticamente ao criar cotações.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <TH>Nome</TH>
                <TH>Telefone</TH>
                <TH w={90}>Cotações</TH>
                <TH w={110} className="hide-mobile">Total gasto</TH>
                <TH w={140} className="hide-mobile">Último atendimento</TH>
                <TH w={80}></TH>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const { count, last, total } = statsFor(c.phone);
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => setDetailCustomer(c)}>
                    <td style={{ padding: '10px 12px' }}>
                      <div className="bold" style={{ fontSize: 13 }}>{c.name}</div>
                      <div className="tiny faint" style={{ marginTop: 2 }}>
                        cliente desde {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="bi bi-whatsapp" style={{ color: '#25d366', fontSize: 13 }}></i>
                        {fmt.phone(c.phone)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'monospace' }}>
                        {count}
                      </span>
                    </td>
                    <td className="hide-mobile" style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                      {total > 0 ? fmt.brl(total) : <span className="faint">—</span>}
                    </td>
                    <td className="hide-mobile" style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-faint)' }}>
                      {last ? fmt.ago(last) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                      <button className="icon-btn" title="Editar dados"
                        onClick={() => setEditCustomer(c)}>
                        <i className="bi bi-pencil" style={{ fontSize: 14 }}></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {detailCustomer && (
        <CustomerDetailModal customer={detailCustomer} onClose={() => setDetailCustomer(null)} />
      )}
      {editCustomer && (
        <CustomerModal customer={editCustomer} onClose={() => setEditCustomer(null)} />
      )}
    </div>
  );
}

function CustomerDetailModal({ customer, onClose }) {
  const { state, dispatch } = useStore();
  const quotations = (state.quotations || [])
    .filter(q => q.customer_phone === customer.phone)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const totalGasto = quotations.reduce((s, q) => s + calcTotals(q.items).grandTotal, 0);

  return (
    <Modal open onClose={onClose}
      title={customer.name}
      icon="bi-person-lines-fill"
      size="lg"
      footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Info header */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="card card-pad" style={{ flex: 1, minWidth: 140, background: 'var(--surface-2)' }}>
            <div className="tiny faint" style={{ marginBottom: 4 }}>Telefone</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="bi bi-whatsapp" style={{ color: '#25d366' }}></i>
              {fmt.phone(customer.phone)}
            </div>
          </div>
          <div className="card card-pad" style={{ flex: 1, minWidth: 120, background: 'var(--surface-2)' }}>
            <div className="tiny faint" style={{ marginBottom: 4 }}>Cotações</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{quotations.length}</div>
          </div>
          <div className="card card-pad" style={{ flex: 1, minWidth: 140, background: 'var(--surface-2)' }}>
            <div className="tiny faint" style={{ marginBottom: 4 }}>Total em peças</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>
              {totalGasto > 0 ? fmt.brl(totalGasto) : '—'}
            </div>
          </div>
          <div className="card card-pad" style={{ flex: 1, minWidth: 140, background: 'var(--surface-2)' }}>
            <div className="tiny faint" style={{ marginBottom: 4 }}>Cliente desde</div>
            <div style={{ fontSize: 13 }}>{new Date(customer.created_at).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>

        {/* Quotation history */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Histórico de cotações</div>
          {quotations.length === 0 ? (
            <div className="small faint" style={{ padding: '20px 0', textAlign: 'center' }}>
              Nenhuma cotação encontrada.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quotations.map(q => {
                const { grandTotal } = calcTotals(q.items);
                return (
                  <div key={q.id} className="card card-pad"
                    style={{ background: 'var(--surface-2)', cursor: 'pointer', border: '1px solid var(--border)' }}
                    onClick={() => {
                      onClose();
                      dispatch({ type: 'navigate', name: 'quotation-detail', params: { id: q.id } });
                    }}>
                    <div className="row between">
                      <div>
                        <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span className="mono bold" style={{ fontSize: 13 }}>{q.quote_number}</span>
                          <StatusBadge status={q.status} />
                        </div>
                        <div className="tiny faint">
                          {q.vehicle.make} {q.vehicle.model} · {q.items.length} {q.items.length === 1 ? 'peça' : 'peças'} · {fmt.ago(q.created_at)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {grandTotal > 0 && (
                          <div className="mono bold" style={{ fontSize: 13 }}>{fmt.brl(grandTotal)}</div>
                        )}
                        <i className="bi bi-chevron-right" style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4, display: 'block' }}></i>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CustomerModal({ customer, onClose }) {
  const { dispatch } = useStore();
  const [form, setForm] = useState({ name: customer.name, phone: customer.phone || '' });
  const valid = form.name.trim().length > 0;

  function save() {
    if (!valid) return;
    const payload = { name: form.name.trim(), phone: form.phone.trim() || null };
    dispatch({ type: 'update_customer', id: customer.id, payload });
    fetch(`${PLATE_PROXY_URL}/api/customers/${customer.id}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).catch(() => {});
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Editar Cliente" icon="bi-person-lines-fill"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="bi-floppy" onClick={save} disabled={!valid}>Salvar</Button>
        </>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Nome *">
          <input className="input" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>
        <Field label="Telefone (WhatsApp)">
          <input className="input mono" placeholder="Só números" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

/* =========================================================
   Relatórios / Analytics
   ========================================================= */
function ReportsScreen() {
  const { state } = useStore();
  const quotations = state.quotations || [];

  // KPIs gerais
  const total = quotations.length;
  const approved = quotations.filter(q => q.customer_approved === 1).length;
  const rejected = quotations.filter(q => q.customer_approved === 0).length;
  const pending  = quotations.filter(q => q.customer_approved === null && q.status !== 'cancelado').length;
  const cancelled = quotations.filter(q => q.status === 'cancelado').length;
  const convRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  // Receita total aprovada
  const revenue = quotations
    .filter(q => q.customer_approved === 1)
    .reduce((s, q) => s + calcTotals(q.items).grandTotal, 0);

  // Cotações nos últimos 30 dias agrupadas por dia
  const today = new Date(); today.setHours(0,0,0,0);
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (29 - i));
    const ymd = [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const dayQ = quotations.filter(q => (q.created_at || '').slice(0,10) === ymd);
    return { label, value: dayQ.length, revenue: dayQ.filter(q => q.customer_approved === 1).reduce((s, q) => s + calcTotals(q.items).grandTotal, 0) };
  });
  const maxBar = Math.max(...last30.map(d => d.value), 1);

  // Top 5 clientes por volume (nº cotações)
  const customerMap = {};
  quotations.forEach(q => {
    if (!q.customer_name) return;
    if (!customerMap[q.customer_name]) customerMap[q.customer_name] = { name: q.customer_name, count: 0, revenue: 0 };
    customerMap[q.customer_name].count++;
    if (q.customer_approved === 1) customerMap[q.customer_name].revenue += calcTotals(q.items).grandTotal;
  });
  const topCustomers = Object.values(customerMap).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxCount = Math.max(...topCustomers.map(c => c.count), 1);

  // Distribuição por status
  const statusDist = Object.entries(STATUS_META).map(([key, meta]) => ({
    key, label: meta.label, count: quotations.filter(q => q.status === key).length
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI strip */}
      <div className="stat-grid">
        {[
          { label: 'Total de cotações', value: total,    icon: 'bi-clipboard-data', color: 'var(--brand)' },
          { label: 'Aprovadas',         value: approved, icon: 'bi-check-circle',   color: 'var(--success)' },
          { label: 'Recusadas',         value: rejected, icon: 'bi-x-circle',       color: 'var(--danger)' },
          { label: 'Taxa de conversão', value: `${convRate}%`, icon: 'bi-graph-up', color: convRate >= 50 ? 'var(--success)' : 'var(--text-muted)' },
        ].map(k => (
          <div key={k.label} className="card card-pad" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`bi ${k.icon}`} style={{ fontSize: 18, color: k.color }}></i>
            </div>
            <div>
              <div className="tiny faint" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: k.color }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Receita aprovada */}
      <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="tiny faint" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Receita total aprovada</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', color: 'var(--success)' }}>{fmt.brl(revenue)}</div>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{pending}</div>
            <div className="tiny faint">Aguardando</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--danger)' }}>{cancelled}</div>
            <div className="tiny faint">Canceladas</div>
          </div>
        </div>
      </div>

      <div className="grid-side">
        {/* Gráfico últimos 30 dias */}
        <div className="card card-pad">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Cotações nos últimos 30 dias</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, overflowX: 'auto' }}>
            {last30.map((d, i) => (
              <div key={i} title={`${d.label}: ${d.value} cotações`}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 0 18px', gap: 2, minWidth: 0 }}>
                <div style={{
                  width: '100%', background: d.value > 0 ? 'var(--brand)' : 'var(--surface-2)',
                  height: `${(d.value / maxBar) * 100}%`, minHeight: d.value > 0 ? 3 : 1,
                  borderRadius: '2px 2px 0 0', transition: 'height 0.3s',
                }} />
                {i % 5 === 0 && <span className="tiny faint" style={{ fontSize: 9, whiteSpace: 'nowrap' }}>{d.label}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição por status */}
        <div className="card card-pad">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Por status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {statusDist.map(s => (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="small">{s.label}</span>
                  <span className="mono small bold">{s.count}</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(s.count / total) * 100}%`, background: 'var(--brand)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
            {statusDist.length === 0 && <div className="tiny faint">Nenhuma cotação ainda.</div>}
          </div>
        </div>
      </div>

      {/* Top clientes */}
      <div className="card card-pad">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Top clientes</div>
        {topCustomers.length === 0 ? (
          <div className="tiny faint">Nenhum dado disponível.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topCustomers.map(c => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span className="tiny faint">{c.count} cotação{c.count !== 1 ? 'ões' : ''}</span>
                    {c.revenue > 0 && <span className="mono small bold" style={{ color: 'var(--success)' }}>{fmt.brl(c.revenue)}</span>}
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(c.count / maxCount) * 100}%`, background: 'var(--brand)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SuppliersScreen() {
  const { state, dispatch } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [search, setSearch] = useState('');

  const suppliers = (state.suppliers || []).filter(s => s.active &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div className="row between" style={{ marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Fornecedores</div>
            <div className="small faint" style={{ marginTop: 2 }}>Cadastro de fornecedores para consulta rápida no módulo de compras</div>
          </div>
          <Button variant="primary" icon="bi-plus-lg" data-tour="supplier-create-btn" onClick={() => { setEditSupplier(null); setModalOpen(true); }}>
            Novo Fornecedor
          </Button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <input className="input" placeholder="Buscar por nome…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        </div>

        {suppliers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-faint)' }}>
            <i className="bi bi-truck" style={{ fontSize: 36, marginBottom: 12, display: 'block' }}></i>
            <div className="bold" style={{ marginBottom: 4 }}>Nenhum fornecedor encontrado</div>
            <div className="small">Clique em "Novo Fornecedor" para começar.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Telefone (WhatsApp)</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observações</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{s.name}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                    {s.phone
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="bi bi-whatsapp" style={{ color: '#25d366', fontSize: 13 }}></i>
                          {fmt.phone ? fmt.phone(s.phone) : s.phone}
                        </span>
                      : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-faint)' }}>{s.notes || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="icon-btn" title="Editar"
                        onClick={() => { setEditSupplier(s); setModalOpen(true); }}>
                        <i className="bi bi-pencil" style={{ fontSize: 14 }}></i>
                      </button>
                      <button className="icon-btn" title="Remover"
                        onClick={() => dispatch({ type: 'remove_supplier', id: s.id })}>
                        <i className="bi bi-trash3" style={{ fontSize: 14, color: '#dc2626' }}></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <SupplierModal
          supplier={editSupplier}
          onClose={() => { setModalOpen(false); setEditSupplier(null); }}
        />
      )}
    </div>
  );
}

function SupplierModal({ supplier, onClose }) {
  const { dispatch } = useStore();
  const [form, setForm] = useState({
    name: supplier?.name || '',
    phone: supplier?.phone || '',
    notes: supplier?.notes || '',
  });
  const valid = form.name.trim().length > 0;

  function save() {
    if (!valid) return;
    const payload = { name: form.name.trim(), phone: form.phone.trim() || null, notes: form.notes.trim() || null };
    if (supplier) {
      dispatch({ type: 'update_supplier', id: supplier.id, payload });
      fetch(`${PLATE_PROXY_URL}/api/suppliers/${supplier.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
    } else {
      dispatch({ type: 'add_supplier', payload });
      fetch(`${PLATE_PROXY_URL}/api/suppliers`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
    }
    onClose();
  }

  return (
    <Modal open onClose={onClose}
      title={supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      icon="bi-truck"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="bi-floppy" onClick={save} disabled={!valid}>Salvar</Button>
        </>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Nome *">
          <input className="input" placeholder="Ex: AutoPeças Central" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>
        <Field label="Telefone (WhatsApp)" hint="Necessário para enviar consulta via WhatsApp">
          <input className="input mono" placeholder="31999990000 (só números)" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Observações">
          <input className="input" placeholder="Especialidade, horário de atendimento…" value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

Object.assign(window, {
  Dashboard, CatalogScreen, NotificationsScreen, AdminUsersScreen, AdminSettingsScreen, SuppliersScreen,
  CustomersScreen, ReportsScreen,
});

