// COTOU — Quotation screens (list, detail, new)

const { useState, useEffect, useMemo, useRef } = React;

/* =========================================================
   Quotations list
   ========================================================= */
function QuotationsList() {
  const { state, dispatch, currentUser } = useStore();
  const [filter, setFilter] = useState(state.route.params.filter || 'todos');
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const sortIcon = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  useEffect(() => {
    if (state.route.params.filter) setFilter(state.route.params.filter);
  }, [state.route.params.filter]);

  // Recarrega do backend toda vez que a lista é exibida
  useEffect(() => {
    fetch(`${PLATE_PROXY_URL}/cotacoes?limit=500`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.ok && Array.isArray(data.items)) {
          dispatch({ type: 'load_quotations', quotations: data.items });
        }
      })
      .catch(() => {});
  }, []);

  // Vendas only sees own quotations
  let list = currentUser.role === 'vendas'
    ? state.quotations.filter(x => x.created_by_user_id === currentUser.id)
    : state.quotations;

  if (filter === 'respondidas') list = list.filter(x => x.customer_approved !== null && x.customer_approved !== undefined);
  else if (filter !== 'todos') list = list.filter(x => x.status === filter);
  if (q.trim()) {
    const needle = q.toLowerCase();
    list = list.filter(x =>
      x.quote_number.toLowerCase().includes(needle) ||
      x.customer_name.toLowerCase().includes(needle) ||
      x.vehicle.plate.toLowerCase().includes(needle) ||
      x.vehicle.model.toLowerCase().includes(needle)
    );
  }
  list = [...list].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const av = sortKey === 'total' ? calcTotals(a.items).grandTotal : a[sortKey];
    const bv = sortKey === 'total' ? calcTotals(b.items).grandTotal : b[sortKey];
    if (av == null) return dir;
    if (bv == null) return -dir;
    return av > bv ? dir : av < bv ? -dir : 0;
  });

  const counts = useMemo(() => {
    const base = currentUser.role === 'vendas'
      ? state.quotations.filter(x => x.created_by_user_id === currentUser.id)
      : state.quotations;
    const map = { todos: base.length };
    ['pendente', 'em_cotacao', 'cotado', 'peca_chegou', 'cancelado'].forEach(s => {
      map[s] = base.filter(x => x.status === s).length;
    });
    map.respondidas = base.filter(x => x.customer_approved !== null && x.customer_approved !== undefined).length;
    return map;
  }, [state.quotations, currentUser]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Cotações</h2>
          <p className="page-sub">
            {currentUser.role === 'vendas' ? 'Suas cotações abertas' : 'Todas as cotações em fluxo'}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: 13 }}></i>
            <input className="input" placeholder="Buscar #, cliente, placa…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 280, width: '100%', paddingLeft: 34 }} />
          </div>
          {(currentUser.role === 'vendas' || currentUser.role === 'admin') && (
            <Button variant="primary" icon="bi-plus-lg" onClick={() => dispatch({ type: 'navigate', name: 'new-quotation' })}>
              Nova cotação
            </Button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="card" data-tour="filter-tabs" style={{ marginBottom: 16, overflow: 'visible' }}>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { k: 'todos', label: 'Todas' },
            { k: 'pendente', label: 'Pendentes' },
            { k: 'em_cotacao', label: 'Em cotação' },
            { k: 'cotado', label: 'Cotadas' },
            { k: 'respondidas', label: 'Respondidas pelo cliente' },
            { k: 'peca_chegou', label: 'Peça chegou' },
            { k: 'cancelado', label: 'Canceladas' },
          ].map(tab => (
            <button
              key={tab.k}
              className={`btn ${filter === tab.k ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setFilter(tab.k)}
            >
              {tab.label}
              <span style={{
                background: filter === tab.k ? 'rgba(255,255,255,0.22)' : 'var(--surface-2)',
                color: filter === tab.k ? '#fff' : 'var(--text-muted)',
                padding: '0 6px', borderRadius: 99, fontSize: 11, fontWeight: 700, marginLeft: 2,
              }}>{counts[tab.k] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" data-tour="quotation-table">
        {list.length === 0 ? (
          <EmptyState
            icon="bi-inbox"
            title="Nenhuma cotação encontrada"
            message="Tente outro filtro ou abra uma nova cotação."
          />
        ) : (
          <div className="tbl-wrap"><table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 130, cursor: 'pointer' }} onClick={() => toggleSort('quote_number')}>Número{sortIcon('quote_number')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('customer_name')}>Cliente{sortIcon('customer_name')}</th>
                <th>Veículo</th>
                <th>Itens</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('total')}>Total{sortIcon('total')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('created_at')}>Aberta em{sortIcon('created_at')}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('status')}>Status{sortIcon('status')}</th>
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {list.map(qt => {
                const totals = calcTotals(qt.items);
                return (
                  <tr
                    key={qt.id}
                    className="clickable"
                    onClick={() => dispatch({ type: 'navigate', name: 'quotation-detail', params: { id: qt.id } })}
                  >
                    <td><span className="mono semibold" style={{ fontSize: 12 }}>{qt.quote_number}</span></td>
                    <td>
                      <div className="semibold">{qt.customer_name}</div>
                      <div className="tiny faint mono">{fmt.phone(qt.customer_phone)}</div>
                    </td>
                    <td>
                      <Plate value={qt.vehicle.plate} />
                      <div className="tiny faint" style={{ marginTop: 3 }}>{qt.vehicle.make} {qt.vehicle.model}</div>
                    </td>
                    <td><span className="mono">{qt.items.length}</span></td>
                    <td><span className="mono semibold">{totals.grandTotal > 0 ? fmt.brl(totals.grandTotal) : <span className="faint">—</span>}</span></td>
                    <td><span className="tiny mono faint">{fmt.datetime(qt.created_at)}</span></td>
                    <td><StatusBadge status={qt.status} /></td>
                    <td><i className="bi bi-chevron-right faint"></i></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Quotation detail
   ========================================================= */
function QuotationDetail() {
  const { state, dispatch, currentUser } = useStore();
  const id = state.route.params.id;
  const qt = state.quotations.find(x => x.id === id);
  const [respondOpen, setRespondOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [quickConsultOpen, setQuickConsultOpen] = useState(false);

  // Busca dados frescos ao abrir — garante que aprovação via WhatsApp aparece mesmo sem socket
  React.useEffect(() => {
    if (!id) return;
    fetch(`${PLATE_PROXY_URL}/cotacoes/${id}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.ok || !data.quotation) return;
        const q = data.quotation;
        dispatch({ type: 'upsert_quotation', quotation: { ...q, items: data.items || [] } });
      })
      .catch(() => {});
  }, [id]);

  if (!qt) {
    return (
      <div className="page">
        <EmptyState icon="bi-exclamation-triangle" title="Cotação não encontrada"
          action={<Button onClick={() => dispatch({ type: 'navigate', name: 'quotations' })}>Voltar para lista</Button>} />
      </div>
    );
  }
  const totals = calcTotals(qt.items);
  const hasValues = qt.items.some(it => it.unit_price > 0);

  const isVendas = currentUser.role === 'vendas';
  const isCompras = currentUser.role === 'compras';
  const isAdmin = currentUser.role === 'admin';
  const canAssign = (isCompras || isAdmin) && qt.status === 'pendente';
  const canRespond = (isCompras || isAdmin) && qt.status === 'em_cotacao';
  const canMarkArrived = (isCompras || isAdmin) && qt.status === 'cotado';
  const canSendWhats = (isVendas || isAdmin) && (qt.status === 'cotado' || qt.status === 'peca_chegou');
  const canCancel = qt.status !== 'cancelado' && qt.status !== 'peca_chegou';

  return (
    <div className="page">

      {/* ── Compact page header ── */}
      <div style={{ marginBottom: 20 }}>
        <div className="row between" style={{ alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'navigate', name: 'quotations' })} style={{ marginBottom: 8, paddingLeft: 0 }}>
              <i className="bi bi-arrow-left"></i> Cotações
            </button>
            <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="mono bold" style={{ fontSize: 20, letterSpacing: '-0.01em' }}>{qt.quote_number}</span>
              <StatusBadge status={qt.status} />
              {totals.grandTotal > 0 && (
                <span className="mono semibold" style={{ fontSize: 14, color: 'var(--brand)' }}>{fmt.brl(totals.grandTotal)}</span>
              )}
            </div>
            <div className="row" style={{ gap: 6, marginTop: 5, color: 'var(--text-faint)', fontSize: 12.5, flexWrap: 'wrap' }}>
              <span>{qt.items.length} {qt.items.length === 1 ? 'peça' : 'peças'}</span>
              <span>·</span><span>{qt.customer_name}</span>
              <span>·</span><span>{qt.vehicle.make} {qt.vehicle.model}</span>
              <span>·</span><span>{fmt.ago(qt.created_at)}</span>
            </div>
          </div>
          <div className="row" style={{ gap: 8, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
            {canCancel && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--st-cancelado)' }} onClick={() => setCancelOpen(true)}>
                <i className="bi bi-x-circle"></i> Cancelar
              </button>
            )}
            {canCancel && (canAssign || canRespond || canMarkArrived || canSendWhats) && (
              <div style={{ width: 1, height: 22, background: 'var(--border)', flexShrink: 0 }}></div>
            )}
            {canAssign && (
              <Button variant="primary" icon="bi-bag-check" onClick={() => {
                dispatch({ type: 'assign_quotation', id: qt.id });
                setRespondOpen(true);
              }}>Assumir e cotar</Button>
            )}
            {canRespond && (
              <Button variant="whatsapp" icon="bi-whatsapp" onClick={() => setQuickConsultOpen(true)}>
                Consultar fornecedor
              </Button>
            )}
            {canRespond && (
              <Button variant="primary" icon="bi-currency-exchange" onClick={() => setRespondOpen(true)}>
                Preencher valores
              </Button>
            )}
            {canMarkArrived && (
              <Button variant="primary" icon="bi-box-seam" onClick={() => dispatch({ type: 'mark_arrived', id: qt.id })}>
                Peça chegou
              </Button>
            )}
            {canSendWhats && (
              <Button variant="whatsapp" icon="bi-whatsapp" onClick={() => setWaOpen(true)}>
                {qt.whatsapp_sent_at ? 'Reenviar' : 'WhatsApp'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2-column layout: 65% / 35% ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* LEFT column */}
        <div className="col" style={{ gap: 16 }}>

          {/* Timeline — compact */}
          <div className="card" style={{ padding: '14px 20px' }}>
            <StatusTimeline quotation={qt} />
          </div>

          {/* Items table — smart columns (hide Unit/MO/Total/Prazo when not filled) */}
          <div className="card">
            <div className="card-head">
              <i className="bi bi-list-ul" style={{ color: 'var(--text-muted)' }}></i>
              <h3>Peças solicitadas</h3>
              <span className="badge" style={{ marginLeft: 'auto' }}>
                {qt.items.length} {qt.items.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="tbl-wrap"><table className="tbl">
              <thead>
                <tr>
                  <th>Peça</th>
                  <th style={{ width: 120 }}>Código</th>
                  <th style={{ width: 55 }}>Qtd</th>
                  {hasValues && <th style={{ width: 105 }}>Unitário</th>}
                  {hasValues && <th style={{ width: 100 }}>M.O.</th>}
                  {hasValues && <th style={{ width: 105 }}>Total</th>}
                  {hasValues && <th style={{ width: 58 }}>Prazo</th>}
                  <th style={{ width: 100 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {qt.items.map(it => (
                  <tr key={it.id}>
                    <td>
                      <div className="semibold truncate" style={{ maxWidth: 240 }}>{it.part_name}</div>
                      {it.supplier_name && <div className="tiny faint truncate" style={{ maxWidth: 200 }}>via {it.supplier_name}</div>}
                      {it.notes && <div className="tiny" style={{ color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic' }}>"{it.notes}"</div>}
                    </td>
                    <td><span className="mono tiny faint">{it.part_code || '—'}</span></td>
                    <td><span className="mono semibold">{it.quantity}</span></td>
                    {hasValues && <td><span className="mono small">{fmt.brl(it.unit_price)}</span></td>}
                    {hasValues && <td><span className="mono small">{fmt.brl(it.labor_cost_compras)}</span></td>}
                    {hasValues && <td><span className="mono semibold">{fmt.brl(it.total_price)}</span></td>}
                    {hasValues && <td><span className="mono small">{it.delivery_days != null ? `${it.delivery_days}d` : '—'}</span></td>}
                    <td>
                      <span className={`badge badge-${it.item_status === 'aguardando' ? 'pendente' : it.item_status}`}>
                        <span className="dot-sm"></span>
                        {it.item_status === 'aguardando' ? 'Aguardando' :
                         it.item_status === 'em_cotacao' ? 'Cotando' :
                         it.item_status === 'cotado' ? 'Cotado' :
                         it.item_status === 'peca_chegou' ? 'Chegou' : it.item_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {hasValues && totals.grandTotal > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <td colSpan={5} style={{ textAlign: 'right', padding: '12px 16px' }}>
                      <span className="muted small">Peças <span className="mono semibold" style={{ color: 'var(--text)' }}>{fmt.brl(totals.partsTotal)}</span></span>
                      <span style={{ margin: '0 10px', color: 'var(--text-faint)' }}>·</span>
                      <span className="muted small">M.O. <span className="mono semibold" style={{ color: 'var(--text)' }}>{fmt.brl(totals.laborTotal)}</span></span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="tiny faint" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total</div>
                      <div className="mono bold big">{fmt.brl(totals.grandTotal)}</div>
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table></div>
          </div>

          {/* Observations — 2 columns side by side with avatar initials */}
          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <div style={{ width: 26, height: 26, borderRadius: 99, background: 'var(--st-em-cotacao-bg)', color: 'var(--st-em-cotacao)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {qt.creator_name ? qt.creator_name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('') : 'V'}
                </div>
                <h3>Obs. Vendas</h3>
              </div>
              <div className="card-pad" style={{ paddingTop: 12 }}>
                <p className="small" style={{ margin: 0, color: qt.notes_vendas ? 'var(--text)' : 'var(--text-faint)', lineHeight: 1.55 }}>
                  {qt.notes_vendas || 'Nenhuma observação.'}
                </p>
                {qt.creator_name && (
                  <div className="tiny faint" style={{ marginTop: 10 }}>{qt.creator_name}</div>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-head">
                <div style={{ width: 26, height: 26, borderRadius: 99, background: 'var(--st-cotado-bg)', color: 'var(--st-cotado)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {qt.buyer_name ? qt.buyer_name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('') : 'C'}
                </div>
                <h3>Obs. Compras</h3>
              </div>
              <div className="card-pad" style={{ paddingTop: 12 }}>
                <p className="small" style={{ margin: 0, color: qt.notes_compras ? 'var(--text)' : 'var(--text-faint)', lineHeight: 1.55 }}>
                  {qt.notes_compras || 'Ainda não respondida.'}
                </p>
                {qt.buyer_name && (
                  <div className="tiny faint" style={{ marginTop: 10 }}>{qt.buyer_name}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT column — sticky sidebar */}
        <div className="col" style={{ gap: 12, position: 'sticky', top: 24, alignSelf: 'start' }}>

          {/* Client card */}
          <div className="card">
            <div className="card-head" style={{ paddingBottom: 10 }}>
              <i className="bi bi-person-circle" style={{ color: 'var(--text-muted)' }}></i>
              <h3>Cliente</h3>
            </div>
            <div className="card-pad" style={{ paddingTop: 10 }}>
              <div className="semibold">{qt.customer_name}</div>
              <a
                href={`https://wa.me/55${String(qt.customer_phone).replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="row"
                style={{ gap: 6, marginTop: 6, color: '#16a34a', textDecoration: 'none', fontSize: 13 }}
              >
                <i className="bi bi-whatsapp"></i>
                <span className="mono">{fmt.phone(qt.customer_phone)}</span>
              </a>
              {qt.customer_approved != null && (
                <div className={`badge ${qt.customer_approved ? 'badge-cotado' : 'badge-cancelado'}`} style={{ marginTop: 10, flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className={`bi ${qt.customer_approved ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
                    Cliente {qt.customer_approved ? 'confirmou' : 'recusou'}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 400 }}>
                    {qt.customer_approval_source === 'whatsapp' && 'via WhatsApp'}
                    {qt.customer_approval_source === 'link' && 'via link de aprovação'}
                    {qt.customer_approval_source === 'manual' && 'registrado pelo vendedor'}
                    {!qt.customer_approval_source && 'registrado pelo vendedor'}
                  </div>
                </div>
              )}
              {(qt.status === 'cotado' || qt.status === 'peca_chegou') && qt.customer_approved == null && (isVendas || isAdmin) && (
                <div className="row" style={{ gap: 6, marginTop: 10 }}>
                  <Button variant="secondary" size="sm" icon="bi-check-lg" onClick={async () => {
                    await fetch(`${PLATE_PROXY_URL}/cotacoes/${qt.id}/resposta-cliente`, {
                      method: 'POST', credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ approved: 1 }),
                    }).catch(() => {});
                    dispatch({ type: 'customer_response', id: qt.id, approved: true, source: 'manual' });
                  }}>Aprovou</Button>
                  <Button variant="ghost" size="sm" icon="bi-x-lg" onClick={async () => {
                    await fetch(`${PLATE_PROXY_URL}/cotacoes/${qt.id}/resposta-cliente`, {
                      method: 'POST', credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ approved: 0 }),
                    }).catch(() => {});
                    dispatch({ type: 'customer_response', id: qt.id, approved: false, source: 'manual' });
                  }}>Recusou</Button>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle card — compact inline layout */}
          <div className="card">
            <div className="card-head" style={{ paddingBottom: 10 }}>
              <i className="bi bi-car-front" style={{ color: 'var(--text-muted)' }}></i>
              <h3>Veículo</h3>
            </div>
            <div className="card-pad" style={{ paddingTop: 10 }}>
              <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <Plate value={qt.vehicle.plate} />
                <div style={{ minWidth: 0 }}>
                  <div className="semibold" style={{ fontSize: 13, lineHeight: 1.3 }}>{qt.vehicle.make} {qt.vehicle.model}</div>
                  <div className="row" style={{ gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                    <span className="mono tiny faint">{qt.vehicle.year_manuf}/{qt.vehicle.year_model}</span>
                    {qt.vehicle.color && <><span className="tiny faint">·</span><span className="mono tiny faint">{qt.vehicle.color}</span></>}
                    {qt.vehicle.fuel && <><span className="tiny faint">·</span><span className="mono tiny faint">{qt.vehicle.fuel}</span></>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata — compact list */}
          <div className="card">
            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <MetaRow label="Aberta por" value={qt.creator_name} />
              <MetaRow label="Comprador" value={qt.buyer_name || '—'} />
              <MetaRow label="Criada" value={fmt.datetime(qt.created_at)} mono />
              {qt.whatsapp_sent_at && (
                <MetaRow label="WhatsApp" value={fmt.datetime(qt.whatsapp_sent_at)} mono icon="bi-whatsapp" iconColor="#16a34a" />
              )}
              {qt.approval_token && qt.customer_approved == null && (() => {
                const approvalUrl = `${PLATE_PROXY_URL}/aprovar/${qt.approval_token}`;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <i className="bi bi-link-45deg" style={{ color: 'var(--brand)', fontSize: 14, flexShrink: 0 }}></i>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>Aprovação</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⏳ Aguardando</span>
                    <button
                      title="Copiar link de aprovação"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 13, padding: '2px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}
                      onClick={() => navigator.clipboard.writeText(approvalUrl).then(() => dispatch({ type: 'toast', tone: 'success', message: 'Link copiado!', duration: 2000 }))}
                    >
                      <i className="bi bi-clipboard"></i>
                    </button>
                    <a href={approvalUrl} target="_blank" rel="noopener noreferrer"
                      title="Abrir link de aprovação"
                      style={{ color: 'var(--brand)', fontSize: 13, padding: '2px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
                    >
                      <i className="bi bi-box-arrow-up-right"></i>
                    </a>
                  </div>
                );
              })()}
              {qt.customer_approved === 1 && (() => {
                const src = qt.customer_approval_source;
                const label = src === 'whatsapp' ? '✅ Cliente confirmou via WhatsApp'
                            : src === 'link'     ? '✅ Cliente confirmou via link'
                            : '✅ Confirmado pelo vendedor';
                return <MetaRow label="Aprovação" value={label} icon="bi-check-circle-fill" iconColor="#16a34a" />;
              })()}
              {qt.customer_approved === 0 && (() => {
                const src = qt.customer_approval_source;
                const label = src === 'whatsapp' ? '❌ Cliente recusou via WhatsApp'
                            : src === 'link'     ? '❌ Cliente recusou via link'
                            : '❌ Recusado pelo vendedor';
                return <MetaRow label="Aprovação" value={label} icon="bi-x-circle-fill" iconColor="#dc2626" />;
              })()}
            </div>
          </div>

          {/* Photo — compact thumbnail (max 80px height) */}
          <div className="card">
            <div className="card-head" style={{ paddingBottom: 8 }}>
              <i className="bi bi-image" style={{ color: 'var(--text-muted)', fontSize: 13 }}></i>
              <h3>Foto da peça</h3>
            </div>
            <div style={{ padding: '0 14px 14px' }}>
              {qt.photo_path ? (
                <img src={qt.photo_path} alt="Foto" style={{ width: '100%', maxHeight: 80, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }} />
              ) : (
                <div style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--r-sm)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-faint)' }}>
                  <i className="bi bi-camera" style={{ fontSize: 16 }}></i>
                  <span className="tiny">Sem foto anexada</span>
                </div>
              )}
            </div>
          </div>

          {/* Chat — collapsible */}
          <ChatPanel quotation={qt} />

          {/* Audit log — visível para admin e compras */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'compras') && (
            <AuditLogPanel quotationId={qt.id} />
          )}
        </div>
      </div>

      {respondOpen && <RespondModal quotation={qt} onClose={() => setRespondOpen(false)} />}
      {quickConsultOpen && <QuickConsultarModal quotation={qt} onClose={() => setQuickConsultOpen(false)} />}
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar cotação?"
        message={`A cotação ${qt.quote_number} será marcada como cancelada. Esta ação pode ser auditada posteriormente.`}
        confirmLabel="Sim, cancelar"
        tone="danger"
        onConfirm={() => { dispatch({ type: 'cancel_quotation', id: qt.id }); setCancelOpen(false); }}
      />
      {waOpen && <WhatsAppModal quotation={qt} onClose={() => setWaOpen(false)} />}
    </div>
  );
}

function MetaRow({ label, value, mono, icon, iconColor }) {
  return (
    <div className="row between">
      <span className="tiny faint" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span className={`small ${mono ? 'mono' : 'semibold'}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <i className={`bi ${icon}`} style={{ color: iconColor || 'var(--text-muted)', fontSize: 12 }}></i>}
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   Chat panel — collapsible
   ========================================================= */
function ChatPanel({ quotation }) {
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const [collapsed, setCollapsed] = useState((quotation.messages || []).length === 0);
  const bottomRef = React.useRef(null);
  const me = state.users.find(u => u.id === state.currentUserId);
  const messages = quotation.messages || [];

  React.useEffect(() => {
    if (!collapsed) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, collapsed]);

  function send() {
    const t = text.trim();
    if (!t) return;
    dispatch({ type: 'send_message', quotationId: quotation.id, text: t });
    setText('');
    setCollapsed(false);
  }

  function getUserName(id) {
    return state.users.find(u => u.id === id)?.name || 'Desconhecido';
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        style={{ width: '100%', background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', textAlign: 'left' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <i className="bi bi-chat-dots" style={{ color: 'var(--brand)', fontSize: 14 }}></i>
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Chat interno</span>
        {messages.length > 0 && (
          <span className="badge" style={{ fontSize: 10, marginLeft: 2 }}>{messages.length}</span>
        )}
        <i className={`bi bi-chevron-${collapsed ? 'down' : 'up'}`} style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)' }}></i>
      </button>
      {!collapsed && (
        <>
          <div style={{ borderTop: '1px solid var(--border)', overflowY: 'auto', maxHeight: 220, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div className="tiny faint" style={{ textAlign: 'center', padding: '14px 0' }}>Nenhuma mensagem ainda.</div>
            )}
            {messages.map(msg => {
              const mine = msg.from === me.id;
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  <div className="tiny faint" style={{ marginBottom: 3 }}>{mine ? 'Você' : getUserName(msg.from)}</div>
                  <div style={{
                    background: mine ? 'var(--brand)' : 'var(--surface-2)',
                    color: mine ? 'var(--brand-text)' : 'var(--text)',
                    borderRadius: mine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '6px 11px', fontSize: 12.5, maxWidth: '88%', wordBreak: 'break-word', lineHeight: 1.45,
                  }}>
                    {msg.text}
                  </div>
                  <div className="tiny faint" style={{ marginTop: 3 }}>{fmt.time(msg.ts)}</div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1, fontSize: 13 }}
              placeholder="Mensagem… (Enter)"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <Button variant="primary" icon="bi-send" onClick={send} disabled={!text.trim()} />
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   Audit Log Panel — collapsible timeline
   ========================================================= */
const AUDIT_LABELS = {
  created:                    { label: 'Cotação criada',                   icon: 'bi-plus-circle',     color: 'var(--brand)' },
  status_changed:             { label: 'Status alterado',                  icon: 'bi-arrow-repeat',    color: 'var(--text-muted)' },
  prices_filled:              { label: 'Valores preenchidos por compras',  icon: 'bi-currency-exchange', color: '#0ea5e9' },
  customer_approved_manual:   { label: 'Cliente aprovou (manual)',         icon: 'bi-check-circle',    color: 'var(--success)' },
  customer_rejected_manual:   { label: 'Cliente recusou (manual)',         icon: 'bi-x-circle',        color: 'var(--danger)' },
  customer_approved_whatsapp: { label: 'Cliente aprovou via WhatsApp',     icon: 'bi-check-circle',    color: 'var(--success)' },
  customer_rejected_whatsapp: { label: 'Cliente recusou via WhatsApp',     icon: 'bi-x-circle',        color: 'var(--danger)' },
  part_arrived:               { label: 'Peça confirmada chegou',           icon: 'bi-box-seam',        color: '#7c3aed' },
};

function AuditLogPanel({ quotationId }) {
  const [collapsed, setCollapsed] = useState(true);
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(false);

  function load() {
    if (logs !== null) return;
    setLoading(true);
    fetch(`${PLATE_PROXY_URL}/cotacoes/${quotationId}/audit-log`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { logs: [] })
      .then(d => { setLogs(d.logs || []); setLoading(false); })
      .catch(() => { setLogs([]); setLoading(false); });
  }

  function toggle() {
    if (collapsed) load();
    setCollapsed(c => !c);
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        style={{ width: '100%', background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', textAlign: 'left' }}
        onClick={toggle}
      >
        <i className="bi bi-shield-check" style={{ color: 'var(--text-muted)', fontSize: 14 }}></i>
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Histórico de auditoria</span>
        {logs !== null && logs.length > 0 && (
          <span className="badge" style={{ fontSize: 10, marginLeft: 2, background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{logs.length}</span>
        )}
        <i className={`bi bi-chevron-${collapsed ? 'down' : 'up'}`} style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)' }}></i>
      </button>
      {!collapsed && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {loading && <div className="tiny faint" style={{ textAlign: 'center', padding: '12px 0' }}>Carregando…</div>}
          {!loading && logs !== null && logs.length === 0 && (
            <div className="tiny faint" style={{ textAlign: 'center', padding: '12px 0' }}>Nenhum evento registrado.</div>
          )}
          {!loading && logs !== null && logs.map((log, i) => {
            const meta = AUDIT_LABELS[log.action] || { label: log.action, icon: 'bi-dot', color: 'var(--text-faint)' };
            const isLast = i === logs.length - 1;
            let detail = null;
            try {
              const nv = log.new_value_json ? JSON.parse(log.new_value_json) : null;
              const ov = log.old_value_json ? JSON.parse(log.old_value_json) : null;
              if (log.action === 'status_changed' && ov && nv) {
                const fromLabel = (STATUS_META[ov.status] || { label: ov.status }).label;
                const toLabel   = (STATUS_META[nv.status] || { label: nv.status }).label;
                detail = `${fromLabel} → ${toLabel}`;
              } else if (log.action === 'part_arrived' && nv?.all) {
                detail = 'Todas as peças confirmadas';
              }
            } catch (_) {}
            return (
              <div key={log.id} style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: isLast ? 0 : 14 }}>
                {!isLast && (
                  <div style={{ position: 'absolute', left: 9, top: 20, bottom: 0, width: 1, background: 'var(--border)' }} />
                )}
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--surface-2)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <i className={`bi ${meta.icon}`} style={{ fontSize: 10, color: meta.color }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{meta.label}</span>
                    <span className="tiny faint mono" style={{ whiteSpace: 'nowrap' }}>{fmt.datetime(log.created_at)}</span>
                  </div>
                  {log.user_name && <div className="tiny faint" style={{ marginTop: 1 }}>por {log.user_name}</div>}
                  {detail && <div className="tiny" style={{ marginTop: 2, color: 'var(--text-muted)' }}>{detail}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Respond modal
   ========================================================= */
function RespondModal({ quotation, onClose }) {
  const { dispatch, state, currentUser } = useStore();
  const [items, setItems] = useState(quotation.items.map(it => ({
    id: it.id,
    unit_price: '',
    labor_cost_compras: '',
    delivery_days: '',
    supplier_name: '',
    notes: '',
  })));
  const [notesCompras, setNotesCompras] = useState('');
  const [consultarItem, setConsultarItem] = useState(null); // { items, supplier, quotationId }

  function update(idx, field, v) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: v } : it));
  }
  const allFilled = items.every(it => Number(it.unit_price) > 0 && Number(it.delivery_days) > 0);

  function submit() {
    if (!allFilled) return;
    dispatch({
      type: 'respond_quotation',
      payload: { id: quotation.id, items, notes_compras: notesCompras }
    });
    onClose();
  }

  // Live total
  const liveTotal = items.reduce((s, it, i) => {
    const q = quotation.items[i].quantity;
    const u = Number(it.unit_price) || 0;
    const l = Number(it.labor_cost_compras) || 0;
    return s + (u * q) + l;
  }, 0);

  const activeSuppliers = (state.suppliers || []).filter(s => s.active);

  return (
    <>
      <Modal
        open={true} onClose={onClose}
        title={`Responder cotação ${quotation.quote_number}`}
        icon="bi-currency-exchange"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" icon="bi-send" onClick={submit} disabled={!allFilled}>
              Enviar resposta
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {quotation.items.map((it, i) => {
            const activeSupplier = activeSuppliers.find(s => s.name === items[i].supplier_name);
            const canConsult = !!(activeSupplier?.phone);
            const sameSupplierCount = items.filter(f => f.supplier_name && f.supplier_name === items[i].supplier_name).length;
            const consultTitle = !items[i].supplier_name ? 'Selecione um fornecedor' :
              !activeSupplier?.phone ? 'Fornecedor sem telefone cadastrado' :
              sameSupplierCount > 1 ? `Consultar ${activeSupplier.name} (${sameSupplierCount} itens) via WhatsApp` :
              `Consultar ${activeSupplier.name} via WhatsApp`;
            return (
              <div key={it.id} className="card card-pad" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="row between" style={{ marginBottom: 12 }}>
                  <div>
                    <div className="bold">{it.part_name}</div>
                    <div className="tiny faint mono">{it.part_code || '—'} · qtd {it.quantity}</div>
                  </div>
                  <span className="mono small bold">
                    {fmt.brl(((Number(items[i].unit_price) || 0) * it.quantity) + (Number(items[i].labor_cost_compras) || 0))}
                  </span>
                </div>
                <div className="grid-4">
                  <Field label="Preço unit. *">
                    <div className="input-group">
                      <span className="input-icon mono">R$</span>
                      <input className="input mono" type="number" step="0.01" placeholder="0,00" min="0.01"
                        value={items[i].unit_price} onChange={e => update(i, 'unit_price', e.target.value)}
                        style={items[i].unit_price !== '' && Number(items[i].unit_price) <= 0 ? { borderColor: '#dc2626' } : {}} />
                    </div>
                  </Field>
                  <Field label="Mão de obra">
                    <div className="input-group">
                      <span className="input-icon mono">R$</span>
                      <input className="input mono" type="number" step="0.01" placeholder="0,00"
                        value={items[i].labor_cost_compras} onChange={e => update(i, 'labor_cost_compras', e.target.value)} />
                    </div>
                  </Field>
                  <Field label="Prazo (dias) *">
                    <input className="input mono" type="number" placeholder="3" min="1"
                      value={items[i].delivery_days} onChange={e => update(i, 'delivery_days', e.target.value)}
                      style={items[i].delivery_days !== '' && Number(items[i].delivery_days) <= 0 ? { borderColor: '#dc2626' } : {}} />
                  </Field>
                  <Field label="Fornecedor">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="input" style={{ flex: 1 }}
                        value={items[i].supplier_name}
                        onChange={e => update(i, 'supplier_name', e.target.value)}>
                        <option value="">— Selecione —</option>
                        {activeSuppliers.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        title={consultTitle}
                        disabled={!canConsult}
                        onClick={() => {
                          if (!canConsult) return;
                          const grouped = quotation.items.reduce((acc, qItem, j) => {
                            if (items[j].supplier_name === items[i].supplier_name) acc.push(qItem);
                            return acc;
                          }, []);
                          setConsultarItem({ items: grouped, supplier: activeSupplier, quotationId: quotation.id });
                        }}
                        style={{ flexShrink: 0, width: 34, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: canConsult ? '#25d366' : 'var(--surface)', color: canConsult ? 'white' : 'var(--text-faint)', cursor: canConsult ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bi bi-whatsapp" style={{ fontSize: 15 }}></i>
                      </button>
                    </div>
                  </Field>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Field label="Observação do item">
                    <input className="input" placeholder="Notas opcionais sobre disponibilidade, marca…"
                      value={items[i].notes} onChange={e => update(i, 'notes', e.target.value)} />
                  </Field>
                </div>
              </div>
            );
          })}

          <Field label="Observação geral de Compras">
            <textarea className="textarea" placeholder="Notas que vão para a Cotação inteira"
              value={notesCompras} onChange={e => setNotesCompras(e.target.value)} />
          </Field>

          <div className="row between" style={{ padding: 14, background: 'var(--brand-soft)', borderRadius: 'var(--r-md)' }}>
            <div>
              <div className="tiny" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--brand)' }}>Total da cotação</div>
              <div className="mono bold" style={{ fontSize: 24, color: 'var(--brand)' }}>{fmt.brl(liveTotal)}</div>
            </div>
            {!allFilled && <span className="tiny" style={{ color: 'var(--brand)' }}>Preencha preço unit. e prazo de todos os itens</span>}
          </div>
        </div>
      </Modal>
      {consultarItem && (
        <ConsultarFornecedorModal
          items={consultarItem.items}
          supplier={consultarItem.supplier}
          quotationId={consultarItem.quotationId}
          onClose={() => setConsultarItem(null)}
        />
      )}
    </>
  );
}

/* =========================================================
   Consultar Fornecedor via WhatsApp
   ========================================================= */
function ConsultarFornecedorModal({ items, supplier, quotationId, onClose }) {
  const { currentUser, dispatch, state } = useStore();
  const quotation = state.quotations.find(q => q.id === quotationId) || {};
  const vehicle = quotation.vehicle || {};

  function buildMsg() {
    let m = `Olá, *${supplier.name}*! 👋\n\n`;
    if (quotation.quote_number) m += `📋 *Cotação:* ${quotation.quote_number}\n\n`;
    if (items.length === 1) {
      const it = items[0];
      m += `Estamos verificando disponibilidade de peça:\n\n`;
      m += `🔧 *${it.part_name}*`;
      if (it.part_code) m += ` (Cód: ${it.part_code})`;
      m += `\n📦 Quantidade: ${it.quantity} unidade${it.quantity > 1 ? 's' : ''}`;
    } else {
      m += `Estamos verificando disponibilidade de *${items.length} peças*:\n\n`;
      items.forEach((it, idx) => {
        m += `${idx + 1}. *${it.part_name}*`;
        if (it.part_code) m += ` (Cód: ${it.part_code})`;
        m += `\n   📦 Qtd: ${it.quantity} unidade${it.quantity > 1 ? 's' : ''}\n\n`;
      });
      m = m.trimEnd();
    }
    if (vehicle.make || vehicle.model) {
      const vDesc = [vehicle.make, vehicle.model, vehicle.year_model].filter(Boolean).join(' ');
      m += `\n\n🚗 *Veículo:* ${vDesc}`;
      if (vehicle.chassis) m += `\n🔑 *Chassi:* ${vehicle.chassis}`;
    }
    const disp = items.length > 1 ? 'disponíveis' : 'disponível';
    m += `\n\nVocê tem ${disp}? Qual o valor unitário e prazo de entrega?\n\nObrigado! 😊`;
    return m;
  }

  const [msg, setMsg] = useState(buildMsg);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canSendViaWA = currentUser?.whatsapp_connected;

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`${PLATE_PROXY_URL}/api/whatsapp/consultar-fornecedor`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierPhone: supplier.phone, message: msg }),
      });
      if (res.status === 401) { dispatch({ type: 'logout' }); return; }
      const json = await res.json().catch(() => ({}));
      if (!json.ok) {
        dispatch({ type: 'toast', tone: 'error', message: json.message || 'Erro ao enviar consulta.' });
        setSending(false);
        return;
      }
    } catch (err) {
      dispatch({ type: 'toast', tone: 'error', message: `Erro de conexão: ${err?.message || String(err)}` });
      setSending(false);
      return;
    }
    setSent(true);
    setSending(false);
    dispatch({ type: 'toast', tone: 'success', message: `Consulta enviada para ${supplier.name}!` });
    setTimeout(onClose, 1500);
  }

  return (
    <Modal open onClose={onClose}
      title={`Consultar ${supplier.name}`}
      icon="bi-whatsapp"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="whatsapp"
            icon={sending ? 'bi-arrow-clockwise' : sent ? 'bi-check-lg' : 'bi-whatsapp'}
            onClick={send} disabled={sending || sent || !canSendViaWA}>
            {sending ? 'Enviando…' : sent ? 'Enviado!' : 'Enviar via WhatsApp'}
          </Button>
        </>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
          <i className="bi bi-person-circle" style={{ color: '#25d366', fontSize: 22 }}></i>
          <div>
            <div className="bold" style={{ fontSize: 13 }}>{supplier.name}</div>
            <div className="tiny faint mono">{supplier.phone}</div>
          </div>
        </div>
        {!canSendViaWA && (
          <div style={{ display: 'flex', gap: 8, padding: '9px 12px', background: 'rgba(245,158,11,.08)', borderRadius: 'var(--r-md)', border: '1px solid rgba(245,158,11,.2)' }}>
            <i className="bi bi-exclamation-triangle" style={{ color: '#f59e0b', flexShrink: 0 }}></i>
            <span className="tiny" style={{ color: '#92400e' }}>
              WhatsApp não conectado. Conecte seu WhatsApp nas configurações antes de enviar.
            </span>
          </div>
        )}
        <Field label="Mensagem (editável antes de enviar)">
          <textarea className="textarea" rows={8} value={msg}
            onChange={e => setMsg(e.target.value)}
            style={{ lineHeight: 1.6, fontSize: 13 }} />
        </Field>
        <p className="tiny faint" style={{ margin: 0 }}>
          A mensagem será enviada do seu WhatsApp para o número do fornecedor.
        </p>
      </div>
    </Modal>
  );
}

/* =========================================================
   Quick supplier consultation — opened directly from quotation detail
   without requiring prices to be filled first
   ========================================================= */
function QuickConsultarModal({ quotation, onClose }) {
  const { state, currentUser, dispatch } = useStore();
  const [supplier, setSupplier] = useState(null);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const activeSuppliers = (state.suppliers || []).filter(s => s.active && s.phone);
  const vehicle = quotation.vehicle || {};

  function buildMsg(sup) {
    let m = `Olá, *${sup.name}*! 👋\n\n`;
    if (quotation.quote_number) m += `📋 *Cotação:* ${quotation.quote_number}\n\n`;
    const its = quotation.items;
    if (its.length === 1) {
      const it = its[0];
      m += `Estamos verificando disponibilidade de peça:\n\n`;
      m += `🔧 *${it.part_name}*`;
      if (it.part_code) m += ` (Cód: ${it.part_code})`;
      m += `\n📦 Quantidade: ${it.quantity} unidade${it.quantity > 1 ? 's' : ''}`;
    } else {
      m += `Estamos verificando disponibilidade de *${its.length} peças*:\n\n`;
      its.forEach((it, idx) => {
        m += `${idx + 1}. *${it.part_name}*`;
        if (it.part_code) m += ` (Cód: ${it.part_code})`;
        m += `\n   📦 Qtd: ${it.quantity} unidade${it.quantity > 1 ? 's' : ''}\n\n`;
      });
      m = m.trimEnd();
    }
    if (vehicle.make || vehicle.model) {
      const vDesc = [vehicle.make, vehicle.model, vehicle.year_model].filter(Boolean).join(' ');
      m += `\n\n🚗 *Veículo:* ${vDesc}`;
      if (vehicle.chassis) m += `\n🔑 *Chassi:* ${vehicle.chassis}`;
    }
    const disp = its.length > 1 ? 'disponíveis' : 'disponível';
    m += `\n\nVocê tem ${disp}? Qual o valor unitário e prazo de entrega?\n\nObrigado! 😊`;
    return m;
  }

  function selectSupplier(s) { setSupplier(s); setMsg(buildMsg(s)); }

  const canSendViaWA = currentUser?.whatsapp_connected;

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`${PLATE_PROXY_URL}/api/whatsapp/consultar-fornecedor`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierPhone: supplier.phone, message: msg }),
      });
      if (res.status === 401) { dispatch({ type: 'logout' }); return; }
      const json = await res.json().catch(() => ({}));
      if (!json.ok) {
        dispatch({ type: 'toast', tone: 'error', message: json.message || 'Erro ao enviar consulta.' });
        setSending(false);
        return;
      }
    } catch (err) {
      dispatch({ type: 'toast', tone: 'error', message: `Erro de conexão: ${err?.message || String(err)}` });
      setSending(false);
      return;
    }
    setSent(true);
    setSending(false);
    dispatch({ type: 'toast', tone: 'success', message: `Consulta enviada para ${supplier.name}!` });
    setTimeout(onClose, 1500);
  }

  return (
    <Modal open onClose={onClose}
      title={supplier ? `Consultar ${supplier.name}` : 'Consultar Fornecedor'}
      icon="bi-whatsapp" size="md"
      footer={
        <>
          <Button variant="ghost" onClick={supplier ? () => setSupplier(null) : onClose}>
            {supplier ? '← Trocar fornecedor' : 'Cancelar'}
          </Button>
          {supplier && (
            <Button variant="whatsapp"
              icon={sending ? 'bi-arrow-clockwise' : sent ? 'bi-check-lg' : 'bi-whatsapp'}
              onClick={send} disabled={sending || sent || !canSendViaWA}>
              {sending ? 'Enviando…' : sent ? 'Enviado!' : 'Enviar via WhatsApp'}
            </Button>
          )}
        </>
      }
    >
      {!supplier ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="small" style={{ color: 'var(--text-faint)', margin: '0 0 4px' }}>
            Selecione o fornecedor para consultar o preço das {quotation.items.length} peça{quotation.items.length !== 1 ? 's' : ''}:
          </p>
          {activeSuppliers.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
              <i className="bi bi-person-x" style={{ fontSize: 24, display: 'block', marginBottom: 8 }}></i>
              Nenhum fornecedor com telefone cadastrado.
            </div>
          ) : activeSuppliers.map(s => (
            <button key={s.id} onClick={() => selectSupplier(s)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <i className="bi bi-person-circle" style={{ color: '#25d366', fontSize: 22, flexShrink: 0 }}></i>
              <div>
                <div className="bold" style={{ fontSize: 13 }}>{s.name}</div>
                <div className="tiny faint mono">{s.phone}</div>
              </div>
              <i className="bi bi-chevron-right" style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontSize: 12 }}></i>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
            <i className="bi bi-person-circle" style={{ color: '#25d366', fontSize: 22 }}></i>
            <div>
              <div className="bold" style={{ fontSize: 13 }}>{supplier.name}</div>
              <div className="tiny faint mono">{supplier.phone}</div>
            </div>
          </div>
          {!canSendViaWA && (
            <div style={{ display: 'flex', gap: 8, padding: '9px 12px',
              background: 'rgba(245,158,11,.08)', borderRadius: 'var(--r-md)',
              border: '1px solid rgba(245,158,11,.2)' }}>
              <i className="bi bi-exclamation-triangle" style={{ color: '#f59e0b', flexShrink: 0 }}></i>
              <span className="tiny" style={{ color: '#92400e' }}>
                WhatsApp não conectado. Conecte seu WhatsApp nas configurações antes de enviar.
              </span>
            </div>
          )}
          <Field label="Mensagem (editável antes de enviar)">
            <textarea className="textarea" rows={9} value={msg}
              onChange={e => setMsg(e.target.value)}
              style={{ lineHeight: 1.6, fontSize: 13 }} />
          </Field>
          <p className="tiny faint" style={{ margin: 0 }}>
            A mensagem será enviada do seu WhatsApp para o número do fornecedor.
          </p>
        </div>
      )}
    </Modal>
  );
}

/* =========================================================
   WhatsApp preview modal
   ========================================================= */
function WhatsAppModal({ quotation, onClose }) {
  const { state, dispatch, currentUser: me } = useStore();
  const [sending, setSending] = useState(false);
  const items = quotation.items || [];
  const msg = renderTemplate(state.settings?.whatsapp_template, quotation, items);

  const canSend = Boolean(me?.whatsapp_connected);

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`${PLATE_PROXY_URL}/api/whatsapp/enviar/${quotation.id}`, { method: 'POST', credentials: 'include' });
      if (res.status === 401) { dispatch({ type: 'logout' }); return; }
      const json = await res.json().catch(() => ({}));
      if (!json.ok) {
        if (json.code === 'CONNECTION_CLOSED') {
          dispatch({ type: 'whatsapp_disconnect', userId: me?.id });
          dispatch({ type: 'toast', tone: 'error', message: 'Sessão WhatsApp encerrada. Reconecte nas configurações e tente novamente.' });
        } else {
          dispatch({ type: 'toast', tone: 'error', message: json.message || 'Erro ao enviar WhatsApp.' });
        }
        setSending(false);
        return;
      }
    } catch (err) {
      dispatch({ type: 'toast', tone: 'error', message: `Erro de conexão: ${err?.message || String(err)}` });
      setSending(false);
      return;
    }
    dispatch({ type: 'send_whatsapp', id: quotation.id, approvalToken: json.approvalToken || null });
    dispatch({ type: 'toast', tone: 'success', message: 'WhatsApp enviado!' });
    setSending(false);
    onClose();
  }

  return (
    <Modal open={true} onClose={onClose} title="Enviar cotação por WhatsApp" icon="bi-whatsapp"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="whatsapp" icon={sending ? 'bi-arrow-clockwise' : 'bi-send'}
            onClick={send} disabled={sending || !canSend}>
            {sending ? 'Enviando…' : 'Enviar agora'}
          </Button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          <div className="avatar" style={{ background: '#16a34a', color: '#fff' }}><i className="bi bi-whatsapp"></i></div>
          <div>
            <div className="bold">{quotation.customer_name}</div>
            <div className="tiny faint mono">{fmt.phone(quotation.customer_phone)}</div>
          </div>
        </div>
        <div style={{ background: 'var(--wa-bg)', borderRadius: 12, padding: 16, minHeight: 200 }}>
          <div style={{ background: 'var(--wa-bubble)', borderRadius: 8, padding: 12, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', maxWidth: 360, marginLeft: 'auto', color: '#111' }}>
            {msg}
            <div style={{ textAlign: 'right', fontSize: 10, color: '#666', marginTop: 6 }}>
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} <i className="bi bi-check2-all" style={{ color: '#34b7f1' }}></i>
            </div>
          </div>
        </div>
        {!canSend && (
          <div className="tiny" style={{ textAlign: 'center', color: 'var(--text-faint)' }}>
            Conecte seu WhatsApp na barra lateral para enviar mensagens.
          </div>
        )}
      </div>
    </Modal>
  );
}

function WhatsAppConnectModal({ userId, onClose }) {
  const { state, dispatch } = useStore();
  const currentUserId = state.currentUserId;
  // Se o admin está conectando outro usuário, envia targetUserId para o backend
  const targetQuery = (userId && userId !== currentUserId) ? `?targetUserId=${userId}` : '';
  const targetBody  = (userId && userId !== currentUserId) ? JSON.stringify({ targetUserId: userId }) : undefined;

  const [phase, setPhase] = useState('loading'); // loading | qr | connected | timeout | error
  const [qrSrc, setQrSrc] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const pollRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        // 0. Verifica se já está conectado — dupla checagem com 1.5s de intervalo
        // para tolerar latência de propagação da Evolution API após um disconnect recente
        const stCheck = await fetch(`${PLATE_PROXY_URL}/api/whatsapp/instancia/status${targetQuery}`, { credentials: 'include' });
        if (!stCheck.ok && stCheck.status === 401) {
          if (!cancelled) dispatch({ type: 'logout' });
          return;
        }
        const stJson = await stCheck.json();
        if (stJson.connected) {
          // Confirma com segunda checagem: evita fechar o modal por status ainda
          // 'open' enquanto a Evolution API ainda processa um disconnect recente
          await new Promise(r => setTimeout(r, 1500));
          if (cancelled) return;
          const st2 = await fetch(`${PLATE_PROXY_URL}/api/whatsapp/instancia/status${targetQuery}`, { credentials: 'include' });
          const st2Json = await st2.json().catch(() => ({}));
          if (st2Json.connected) {
            dispatch({ type: 'whatsapp_connect', userId });
            setPhase('connected');
            return;
          }
          // Status mudou entre as duas checagens — Evolution processou o disconnect
          // durante o intervalo: continua para o fluxo de QR normalmente
        }

        // 1. Garante que a instância existe
        const criarRes = await fetch(`${PLATE_PROXY_URL}/api/whatsapp/instancia/criar`, {
          method: 'POST', credentials: 'include',
          headers: targetBody ? { 'Content-Type': 'application/json' } : undefined,
          body: targetBody,
        });
        if (criarRes.status === 401) {
          if (!cancelled) dispatch({ type: 'logout' });
          return;
        }
        if (!criarRes.ok) {
          const criarJson = await criarRes.json().catch(() => ({}));
          setPhase('error');
          setErrorMsg(criarJson.message || 'Não foi possível inicializar a instância WhatsApp.');
          return;
        }

        // 2. Busca QR Code — retry até 5x com 2s de intervalo (Evolution pode demorar um instante para gerar)
        let base64 = null;
        for (let attempt = 0; attempt < 5 && !base64 && !cancelled; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
          const qrRes = await fetch(`${PLATE_PROXY_URL}/api/whatsapp/instancia/qrcode${targetQuery}`, { credentials: 'include', cache: 'no-store' });
          const qrJson = await qrRes.json();
          if (cancelled) return;
          if (!qrJson.ok) {
            setPhase('error');
            const apiMsg = qrJson.message || qrJson.error || '';
            setErrorMsg(apiMsg === 'Não autenticado' ? 'Sua sessão expirou. Faça login novamente.' : apiMsg || 'Não foi possível gerar o QR Code.');
            return;
          }
          // Instância já conectada — tratar como sucesso
          if (qrJson.already_connected) {
            dispatch({ type: 'whatsapp_connect', userId });
            setPhase('connected');
            return;
          }
          base64 = qrJson.data?.base64 || qrJson.data?.qrcode || null;
        }
        if (cancelled) return;
        if (!base64) {
          setPhase('error');
          setErrorMsg('QR Code não ficou disponível. Clique em Tentar novamente.');
          return;
        }
        setQrSrc(base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`);
        setPhase('qr');

        // 3. Polling de status até conectar (máx 3 min)
        let attempts = 0;
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          if (cancelled) return;
          attempts++;
          if (attempts > 36) { clearInterval(pollRef.current); if (!cancelled) setPhase('timeout'); return; } // 3min
          try {
            const st = await fetch(`${PLATE_PROXY_URL}/api/whatsapp/instancia/status${targetQuery}`, { credentials: 'include' });
            const s = await st.json();
            if (s.connected) {
              clearInterval(pollRef.current);
              if (!cancelled) {
                dispatch({ type: 'whatsapp_connect', userId });
                setPhase('connected');
              }
            } else {
              // Atualiza QR se disponível (pode expirar e gerar novo)
              try {
                const nq = await fetch(`${PLATE_PROXY_URL}/api/whatsapp/instancia/qrcode${targetQuery}`, { credentials: 'include', cache: 'no-store' });
                const nqj = await nq.json();
                if (nqj.ok && !nqj.already_connected && !cancelled) {
                  const b = nqj.data?.base64 || nqj.data?.qrcode || null;
                  if (b) setQrSrc(b.startsWith('data:') ? b : `data:image/png;base64,${b}`);
                }
              } catch (_) {}
            }
          } catch (_) {}
        }, 5000);
      } catch (err) {
        if (!cancelled) {
          setPhase('error');
          setErrorMsg(`Erro: ${err?.message || err} — URL: ${PLATE_PROXY_URL}`);
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [userId, retryCount]);

  React.useEffect(() => {
    if (phase === 'connected') {
      const t = setTimeout(onClose, 1500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  async function forceReconnect() {
    setPhase('loading');
    setQrSrc(null);
    setErrorMsg('');
    await fetch(`${PLATE_PROXY_URL}/api/whatsapp/instancia/desconectar${targetQuery}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
    dispatch({ type: 'whatsapp_disconnect', userId });
    setRetryCount(c => c + 1);
  }

  return (
    <Modal open={true} onClose={onClose} title="Conectar WhatsApp" icon="bi-whatsapp"
      footer={
        <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          {phase === 'qr' && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--text-faint)' }}
              onClick={forceReconnect}>
              <i className="bi bi-arrow-clockwise" style={{ fontSize: 11 }}></i> Gerar novo QR
            </button>
          )}
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      }
    >
      <div className="col" style={{ alignItems: 'center', gap: 20, padding: '8px 0' }}>
        {phase === 'loading' && (
          <>
            <i className="bi bi-arrow-clockwise" style={{ fontSize: 36, color: 'var(--brand)', animation: 'spin 1s linear infinite' }}></i>
            <div className="muted">Preparando QR Code…</div>
            <div className="tiny faint" style={{ textAlign: 'center', maxWidth: 260 }}>
              Na primeira conexão pode levar até 30 segundos
            </div>
          </>
        )}
        {phase === 'qr' && (
          <>
            {qrSrc
              ? <img src={qrSrc} alt="QR Code WhatsApp" style={{ width: 220, height: 220, borderRadius: 12, border: '1px solid var(--border)' }} />
              : <div style={{ width: 220, height: 220, borderRadius: 12, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="bi bi-arrow-clockwise" style={{ fontSize: 32, color: 'var(--brand)', animation: 'spin 1s linear infinite' }}></i>
                </div>
            }
            <div style={{ textAlign: 'center' }}>
              <div className="muted tiny" style={{ fontWeight: 600, marginBottom: 4 }}>
                Abra o WhatsApp no celular
              </div>
              <div className="tiny faint">
                Menu (⋮) → Dispositivos conectados → Conectar dispositivo
              </div>
            </div>
            <div className="tiny faint" style={{ background: 'var(--surface-2)', padding: '4px 10px', borderRadius: 6 }}>
              QR atualizado automaticamente a cada 60s
            </div>
          </>
        )}
        {phase === 'connected' && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: 99, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-check-lg" style={{ fontSize: 36, color: '#16a34a' }}></i>
            </div>
            <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 15 }}>WhatsApp conectado!</div>
            <div className="tiny faint">Fechando automaticamente…</div>
          </>
        )}
        {phase === 'timeout' && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: 99, background: 'rgba(245,158,11,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-clock-history" style={{ fontSize: 32, color: '#d97706' }}></i>
            </div>
            <div style={{ fontWeight: 600, color: '#92400e', fontSize: 13 }}>QR Code expirou</div>
            <div className="muted tiny" style={{ textAlign: 'center', maxWidth: 270 }}>
              O aparelho não foi conectado em 3 minutos. Gere um novo QR Code para tentar novamente.
            </div>
            <Button variant="primary" size="sm" onClick={forceReconnect}>
              <i className="bi bi-arrow-clockwise"></i> Gerar novo QR
            </Button>
          </>
        )}
        {phase === 'error' && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: 99, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-exclamation-triangle" style={{ fontSize: 30, color: '#dc2626' }}></i>
            </div>
            <div style={{ fontWeight: 600, color: '#dc2626', fontSize: 13 }}>Erro ao conectar</div>
            <div className="muted tiny" style={{ textAlign: 'center', maxWidth: 280 }}>{errorMsg}</div>
            <Button variant="primary" size="sm" onClick={() => { setPhase('loading'); setQrSrc(null); setErrorMsg(''); setRetryCount(c => c + 1); }}>
              <i className="bi bi-arrow-clockwise"></i> Tentar novamente
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

/* =========================================================
   New quotation
   ========================================================= */
function NewQuotation() {
  const { state, dispatch } = useStore();
  const [step, setStep] = useState(1);
  // customer
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [step1Touched, setStep1Touched] = useState(false);
  // vehicle
  const [plate, setPlate] = useState('');
  const [plateLoading, setPlateLoading] = useState(false);
  const [plateFound, setPlateFound] = useState(false);
  const [plateWarning, setPlateWarning] = useState('');
  const [vehicle, setVehicle] = useState({ make: '', model: '', year_model: '', year_manuf: '', color: '', fuel: '', chassis: '' });
  // items
  const [items, setItems] = useState([]);
  const [partQuery, setPartQuery] = useState('');
  // notes + photo
  const [notesVendas, setNotesVendas] = useState('');
  const [photo, setPhoto] = useState(null);
  const fileRef = useRef(null);

  async function lookupPlate() {
    const key = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!key) return;
    setPlateLoading(true);
    setPlateWarning('');
    try {
      const res = await fetch(`${PLATE_PROXY_URL}/api/placa/${key}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok && json.data) {
        setVehicle({
          make:       json.data.make || '',
          model:      json.data.model || '',
          year_model: String(json.data.year_model || ''),
          year_manuf: String(json.data.year_manuf || ''),
          color:      json.data.color || '',
          fuel:       json.data.fuel || '',
          chassis:    json.data.chassis || '',
        });
        setPlateFound(true);
        dispatch({ type: 'toast', tone: 'success', message: 'Dados do veículo carregados' });
      } else {
        setPlateFound(false);
        dispatch({ type: 'toast', tone: 'error', message: json.message || 'Placa não encontrada — preencha manualmente' });
      }
    } catch (_err) {
      setPlateFound(false);
      dispatch({ type: 'toast', tone: 'error', message: 'Erro ao consultar placa. Preencha manualmente.' });
    } finally {
      const existing = state.quotations.find(
        q => q.vehicle.plate.toUpperCase() === key && ['pendente', 'em_cotacao'].includes(q.status)
      );
      if (existing) {
        setPlateWarning(`⚠️ Este veículo já possui a cotação ${existing.quote_number} em aberto (${STATUS_META[existing.status].label}).`);
      }
      setPlateLoading(false);
    }
  }

  function addItem(part) {
    setItems(prev => [...prev, { part_name: part.name, part_code: part.code, quantity: 1 }]);
    setPartQuery('');
  }

  function addManualItem() {
    setItems(prev => [...prev, { part_name: '', part_code: '', quantity: 1 }]);
  }
  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }
  function updateItem(idx, field, v) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: v } : it));
  }

  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(f);
  }

  const phoneDigits = customerPhone.replace(/\D/g, '');
  const canStep1 = customerName.trim() && (phoneDigits.length === 10 || phoneDigits.length === 11);

  // Histórico do cliente: encontra cotações do telefone digitado
  const existingCustomer = phoneDigits.length >= 10
    ? (state.customers || []).find(c => c.phone && c.phone.replace(/\D/g, '') === phoneDigits)
    : null;
  const customerHistory = existingCustomer
    ? (state.quotations || [])
        .filter(q => q.customer_phone && q.customer_phone.replace(/\D/g, '') === phoneDigits)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5)
    : [];
  const canStep2 = plate && vehicle.make && vehicle.model;
  const validItems = items.filter(i => i.part_name && i.quantity > 0);
  const canSubmit = canStep1 && canStep2 && validItems.length > 0;

  function submit() {
    dispatch({
      type: 'create_quotation',
      payload: {
        customer_name: customerName,
        customer_phone: customerPhone.replace(/\D/g, ''),
        vehicle: {
          plate: plate.toUpperCase(),
          make: vehicle.make, model: vehicle.model,
          year_model: Number(vehicle.year_model) || null,
          year_manuf: Number(vehicle.year_manuf) || null,
          color: vehicle.color, fuel: vehicle.fuel,
          chassis: vehicle.chassis || '',
        },
        items: validItems,
        notes_vendas: notesVendas,
        photo_path: photo,
      },
    });
  }

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <div className="page-head">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'navigate', name: 'quotations' })} style={{ marginBottom: 8 }}>
            <i className="bi bi-arrow-left"></i> Voltar
          </button>
          <h2 className="page-title">Nova cotação</h2>
          <p className="page-sub">Cadastre o cliente, veículo e peças. O setor de compras será notificado.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="timeline" data-tour="form-stepper">
          {[
            { k: 1, label: 'Cliente', icon: 'bi-person' },
            { k: 2, label: 'Veículo', icon: 'bi-car-front' },
            { k: 3, label: 'Peças', icon: 'bi-gear' },
            { k: 4, label: 'Observações', icon: 'bi-chat-text' },
          ].map(s => (
            <div key={s.k} className={`timeline-step ${step > s.k ? 'done' : step === s.k ? 'current' : ''}`}>
              <span className="timeline-dot"><i className={`bi ${step > s.k ? 'bi-check2' : s.icon}`}></i></span>
              <div className="timeline-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: customer */}
      {step === 1 && (
        <div className="card card-pad" data-tour="form-step1" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0 }}>Dados do cliente</h3>
          <div className="grid-2">
            <Field label="Nome completo *" error={step1Touched && !customerName.trim() ? 'Nome é obrigatório' : ''}>
              <input className="input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Carlos Eduardo Mendes" autoFocus style={step1Touched && !customerName.trim() ? { borderColor: '#dc2626' } : {}} />
            </Field>
            <Field label="WhatsApp *" hint="Com DDD, sem espaços" error={step1Touched && !(phoneDigits.length === 10 || phoneDigits.length === 11) ? 'Informe DDD + número (10 ou 11 dígitos)' : ''}>
              <div className="input-group">
                <i className="bi bi-whatsapp input-icon" style={{ color: '#16a34a' }}></i>
                <input className="input mono" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="11987654321" style={step1Touched && !(phoneDigits.length === 10 || phoneDigits.length === 11) ? { borderColor: '#dc2626' } : {}} />
              </div>
            </Field>
          </div>
          {/* Histórico do cliente — aparece quando o telefone já existe na base */}
          {existingCustomer && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: 'var(--brand-soft)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-person-check" style={{ color: 'var(--brand)', fontSize: 14 }}></i>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--brand)' }}>Cliente já cadastrado</span>
                {!customerName.trim() && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginLeft: 'auto', fontSize: 11 }}
                    onClick={() => setCustomerName(existingCustomer.name)}>
                    Usar nome: {existingCustomer.name}
                  </button>
                )}
              </div>
              {customerHistory.length === 0 ? (
                <div className="tiny faint" style={{ padding: '10px 14px' }}>Nenhuma cotação anterior.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {customerHistory.map((q, i) => {
                    const { grandTotal } = calcTotals(q.items);
                    const meta = STATUS_META[q.status] || {};
                    return (
                      <div key={q.id}
                        onClick={() => dispatch({ type: 'navigate', name: 'quotation-detail', params: { id: q.id } })}
                        style={{ padding: '8px 14px', borderBottom: i < customerHistory.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                            <span className="mono bold" style={{ fontSize: 12 }}>{q.quote_number}</span>
                            <StatusBadge status={q.status} />
                          </div>
                          <div className="tiny faint">
                            {q.vehicle?.make} {q.vehicle?.model} · {fmt.ago(q.created_at)}
                          </div>
                        </div>
                        {grandTotal > 0 && (
                          <span className="mono small" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt.brl(grandTotal)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="primary" iconRight="bi-arrow-right" onClick={() => { setStep1Touched(true); if (canStep1) setStep(2); }}>Próximo</Button>
          </div>
        </div>
      )}

      {/* Step 2: vehicle */}
      {step === 2 && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0 }}>Veículo</h3>
          <Field label="Placa" hint="Digite a placa e consulte para autocompletar (tente ABC1D23, XYZ5E67, RIO3F45…)">
            <div className="row" style={{ gap: 8 }}>
              <div className="input-group" style={{ flex: 1 }}>
                <i className="bi bi-tag input-icon"></i>
                <input
                  className="input mono"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}
                  value={plate} onChange={e => setPlate(e.target.value.toUpperCase())}
                  placeholder="ABC1D23"
                  maxLength={8}
                />
              </div>
              <Button variant="secondary" icon={plateLoading ? 'bi-arrow-clockwise' : 'bi-search'} onClick={lookupPlate} disabled={!plate || plateLoading}>
                {plateLoading ? 'Consultando…' : 'Consultar'}
              </Button>
            </div>
          </Field>

          {plateFound && (
            <div className="row" style={{ padding: 10, background: 'var(--st-cotado-bg)', color: 'var(--st-cotado)', borderRadius: 'var(--r-md)', gap: 8 }}>
              <i className="bi bi-check-circle-fill"></i>
              <span className="small semibold">Dados encontrados na base de placas (WDAPI)</span>
            </div>
          )}
          {plateWarning && (
            <div className="row" style={{ padding: 10, background: '#fef3c7', color: '#b45309', borderRadius: 'var(--r-md)', gap: 8, border: '1px solid #fde68a' }}>
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span className="small">{plateWarning}</span>
            </div>
          )}

          <div className="grid-2">
            <Field label="Fabricante *"><input className="input" value={vehicle.make} onChange={e => setVehicle({ ...vehicle, make: e.target.value })} placeholder="VOLKSWAGEN" /></Field>
            <Field label="Modelo *"><input className="input" value={vehicle.model} onChange={e => setVehicle({ ...vehicle, model: e.target.value })} placeholder="Gol 1.0" /></Field>
            <Field label="Ano fabricação"><input className="input mono" type="number" value={vehicle.year_manuf} onChange={e => setVehicle({ ...vehicle, year_manuf: e.target.value })} placeholder="2018" /></Field>
            <Field label="Ano modelo"><input className="input mono" type="number" value={vehicle.year_model} onChange={e => setVehicle({ ...vehicle, year_model: e.target.value })} placeholder="2019" /></Field>
            <Field label="Cor"><input className="input" value={vehicle.color} onChange={e => setVehicle({ ...vehicle, color: e.target.value })} placeholder="PRATA" /></Field>
            <Field label="Chassi">
              <input className="input mono" value={vehicle.chassis} onChange={e => setVehicle({ ...vehicle, chassis: e.target.value.toUpperCase() })} placeholder="9BWZZZ377VT004251" style={{ letterSpacing: '0.05em' }} />
            </Field>
          </div>
          <div className="row between">
            <Button variant="ghost" icon="bi-arrow-left" onClick={() => setStep(1)}>Voltar</Button>
            <Button variant="primary" iconRight="bi-arrow-right" disabled={!canStep2} onClick={() => setStep(3)}>Próximo</Button>
          </div>
        </div>
      )}

      {/* Step 3: parts */}
      {step === 3 && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="row between">
            <h3 style={{ margin: 0 }}>Peças solicitadas</h3>
            <Button variant="ghost" size="sm" icon="bi-plus-lg" onClick={addManualItem}>Item manual</Button>
          </div>

          <PartAutocomplete value={partQuery} onChange={setPartQuery} onPick={addItem} />

          <div className="card" style={{ background: 'var(--surface-2)' }}>
            {items.length === 0 ? (
              <EmptyState icon="bi-gear" title="Nenhuma peça adicionada"
                message="Busque no catálogo acima ou clique em 'Item manual'." />
            ) : (
              <div className="tbl-wrap"><table className="tbl">
                <thead>
                  <tr>
                    <th>Peça</th>
                    <th>Código</th>
                    <th style={{ width: 90 }}>Quantidade</th>
                    <th style={{ width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        <input className="input" value={it.part_name} onChange={e => updateItem(i, 'part_name', e.target.value)} placeholder="Nome da peça" />
                      </td>
                      <td>
                        <input className="input mono small" value={it.part_code || ''} onChange={e => updateItem(i, 'part_code', e.target.value)} placeholder="—" style={{ width: 110 }} />
                      </td>
                      <td>
                        <input className="input mono" type="number" min="1" value={it.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
                      </td>
                      <td>
                        <button className="icon-btn" onClick={() => removeItem(i)} title="Remover">
                          <i className="bi bi-trash3" style={{ fontSize: 14, color: 'var(--text-faint)' }}></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ paddingTop: 6 }}>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={addManualItem} style={{ gap: 6 }}>
                        <i className="bi bi-plus-lg"></i> Adicionar peça
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table></div>
            )}
          </div>

          <div className="row between">
            <Button variant="ghost" icon="bi-arrow-left" onClick={() => setStep(2)}>Voltar</Button>
            <Button variant="primary" iconRight="bi-arrow-right" disabled={validItems.length === 0} onClick={() => setStep(4)}>Próximo</Button>
          </div>
        </div>
      )}

      {/* Step 4: notes + photo */}
      {step === 4 && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0 }}>Observações e foto (opcional)</h3>
          <Field label="Observação para Compras">
            <textarea className="textarea" value={notesVendas} onChange={e => setNotesVendas(e.target.value)} rows={4}
              placeholder="Detalhe o que foi relatado pelo cliente, urgência, preferências…" />
          </Field>
          <Field label="Foto da peça ou problema">
            {photo ? (
              <div className="photo-preview">
                <img src={photo} alt="Foto" />
                <button className="remove" onClick={() => setPhoto(null)}>
                  <i className="bi bi-x-lg" style={{ fontSize: 12 }}></i>
                </button>
              </div>
            ) : (
              <div className="dropzone" onClick={() => fileRef.current && fileRef.current.click()}>
                <i className="bi bi-cloud-arrow-up"></i>
                <div className="semibold small">Clique para enviar uma foto</div>
                <div className="tiny faint" style={{ marginTop: 4 }}>JPG, PNG até 5MB</div>
                <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
              </div>
            )}
          </Field>

          <div className="card" style={{ background: 'var(--brand-soft)', border: 0 }}>
            <div className="card-pad">
              <div className="tiny" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--brand)' }}>Resumo</div>
              <div className="grid-2" style={{ marginTop: 12, gap: 16 }}>
                <div>
                  <div className="tiny faint">Cliente</div>
                  <div className="semibold">{customerName}</div>
                  <div className="mono tiny faint">{fmt.phone(customerPhone)}</div>
                </div>
                <div>
                  <div className="tiny faint">Veículo</div>
                  <div className="semibold">{vehicle.make} {vehicle.model}</div>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <Plate value={plate} />
                    <span className="tiny faint mono">{vehicle.year_manuf}/{vehicle.year_model}</span>
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="tiny faint">Peças ({validItems.length})</div>
                  <div className="small" style={{ marginTop: 4 }}>
                    {validItems.map((it, i) => <div key={i}>· {it.part_name} <span className="mono faint tiny">x{it.quantity}</span></div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row between">
            <Button variant="ghost" icon="bi-arrow-left" onClick={() => setStep(3)}>Voltar</Button>
            <Button variant="primary" icon="bi-send" disabled={!canSubmit} onClick={submit}>Abrir cotação</Button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { QuotationsList, QuotationDetail, NewQuotation });

