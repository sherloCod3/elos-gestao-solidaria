# Etapa 3 — Verificação de Ferramentas e Arquitetura

**Projeto:** Desafio 3 — Tecnologia para o Impacto Social  
**MVP:** Doações, estoque e entregas  
**Data da verificação:** 19/10/2026  
**Status:** aprovada e implementada em 19/10/2026

---

## 1. Objetivo desta etapa

Verificar o que está disponível no ambiente, comparar alternativas de implementação e recomendar uma arquitetura capaz de sustentar o MVP aprovado na Etapa 2, sem comprometer:

- interface funcional com CSS/HTML customizável;
- formulários com validação;
- banco de dados relacional e persistente;
- workflow automatizado de status e movimentação de estoque;
- acompanhamento por dashboard, listas, filtros e histórico;
- rastreabilidade do saldo por meio de movimentos;
- demonstração local simples e evidências verificáveis;
- evolução aditiva para a v2.

---

## 2. Restrições e decisões já confirmadas

- O projeto e a documentação devem estar em **português (pt-BR)**.
- O MVP é **low-code** no contexto de desenvolvimento agêntico; **CSS/HTML customizado é permitido**.
- A v1 implementa apenas recursos do tipo `bem`.
- O saldo é derivado de `movimento_recurso`, não digitado manualmente.
- Famílias são identificadas por código (`F-000`), sem dados pessoais reais.
- Doações financeiras, notificações externas, lote/FEFO e aplicativo nativo estão fora da v1.
- Nenhuma integração deve ser declarada como funcional sem teste real.
- O diretório foi inicializado como repositório Git em 19/10/2026; a implementação está versionada.

---

## 3. Ambiente verificado

### 3.1 Disponibilidades

| Recurso | Resultado | Evidência |
|---|---|---|
| Node.js | v26.8.1 em `/usr/bin/node` | `node --version` |
| SQLite embutido no Node | disponível (`node:sqlite`) | teste com `DatabaseSync`, criação de tabela, insert e transação |
| Servidor HTTP nativo | disponível (`node:http`) | teste local com resposta HTTP 200 |
| Test runner nativo | disponível (`node:test`) | teste de sanidade executado com sucesso |
| Git | 2.55.0 | `git --version` |
| SQLite CLI | disponível | `sqlite3` |
| Python | 3.14.7 | `python3 --version` |
| Navegador | Chrome/Chromium disponíveis | binários do sistema |
| Rust/Cargo | 1.98.1 | `cargo --version` |
| Docker/Podman | não encontrados | `command -v docker/podman` sem resultado |

### 3.2 Ausências relevantes

| Recurso | Situação | Impacto |
|---|---|---|
| npm / npx | não instalados | impede instalar dependências JavaScript via npm e o instalador do Impeccable |
| pnpm / yarn / bun | não instalados | não há gerenciador de pacotes JS disponível |
| pip | não instalado por padrão | Flask/Django exigiriam instalação adicional |
| Docker | não instalado | auto-hospedagem de plataformas low-code fica inviável no ambiente atual |

### 3.3 Consequência prática

O ambiente favorece uma solução **sem dependências externas de frontend/backend**, usando o que já existe:

- Node.js para servidor HTTP e regras de negócio;
- `node:sqlite` para banco relacional;
- HTML renderizado no servidor;
- CSS e JavaScript vanilla para interface e interações;
- `node:test` para testes automatizados;
- Git para versionamento.

Isso não impede o uso de uma plataforma low-code externa, mas reduz custo, instalação e risco de bloqueio por conta/plano.

---

## 4. Alternativas avaliadas

### Alternativa A — Node.js + `node:sqlite` + HTML/CSS/JS server-side (recomendada)

**Como funciona**

- Um servidor HTTP nativo em Node.js entrega páginas HTML renderizadas no servidor.
- O banco SQLite é acessado por `node:sqlite`.
- Regras de validação, workflow e ledger ficam em módulos JavaScript testáveis.
- CSS próprio define a identidade visual; JavaScript vanilla melhora formulários e filtros.
- Testes usam `node:test`, sem dependências.

**Vantagens**

- Zero dependências externas obrigatórias.
- Controle total sobre CSS/HTML e UX.
- Banco relacional real, com transações e constraints.
- Workflow e invariantes de saldo implementados no servidor, não apenas na tela.
- Fácil de testar e de demonstrar localmente.
- Sem lock-in de plataforma; o código e o banco são exportáveis.
- Compatível com o uso de agentes para gerar e evoluir o código.

**Desvantagens**

- Exige implementar CRUD, formulários, navegação e responsividade manualmente.
- Não há autenticação/perfis prontos; a v1 usará o campo “responsável” e documentará essa limitação.
- SQLite é adequado para demonstração e equipe pequena, mas não para alta concorrência.
- O rótulo “low-code” depende da interpretação do curso; é uma solução code-first construída de forma agêntica.

**Aderência ao MVP:** alta.

---

### Alternativa B — Plataforma low-code (Budibase, Appsmith, ToolJet ou similar)

**Como funciona**

- A plataforma fornece componentes visuais, banco interno ou conexão com banco externo, autenticação e automações.
- Custom CSS/JS é usado para ajustes de interface e regras específicas.

**Vantagens**

- Entrega visual mais rápida.
- Autenticação, componentes e automações prontos.
- Aderência mais explícita ao rótulo “low-code”.

**Desvantagens**

- O ambiente não tem Docker nem npm; auto-hospedagem exigiria instalação adicional.
- Planos gratuitos podem limitar automações, usuários, histórico ou customização.
- Regras de ledger e validação de saldo podem exigir scripts/API, reduzindo o ganho do low-code.
- Maior risco de lock-in e de limitações de customização.
- O fluxo de demonstração depende de conta, disponibilidade do serviço e configuração da plataforma.

**Aderência ao MVP:** média a alta, se o curso exigir uma plataforma nomeada.

---

### Alternativa C — Python + SQLite + framework web

**Como funciona**

- Flask/Django ou até `http.server` com `sqlite3`.
- HTML/CSS renderizado no servidor.

**Vantagens**

- Linguagem simples e boa para regras de negócio.
- SQLite nativo.

**Desvantagens**

- O ambiente não tem pip instalado; seria necessário instalar dependências.
- Não oferece vantagem relevante sobre Node no ambiente atual.
- O mesmo esforço de interface continuaria manual.

**Aderência ao MVP:** média.

---

### Alternativa D — No-code hospedado (Airtable, Glide, Softr)

**Como funciona**

- Base de dados em serviço externo e interface gerada pela plataforma.

**Vantagens**

- Protótipo rápido.
- Pouco código.

**Desvantagens**

- Controle limitado sobre relacionamentos, transações e invariantes de saldo.
- Automações e customização frequentemente dependem de planos pagos.
- Custom CSS/HTML pode ser restrito.
- Maior dependência de fornecedor e de conectividade.
- Risco de o MVP parecer um formulário genérico, sem workflow verificável.

**Aderência ao MVP:** baixa para o núcleo de estoque e ledger.

---

## 5. Comparação objetiva

| Critério | A. Node + SQLite | B. Low-code platform | C. Python + SQLite | D. No-code hospedado |
|---|---|---|---|---|
| Interface customizável | Alta | Média | Alta | Baixa/média |
| Banco relacional real | Alta | Média/alta | Alta | Média |
| Workflow transacional | Alta | Média | Alta | Baixa/média |
| Invariantes de saldo | Alta | Média | Alta | Baixa |
| Facilidade no ambiente atual | Alta | Baixa/média | Média | Alta |
| Custo | Zero | Pode ter limite | Zero | Pode ter limite |
| Lock-in | Baixo | Médio/alto | Baixo | Alto |
| Aderência ao rótulo “low-code” | Média | Alta | Baixa | Alta |
| Controle sobre UX/UI | Alto | Médio | Alto | Baixo |
| Esforço inicial | Médio | Baixo/médio | Médio | Baixo |

---

## 6. Recomendação

**Recomendação: Alternativa A — Node.js + `node:sqlite` + HTML/CSS/JS server-side.**

Motivos:

1. É a única alternativa que funciona no ambiente atual sem instalar dependências ou depender de conta externa.
2. Permite implementar o ledger e as validações de saldo com transações reais, que é o coração do MVP.
3. Dá controle total sobre CSS/HTML, o que atende ao requisito de UI/UX e permite aplicar os princípios do Impeccable.
4. Facilita testes automatizados e evidências reproduzíveis.
5. Mantém a v2 viável, pois o modelo de dados e as regras ficam no código, não presos a um fornecedor.

### Condição de mudança

Se o curso exigir explicitamente uma plataforma low-code nomeada, a recomendação muda para a **Alternativa B**, com prototipação prévia para verificar:

- automação de status;
- relacionamentos e validações;
- custom CSS/HTML;
- limites do plano gratuito;
- exportação de dados;
- autenticação/perfis.

Nesse caso, a plataforma deve ser validada antes de qualquer implementação.

---

## 7. Arquitetura proposta

```text
kodie/
├── server.js                 # servidor HTTP e rotas
├── db.js                     # conexão SQLite, migrações e transações
├── schema.sql                # tabelas, índices e constraints
├── lib/
│   ├── validation.js         # validação e normalização
│   ├── ledger.js             # saldo e movimentos
│   ├── workflow.js           # transições de status
│   └── http.js               # helpers de request/response
├── views/
│   ├── layout.js             # shell HTML
│   ├── dashboard.js
│   ├── recursos.js
│   ├── doadores.js
│   ├── familias.js
│   ├── doacoes.js
│   ├── entregas.js
│   ├── estoque.js
│   └── historico.js
├── public/
│   ├── styles.css
│   └── app.js
├── scripts/
│   └── seed.js               # dados fictícios
├── tests/
│   ├── validation.test.js
│   ├── ledger.test.js
│   └── workflow.test.js
├── data/                     # banco em runtime; não versionar
├── docs/
├── planning/
└── README.md
```

### Decisões técnicas

- **Renderização no servidor:** reduz complexidade e mantém o fluxo verificável.
- **CSS próprio:** identidade visual “operacional”, responsiva e acessível.
- **JavaScript vanilla:** apenas para melhorias progressivas (linhas de itens, confirmações, filtros).
- **SQL parametrizado:** todas as consultas usam parâmetros, nunca concatenação de entrada.
- **Transações:** validação de doação e confirmação de entrega atualizam status e inserem movimentos atomicamente.
- **Saldo calculado:** `SUM` dos movimentos, com sinais por tipo; nunca um campo `saldo` editável.
- **Histórico append-only:** eventos de criação, transição, cancelamento e ajuste.
- **Testes nativos:** `node --test`, sem framework externo.

---

## 8. Modelo de dados e invariantes

O schema da Etapa 2 permanece válido. A implementação deve garantir:

- `recurso.tipo` aceita `bem` e `servico`; a UI da v1 expõe apenas `bem`.
- `movimento_recurso` é a fonte de verdade do saldo.
- `doacao` e `entrega` têm itens; cada item gera movimento na transição correta.
- `entrega.solicitacao_id` existe como coluna anulável, preparada para a v2.
- `historico_evento` registra eventos sem exclusão.
- `familia.codigo` é único.
- Não há saldo negativo para bens.
- Não há exclusão de registro com movimento; cancelamento gera movimento compensatório.
- Quantidades devem ser positivas e consistentes entre item e movimento.

### Quantidades

Para evitar erros de ponto flutuante no ledger, a implementação deve usar **inteiros** na v1. A forma mais simples é tratar a quantidade como unidades inteiras do recurso (ex.: `20` unidades, `5` kg, `2` cobertores). A limitação “sem frações” deve ser registrada.

Se houver necessidade real de frações, a evolução recomendada é armazenar milésimos (`quantidade_milesimos`) ou adotar uma unidade-base por recurso. Isso não é necessário para o MVP.

---

## 9. Workflow a implementar

### Doação

```text
Recebida → Disponível → Cancelada
Recebida → Cancelada
```

- Criar doação e itens em `Recebida`.
- Coordenação valida → `Disponível`.
- Ao validar, inserir um movimento `entrada` por item.
- Cancelar antes da validação: sem movimento.
- Cancelar depois da validação: movimento `saida` compensatório.
- Registrar evento no histórico.

### Entrega

```text
Registrada → Entregue → Cancelada
Registrada → Cancelada
```

- Criar entrega e itens em `Registrada`.
- Ao confirmar, validar saldo de todos os itens.
- Se insuficiente, bloquear com mensagem clara e não alterar nada.
- Se suficiente, inserir um movimento `saida` por item e mudar para `Entregue`.
- Cancelar depois da confirmação: movimento `entrada` compensatório.
- Registrar evento no histórico.

### Ajuste

- Coordenação registra `ajuste_entrada` ou `ajuste_saida`.
- Motivo obrigatório.
- Gera movimento e evento.

### Alertas

- Saldo abaixo do mínimo.
- Item com validade nos próximos 7 dias.
- Doação pendente há mais de 2 dias.
- Entrega registrada há mais de 1 dia.

Alertas são calculados no dashboard; não há envio externo.

---

## 10. Interface e UX

### Modo de design

**Operate** — o usuário precisa concluir tarefas, não admirar uma landing page. A prioridade é escaneabilidade, clareza e confiança.

### Direção visual

- Fundo neutro quente, texto escuro com bom contraste.
- Acento principal em verde/teal profundo.
- Âmbar para atenção; vermelho apenas para crítico.
- Tipografia legível, com números tabulares em tabelas.
- Cards apenas quando necessários; evitar cards aninhados.
- Sem gradientes decorativos, sem excesso de sombras.
- Status como chips textuais, não apenas cor.
- Formulários com labels persistentes, ajuda contextual e erros inline.
- Tabelas viram listas empilhadas em telas pequenas.
- Estados vazios e de erro desenhados, não deixados em branco.

### Princípios do Impeccable aplicáveis

- `shape`: hierarquia das telas antes do código.
- `critique`: revisão de hierarquia e clareza.
- `audit`: acessibilidade, responsividade e performance.
- `clarify`: rótulos, mensagens de erro e textos de ação.
- `harden`: estados de erro, textos longos e casos de borda.
- `polish`: consistência final.

O Impeccable **não será instalado nesta etapa** porque o ambiente não tem `npx`. Seu conjunto de princípios será aplicado manualmente. A instalação pode ser reavaliada depois do MVP, caso o detector e o modo live sejam úteis.

---

## 11. Execução local e evidências

### Execução prevista

```bash
node server.js
# abrir http://localhost:3000
```

### Dados fictícios

- Doadores: `Mercado Exemplo`, `Doador Teste`.
- Recursos: `Arroz 5 kg`, `Feijão 1 kg`, `Cobertor`.
- Famílias: `F-001`, `F-002`, `F-003`.

### Testes

```bash
node --test
```

Cobrir, no mínimo:

- validação de campos obrigatórios;
- criação de recurso, doador, família, doação e entrega;
- transição de status;
- entrada e saída de estoque;
- bloqueio de entrega acima do saldo;
- cancelamento com movimento compensatório;
- persistência após reinício;
- dashboard coerente com o ledger.

### Evidências para a entrega

- capturas de tela;
- gravação curta da demonstração;
- tabela de testes preenchida;
- banco de exemplo ou script de seed;
- registro de limitações.

---

## 12. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Curso exigir plataforma low-code nomeada | Alto | Confirmar antes de implementar; Alternativa B |
| Escopo crescer para a v2 | Alto | Porteira dos critérios de aceitação da v1 |
| Saldo divergir | Alto | Ledger + transações + testes de invariantes |
| Interface parecer genérica | Médio | Direção visual própria + revisão de UX |
| Falta de autenticação | Médio | Documentar como limitação; campo “responsável” |
| SQLite em produção | Médio | Usar apenas demonstração local ou volume persistente |
| Dados pessoais | Alto | Códigos, dados fictícios, minimização |
| Prazo curto | Médio | Implementar o fluxo ponta a ponta primeiro |

---

## 13. Registro de aprovação

A Etapa 3 foi aprovada pelo usuário em **19/10/2026**, com os seguintes entendimentos:

1. A solução customizada em Node.js é aceitável para o curso como “low-code/agêntico”.
2. A arquitetura proposta foi aprovada.
3. Quantidades inteiras na v1 foram aceitas.
4. A ausência de autenticação real na v1 foi aceita, com o campo “responsável” e um perfil de demonstração.
5. O escopo da v1 permaneceu o aprovado, sem antecipar a v2.

---

## 14. Próximos passos

### Concluídos

1. ~~Aprovar esta arquitetura.~~ Aprovada em 19/10/2026.
2. ~~Inicializar o repositório Git.~~ Repositório inicializado em 19/10/2026.
3. ~~Criar o esqueleto do projeto e o schema.~~ Implementado em `schema.sql`, `db.js` e `lib/`.
4. ~~Implementar o fluxo ponta a ponta.~~ Implementado: recurso → doação → validação → estoque → família → entrega → histórico.
5. ~~Executar os testes e coletar evidências.~~ 25 testes automatizados aprovados; evidências registradas em `docs/01-problema-e-escopo.md` e `planning/progress.md`.

### Pendentes

6. Preparar a entrega acadêmica e a apresentação de 5–7 minutos.
7. Planejar a v2 somente depois da v1 validada.
