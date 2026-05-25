const MOCK = {
  currentUser: { id: 2, name: 'João Vendas', role: 'vendas', email: 'vendas@cotou.com.br' },
  users: [
    { id: 1, name: 'Admin Sistema', email: 'admin@cotou.com.br', role: 'admin', active: true },
    { id: 2, name: 'João Vendas', email: 'vendas@cotou.com.br', role: 'vendas', active: true },
    { id: 3, name: 'Maria Compras', email: 'compras@cotou.com.br', role: 'compras', active: true }
  ],
  quotations: [
    { id:1, quote_number:'COT-2026-0001', status:'pendente', customer_name:'Carlos Eduardo Mendes', customer_phone:'(11)98765-4321', license_plate:'ABC1D23', model:'Volkswagen Gol 1.0', year_model:2019, creator_name:'João Vendas', buyer_name:null, notes_vendas:'Barulho ao frear, verificar pastilhas.', notes_compras:null, created_at:'2026-05-23T10:30:00Z', customer_approved:null, parts_total:0, grand_total:0 },
    { id:2, quote_number:'COT-2026-0002', status:'em_cotacao', customer_name:'Ana Paula Ferreira', customer_phone:'(21)99234-5678', license_plate:'XYZ5E67', model:'Toyota Corolla 2.0', year_model:2022, creator_name:'João Vendas', buyer_name:'Maria Compras', notes_vendas:'Folga na suspensão traseira.', notes_compras:null, created_at:'2026-05-21T14:00:00Z', customer_approved:null, parts_total:0, grand_total:0 },
    { id:3, quote_number:'COT-2026-0003', status:'cotado', customer_name:'Roberto Souza Lima', customer_phone:'(31)97654-3210', license_plate:'MNO3F89', model:'Chevrolet Onix Plus', year_model:2023, creator_name:'João Vendas', buyer_name:'Maria Compras', notes_vendas:'Embreagem patinando.', notes_compras:'Fornecedor AutoPeças Belo. Prazo 3 dias.', created_at:'2026-05-18T09:00:00Z', customer_approved:null, parts_total:525.00, grand_total:645.00 },
    { id:4, quote_number:'COT-2026-0004', status:'cotado', customer_name:'Fernanda Oliveira Costa', customer_phone:'(11)91234-5678', license_plate:'DEF2G45', model:'Ford Ka 1.5', year_model:2020, creator_name:'João Vendas', buyer_name:'Maria Compras', notes_vendas:'Vidro traseiro quebrado.', notes_compras:'Peça disponível em estoque.', created_at:'2026-05-20T11:00:00Z', customer_approved:1, parts_total:320.00, grand_total:380.00 },
    { id:5, quote_number:'COT-2026-0005', status:'peca_chegou', customer_name:'Marcelo Andrade', customer_phone:'(41)98888-1234', license_plate:'GHI7H01', model:'Hyundai HB20', year_model:2021, creator_name:'João Vendas', buyer_name:'Maria Compras', notes_vendas:'Sensor de estacionamento com defeito.', notes_compras:'Sensor chegou conforme prazo.', created_at:'2026-05-15T08:00:00Z', customer_approved:1, parts_total:320.00, grand_total:410.00 },
    { id:6, quote_number:'COT-2026-0006', status:'cancelado', customer_name:'Juliana Nascimento', customer_phone:'(85)97777-9999', license_plate:'JKL4I56', model:'Fiat Strada', year_model:2022, creator_name:'João Vendas', buyer_name:null, notes_vendas:'Troca de bateria.', notes_compras:null, created_at:'2026-05-17T16:00:00Z', customer_approved:0, parts_total:0, grand_total:0 },
    { id:7, quote_number:'COT-2026-0007', status:'pendente', customer_name:'Diego Carvalho', customer_phone:'(11)96543-2109', license_plate:'PQR8J90', model:'Renault Kwid', year_model:2020, creator_name:'João Vendas', buyer_name:null, notes_vendas:'Motor superaquecendo.', notes_compras:null, created_at:'2026-05-24T07:00:00Z', customer_approved:null, parts_total:0, grand_total:0 },
    { id:8, quote_number:'COT-2026-0008', status:'em_cotacao', customer_name:'Patrícia Rocha Santos', customer_phone:'(51)95555-8765', license_plate:'STU6K34', model:'Honda Civic 1.5T', year_model:2023, creator_name:'João Vendas', buyer_name:'Maria Compras', notes_vendas:'Revisão 40.000 km.', notes_compras:null, created_at:'2026-05-22T13:00:00Z', customer_approved:null, parts_total:0, grand_total:0 }
  ],
  quotationItems: [
    { id:1, quotation_id:3, part_name:'Kit Embreagem Completo', part_code:'KE-7731', quantity:1, unit_price:480.00, total_price:480.00, labor_cost_compras:120.00, delivery_days:3, supplier_name:'AutoPeças Belo', item_status:'cotado', notes:'Kit inclui disco, platô e rolamento' },
    { id:2, quotation_id:3, part_name:'Cabo de Embreagem', part_code:'CE-1104', quantity:1, unit_price:45.00, total_price:45.00, labor_cost_compras:0, delivery_days:3, supplier_name:'AutoPeças Belo', item_status:'cotado', notes:null }
  ],
  parts: [
    { id:1, code:'PF-1023', name:'Pastilha de Freio Dianteira', description:'Kit com 4 pastilhas', default_price:89.90, category:'Freios' },
    { id:2, code:'DF-4401', name:'Disco de Freio Dianteiro', description:'Par de discos ventilados', default_price:210.00, category:'Freios' },
    { id:3, code:'AT-2210', name:'Amortecedor Traseiro', description:'Par com mola', default_price:380.00, category:'Suspensão' },
    { id:4, code:'KE-7731', name:'Kit Embreagem Completo', description:'Disco + platô + rolamento', default_price:480.00, category:'Embreagem' },
    { id:5, code:'FO-1122', name:'Filtro de Óleo', description:'Rosca 3/4-16', default_price:28.00, category:'Motor' },
    { id:6, code:'FA-3344', name:'Filtro de Ar', description:'Elemento filtrante', default_price:42.00, category:'Motor' },
    { id:7, code:'BAT-60', name:'Bateria 60Ah', description:'Selada livre de manutenção', default_price:380.00, category:'Elétrica' },
    { id:8, code:'BD-5510', name:'Bomba D\'Água', description:'Com junta', default_price:165.00, category:'Motor' },
    { id:9, code:'VT-3302', name:'Vidro Traseiro Liso', description:'Original', default_price:320.00, category:'Carroceria' },
    { id:10, code:'SE-6612', name:'Sensor de Estacionamento Traseiro', description:'Kit 4 sensores', default_price:35.00, category:'Elétrica' }
  ],
  notifications: [
    { id:1, type:'cotacao_respondida', title:'Cotação #COT-2026-0003 respondida!', message:'Maria Compras preencheu os valores. Verifique e envie ao cliente.', read_at:null, quotation_id:3, created_at:'2026-05-25T09:00:00Z', time_label:'2h atrás' },
    { id:2, type:'peca_chegou', title:'Peça chegou — Cotação #COT-2026-0005', message:'Maria Compras confirmou a chegada. Avise o cliente!', read_at:null, quotation_id:5, created_at:'2026-05-24T16:00:00Z', time_label:'ontem' },
    { id:3, type:'status_atualizado', title:'Cotação #COT-2026-0002 atualizada', message:'Status alterado para "Em Cotação" por Maria Compras.', read_at:'2026-05-21T15:00:00Z', quotation_id:2, created_at:'2026-05-21T15:00:00Z', time_label:'4 dias atrás' },
    { id:4, type:'nova_cotacao', title:'Nova cotação #COT-2026-0008', message:'João Vendas abriu cotação para Patrícia Rocha — Honda Civic STU6K34', read_at:'2026-05-22T14:00:00Z', quotation_id:8, created_at:'2026-05-22T13:05:00Z', time_label:'3 dias atrás' },
    { id:5, type:'cotacao_atualizada', title:'Cliente APROVOU — Cotação #COT-2026-0004', message:'João Vendas informou que o cliente aprovou. Pode encomendar!', read_at:'2026-05-20T12:00:00Z', quotation_id:4, created_at:'2026-05-20T11:30:00Z', time_label:'5 dias atrás' }
  ]
};
