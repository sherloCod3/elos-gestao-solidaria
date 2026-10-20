import { closeDatabase, openDatabase, transaction } from '../db.js';
import { addDaysIso, todayIso } from '../lib/date.js';
import {
  adjustStock,
  confirmDelivery,
  createDelivery,
  createDonation,
  createDonor,
  createFamily,
  createResource,
  validateDonation,
} from '../lib/services.js';

const db = openDatabase();
const today = todayIso();

const existing = Number(db.prepare('SELECT COUNT(*) AS total FROM recurso').get().total);
if (existing > 0) {
  console.log('Banco já possui recursos. Seed ignorado.');
  closeDatabase(db);
  process.exit(0);
}

let coordinator = db
  .prepare("SELECT * FROM usuario WHERE papel = 'coordenacao' AND ativo = 1 ORDER BY id LIMIT 1")
  .get();

if (!coordinator) {
  transaction(db, () => {
    db.prepare("INSERT INTO usuario (nome, papel, ativo) VALUES ('Coordenação Demo', 'coordenacao', 1)").run();
    db.prepare("INSERT INTO usuario (nome, papel, ativo) VALUES ('Voluntário Demo', 'voluntario', 1)").run();
  });
  coordinator = db
    .prepare("SELECT * FROM usuario WHERE papel = 'coordenacao' AND ativo = 1 ORDER BY id LIMIT 1")
    .get();
}

const volunteer = db
  .prepare("SELECT * FROM usuario WHERE papel = 'voluntario' AND ativo = 1 ORDER BY id LIMIT 1")
  .get();

const arroz = createResource(
  db,
  { nome: 'Arroz 5 kg', tipo: 'bem', unidade: 'kg', categoria: 'Alimentos', estoque_minimo: '10', ativo: '1' },
  coordinator,
);
const feijao = createResource(
  db,
  { nome: 'Feijão 1 kg', tipo: 'bem', unidade: 'kg', categoria: 'Alimentos', estoque_minimo: '8', ativo: '1' },
  coordinator,
);
const cobertor = createResource(
  db,
  { nome: 'Cobertor', tipo: 'bem', unidade: 'un', categoria: 'Abrigo', estoque_minimo: '5', ativo: '1' },
  coordinator,
);
const leite = createResource(
  db,
  { nome: 'Leite 1 L', tipo: 'bem', unidade: 'L', categoria: 'Alimentos', estoque_minimo: '12', ativo: '1' },
  coordinator,
);

const mercado = createDonor(
  db,
  { nome: 'Mercado Exemplo', tipo: 'PJ', contato: 'contato fictício' },
  coordinator,
);
const doadorTeste = createDonor(db, { nome: 'Doador Teste', tipo: 'PF' }, coordinator);

const familia1 = createFamily(db, { codigo: 'F-001', observacoes: 'Família de demonstração' }, coordinator);
const familia2 = createFamily(db, { codigo: 'F-002', observacoes: 'Família de demonstração' }, coordinator);
createFamily(db, { codigo: 'F-003', observacoes: 'Família de demonstração' }, coordinator);

const donation1 = createDonation(
  db,
  {
    doador_id: String(mercado),
    data: addDaysIso(today, -12),
    responsavel_id: String(coordinator.id),
    observacoes: 'Carga inicial de demonstração',
    items: [
      { recurso_id: String(arroz), quantidade: '20', validade: addDaysIso(today, 20) },
      { recurso_id: String(feijao), quantidade: '10', validade: addDaysIso(today, 15) },
    ],
  },
  coordinator,
);
validateDonation(db, donation1, coordinator);

createDonation(
  db,
  {
    doador_id: String(doadorTeste),
    data: addDaysIso(today, -1),
    responsavel_id: String(volunteer?.id ?? coordinator.id),
    observacoes: 'Aguardando conferência da coordenação',
    items: [{ recurso_id: String(cobertor), quantidade: '5' }],
  },
  coordinator,
);

const delivery1 = createDelivery(
  db,
  {
    familia_id: String(familia1),
    data: addDaysIso(today, -3),
    responsavel_id: String(coordinator.id),
    observacoes: 'Entrega de demonstração',
    items: [
      { recurso_id: String(arroz), quantidade: '2' },
      { recurso_id: String(feijao), quantidade: '1' },
    ],
  },
  coordinator,
);
confirmDelivery(db, delivery1, coordinator);

createDelivery(
  db,
  {
    familia_id: String(familia2),
    data: addDaysIso(today, -1),
    responsavel_id: String(coordinator.id),
    observacoes: 'Aguardando confirmação',
    items: [{ recurso_id: String(arroz), quantidade: '1' }],
  },
  coordinator,
);

adjustStock(
  db,
  {
    recurso_id: String(leite),
    tipo_ajuste: 'entrada',
    quantidade: '12',
    motivo: 'Inventário inicial de demonstração',
    data: today,
  },
  coordinator,
);

console.log('Seed concluído: 4 recursos, 2 doadores, 3 famílias, 2 doações, 2 entregas e 1 ajuste.');
closeDatabase(db);
