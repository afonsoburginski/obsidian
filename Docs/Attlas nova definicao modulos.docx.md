

   **ATTLAS**

Sistema Inteligente de Gestão de Tráfego

────────────────────────────────────────

NOVA DEFINIÇÃO DE MÓDULOS

Relatório Detalhado de Estrutura Modular

Documento de Referência Técnica e Funcional

VINCEN SANTAELLA

Versão 1.0 — Março 2026

**Sumário**

**Plataforma Attlas:  Sistema Central de Gestão Semafórica**

Plataforma inovadora desenvolvida para a gestão eficiente de cidades inteligentes. Integra tecnologia avançada em controle semafórico e videomonitoramento para otimizar a mobilidade urbana e a segurança pública, coletando e processando dados de trânsito em tempo real para reduzir o tempo de deslocamento.

A arquitetura da plataforma é baseada em microserviços (Node.js/TypeScript, monorepo) organizados em módulos funcionais independentes que se comunicam por APIs REST, eventos asíncronos (RabbitMQ/Kafka) e WebSockets para tempo real. A infraestrutura de deploy utiliza Kubernetes (RKE2) com clusters isolados por cliente, gerenciados centralmente via Rancher, com CI/CD via github actions e helm para configuração por cliente. O frontend é Angular.

**Módulos da Plataforma**

A plataforma está organizada em módulos classificados em três tipos: Core (base sobre a qual todos operam), Funcional (domínio operacional completo e autônomo) e Transversal/Dependente (consome ou complementa outros módulos). Cada módulo possui especificação funcional própria com recursos, funcionalidades, exemplo de uso, integração e fronteiras claras.

| \# | Módulo | Tipo | Descrição |
| :---- | :---- | :---- | :---- |
| 4.1 | Organização | Core | Gestão administrativa |
| 4.2 | Permissões | Core | Controle granular de acesso por módulo, recurso e ação. |
| 4.3 | Modelo de Tráfego | Core | Abstração digital da malha viária: interseções, áreas, subáreas, rotas, acessos, pontos de medição, estratégias. A interseção é a entidade maestra que persiste a configuração semafórica. |
| 4.4 | Controladores | Funcional | Cadastro, comunicação, monitoramento e controle direto de controladores semafóricos. O controlador é um executor que responde às ordens da interseção. |
| 4.5 | Câmeras | Funcional | Streaming ao vivo, controle PTZ, gravação, videoanalítica. Gestão de videowall. |
| 4.6 | Nobreaks | Funcional | Gestão de fontes de alimentação ininterruptas dos controladores. |
| 4.7 | Prioridade Seletiva | Funcional | Prioridade semafórica para transporte público e veículos autorizados. Cadastro, regras, regiões. |
| 4.8 | PMV | Funcional | Painéis de Mensagens Variáveis: cadastro, biblioteca de mensagens, envio, monitoramento. |
| 4.9 | Inventário e Manutenção | Dependente | Inventário universal de ativos, estoque, incidências (com auto-correlação), ordens de serviço (preventiva/corretiva), dashboard. |
| 4.10 | Planos de Execução | Dependente | Sequências de ações coordenadas sobre múltiplos dispositivos. Templates, simulação, execução. |
| 4.11 | Emergências | Dependente | Gestão de veículos prioritários, eventos de emergência com snapshot-rollback, protocolos dinâmicos, corredor verde. |
| 4.12 | Alarmes | Dependente | Detecção, notificação e arquivo de todos os eventos anômalos. |
| 4.13 | Painel de Operações | Core | Mapa GIS interativo: interface única de operação. |
| 4.14 | Analítico | Dependente | Tratamento e análise de dados de tráfego. Níveis de serviço, fluxos, tempos de percurso, predições. |
| 4.15 | Simulação | Dependente | Integração com SUMO para simulação de cenários de tráfego. |
| 4.16 | Relatórios | Dependente | Geração e distribuição de relatórios formatados a partir de dados de todos os módulos. |
| 4.17 | Dashboard Global | Dependente | Camada de visualização, monitoramento e apoio à tomada de decisão |

**Princípios Arquiteturais Fundamentais**

A interseção é o eixo central do controle semafórico: Toda a configuração semafórica (planos, fases, tempos, defasagens, grupos) é persistida na interseção dentro do Modelo de Tráfego. O controlador é um executor reemplazável que, ao ser associado a uma interseção, adota automaticamente a configuração que ela persiste. Se um controlador for substituído, o novo equipamento herda imediatamente toda a configuração  sem reconfiguração manual. O fluxo de execução é: Estratégia → interseção (persiste) → controlador (executa).

Separação clara de responsabilidades: O **modelo de tráfego** é dono da configuração semafórica (o “quê”). O módulo de **controladores** é dono do equipamento físico (o “como”). O Analítico é dono do tratamento de dados. Os Alarmes são o sistema nervoso de detecção. O Inventário e Manutenção é o ciclo de vida dos ativos. Cada módulo tem fronteira explícita documentada.

Elementos topológicos como pontos de convergência: Cada elemento topológico (interseção, área, subárea, rota) funciona como ponto de convergência de informações: no detalhe de uma interseção, o usuário encontra dados topológicos próprios e métricas consumidas em tempo real dos módulos de dispositivos, sem navegar para outros módulos.

Snapshot-rollback para emergências: O módulo de Emergências captura o estado de todos os dispositivos antes de intervir, aplica modificações coordenadas (corredor verde, temporizações, PMVs, câmeras), e ao encerrar o evento restaura automaticamente cada dispositivo ao estado anterior. Esta capacidade é exclusiva deste módulo.

Alarmes → Incidências → OS: Fluxo operacional integrado: alarmes persistentes ou críticos geram automaticamente incidências no módulo, que via auto-regras geram ordens de serviço. A resolução da incidência atualiza o alarme. Rastreabilidade completa desde a detecção até a resolução.

# 

# 

# **1\. Introdução**

O presente documento descreve a nova estrutura modular do sistema Attlas, uma plataforma de Sistemas Inteligentes de Transporte (ITS — Intelligent Transportation Systems) voltada à gestão, monitoramento e controle do tráfego urbano. O Attlas integra semáforos, controladores, câmeras, painéis de mensagens variáveis, sensores e diversos outros dispositivos de campo, fornecendo aos operadores uma visão centralizada e ferramentas avançadas para otimizar a mobilidade urbana.

A reestruturação modular aqui documentada tem como objetivo principal reorganizar a disposição hierárquica dos elementos na interface, garantindo maior clareza funcional, escalabilidade do produto e flexibilidade comercial na composição de licenças e contratos.

## **1.1. Objetivo**

Definir e documentar a nova estrutura hierárquica e disposição de elementos na interface do sistema Attlas, estabelecendo uma taxonomia clara de módulos que permita:

* **Compreensão unificada:** que todos os stakeholders (negócio, desenvolvimento e operações) compartilhem o mesmo entendimento sobre a estrutura do sistema.

* **Flexibilidade comercial:** permitir que módulos possam ser ativados ou desativados conforme licenças e contratos com cada município ou operador.

* **Escalabilidade técnica:** facilitar a evolução independente de cada módulo sem impactos colaterais no restante da plataforma.

* **Clareza de navegação:** oferecer ao usuário final uma experiência de uso intuitiva, onde cada módulo representa um domínio funcional coerente.

## **1.2. Público-Alvo**

Este documento é destinado tanto a stakeholders de negócio (gestores de produto, equipe comercial, gerências de projeto) quanto à equipe de desenvolvimento (arquitetos, desenvolvedores, QA), servindo como referência única para a compreensão da estrutura modular do attlas.

## **1.3. Definição de Módulo**

No contexto do attlas, um módulo é definido como*: “um domínio funcional coerente, com responsabilidade clara, que pode existir de forma independente na navegação, mas também pode ser reutilizado por outros módulos.”*

Cada módulo agrupa um conjunto lógico de recursos (telas, funcionalidades, dashboards) que se relacionam a um mesmo contexto operacional dentro da gestão de tráfego.

# **2\. Taxonomía de Módulos**

A nova definição estabelece três categorias (tipos) de módulos, classificados conforme seu grau de independência, obrigatoriedade e modelo de licenciamento. Esta taxonomia é fundamental para entender como o sistema se organiza e como diferentes funcionalidades podem ser compostas para atender às necessidades específicas de cada operação de tráfego.

| Tipo | Definição | Independente | Depende de outros | Liga/Desliga | Exemplos |
| ----- | ----- | :---: | :---: | :---: | ----- |
| Módulo Core | Elementos sempre presentes no sistema. São módulos padrões que servem como base para o sistema existir. | Sim | Não | Não | Org., Permissões, Modelo de Tráfego |
| Módulo Funcional | Módulos que funcionam de forma independente, têm objetivo próprio e conjunto claro de telas. | Sim | Não | Sim | Controladores, Câmeras, PMV, Nobreaks |
| Módulo Dependente | Módulos que alimentam, apoiam ou atravessam vários módulos funcionais, usando dados e contextos deles. | Não | Sim | Condicional | Analítico, Plano Exec., Inventário |

## **2.1. Módulo Core**

Os **módulos core** representam a infraestrutura fundamental do sistema. Sem eles, o attlas simplesmente não pode operar. Eles fornecem as capacidades básicas que todos os outros módulos necessitam: gestão de usuários, controle de permissões e o modelo geográfico/topológico do tráfego.

Características principais: coexistem sozinhos (independentes), não dependem de outros módulos, e não podem ser desligados por licença ou contrato — são obrigatórios em toda instalação.

## **2.2. Módulo Funcional**

Os módulos Funcionais representam domínios operacionais completos e autônomos. Cada um deles resolve um problema específico da gestão de tráfego (controle de semáforos, monitoramento por câmeras, painéis de mensagens, etc.) e possui seu próprio conjunto de telas, workflows e dashboards.

Características principais: coexistem sozinhos, não dependem de outros módulos funcionais, e podem ser ativados/desativados conforme o contrato ou licença. São a unidade principal de comercialização do sistema.

## **2.3. Módulo Dependente**

Os módulos dependentes são peças transversais que enriquecem, analisam ou automatizam processos que envolvem dados de vários módulos. Eles não fazem sentido isoladamente, pois precisam dos dados gerados pelos **módulos core** e/ou **funcionais** para operar.

Características principais: não coexistem sozinhos, dependem de outros módulos, e seu licenciamento é condicional, geralmente vinculado à presença dos módulos dos quais dependem.

# **3\. Visão Geral dos Módulos**

A tabela a seguir apresenta a visão consolidada de todos os módulos definidos para o sistema Attlas, seus recursos e classificação:

| Módulo | Recursos | Tipo |
| ----- | ----- | :---: |
| **Organização** | Usuários, Licenças, Chaves, Sistemas, Convites, Onboarding,  Auditoria e Ajuda | Core |
| **Permissões** | Perfis, Grupos | Core |
| **Modelo de Tráfego** | Mapa de construção do modelo (Interseções, Vias, Áreas, Subáreas, Estratégias, Pontos de medição, Acesso, Rota) | Core |
| **Controladores** | Lista de Controladores, Eventos, Incidentes e Dashboard | Funcional |
| **Câmeras** | Lista de Câmeras, Vídeo Wall e Dashboard | Funcional |
| **Analítico** | Acom's, Analíticos, Incidentes e ATSPM (Dashboard) | Dependente |
| **Plano de Execução** | Planos, Biblioteca de Tarefas e Dashboard | Dependente |
| **Prioridade Seletiva** | Construção, Elementos (Veículos, Regiões, Terminais e Paradas, Grupos semafóricos), Dashboard | Dependente |
| **PMV** | Lista de PMV's, Biblioteca e Dashboard | Funcional |
| **Inventário** | Inventário, Estoque, Atendimento, Ordens de Serviço e Dashboard | Dependente |
| **Painel de Operação** | Mapa Operacional | Core |
| **Emergências** | Veículos Prioritários, Eventos de Emergência, Protocolos, Dashboard | Dependente |
| **Alarmes** | Alarmes, Arquivo, Dashboard | Dependente |
| **Simulação** | Cenários, Simulações, Dashboard | Dependente |
| **Controle** | Subsistemas, Otimização, Dashboard | Dependente |
| **Nobreaks** | Lista de Nobreaks, Monitoramento, Dashboard | Funcional |
| **Relatórios** | Catálogo de Relatórios, Geração e Distribuição | Dependente |
| **Dashboard** | Quadros de Comando, Configuração e Personalização | Dependente |

# 

# **4\. Detalhamento dos Módulos**

A seguir, cada módulo é descrito em profundidade, incluindo sua justificativa de agrupamento, o contexto operacional que atende e o significado de cada recurso que o compõe.

**4.1. Organização**

Tipo: **Core**

### **Contexto e Justificativa**

O módulo de Organização é o núcleo administrativo do attlas. Ele concentra toda a gestão da entidade organizacional que opera o sistema: quem são os usuários, quais sistemas estão configurados, como as licenças estão distribuídas e quem pode acessar o quê. Foi classificado como Core porque, sem uma organização configurada, nenhum outro módulo tem contexto para operar.

O agrupamento destes recursos sob um único módulo reflete o fato de que todos se referem ao mesmo domínio: a entidade administrativa que contém usuários, licenças e configurações globais. Separá-los seria fragmentar um contexto naturalmente coeso.

### **Recursos**

* **Usuários:** Gestão completa dos usuários da organização. Inclui cadastro, edição do rol, ativação/desativação de contas, definição de dados pessoais e profissionais. Cada usuário é vinculado a uma organização e pode ter múltiplos acessos ao sistemas da organização ou de outras organizações.

* **Licenças:** Gerenciamento das licenças de uso do sistema. Controla quais módulos funcionais e dependentes estão habilitados para aquela organização, datas de vigência, limites de uso e parâmetros contratuais.

* **Chaves:** Gestão de chaves de acesso e tokens de API. Essencial para integrações com sistemas externos (centrais de controle, outros softwares municipais) e para autenticação programática de serviços.

* **Sistemas:** Gestão de sistemas vinculadas à organização. Num cenário multi-organização, uma mesma organização pode operar múltiplos sistemas (diferentes cidades ou regiões), cada um com sua própria configuração de controladores, câmeras e modelo de tráfego.

* **Convites**: Sistema de convites para novos usuários para fazer parte da organização. Permite que administradores convidem colaboradores via e-mail, definindo previamente o perfil de acesso e as permissões que o convidado receberá ao completar o cadastro.

* **Auditoria:** Registro e consulta de todas as ações realizadas no sistema (logs de auditoria). Fundamental para compliance, rastreabilidade e investigação de incidentes. Registra quem fez o quê, quando e onde dentro do sistema.

* **Ajuda:** Central de ajuda integrada ao sistema. Fornece documentação contextual, FAQs, guias de uso e possivelmente acesso a suporte técnico. Agrupada aqui por ser um recurso transversal da organização e não de um módulo específico.

* **Onboarding:** Cadastro e login, fluxo completo de registro de novos usuários e autenticação. Inclui validação de e-mail, definição de senha conforme políticas de segurança, recuperação de senha e login com credenciais. Pode incluir suporte a autenticação multifator (MFA) e integração com provedores de identidade externos.

## **4.2. Permissões**

Tipo: **Core**

### **Contexto e Justificativa**

O módulo de **permissões** é o motor de autorização do attlas, responsável por controlar quem pode fazer o quê, onde, e com qual nível de prioridade dentro do sistema. Enquanto o módulo de Organização define "quem existe" (gestão de identidades, contas e estrutura organizacional), o módulo de permissões define o alcance operacional de cada usuário: quais funcionalidades pode acessar, quais dispositivos pode operar, quais zonas geográficas pode visualizar e como seu ambiente de trabalho se configura.

A separação entre organização e permissões é intencional e segue o princípio de segregação de responsabilidades: gerenciar usuários (CRUD de contas, convites, licenças) é uma responsabilidade administrativa diferente de gerenciar as políticas de acesso que determinam o que esses usuários podem ver e fazer. Essa separação permite que diferentes administradores cuidem de cada domínio — um gestor de RH pode criar usuários, enquanto um gestor de segurança ou o administrador de um grupo define as permissões.

No contexto de um sistema ITS como o Attlas, o controle de acesso vai muito além de permissões simples de telas. O modelo de autorização opera em múltiplas dimensões que convergem numa **única política de acesso integrada**: dimensão funcional (o que pode fazer), dimensão espacial (onde pode atuar), dimensão de recursos (quais dispositivos pode operar), dimensão de prioridade (com qual nível de controle) e dimensão de interface (como visualiza o sistema). 

Essas dimensões não são gerenciadas de forma isolada — são atributos de configuração de um perfil de acesso.

O módulo opera com um **modelo de configuração em cascata de três níveis**: a Administração **Hierárquica** define os perímetros máximos de cada grupo, os **Grupos de Usuários** organizam seus membros e perfis dentro desses limites, e os **Perfis de Acesso** definem a política de autorização concreta de cada papel operacional. Cada nível depende do anterior e herda seus limites.

A gestão de perfis é acessível tanto a partir do seu próprio recurso (para operações transversais como comparar ou duplicar perfis entre grupos) quanto a partir de dentro do grupo de usuários (para que o administrador possa criar perfis, ver membros e associá-los sem sair do contexto do grupo).

### **Recursos**

### **Administração Hierárquica**

Recurso de governança do modelo de permissões e pré-requisito para a existência dos demais recursos. O Administrador Geral é a figura com responsabilidade global sobre todo o sistema, acima de todos os administradores de grupo. Possui capacidade exclusiva de criar e remover grupos de usuários, definir o perímetro máximo de cada grupo (quais zonas geográficas, dispositivos e funcionalidades o grupo pode distribuir entre seus perfis) e definir quais capacidades administrativas cada administrador de grupo possui (delegação e limites de escopo). O perímetro de um grupo funciona como um contrato: nenhum perfil criado dentro do grupo pode excedê-lo. Se o Administrador Geral reduzir o perímetro de um grupo, o sistema identifica automaticamente quais perfis são afetados e notifica o administrador do grupo para ajustá-los.

**Grupos de Usuários**

Recurso organizacional que reflete a estrutura real das equipes que operam o sistema. Um grupo deve ser criado pelo Administrador Geral (com seu perímetro definido) antes de poder operar. Cada grupo possui um Administrador de Grupo: figura administrativa com autonomia para gerenciar membros, criar e editar perfis de acesso, e associar perfis a membros — tudo dentro do perímetro definido pelo Administrador Geral e sem necessidade de sair do contexto do grupo. O administrador de grupo pode adicionar, ativar e desativar membros, organizar o grupo em subequipes ou turnos, e conceder acesso a usuários de outros grupos (perfis cruzados) atribuindo-lhes diretamente um perfil do seu grupo. Um usuário pode pertencer a múltiplos grupos simultaneamente se o administrador de cada grupo lhe conceder acesso com um perfil correspondente — não são necessárias solicitações nem convites, é uma decisão direta do administrador do grupo receptor. Quando um usuário possui perfis em mais de um grupo, ele pode visualizar/editar tudo o que o grupo permite.

**Perfis de Acesso**

Recurso de política de autorização. Todo perfil pertence obrigatoriamente a um grupo e opera dentro do seu perímetro — um perfil sem grupo não existe no sistema, e o grupo deve existir antes de qualquer perfil ser criado. Cada perfil define, de forma integrada, todas as dimensões de controle de acesso: permissões funcionais (quais telas, ações e funcionalidades são permitidas, desde leitura até controle operacional de equipamentos), restrição geográfica por zonas (quais áreas, interseções e vias o usuário pode visualizar e operar no mapa, sempre dentro das zonas do perímetro do grupo), restrição por dispositivos (quais controladores, câmeras, PMVs e nobreaks o usuário pode operar, sempre dentro dos dispositivos do perímetro do grupo), nível de prioridade e bloqueio de recursos (nível de precedência para acesso concorrente a dispositivos compartilhados — por exemplo, um supervisor pode assumir o controle de uma câmera em uso por um operador de menor prioridade), e workspace padrão (layout de janelas, camadas visíveis e disposição de painéis que o usuário verá ao iniciar sessão com esse perfil). Toda informação exibida na interface é filtrada automaticamente conforme as dimensões configuradas no perfil, sem necessidade de filtros manuais. Além do perfil base, o sistema suporta permissões individuais (overrides) a nível de usuário: um administrador pode conceder a um membro específico acessos adicionais pontuais (por exemplo, acesso a um dispositivo ou zona que não fazem parte do seu perfil, mas que estão dentro do perímetro do grupo) sem precisar criar um perfil exclusivo para essa exceção. Isso mantém os perfis genéricos e reutilizáveis, e as exceções são gerenciadas individualmente e rastreáveis.

**Exemplo de Uso**

O exemplo a seguir ilustra o fluxo completo de configuração do módulo de Permissões para a cidade de Quito, onde dois órgãos distintos utilizam o mesmo sistema Attlas: a EPMMOP (Empresa Pública de Movilidad), que opera o tráfego da Zona Norte, e a AMT (Agência Metropolitana de Tránsito), que opera a Zona Sul. Existe também uma equipe de Engenharia Central que precisa de acesso analítico a ambas as zonas.

**Passo 1:  Administração Hierárquica**

O Administrador Geral configura as políticas globais e cria os grupos com seus respectivos perímetros.

**Criação dos grupos e perímetros:**

| Configuração | Grupo EPMMOP | Grupo AMT | Grupo Eng. Central | Observações |
| ----- | ----- | ----- | ----- | ----- |
| Zonas geográficas | Zona Norte (N1, N2, N3) | Zona Sul (S1, S2, S3, S4) | Zona Norte \+ Zona Sul (todas) | Define o escopo geográfico máximo do grupo |
| Dispositivos | 50 controladores, 20 câmeras, 5 PMVs | 80 controladores, 35 câmeras, 8 PMVs | Todos (130 control., 55 câm., 13 PMVs) | Define quais equipamentos o grupo pode distribuir entre perfis |
| Funcionalidades máximas | Controle total (leitura, escrita, comandos) | Controle total (leitura, escrita, comandos) | Somente leitura (consulta, dashboards, analíticos) | Teto de ações que perfis dentro do grupo podem receber |
| Prioridade máxima | Nível 4 (Supervisor) | Nível 4 (Supervisor) | Nível 0 (Sem controle) | Nível mais alto de prioridade que um perfil do grupo pode ter |
| Administrador de Grupo | Carlos Mendoza | María Fernández | Administrador Geral acumula | Responsável pela gestão interna do grupo |

**Administradores de grupo designados:**

* EPMMOP: Carlos Mendoza  
* AMT: María Fernández  
* Eng. Central: Administrador geral 

**Passo 2:  Grupos de Usuários**

Cada administrador de grupo organiza seu grupo internamente. Desde a tela do grupo, sem sair do contexto, o administrador realiza todas as operações: cria perfis, adiciona membros e associa perfis a membros.

**Carlos Mendoza (Admin EPMMOP) configura seu grupo:**

Primeiro, cria os perfis do grupo (dentro do contexto do grupo):

| Perfil | Funcionalidades | Zonas | Dispositivos | Prioridade |
| ----- | ----- | ----- | ----- | :---: |
| Operador ZN | Monitorar controladores, visualizar câmeras, registrar incidentes | Subárea atribuída (N1, N2 ou N3) | Controladores e câmeras da subárea | Nível 1 |
| Supervisor ZN | Todas do operador \+ alterar planos semafóricos, comandos a controladores, aprovar PMVs, gerenciar incidentes | Toda Zona Norte (N1 \+ N2 \+ N3) | Todos: 50 control., 20 câm., 5 PMVs | Nível 3 |

Em seguida, adiciona membros e associa perfis:

* 12 operadores → Perfil: "Operador ZN"  
* 3 supervisores → Perfil: "Supervisor ZN"

Tudo na mesma tela, num fluxo contínuo.

María Fernández (**Admin AMT**) realiza o mesmo processo para seu grupo com perfis equivalentes para a Zona Sul.

| Perfil | Funcionalidades | Zonas | Dispositivos | Prioridade |
| :---: | ----- | :---: | :---: | :---: |
| **Operador ZS** | Monitorar controladores, visualizar câmeras, registrar incidentes | Subáreas S1-S2 ou S3-S4 (conforme equipe) | Controladores e câmeras das subáreas atribuídas | Nível 1 |
| **Supervisor ZS** | Todas do operador \+ alterar planos semafóricos, comandos a controladores, aprobar PMVs | Toda Zona Sul (S1 \+ S2 \+ S3 \+ S4) | Todos: 80 control., 35 câm., 8 PMVs | Nível 3 |

Perfil criado pelo Administrador Geral para a equipe de engenharia.

| Perfil | Funcionalidades | Zonas | Dispositivos | Prioridade |
| ----- | ----- | ----- | ----- | :---: |
| **Engenheiro Analista** | Visualizar mapa, dados históricos, dashboards analíticos, ATSPM, gerar relatórios. Sem controle de equipamentos. | Zona Norte \+ Zona Sul (visão completa) | Todos (somente visualização) | Nível 0 |

**Passo 3: Perfis Cruzados**

A engenheira Ana Torres pertence ao grupo “Eng. Central” com o perfil "Engenheiro Analista" (somente leitura, todas as zonas). Porém, para um projeto de otimização semafórica, ela precisa acessar os dashboards operacionais específicos da EPMMOP que não estão disponíveis no seu perfil atual.

**Como se resolve:**

Carlos Mendoza (Admin EPMMOP), a partir da tela do seu grupo, concede acesso a Ana Torres atribuindo-lhe o perfil **"Consultor Externo"** do grupo EPMMOP. Não é necessária nenhuma solicitação formal nem convite — Carlos simplesmente busca Ana no sistema e associa o perfil.

Ana Torres agora possui dois perfis ativos:

* Eng. Central \- **Engenheiro Analista**: visão analítica global (sua função principal)  
* EPMMOP \- **Consultor Externo**: acesso a dashboards operacionais da Zona Norte


**Passo 4: Permissões Individuais (Overrides)**

O operador João Silva pertence ao grupo EPMMOP com o perfil "Operador ZN" restrito à subárea N1. Porém, devido a uma obra temporária na subárea N2, o supervisor precisa que João monitore temporariamente 3 câmeras específicas de N2.

**Como se resolve:**

Carlos Mendoza (ou o supervisor, se tiver permissão delegada) adiciona um override individual a João Silva: acesso às câmeras CAM-N2-07, CAM-N2-08 e CAM-N2-12.

João continua com seu perfil "Operador ZN" base (subárea N1), mas agora também visualiza e opera essas 3 câmeras adicionais.Nenhum perfil foi modificado — os demais operadores de N1 não são afetados.

Regra: overrides só podem conceder acessos dentro do perímetro do grupo. Carlos não poderia dar a João acesso a uma câmera da Zona Sul, pois está fora do perímetro da EPMMOP.

### 

### **Validações Automáticas do Sistema**

O Attlas aplica as seguintes validações para garantir a consistência do modelo:

* Perfil não pode exceder o perímetro do grupo: Se o grupo EPMMOP tem acesso a 50 controladores, nenhum perfil dentro desse grupo pode incluir um 51º controlador. O sistema bloqueia e exibe o motivo.  
* Override não pode exceder o perímetro do grupo: Permissões individuais adicionais também respeitam o perímetro. O administrador não pode conceder via override acessos fora do escopo do seu grupo.  
* Grupo deve existir antes do perfil: A criação de perfil exige a seleção do grupo como primeiro campo obrigatório.  
* Redução de perímetro com impacto: Se o Administrador Geral reduzir o perímetro de um grupo, o sistema identifica perfis e overrides afetados e notifica o administrador do grupo.

**4.3. Modelo de Tráfego**

Tipo: **Core**

### **Contexto e Justificativa**

O Modelo de Tráfego é o coração do domínio do attlas. Ele representa a abstração digital da malha viária real: cada interseção, via, área, subárea e ponto de medição são modelados aqui. Este módulo é Core porque todos os módulos funcionais e dependentes referenciam o modelo de tráfego para contextualizar suas operações: um controlador está em uma interseção, uma câmera monitora uma via, um plano semafórico se aplica a uma área.

O módulo é **puramente topológico**: sua responsabilidade é definir a estrutura da rede viária e, através do mapa de construção, permitir a associação de dispositivos físicos (controladores, câmeras, detectores, PMVs) aos elementos dessa topologia. O Modelo de Tráfego não gerencia os dispositivos em si — não controla estado, comunicação nem configuração técnica dos equipamentos. Essas responsabilidades pertencem aos módulos de cada tipo de dispositivo (Controladores, Câmeras, PMV, Nobreaks). O que o Modelo de Tráfego faz é estabelecer o vínculo: "na interseção X existem 3 grupos semafóricos e 2 detectores", sem se preocupar com o funcionamento desses equipamentos.

Cada elemento topológico funciona como um **ponto de convergência de informações**: ao acessar o detalhe de uma interseção, por exemplo, o usuário encontra não apenas os dados topológicos, mas também as métricas e informações operacionais provenientes dos dispositivos associados a ela — volume de tráfego dos detectores, estado dos controladores, imagens das câmeras. Essa informação é consumida dos respectivos módulos de dispositivos e apresentada no contexto do elemento topológico, oferecendo ao operador uma visão integrada sem sair do modelo.

O agrupamento de todos os elementos topológicos num único módulo reflete o fato de que eles formam uma **rede interdependente**: interseções se conectam por vias, vias pertencem a áreas, áreas contêm subáreas, estratégias se aplicam a combinações desses elementos, e rotas traçam caminhos através da rede. Fragmentá-los seria romper a coerência do modelo.

### **Recursos**

### **Mapa de Construção do Modelo**

Interface visual (mapa) onde o operador constrói e edita o modelo de tráfego. É o canvas principal onde todos os elementos topológicos são posicionados, conectados e onde se realiza a **associação de dispositivos físicos** aos pontos da rede. O mapa opera em múltiplas visualizações e é também o local onde o operador vincula equipamentos de campo à topologia.

#### **Funcionalidades**

* **Mapa geral da rede:** Visão macro de toda a malha viária com todos os elementos topológicos e suas associações. Permite navegação, zoom e filtragem por tipo de elemento.  
* **Mapa de interseção:** Visão detalhada de uma interseção específica com seus grupos semafóricos, detectores, fases e movimentos. Permite visualizar a geometria do cruzamento e os dispositivos associados.  
* **Mapa de rota:** Visualização de uma rota com as interseções que a compõem e os parâmetros de coordenação (velocidade de progressão, distâncias, defasagens).  
* **Editor do mapa:** Modo de edição para criar, modificar e excluir elementos topológicos, definir conexões entre eles e configurar parâmetros de circulação (sentido de tráfego, número de faixas, velocidade regulamentar, restrições de movimento).  
* **Associação de dispositivos físicos:** Dentro do editor, o operador vincula dispositivos de campo aos elementos topológicos. Isso inclui associação de grupos semafóricos e controladores a interseções, detectores a pontos de medição, câmeras a vias ou interseções, e PMVs a trechos de via. O mapa apenas registra o vínculo topológico — toda a gestão operacional dos dispositivos acontece nos seus respectivos módulos.

### 

### **Elementos Topológicos**

Os elementos topológicos são os componentes que definem a estrutura lógica da rede viária. Eles são organizados hierarquicamente e formam a base sobre a qual todo o sistema opera. Cada elemento topológico possui uma **tela de detalhe** onde o usuário encontra, além dos dados topológicos, as informações e métricas provenientes dos dispositivos associados a ele — dados de fluxo dos detectores, estado dos controladores, feeds de câmeras, alertas de equipamentos. Essas informações são consumidas em tempo real dos respectivos módulos de dispositivos, permitindo que o operador tenha uma visão integrada do que acontece naquele ponto da rede sem precisar navegar para outros módulos.

* **Interseções:** Pontos de cruzamento ou encontro de vias. São a unidade fundamental do modelo topológico, pois é na interseção que os movimentos conflitantes de tráfego se encontram. Cada interseção é definida por sua localização geográfica, geometria (número de aproximações, faixas por aproximação, movimentos permitidos) e os dispositivos físicos associados a ela. No detalhe de uma interseção, o usuário visualiza: dados topológicos (geometria, movimentos, fases), estado dos controladores e grupos semafóricos associados (consumido do módulo Controladores), dados de fluxo dos detectores posicionados nas aproximações (consumido do módulo Analítico) e feeds das câmeras que monitoram o cruzamento (consumido do módulo Câmeras).  
* **Áreas:** Regiões geográficas que agrupam múltiplas interseções e vias. Permitem aplicar estratégias de controle coordenado ("onda verde") e segmentar a operação por região da cidade. A área é o primeiro nível de agrupamento lógico acima da interseção. No detalhe de uma área, o usuário visualiza: lista de interseções e subáreas que a compõem, métricas agregadas de tráfego da região (volume total, velocidade média, nível de serviço) e o estado consolidado dos dispositivos associados.  
* **Subáreas:** Subdivisões de áreas, permitindo granularidade adicional no controle. Úteis quando uma área grande possui trechos com comportamentos de tráfego distintos. Cada subárea possui um **modo de funcionamento** (central, local, manual, intermitente, apagado) que determina como as interseções dentro dela se comportam operacionalmente. No detalhe, o usuário visualiza o modo atual, as interseções contidas e as métricas de tráfego do trecho.  
* **Estratégias:** Mecanismo pelo qual o engenheiro de tráfego define **e executa** o comportamento operacional da rede semafórica. Uma estratégia é uma unidade completa de controle de tráfego composta por três componentes: o escopo (a qual subárea, área ou rota se aplica, determinando quais interseções e controladores serão afetados), as condições de ativação (quando se aplica — suporta três modos: **programada** por tabela horária, **por condição** quando métricas de tráfego atingem limiares, e **manual** por decisão do operador, sendo que a manual prevalece sobre por condição, que prevalece sobre programada) e a configuração semafórica (o que faz — define planos semafóricos por controlador, tempos de ciclo, defasagens entre interseções para ondas verdes, distribuição de verde por fase, velocidade de progressão em rotas e modo de operação da subárea). Quando ativada, a estratégia envia as configurações diretamente aos controladores do escopo sem intermediação de outro módulo. O operador acompanha a execução em tempo real: quais controladores receberam a configuração, quais estão em transição e se houve falhas. Quando duas estratégias tentam atuar sobre a mesma subárea, o sistema aplica regras de prioridade, notifica o operador sobre o conflito e registra a substituição. O sistema mantém histórico completo de ativações, desativações, quem ativou (sistema ou operador), duração efetiva e métricas de desempenho durante a vigência, alimentando o módulo Analítico para análise de eficácia.  
* **Pontos de Medição:** Locais onde sensores (laços indutivos, radares, câmeras de contagem) coletam dados de fluxo veicular. Cada ponto de medição é posicionado no modelo topológico e associado ao detector físico correspondente. A definição do ponto (localização, tipo de medição, sentido de fluxo) pertence ao Modelo de Tráfego; o tratamento e análise dos dados coletados pertence ao módulo Analítico. No detalhe de um ponto de medição, o usuário visualiza: dados do detector associado, métricas em tempo real (volume, velocidade, ocupação) e histórico de medições.  
* **Acessos:** Pontos de acesso à malha viária (entradas/saídas de regiões controladas). Relevantes para controle de áreas restritas e gestão de fluxo em perímetros específicos. Um acesso define onde o tráfego entra ou sai de uma zona controlada.  
* **Rotas:** Sequências ordenadas de interseções e vias que formam um corredor. Utilizadas para planejamento de coordenação semafórica (onda verde ao longo de um corredor) e como referência para análise de tempos de viagem. Uma rota define o caminho e os parâmetros de progressão que serão utilizados pelos módulos de controle. No detalhe de uma rota, o usuário visualiza: sequência de interseções, distâncias entre elas, velocidade de progressão desejada e métricas de tempo de viagem real versus planejado.

## 

## **Exemplo de Uso**

A EPMMOP precisa modelar no Attlas o corredor da Avenida 10 de Agosto, um dos principais eixos viários da Zona Norte de Quito. O corredor possui 8 interseções semaforizadas, detectores veiculares e câmeras de monitoramento. Além da construção do modelo topológico, a equipe de engenharia de tráfego precisa configurar as estratégias de operação cotidiana do corredor.

### **Passo 1: Construção da Topologia no Mapa**

O engenheiro de tráfego abre o editor do mapa e começa a construir o modelo:

**Cria a estrutura hierárquica:**

* Área: "Zona Norte"  
* Subárea: "Corredor Av. 10 de Agosto"  
* Modo de funcionamento da subárea: "Central" (controlado pela central de tráfego)

**Posiciona as interseções:**

| Interseção | Localização | Aproximações | Movimentos |
| ----- | ----- | ----- | ----- |
| INT-001 | Av. 10 de Agosto / Calle Murgeon | 4 aproximações, 12 faixas | 8 veiculares \+ 4 pedestres |
| INT-002 | Av. 10 de Agosto / Av. Colón | 4 aproximações, 14 faixas | 10 veiculares \+ 4 pedestres |
| INT-003 | Av. 10 de Agosto / Av. Patria | 4 aproximações, 16 faixas | 12 veiculares \+ 6 pedestres |
| ... | ... | ... | ... |
| INT-008 | Av. 10 de Agosto / Av. El Inca | 3 aproximações, 10 faixas | 6 veiculares \+ 3 pedestres |

**Configura parâmetros de circulação no editor:**

* Av. 10 de Agosto: sentido duplo, 3 faixas por sentido, velocidade regulamentar 50 km/h.  
* Faixa exclusiva BRT no canteiro central (sentido norte-sul).

**Define pontos de medição:**

* PM-001: Câmera de contagem na aproximação norte de INT-001.  
* PM-002:Câmera de contagem entre INT-002 e INT-003.  
* PM-003: Câmera de contagem na aproximação sul de INT-005.

**Define acessos:**

* ACC-001: Acesso pela Av. Colón (entrada lateral ao corredor).  
* ACC-002: Acesso pela Av. Pátria (entrada/saída do hipercentro).

**Define a rota do corredor:**

* Rota: "Corredor 10 de Agosto Norte-Sul".  
* Sequência: INT-001 \-\> INT-002 \-\> INT-003 \-\> INT-008.  
* Distância total: 4.2 km.  
* Velocidade de progressão desejada: 45 km/h.

**Passo 2: Associação de Dispositivos Físicos no Mapa**

Ainda no editor do mapa, o engenheiro associa os dispositivos (já cadastrados nos seus respectivos módulos):

| Interseção | Grupos Semafóricos | Controlador | Detectores |
| ----- | ----- | ----- | ----- |
| INT-001 | GS-1 a GS-4 (4 fases) | CTRL-001 | DET-LAC-001 (laço virtual) |
| INT-002 | GS-1 a GS-5 (5 fases, conversão protegida) | CTRL-002 | — |
| INT-003 | GS-1 a GS-6 (6 fases, BRT) | CTRL-003 | DET-LAC-003 (laço virtual) |
| ... | ... | ... | ... |
| INT-008 | GS-1 a GS-3 (3 fases) | CTRL-008 | — |

Câmeras e PMVs associados a trechos de via: CAM-012 (entre INT-002 e INT-003), CAM-015 (aproximação sul de INT-003), PMV-003 (aproximação de INT-005).

### **Passo 3: Configuração de Estratégias**

Com o modelo topológico construído e os dispositivos associados, o engenheiro de tráfego cria as estratégias de operação para a subárea "Corredor Av. 10 de Agosto". Cada estratégia define escopo, condição de ativação e configuração semafórica completa.

### **Estratégia "Hora Pico Manhã":**

| Componente | Configuração |
| ----- | ----- |
| Escopo | Subárea "Corredor Av. 10 de Agosto" (INT-001 a INT-008) |
| Ativação | Programada: Segunda a Sexta, 06:30–09:00 |
| Objetivo | Priorizar sentido sul (direção centro) |
| Ciclo | 80 segundos em todas as interseções |
| Distribuição de verde | 60% movimentos N-S (sentido sul priorizado), 40% L-O |
| Defasagens | Onda verde sentido sul a 40 km/h: INT-001→002 (8s), INT-002→003 (10s), INT-003→004 (7s), ... |
| Planos por controlador | CTRL-001: Plano 2, CTRL-002: Plano 2, CTRL-003: Plano 3 (BRT), ..., CTRL-008: Plano 2 |
| Modo subárea | Central |

**Estratégia "Entre Picos":**

| Componente | Configuração |
| ----- | ----- |
| Escopo | Subárea "Corredor Av. 10 de Agosto" (INT-001 a INT-008) |
| Ativação | Programada: Segunda a Sexta, 09:00–17:00 |
| Objetivo | Distribuição equilibrada entre sentidos |
| Ciclo | 100 segundos |
| Distribuição de verde | 50% N-S, 50% L-O |
| Defasagens | Onda verde bidirecional a 50 km/h |
| Planos por controlador | CTRL-001 a CTRL-008: Plano 1 (padrão) |
| Modo subárea | Central |

**Estratégia "Hora Pico Tarde":**

| Componente | Configuração |
| ----- | ----- |
| Escopo | Subárea "Corredor Av. 10 de Agosto" (INT-001 a INT-008) |
| Ativação | Programada: Segunda a Sexta, 17:00–20:00 |
| Objetivo | Priorizar sentido norte (saída do centro) |
| Ciclo | 80 segundos |
| Distribuição de verde | 60% N-S (sentido norte priorizado), 40% L-O |
| Defasagens | Onda verde sentido norte a 40 km/h (invertidas em relação à manhã) |
| Planos por controlador | CTRL-001: Plano 3, ..., CTRL-008: Plano 3 |
| Modo subárea | Central |

## **Estratégia "Noturno"**

| Componente | Configuração |
| ----- | ----- |
| Escopo | Subárea "Corredor Av. 10 de Agosto" (INT-001 a INT-008) |
| Ativação | Programada: Todos os dias, 22:00–06:00 |
| Objetivo | Reduzir consumo energético, manter segurança mínima |
| Ciclo | N/A (modo intermitente) |
| Distribuição de verde | N/A |
| Defasagens | N/A |
| **Planos por controlador** | Todos: modo intermitente |
| **Modo subárea** | Intermitente |

**Estratégia "Evento Estádio Atahualpa" (manual)**

| Componente | Configuração |
| ----- | ----- |
| Escopo | Parcial: INT-004 a INT-007 (próximas ao estádio) |
| Ativação | Manual (operador ativa quando há evento confirmado) |
| Objetivo | Gerenciar fluxo de saída massivo pós-evento |
| Ciclo | 60 segundos (ciclos curtos para escoamento rápido) |
| Distribuição de verde | 70% movimentos de saída do estádio, 30% demais |
| Defasagens | Onda verde sentido norte (saída) a 30 km/h a partir de INT-004 |
| Planos por controlador | CTRL-004 a CTRL-007: Plano 5 (evento) |
| Modo subárea | Central |

### 

### **Passo 4: Execução das Estratégias em Operação**

**Cenário dia útil normal — ativação automática programada:**

São 06:30 de segunda-feira. O sistema verifica a tabela horária e ativa automaticamente a estratégia "Hora Pico Manhã". O sistema envia os planos aos controladores e o operador acompanha no painel:

| Controlador | Status | Plano Enviado | Recebido |
| ----- | ----- | ----- | ----- |
| CTRL-001 | Online | Plano 2 ativado | 06:30:02 |
| CTRL-002 | Online | Plano 2 ativado | 06:30:02 |
| CTRL-003 | Online | Plano 3 (BRT) ativado | 06:30:03 |
| CTRL-004 | Online | Plano 2 ativado | 06:30:02 |
| CTRL-005 | Offline | Falha de comunicação | — |
| CTRL-006 | Online | Plano 2 ativado | 06:30:03 |
| CTRL-007 | Online | Plano 2 ativado | 06:30:02 |
| CTRL-008 | Online | Plano 2 ativado | 06:30:03 |

O **CTRL-005** não respondeu, o sistema gera alerta no módulo **Alarmes**. A estratégia continua ativa nos demais controladores (a falha de um equipamento não bloqueia os outros). Às 09:00, "**Hora Pico Manhã**" expira e "Entre Picos" é ativada automaticamente.

**Cenário evento especial — ativação manual com conflito:**

São 20:30, a estratégia **"Entre Picos"** está ativa. O jogo no Estádio Atahualpa terminou. O operador ativa manualmente **"Evento Estádio Atahualpa"**. O sistema detecta conflito (ambas atuam na mesma subárea) e aplica a regra de prioridade (manual prevalece sobre programada):

1. Suspende **"Entre Picos"** nas interseções INT-004 a INT-007 (escopo do evento)  
2. Mantém **"Entre Picos"** ativa em INT-001 a INT-003 e INT-008 (fora do escopo)  
3. Ativa **"Evento Estádio Atahualpa"** em INT-004 a INT-007  
4. Registra conflito e substituição para auditoria  
5. Notifica operador: "Estratégia **'Entre Picos'** suspensa parcialmente por ativação manual de **'Evento Estádio Atahualpa'**"

Às 22:00 o operador desativa a estratégia de evento. O sistema restaura automaticamente a estratégia programada vigente naquele horário — **"Noturno".**

**Visualização Integrada no Detalhe**

| Seção | Informação | Origem |
| ----- | ----- | ----- |
| Dados Topológicos | 4 aproximações, 16 faixas, 12 mov. veiculares, 6 pedestres | Modelo de Tráfego |
| Estratégia Ativa | "Hora Pico Manhã" — Plano 3 (BRT), ciclo 80s | Modelo de Tráfego |
| Controlador | CTRL-003 — Online, Plano 3 ativo, ciclo 80s | Módulo Controladores |
| Grupos Semafóricos | GS-1 a GS-6, fase atual: GS-2 (verde L-O) | Módulo Controladores |
| Detectores | DET-LAC-003: 1.250 veíc/h, ocupação 45% | Módulo Analítico |
| Câmeras | CAM-015: feed ao vivo da aproximação sul | Módulo Câmeras |
| Alertas | Nenhum alerta ativo | Módulo Alarmes |

## 

## **4.4. Controladores**

Tipo: **Funcional**

### **Contexto e Justificativa**

O módulo de Controladores é o coração operacional da gestão semafórica do Attlas. Controladores semafóricos são os equipamentos físicos instalados nas interseções que executam os planos de temporização dos semáforos, regulando os movimentos conflitantes de tráfego. Este módulo é classificado como Funcional porque possui um domínio operacional completo e autônomo: um operador pode gerenciar controladores sem necessariamente interagir com câmeras, PMVs ou outros módulos.

O paradigma fundamental deste módulo é que a **interseção é a entidade maestra da configuração semafórica**, não o controlador. Toda a configuração de tráfego (planos semafóricos, fases, tempos de ciclo, defasagens, grupos semafóricos) é persistida na interseção. O controlador é um executor reemplazável que, ao ser associado a uma interseção, adota automaticamente toda a configuração que ela persiste. Isso garante que, se um controlador for substituído por falha ou manutenção, o novo equipamento herde imediatamente a configuração otimizada da interseção, sem necessidade de reconfiguração manual e sem risco de perda de dados operacionais.

Esse paradigma define claramente a separação de responsabilidades entre módulos: o Modelo de Tráfego é dono da configuração semafórica (o "o quê", quais planos, quais tempos, quais estratégias), enquanto o módulo de Controladores é dono do equipamento físico (o "como",  comunicação, firmware, estado de hardware, execução dos comandos).

O fluxo de execução das estratégias segue esta cadeia: a estratégia envia a configuração à interseção (que a persiste como sua configuração ativa), a interseção propaga a configuração ao controlador associado, o controlador executa a configuração recebida. Se o controlador estiver offline, a interseção mantém a configuração persistida e a reenvia automaticamente quando a comunicação for restabelecida.

Além do controle via estratégias, o módulo permite que o operador envie comandos diretos a qualquer controlador a qualquer momento, independentemente da estratégia ativa. Essa autonomia é essencial para situações de emergência onde o operador precisa intervir rapidamente — por exemplo, colocar um cruzamento em intermitente após um acidente — sem depender da criação ou modificação de uma estratégia.

O agrupamento de controladores com seus eventos e incidentes reflete o ciclo de vida operacional completo: o operador monitora controladores, recebe eventos (mudanças de estado, alarmes de hardware), trata incidentes (falhas, conflitos, avarias) e envia comandos — tudo no mesmo contexto.

### **Recursos**

**Lista de Controladores**

Recurso central do módulo, responsável pelo cadastro, configuração técnica e monitoramento de todos os controladores semafóricos da rede. Um controlador pode existir no sistema sem estar associado a nenhuma interseção (por estar em estoque, em testes ou pendente de instalação). Somente quando associado a uma interseção, o controlador passa a participar da operação semafórica, adotando a configuração que a interseção persiste.

**Funcionalidades**

* **Cadastro e configuração técnica**: Registro completo de cada controlador incluindo modelo, fabricante, versão de firmware, endereço IP, protocolo de comunicação (UNE, proprietário), porta de comunicação. Inclui a configuração dos parâmetros de comunicação entre o controlador e a central: intervalo de polling, timeout de conexão e modo de fallback (comportamento do controlador quando perde comunicação com a central). Essa configuração é exclusiva do equipamento e não depende de associação à interseção.  
* **Estados do controlador:** Cada controlador possui um estado explícito que reflete sua situação no ciclo de vida: 

| Estado | Descrição | Comandos Disponíveis |
| ----- | ----- | ----- |
| Em estoque | Equipamento cadastrado mas não instalado. Pode estar em almoxarifado ou aguardando designação. | Nenhum — apenas gestão de cadastro técnico. |
| Em testes | Instalado em bancada de testes ou em campo para validação. Não opera tráfego real. | Todos disponíveis para fins de teste. Warning: "Controlador em modo de testes". |
| Em campo — sem associar | Instalado fisicamente em uma interseção mas não associado logicamente no sistema. Pode estar operando com plano local interno. | Todos disponíveis. Warning permanente: "Controlador instalado em campo sem associação à interseção. Comandos não afetam configuração persistida." |
| Operativo | Associado a uma interseção e participando plenamente da operação semafórica. Recebe configurações das Estratégias via interseção. | Todos disponíveis. Operação normal. |

* **Comunicação com controladores:** Gestão da conexão bidirecional entre a central Attlas e cada controlador de campo. O sistema realiza polling periódico para verificar conectividade e coletar dados operacionais, mantém canais abertos para envio de comandos em tempo real e monitora a qualidade da comunicação (latência, taxa de perda de pacotes). Suporta múltiplos protocolos simultaneamente, permitindo que a rede contenha controladores de diferentes fabricantes.

* **Monitoramento em tempo real:** Visualização contínua do estado de cada controlador: status de conectividade (online/offline), plano semafórico em execução (recebido da interseção), fase atual, tempo restante da fase, modo de operação (normal, intermitente, apagado, manual), estado de luzes de cada grupo semafórico, intensidade luminosa (quando suportado pelo hardware) e modo de controle (central, local, manual). Essas informações também são exibidas no detalhe da interseção correspondente no Modelo de Tráfego.

* **Controle direto:** Capacidade de enviar comandos a controladores individuais ou a grupos de controladores simultaneamente, independentemente da estratégia ativa. Os comandos incluem: trocar plano semafórico, alterar modo de operação (intermitente, apagar, retornar ao modo central), forçar uma fase específica, alterar tempos de ciclo e executar reset do equipamento. Quando o operador envia um comando direto que conflita com a estratégia ativa, o sistema registra a intervenção manual, notifica sobre o conflito e mantém o comando manual até que o operador libere o controlador de volta ao controle da estratégia. O comando manual opera diretamente sobre o controlador — a interseção registra que o controlador está sob intervenção manual, mas não altera sua configuração persistida.

* **Substituição de equipamento:** Quando um controlador precisa ser substituído, o operador desassocia o controlador antigo da interseção (que mantém toda a sua configuração intacta) e associa o novo controlador. O novo equipamento recebe automaticamente a configuração persistida na interseção, planos, fases, tempos, defasagens e entra em operação sem necessidade de configuração manual. O controlador antigo retorna ao estado "Em estoque" ou "Em testes" para manutenção.

### **Eventos**

Recurso de registro e monitoramento de eventos operacionais dos controladores. Eventos são ocorrências detectadas automaticamente pelo sistema ou geradas pelos próprios controladores, representando mudanças de estado ou condições que merecem atenção do operador.

**Funcionalidades**

* **Registro automático de eventos:** Captura automática de todos os eventos gerados pelos controladores: mudanças de plano (qual plano saiu, qual entrou, quem solicitou — estratégia ou operador), transições de modo de operação, alertas de hardware (porta do armário aberta, temperatura elevada, falha de ventilador, detecção de conflito de fases), eventos de comunicação (perda de conexão, reconexão, timeout) e eventos de energia (queda de alimentação, entrada em bateria via nobreak, retorno de energia).

* **Classificação e filtragem:** Cada evento é classificado por tipo (operacional, hardware, comunicação, energia), severidade (informativo, atenção, crítico) e origem (controlador específico, subárea, área). Filtragem por qualquer combinação desses atributos, período de tempo ou área geográfica.

* **Correlação temporal:** Visualização de eventos em linha do tempo, permitindo correlacionar eventos simultâneos ou sequenciais. Por exemplo: queda de energia → perda de comunicação com 15 controladores → transição para modo local.

* **Notificação e integração:** Eventos críticos geram notificações no módulo de Alarmes. Eventos operacionais alimentam o módulo Analítico para análise de padrões. Todos os eventos são armazenados para consulta pelo módulo de Relatórios.

## **Exemplo de Uso**

### **Cenário**

São 07:45 de segunda-feira. A estratégia **"Hora Pico Manhã"** está ativa no corredor Av. 10 de Agosto. O operador Juan Martínez está monitorando a rede de controladores desde o centro de controle da **EPMMOP**.

### **Passo 1: Monitoramento da Rede**

Juan abre o módulo de Controladores e visualiza o Dashboard:

| Indicador | Valor |
| ----- | ----- |
| Controladores online | 47 de 50 (94%) |
| Controladores offline | 3 (CTRL-005, CTRL-023, CTRL-041) |
| Estratégia ativa | "Hora Pico Manhã" — configuração enviada via interseções do corredor |
| Incidentes abertos | 5 (2 críticos, 1 alto, 2 médios) |

### **Passo 2: Investigação de Controlador Offline**

Juan clica no **CTRL-005** (offline desde às 06:30). O sistema mostra que a interseção **INT-005** enviou a configuração da estratégia, mas o controlador não respondeu:

| Atributo | Informação |
| ----- | ----- |
| Identificação | CTRL-005 — Siemens ST900 / Firmware v4.2.1 |
| Estado | Operativo (associado a INT-005 — Av. 10 de Agosto / Av. Amazonas) |
| Status de comunicação | Offline desde 06:28:15 |
| Interseção associada | INT-005 — configuração persistida: Plano 2 (Hora Pico Manhã). Aguardando reconexão para propagar. |
| Modo de fallback | Local — executando plano interno do controlador (Plano 1 padrão) |
| Último evento | 06:28:15 — Timeout de comunicação (3 tentativas sem resposta) |
| Incidente | INC-2026-0847 — Criado automaticamente, severidade Alta, status: Aberto |

A interseção **INT-005** mantém a configuração da estratégia "Hora Pico Manhã" persistida. Quando **CTRL-005** reconectar, a interseção propagará automaticamente o Plano 2 ao controlador, sem intervenção do operador.

### **Passo 3: Intervenção Manual (Acidente)**

Às 07:52, Juan recebe informação de acidente em **INT-003**. O agente de trânsito solicita intermitente. Juan envia comando direto:

| Ação | Detalhes |
| ----- | ----- |
| Controlador | CTRL-003 — estado: Operativo, associado a INT-003 |
| Comando | Alterar modo para Intermitente |
| Conflito | Estratégia "Hora Pico Manhã" ativa — Plano 3 (BRT) em execução nesta interseção |
| Ação do sistema | Comando manual enviado diretamente ao CTRL-003. INT-003 registra que o controlador está sob intervenção manual. Configuração persistida na interseção NÃO é alterada (continua sendo Plano 3 BRT). |
| Registro | 07:52 — Juan Martínez colocou CTRL-003 em intermitente (motivo: acidente). Estratégia suspensa neste controlador. |

Às 08:30, o acidente é liberado. Juan retorna **CTRL-003** ao modo central. A interseção **INT-003** propaga automaticamente a configuração persistida (Plano 3 BRT da estratégia ativa) e **CTRL-003** volta à operação coordenada.

### **Passo 4 — Substituição de Equipamento**

O **CTRL-005** é diagnosticado com falha no módulo de comunicação. A equipe de campo substitui o equipamento por um **CTRL-051** (novo, estado "Em estoque"):

| Passo | Ação |
| ----- | ----- |
| 1\. Desassociar antigo | Operador desassocia CTRL-005 de INT-005. Estado de CTRL-005 muda para "Em estoque" (aguardando reparo). INT-005 mantém toda a configuração semafórica intacta. |
| 2\. Configurar novo | CTRL-051 recebe configuração técnica: IP 10.0.5.105, protocolo UNE, parâmetros de polling. Estado muda de "Em estoque" para "Em campo — sem associar". |
| 3\. Associar à interseção | Operador associa CTRL-051 a INT-005. Estado muda para "Operativo". INT-005 propaga automaticamente ao CTRL-051: Plano 2 (Hora Pico Manhã, se ativa) ou último plano persistido. |
| 4\. Verificação | CTRL-051 confirma recebimento do plano. INT-005 volta a operar normalmente. Nenhuma configuração semafórica foi perdida nem reconfigurada manualmente. |

Esse fluxo garante que a troca de equipamento seja uma operação rápida e segura: a inteligência de tráfego (planos, tempos, estratégias) está na interseção, não no controlador.

### **Passo 5 — Eventos do Turno**

Ao final do turno, Juan consulta os eventos:

| Hora | Controlador | Tipo | Descrição |
| ----- | ----- | ----- | ----- |
| 06:25:10 | CTRL-005 | Energia | Queda de energia na região |
| 06:28:15 | CTRL-005 | Comunicação | Timeout — fallback para modo local |
| 06:30:02 | INT-001 a 008 | Operacional | Estratégia "Hora Pico Manhã" enviada às interseções. INT-005 persiste config, aguarda reconexão. |
| 07:52:00 | CTRL-003 | Operacional | Modo intermitente por Juan Martínez (acidente em INT-003). Config persistida em INT-003 não alterada. |
| 08:30:00 | CTRL-003 | Operacional | Retorno ao modo central. INT-003 propagou Plano 3 (BRT) ao controlador. |
| 10:15:00 | CTRL-051 | Operacional | Novo controlador associado a INT-005. Configuração propagada: Plano 1 (Entre Picos, ativa às 09:00). |

## **4.6. Câmeras**

Tipo: **Funcional**

### **Contexto e Justificativa**

O módulo de Câmeras gerencia o subsistema de videomonitoramento do tráfego do Attlas. Classificado como Funcional, o módulo possui domínio operacional completo e autônomo: um operador pode monitorar câmeras, controlar movimentação PTZ e visualizar feeds de vídeo sem necessariamente interagir com controladores, PMVs ou outros módulos. O domínio de vídeo possui tecnologias, protocolos (RTSP, ONVIF) e workflows próprios que justificam plenamente sua separação.

O paradigma fundamental deste módulo é que a câmera é um dispositivo de captura e transmissão de vídeo em tempo real, não um dispositivo de armazenamento. Toda a responsabilidade de videogravação e armazenamento de dados de vídeo pertence ao VMS (Video Management System) externo ou ao próprio equipamento de gravação. O módulo Câmeras é responsável exclusivamente por: integração, monitoramento, controle operativo e visualização dos streams de vídeo.

A integração de câmeras é realizada mediante protocolo ONVIF (Open Network Video Interface Forum), garantindo interoperabilidade entre equipamentos de diferentes fabricantes. Adicionalmente, o módulo suporta conexão direta a bases de dados ou APIs proprietárias fornecidas pelos fabricantes, permitindo que câmeras com protocolos específicos também sejam integradas à rede.

O sistema é projetado para escalabilidade sem substituição da plataforma base: novas câmeras podem ser adicionadas progressivamente à rede sem impacto na infraestrutura existente, suportando o crescimento da malha de videomonitoramento de acordo com as necessidades operacionais da cidade.

Os dados de videoanalítica gerados pelas câmeras (contagem veicular, classificação de veículos, detecção de incidentes) são disponibilizados ao módulo Analítico, que os consome para tomada de decisões automatizada e geração de insights operacionais. A separação é clara: Câmeras captura e transmite; Analítico processa e decide.

### **Recursos**

**Lista de Câmeras**  
Recurso central do módulo, responsável pelo cadastro, configuração técnica e monitoramento de todas as câmeras da rede de videomonitoramento. Uma câmera pode existir no sistema sem estar ativa operacionalmente (por estar em estoque, em testes ou pendente de instalação). Somente quando configurada e ativa, a câmera passa a participar do videomonitoramento em tempo real.

**Funcionalidades**

* **Cadastro e configuração técnica:** Registro completo de cada câmera incluindo modelo, fabricante, versão de firmware, endereço IP, tipo de câmera (fixa, PTZ, analítica, térmica), resolução máxima, protocolo de comunicação (ONVIF, RTSP, API proprietária), porta de comunicação, codec de vídeo (H.264, H.265), taxa de quadros (fps) e capacidades analíticas nativas. Inclui configuração dos parâmetros de conexão: URL do stream primário e secundário, intervalo de heartbeat, timeout de conexão e modo de fallback.  
* **Estados da câmera:** Cada câmera possui um estado explícito que reflete sua situação no ciclo de vida:


| Estado | Descrição | Comandos Disponíveis |
| ----- | ----- | ----- |
| Em estoque | Equipamento cadastrado mas não instalado. Pode estar em almoxarifado ou aguardando designação. | Nenhum — apenas gestão de cadastro técnico. |
| Em testes | Instalada em bancada de testes para validação de stream, PTZ e configurações. Não participa do monitoramento operacional. | Visualização de stream e controle PTZ para fins de teste. *Warning: “Câmera em modo de testes”.* |
| Em campo — sem configurar | Instalada fisicamente mas sem configuração de stream validada no sistema. Pode estar operando localmente. | Visualização e PTZ disponíveis. *Warning permanente: “Câmera instalada em campo sem configuração validada.”* |
| Operativa | Configurada, validada e participando plenamente do videomonitoramento em tempo real. Streams ativos e disponíveis para operadores. | Todos disponíveis. Operação normal. |


* O estado deve ser definido manualmente pelo administrador. O sistema exibe warnings de confirmação antes de executar qualquer comando operacional em câmeras que não estejam no estado “Operativa”, prevenindo que o operador cometa erros ao interagir com equipamentos que podem estar fisicamente em campo sem configuração validada no sistema.  
* **Comunicação com câmeras:** Gestão da conexão bidirecional entre a central Attlas e cada câmera. O sistema realiza heartbeat periódico para verificar conectividade e disponibilidade do stream, mantém canais RTSP/ONVIF abertos para recepção de vídeo em tempo real e monitora a qualidade da comunicação (latência, taxa de perda de pacotes, qualidade do stream). Suporta conexão direta a bases de dados ou APIs proprietárias fornecidas pelo fabricante, permitindo integração de câmeras com protocolos específicos além do ONVIF.  
* **Monitoramento em tempo real:** Visualização contínua do estado de cada câmera: status de conectividade (online/offline), qualidade do stream (resolução atual, fps, bitrate), modo de operação (ativa, em pausa, em manutenção), posição PTZ atual (pan, tilt, zoom), status de iluminação IR (quando suportado) e presets configurados. Representação geoposicionada de câmeras no mapa, permitindo localização visual e acesso rápido ao stream diretamente do mapa.

* **Controle PTZ:** Capacidade de controlar câmeras PTZ (Pan-Tilt-Zoom) diretamente da interface gráfica do sistema ou do teclado do operador. Inclui: movimentação contínua (pan/tilt), controle de zoom (óptico e digital), gestão de presets (posições pré-configuradas), tours automáticos (sequência de presets com tempos configuráveis), modo de patrulha e rastreamento automático (quando suportado pelo hardware). O controle é exercido via protocolo ONVIF, garantindo padronização independente do fabricante.

* **Gestão de streams:** Configuração e gestão de múltiplos streams por câmera: stream primário (alta resolução, para visualização detalhada e gravação no VMS externo), stream secundário (baixa resolução, para miniaturas no Video Wall e monitoramento simultâneo de múltiplas câmeras). Configuração de codecs, resolução, taxa de quadros e bitrate por stream.

* **Substituição de equipamento:** Quando uma câmera precisa ser substituída, o operador desativa a câmera antiga (que retorna ao estado “Em estoque” para manutenção) e cadastra a nova câmera na mesma localização geográfica, herdando os metadados de posição, presets PTZ padrão e associações com o Video Wall.

### **Video Wall**

Interface para composição e exibição simultânea de múltiplos feeds de vídeo. Permite que operadores em centros de controle visualizem diversas câmeras simultaneamente, com layouts configuráveis e gestão avançada de visualização.

**Funcionalidades**

* **Layouts configuráveis:** Composição de telas com layouts pré definidos (1x1, 2x2, 3x3, 4x4) e layouts customizados criados pelo operador. Cada célula do layout pode exibir um stream de câmera diferente. Os layouts podem ser salvos como templates para reutilização.

* **Gestão de cenas:** Criação de cenas (conjuntos predefinidos de câmeras em layouts específicos) que podem ser ativadas rapidamente. Por exemplo: cena “Corredor Av. 10 de Agosto” com 4 câmeras do corredor em layout 2x2, cena “Visão Geral Norte” com 9 câmeras em 3x3.

* **Rotação automática:** Ciclo automático entre cenas com tempo configurável (ex: alternar entre cenas a cada 30 segundos), permitindo monitoramento contínuo de grandes áreas sem intervenção do operador.

* **Controle PTZ inline:** Controle PTZ diretamente de qualquer célula do Video Wall, sem necessidade de abrir a tela separada. O operador seleciona a célula e utiliza controles sobrepostos (overlay) para movimentar a câmera.

* **Popup de detalhe:** Expansão de qualquer célula para visualização em tela cheia com acesso a informações detalhadas da câmera (dados técnicos, localização, histórico de eventos).

* **Monitoramento de largura de banda:** Indicação em tempo real do consumo de banda de vídeo por câmera e total do Video Wall, alertando quando o consumo se aproxima dos limites da infraestrutura de rede.

### **Eventos**

Recurso de registro e monitoramento de eventos operacionais das câmeras. Eventos são ocorrências detectadas automaticamente pelo sistema ou geradas pelas próprias câmeras, representando mudanças de estado ou condições que merecem atenção do operador.

**Funcionalidades**

* **Registro automático de eventos:** Captura automática de todos os eventos gerados pelas câmeras: mudanças de estado (online/offline), eventos de comunicação (perda de stream, reconexão, timeout), eventos de energia (queda de alimentação, entrada em bateria, retorno de energia), eventos PTZ (movimentação não autorizada, falha de motor).

* **Classificação e filtragem:** Cada evento é classificado por tipo (operacional, hardware, comunicação, energia, analítica), severidade (informativo, atenção, crítico) e origem (câmera específica, subárea, área). Filtragem por qualquer combinação desses atributos, período de tempo ou área geográfica.

* **Correlação temporal:** Visualização de eventos em linha do tempo, permitindo correlacionar eventos simultâneos ou sequenciais. Por exemplo: queda de energia → perda de stream de 8 câmeras → reconexão progressiva.

* **Notificação e integração:** Eventos críticos geram notificações no módulo de Alarmes. Eventos de videoanalítica alimentam o módulo Analítico. Todos os eventos são armazenados para consulta pelo módulo de Relatórios.

**Incidentes**

Recurso de gestão unificada de incidentes relacionados a câmeras. Um incidente é qualquer situação que requer atenção, investigação ou ação corretiva. O recurso unifica incidentes operacionais (falha de stream, qualidade degradada) e avarias de equipamento (falha de hardware, vandalismo, problemas de comunicação persistentes) sob um único fluxo de gestão.

**Funcionalidades**

* **Criação automática e manual:** Incidentes podem ser criados automaticamente quando eventos críticos são detectados (ex: perda total de stream gera incidente automático de severidade crítica) ou manualmente pelo operador (ex: operador observa obstrução parcial da lente e registra o incidente).  
* **Classificação unificada:** Cada incidente é classificado por tipo (operacional, avaria de hardware, comunicação, energia, vandalismo), severidade (baixa, média, alta, crítica) e status (aberto, em análise, em manutenção, resolvido, fechado).  
* **Fluxo de tratamento:** Ciclo de vida definido: abertura \-\> triagem \-\> diagnóstico \-\> resolução (pode incluir geração de ordem de serviço no módulo Inventário para manutenção de campo) \-\> fechamento. O sistema rastreia tempos em cada etapa para cálculo de SLA.  
* **Vinculação com Inventário:** Quando o incidente requer manutenção física (substituição de câmera, reparo de caixa de proteção, troca de fonte), o operador pode gerar uma ordem de serviço diretamente do incidente, que é enviada ao módulo Inventário.  
* **Histórico e métricas:** Registro completo com análise de tendências: câmeras com maior incidência de problemas, tipos de avarias mais frequentes, tempo médio de resolução (MTTR) e tempo médio entre falhas (MTBF) por câmera e região.

**Dashboard**

Painel visual com indicadores-chave do estado da rede de câmeras, oferecendo visão consolidada e acionável do subsistema de videomonitoramento.

**Funcionalidades**

* **Indicadores de conectividade:** Percentual online/offline, mapa de calor por região, tendência de disponibilidade, câmeras com conexão intermitente.  
* **Indicadores operacionais:** Distribuição por tipo de câmera (fixa, PTZ, analítica) e estado, câmeras com capacidade analítica ativa, presets mais utilizados.  
* **Indicadores de incidentes:** Incidentes abertos por severidade, tempo médio de resolução, mapa de calor de avarias, câmeras com maior recorrência de problemas.  
* **Indicadores de rede:** Consumo total de largura de banda de vídeo, distribuição de banda por área, câmeras com degradação de qualidade de stream, latência média de conexão.

## **Exemplo de Uso**

### **Cenário**

São 14:20 de quarta-feira. A operadora María González está monitorando a rede de câmeras desde o centro de controle da EPMMOP. O corredor Av. América possui 12 câmeras PTZ instaladas e 3 câmeras analíticas em interseções críticas.

### 

### **Passo 1: Monitoramento da Rede**

María abre o módulo de Câmeras e visualiza o Dashboard:

| Indicador | Valor |
| :---- | :---- |
| Câmeras online | 14 de 15 (93%) |
| Câmeras offline | 1 (CAM-007 — Av. América / Av. Mariana de Jesús) |
| Largura de banda | 320 Mbps de 500 Mbps disponíveis (64%) |
| Incidentes abertos | 3 (1 crítico, 1 alto, 1 médio) |

### 

### **Passo 2: Investigação de Câmera Offline**

María clica na CAM-007 (offline desde às 13:45). O sistema mostra:

| Atributo | Informação |
| :---- | :---- |
| Identificação | CAM-007 — Hikvision DS-2DE4425IW / Firmware v5.7.3 / PTZ |
| Estado | Operativa (Av. América / Av. Mariana de Jesús) |
| Status de comunicação | Offline desde 13:42:30 |
| Stream | RTSP://10.0.7.107/stream1 — sem resposta |
| Último evento | 13:42:30 — Timeout de conexão (3 tentativas sem resposta) |
| Incidente | INC-2026-1203 — Criado automaticamente, severidade Alta, status: Aberto |

### 

### **Passo 3: Monitoramento de Acidente via Video Wall**

Às 14:35, María recebe a notificação de acidente na interseção Av. América / Av. Colón (monitorada pela CAM-003 e CAM-004). María ativa a cena “Interseção América-Colón” no Video Wall:

| Ação | Detalhes |
| :---- | :---- |
| Layout ativado | 2x2 — CAM-003 (visão geral), CAM-004 (detalhe), CAM-002 (aproximação norte), CAM-005 (aproximação sul) |
| Controle PTZ | María direciona CAM-003 para o ponto exato do acidente usando controle PTZ inline. Zoom 12x ativado. |
| Coordenação | Informação visual transmitida em tempo real ao módulo de Controladores para apoiar a decisão de colocar CTRL-009 em intermitente. |
| Registro | 14:35 — María González ativou cena “Interseção América-Colón”. PTZ de CAM-003 direcionado manualmente. |

### 

### **Passo 4: Substituição de Equipamento**

A CAM-007 é diagnosticada com falha no módulo de rede. A equipe de campo substitui o equipamento por uma CAM-016 (nova, estado “Em estoque”):

| Passo | Ação |
| :---- | :---- |
| 1\. Desativar antiga | Operador desativa CAM-007. Estado muda para “Em estoque” (aguardando reparo). Localização geográfica e presets PTZ padrão são mantidos como referência. |
| 2\. Configurar nova | CAM-016 recebe configuração técnica: IP 10.0.7.107, protocolo ONVIF, parâmetros de stream. Estado muda de “Em estoque” para “Em campo — sem configurar”. |
| 3\. Validar e ativar | Stream validado. Estado muda para “Operativa”. CAM-016 aparece no mapa na mesma posição de CAM-007. Presets PTZ reconfigurados. |
| 4\. Verificação | CAM-016 visível no Video Wall e no mapa. Cenas que incluíam CAM-007 atualizadas automaticamente para CAM-016. |

### 

### **Passo 5: Eventos do Turno**

Ao final do turno, María consulta os eventos:

| Hora | Câmera | Tipo | Descrição |
| :---- | :---- | :---- | :---- |
| 13:42:30 | CAM-007 | Comunicação | Timeout — stream indisponível |
| 13:42:35 | CAM-007 | Operacional | Incidente INC-2026-1203 criado automaticamente. |
| 14:35:00 | CAM-003 | Operacional | PTZ direcionado manualmente por María González (acidente América/Colón). |
| 15:20:00 | CAM-003 | Operacional | PTZ retornado a preset padrão (acidente liberado). |
| 16:10:00 | CAM-016 | Operacional | Nova câmera ativada na posição de CAM-007. Stream validado. |

## **4.6. Analítico**

Tipo: **Dependente**

### **Contexto e Justificativa**

O módulo Analítico é o cérebro de inteligência de dados do Attlas. Ele processa, analisa e apresenta dados coletados por controladores, sensores e câmeras para gerar insights sobre o desempenho da rede de tráfego. É classificado como Dependente porque não gera dados próprios, ele consome dados de outros módulos (Modelo de Tráfego, Controladores, Câmeras, pontos de medição) e os transforma em informação acionável.

O paradigma fundamental deste módulo é a cadeia de valor dos dados: coleta \-\> configuração \-\> processamento \-\> análise \-\> apresentação \-\> ação. Embora o módulo consuma dados de múltiplas fontes (controladores, detectores, sensores), o foco primário está na videoanalítica: o Analítico é o módulo responsável por configurar os mecanismos de detecção de presença (laços virtuais), classificação de objetos (regiões de interesse) e processamento inteligente das imagens capturadas pelas câmeras. O módulo Câmeras fornece o stream de vídeo; o Analítico define o que fazer com ele.

Além da videoanalítica, o módulo integra ferramentas ATSPM (Automated Traffic Signal Performance Measures) que consomem dados de alta resolução dos controladores semafóricos para gerar métricas de desempenho. Essa combinação — videoanalítica como core operacional e ATSPM como extensão analítica — permite ao Attlas oferecer uma visão completa: desde a detecção física de veículos e incidentes até a avaliação de eficiência da temporização semafórica.

O módulo possui também capacidade de tomada de decisões automatizada: utilizando dados conhecidos de videoanalítica e detectores, o Analítico pode alimentar diretamente as Estratégias do Modelo de Tráfego, sugerindo ou ativando ajustes de temporização semafórica em resposta a condições de tráfego detectadas em tempo real. Essa capacidade transforma o Attlas de um sistema reativo em um sistema preditivo e adaptativo.

A separação de responsabilidades é clara: o módulo Câmeras captura e transmite vídeo; o módulo Controladores coleta dados de detectores e executa comandos; o Analítico configura a inteligência sobre esses dados, processa resultados e gera insights — sem impactar a operação em tempo real dos equipamentos de campo.

### **Recursos**

### **Visão Geral**

Recurso de visualização e configuração analítica das câmeras da rede. Apresenta todas as câmeras associadas ao domínio analítico em uma interface consolidada, permitindo ao operador ou engenheiro de tráfego acessar o stream de cada câmera e configurar diretamente os mecanismos de detecção e classificação sobre o vídeo. Diferentemente do módulo Câmeras (que foca no monitoramento operativo e controle PTZ), a Visão Geral do Analítico foca na configuração da inteligência aplicada ao vídeo.

**Funcionalidades**

* **Listagem de câmeras analíticas:** Exibição de todas as câmeras que possuem configuração analítica ativa ou pendente, com indicação de status (configurada, não configurada, erro de processamento), localização geográfica e tipo de analítico associado.

* **Visualização de stream com overlay analítico:** Ao clicar em uma câmera, o sistema exibe o stream de vídeo em tempo real com sobreposição (overlay) dos elementos analíticos configurados: laços virtuais de detecção de presença desenhados sobre a imagem, regiões de interesse para classificação de objetos, contadores ativos e alertas em tempo real. Essa visualização permite ao operador verificar imediatamente se a configuração analítica está correta.

* **Configuração de laços virtuais (detecção de presença):** Interface gráfica para desenhar, editar e posicionar laços virtuais diretamente sobre o stream de vídeo da câmera. Os laços virtuais são regiões definidas pelo operador que simulam o comportamento de detectores físicos indutivos: quando um veículo cruza o laço, o sistema registra a presença. O operador define: posição e geometria do laço (retângulo, polígono), direção de detecção (entrada, saída, bidirecional), sensibilidade de detecção e associação com faixas de tráfego.

* **Configuração de regiões de classificação de objetos:** Interface gráfica para definir regiões de interesse (ROI — Regions of Interest) onde o sistema aplica algoritmos de classificação de objetos. Dentro de cada região, o sistema identifica e classifica: tipos de veículos (automóvel, ônibus, caminhão, motocicleta, bicicleta), pedestres, objetos estáticos (obstáculos na via, veículos parados). O operador configura: área da região (polígono sobre o stream), classes de objetos a detectar, limiares de confiança e ações automáticas por tipo de detecção (ex: gerar alerta quando pedestre detectado em faixa exclusiva).

* **Validação em tempo real:** Feedback visual imediato após cada alteração de configuração: o sistema mostra em tempo real as detecções geradas pelos laços e regiões reciém-configurados, permitindo ao operador ajustar posição e parâmetros até obter a precisão desejada antes de confirmar a configuração.

* **Histórico de configurações:** Registro de todas as alterações de configuração analítica por câmera, com versionamento, autor, data e motivo. Permite reverter a configurações anteriores em caso de erro ou degradação de precisão.

### **Analíticos**

Recurso central de gestão de todos os analíticos e seus dispositivos associados (câmeras e Acom’s). Um analítico é um servidor externo de processamento de vídeo que executa algoritmos de visão computacional (contagem, classificação, detecção de incidentes, medição de velocidade) sobre os streams recebidos das câmeras. Toda a configuração de processamento (algoritmos, modelos, parâmetros de detecção) é gerida no próprio servidor analítico, fora do escopo do Attlas. O módulo Analítico do Attlas é responsável exclusivamente por: registrar os servidores, conectar-se a eles para obter dados processados, monitorar sua conectividade via polling e gerenciar os dispositivos associados.

Os Acom’s (Acompanhamentos) são placas de hardware instaladas nos controladores semafóricos cuja única função é converter o sinal de detecção gerado pela câmera (via videoanalítica) em contato seco, uma interface elétrica on/off que o controlador interpreta como presença veicular, de forma análoga a um laço indutivo físico. Os Acom’s são o elo entre a videoanalítica e a operação semafórica, e são gerenciados como dispositivos associados dentro deste recurso.

**Funcionalidades**

* **Cadastro de servidores analíticos:** Registro de cada servidor analítico na rede incluindo: nome identificador, endereço IP/hostname, porta de comunicação, protocolo de conexão (API REST, protocolo proprietário), credenciais de acesso, tipo de dados fornecidos (contagem veicular, classificação de objetos, detecção de incidentes, medição de velocidade, detecção de fila, detecção de veículo parado, contagem de pedestres) e intervalo de coleta de dados. Não há configuração de parâmetros de processamento no Attlas, essa responsabilidade pertence ao servidor analítico.

* **Estados de conectividade:** Cada servidor analítico possui um estado de conectividade monitorado continuamente por polling:

| Estado | Descrição | Comportamento do Attlas |
| ----- | ----- | ----- |
| Online | Servidor respondendo ao polling e fornecendo dados dentro dos parâmetros esperados. | Coleta dados normalmente. Alimenta Dashboard, Relatórios e Estratégias. |
| Degradado | Servidor respondendo ao polling mas com latência elevada, dados incompletos ou taxa de erros acima do limiar. | Coleta dados disponíveis. Incidente gerado automaticamente. *Warning: “Servidor analítico degradado. Dados podem estar incompletos.”* |
| Offline | Servidor não responde ao polling. Comunicação perdida após múltiplas tentativas. | Coleta interrompida. Incidente crítico gerado automaticamente. *Warning: “Servidor analítico offline. Sem dados desde \[timestamp\].”* |
| Não configurado | Servidor registrado no sistema mas sem parâmetros de conexão válidos ou aguardando configuração inicial. | Nenhuma coleta. Apenas gestão de cadastro. |

* **Monitoramento de conectividade (polling):** O sistema realiza polling periódico a cada servidor analítico para verificar disponibilidade e saúde da conexão. O intervalo de polling é configurável por servidor. Cada ciclo de polling registra: status de resposta, latência, volume de dados recebidos e taxa de erros. O histórico de polling alimenta métricas de disponibilidade (uptime) no Dashboard.

* **Coleta e consumo de dados:** Conexão aos servidores analíticos para obtenção dos dados processados: contagens veiculares por faixa e direção, classificação por tipo de veículo, eventos de detecção (incidentes, veículos parados, pedestres), velocidade média e taxa de ocupação. Os dados são recebidos e armazenados pelo Attlas para alimentar o Dashboard, Relatórios e regras de Estratégias.

* **Gestão de dispositivos associados (Câmeras):** Associação de câmeras a servidores analíticos específicos. O Attlas registra qual câmera alimenta qual servidor, permitindo rastreabilidade entre o stream de vídeo (gerido pelo módulo Câmeras) e os dados processados (obtidos do servidor analítico). Uma câmera pode estar associada a múltiplos servidores simultaneamente.

* **Gestão de dispositivos associados (Acom’s):** Cadastro e associação de Acom’s (Acompanhamentos) como dispositivos de interface entre a videoanalítica e os controladores semafóricos. Cada Acom é uma placa instalada em um controlador específico que converte o sinal de detecção da câmera em contato seco, permitindo que o controlador receba a informação de presença veicular detectada por videoanalítica como se fosse um detector físico. Cada Acom é configurado com: controlador associado, câmera fonte do sinal de detecção, mapeamento de canais de detecção (qual laço virtual corresponde a qual entrada de contato seco) e status de operação.

* **Tomada de decisões automatizada:** Capacidade de configurar regras automáticas no Attlas que utilizam os dados consumidos dos servidores analíticos para alimentar as Estratégias do Modelo de Tráfego. Exemplos: ativação de plano de emergência quando o servidor de detecção de incidentes reporta acidente, ajuste de tempos de ciclo quando volume recebido excede limiar, ativação de onda verde quando fluxo no corredor é favorável. As regras operam em modo de sugestão (requer aprovação do operador) ou modo automático (execução imediata).

### **Incidentes**

Recurso de gestão de incidentes detectados pelo domínio analítico. Diferentemente dos incidentes de equipamento (geridos nos módulos Controladores e Câmeras), os incidentes do Analítico são incidentes de tráfego e de processamento detectados por análise de dados e videoanalítica.

**Funcionalidades**

* **Detecção automática de incidentes de tráfego:** Incidentes detectados pelos analíticos configurados: congestionamentos atípicos (ocupação acima do limiar com velocidade abaixo do limiar), quedas abruptas de fluxo (possível acidente), formação de filas anormais, veículos parados em locais inesperados, pedestres em áreas restritas, e contra-fluxo detectado por videoanalítica.

* **Classificação e severidade:** Cada incidente é classificado por tipo (tráfego, processamento), subtipo (congestionamento, acidente provável, fila excessiva, falha analítica, degradação), severidade (calculada com base na magnitude do desvio e importância do corredor afetado) e status de confirmação (detectado, confirmado pelo operador, falso positivo).

* **Fluxo de tratamento:** Ciclo de vida: abertura automática ou manual \-\> confirmação visual (via câmeras) \-\> ação corretiva (ativação de estratégia, comando direto ao controlador, despacho de equipe) \-\> monitoramento \-\> fechamento. O sistema rastreia tempos em cada etapa para cálculo de SLA.

* **Histórico e padrões:** Registro completo de todos os incidentes com análise de recorrência: identificação de pontos críticos (interseções ou corredores com alta frequência de incidentes), horários de maior incidência, correlação com condições climáticas ou eventos especiais, e eficácia das ações corretivas aplicadas.

### **ATSPM**

**Automated Traffic Signal Performance Measures**: conjunto de ferramentas de software, dados e análises de alta resolução que permitem gestionar, manter e otimizar os semáforos em tempo real. O ATSPM utiliza dados de alta resolução dos controladores semafóricos (eventos de fase, ativações de detectores, preemptions, transições) para gerar informes de desempenho automatizados, seguindo padrões internacionais. Enquanto os demais recursos do Analítico focam em videoanalítica e dados de sensores, o ATSPM é a extensão analítica que avalia diretamente a eficiência da operação semafórica. Os dados são coletados pelo módulo controladores e consumidos pelo ATSPM para geração de métricas de desempenho.

**Funcionalidades**

* **Purdue Coordination Diagram (PCD):** Gráfico que relaciona chegadas de veículos com o início da fase verde, permitindo avaliar a qualidade da coordenação semafórica (onda verde). Identifica se os veículos estão chegando durante o verde (boa coordenação) ou durante o vermelho (coordenação deficiente).

* **Arrivals on Green (AOG):** Percentual de veículos que chegam à interseção durante a fase verde. Indicador direto da eficiência da coordenação: valores acima de 70% indicam boa coordenação, abaixo de 50% indicam necessidade de ajuste de defasagem.

* **Split Monitor:** Monitoramento do uso efetivo de cada fase em relação ao tempo alocado. Identifica fases subutilizadas (tempo verde desperdiçado) e fases sobrecarregadas (filas residuais frequentes), fornecendo dados para otimização de splits.

* **Yellow/Red Actuations:** Contagem de veículos que cruzam a interseção durante as fases amarela e vermelha. Indicador de segurança viária: alta incidência pode indicar necessidade de ajuste no entreverdes ou revisão da geometria da interseção.

* **Turning Movement Counts (TMC):** Contagem classificada de movimentos (giro à esquerda, frente, giro à direita) por aproximação, derivada de detectores e videoanalítica. Base para dimensionamento de fases e avaliação de nível de serviço.

* **Approach Delay:** Estimativa do atraso médio por aproximação, calculado a partir de dados de ocupação e volume. Indicador fundamental para cálculo de nível de serviço (LOS) e avaliação do impacto de mudanças de plano.

* **Preemption e Priority:** Registro e análise de eventos de preemption (veículos de emergência) e priority (transporte público). Métricas de tempo de resposta, impacto no ciclo e recuperação pós-evento.

* **Relatórios de desempenho:** Geração de relatórios automatizados de desempenho semafórico por interseção, corredor e período. Inclui comparações antes/depois de alterações de plano, ranking de interseções por eficiência e identificação de oportunidades de otimização.

### **Dashboard**

Painel visual com indicadores-chave do domínio de analíticos de vídeo e processamento de dados, oferecendo visão consolidada e acionável de toda a infraestrutura analítica.

**Funcionalidades**

* **Indicadores de videoanalítica:** Volume veicular agregado por área, distribuição por tipo de veículo, velocidade média por corredor, taxa de ocupação e nível de serviço (LOS) em tempo real e histórico. Gráficos temporais com comparação ao padrão histórico do mesmo período.

* **Indicadores de cobertura analítica:** Percentual de câmeras com analíticos ativos, distribuição de servidores analíticos por estado (online, degradado, offline), Acom’s operacionais vs. com falha de conversão, mapa de calor de cobertura analítica na rede.

* **Indicadores de qualidade:** Precisão média das detecções por analítico e por câmera, taxa de falsos positivos, analíticos com degradação de precisão, tendência de qualidade ao longo do tempo.

* **Indicadores de incidentes:** Incidentes de tráfego detectados por severidade, tempo médio de confirmação, taxa de falsos positivos, correlação entre detecções e ações corretivas aplicadas.

* **Indicadores ATSPM:** Resumo das métricas de desempenho semafórico: AOG médio da rede, interseções com pior desempenho, tendência de atraso médio e ranking de corredores por eficiência de coordenação.

## 

## **Exemplo de Uso**

### **Cenário**

São 08:15 de quinta-feira. O engenheiro de tráfego Carlos Reyes está no centro de controle da EPMMOP. Na semana anterior, duas novas câmeras analíticas foram instaladas no corredor Av. 6 de Diciembre e uma nova temporização semafórica foi implementada. Carlos precisa configurar os analíticos das novas câmeras e avaliar o impacto da nova temporização.

### 

### **Passo 1: Configuração na Visão Geral**

Carlos abre a Visão Geral do módulo Analítico e localiza a CAM-018 (recém-instalada na Av. 6 de Diciembre / Av. Naciones Unidas). O status indica “não configurada”:

| Ação | Detalhes |
| ----- | ----- |
| Acesso ao stream | Carlos clica na CAM-018. O stream é exibido em tempo real sem overlay (nenhum laço ou região configurados). |
| Configuração de laços virtuais | Carlos desenha 4 laços virtuais sobre o stream: 2 na aproximação norte (faixas 1 e 2\) e 2 na aproximação sul (faixas 1 e 2). Direção: bidirecional. Sensibilidade: média. |
| Configuração de regiões ROI | Carlos define 2 regiões de classificação: uma para a aproximação norte e outra para a sul. Classes: automóvel, ônibus, caminhão, motocicleta. |
| Validação em tempo real | O sistema mostra imediatamente detecções nos laços e classificações nas regiões. Carlos ajusta a posição do laço da faixa 2 norte (estava 10cm deslocado). |
| Confirmação | Carlos salva a configuração. CAM-018 muda para status “configurada” na Visão Geral. |

### 

### **Passo 2: Registro e Conexão de Servidor Analítico**

Carlos acessa o recurso Analíticos para registrar o servidor de videoanalítica que processará as imagens da CAM-018. O servidor já foi configurado pela equipe de TI com os algoritmos de contagem e classificação — Carlos precisa apenas registrá-lo no Attlas e estabelecer a conexão:

| Atributo | Configuração |
| ----- | ----- |
| Nome | SVR-AN-012 — Servidor Analítico Av. 6 de Diciembre (Norte) |
| Endereço | 10.0.12.50:8443 — API REST |
| Tipo de dados fornecidos | Contagem veicular \+ Classificação de objetos \+ Detecção de incidentes |
| Dispositivos associados | CAM-018, CAM-019 (câmeras) / ACOM-032 (placa de contato seco instalada em CTRL-018, converte detecção da CAM-018) |
| Intervalo de polling | 30 segundos |
| Intervalo de coleta de dados | 5 minutos (agregação) |

Após salvar, o sistema executa o primeiro polling. O servidor responde dentro dos parâmetros esperados:

| Verificação | Resultado |
| ----- | ----- |
| Conectividade | Online — latência 12ms |
| Dados recebidos | Contagem: 342 veíc (5 min) / Classificação: 89% automóveis, 6% ônibus, 3% caminhões, 2% motos |
| Estado | Online |

Nota: toda a configuração de processamento (algoritmos, modelos de IA, parâmetros de detecção) é realizada no próprio servidor SVR-AN-012, fora do escopo do Attlas. O Attlas apenas se conecta ao servidor para consumir os dados já processados e monitorar sua disponibilidade via polling.

### 

### **Passo 3: Análise ATSPM**

Carlos acessa o recurso ATSPM para avaliar o impacto da nova temporização na interseção Av. 6 de Diciembre / Av. Naciones Unidas:

| Indicador ATSPM | Resultado |
| ----- | ----- |
| Arrivals on Green (AOG) | 72% (melhoria de 58% para 72% — coordenação eficaz) |
| Split utilization (Fase 2 — principal) | 85% (uso adequado do tempo verde alocado) |
| Split utilization (Fase 4 — secundária) | 45% (tempo verde subutilizado — oportunidade de redistribuição) |
| Yellow/Red Actuations | 12 eventos/h (dentro do limiar aceitável de 15\) |
| Approach Delay (médio) | 32s (redução de 45s para 32s — melhoria de 29%) |

### 

### **Passo 4: Detecção de Incidente**

Às 08:45, o analítico de detecção de incidentes da CAM-012 (Av. 6 de Diciembre / Av. Eloy Alfaro) detecta uma anomalia:

| Atributo | Informação |
| ----- | ----- |
| Anomalia detectada | Queda abrupta de fluxo na aproximação norte (de 800 para 200 veíc/h em 5 min) \+ veículo parado detectado na faixa 2\. |
| Classificação | Possível acidente — severidade Alta |
| Câmeras sugeridas | CAM-011 e CAM-012 (confirmação visual imediata) |
| Ação automática | Sugestão enviada ao Modelo de Tráfego: ativar plano de emergência para INT-015. |

Carlos confirma visualmente o acidente via CAM-012 no Video Wall e aprova a sugestão. O Modelo de Tráfego ativa o plano de emergência, que é propagado ao controlador via interseção.

*Nota: a cadeia completa de ação é: Analítico detecta anomalia (via videoanalítica) → gera incidente → sugere ação ao Modelo de Tráfego → operador confirma visualmente (via Câmeras) → Estratégia envia configuração à interseção → interseção propaga ao controlador.*

### **Passo 5: Dashboard**

Ao final da manhã, Carlos consulta o Dashboard do Analítico:

| Indicador | Valor |
| ----- | ----- |
| Analíticos ativos | 38 de 42 (90,5%) |
| Analíticos em erro | 2 (AN-031: câmera offline, AN-039: degradação de precisão) |
| Acom’s operacionais | 56 de 60 (93,3%) — 4 com falha de conversão de sinal |
| Precisão média (videoanalítica) | 94,2% |
| Incidentes detectados (hoje) | 3 (1 confirmado, 1 pendente, 1 falso positivo) |
| AOG médio da rede | 68% (melhoria de 3pp vs. semana anterior) |

## **4.7. Plano de Execução**

Tipo: **Dependente**

### **Contexto e Justificativa**

O módulo de Plano de Execução gerencia o planejamento e programação de atividades operacionais que envolvem múltiplos módulos do sistema. É Dependente porque um plano de execução tipicamente envolve ações sobre controladores, câmeras, PMVs e outros dispositivos simultaneamente, ele orquestra tarefas que pertencem a diferentes contextos. O domínio de orquestração de ações, sequências coordenadas de comandos sobre subsistemas, notificações, decisões humanas e automações, possui lógica, workflows e ciclos de vida próprios que justificam sua separação.

O paradigma fundamental deste módulo é a separação entre definição e execução. Um plano é um template reutilizável que define fases, tarefas e ações de forma estruturada; uma execução é uma instância viva desse plano, com estado próprio, operador responsável, log de ações e acompanhamento em tempo real. Essa separação permite que o mesmo plano tenha múltiplas execuções simultâneas, cada uma com seu contexto e resultado independente. A analogia direta é com o Modelo de Tráfego: assim como uma Estratégia define a configuração e a interseção a executa, um Plano define a sequência de ações e a Execução a realiza.

Um plano de execução é um conjunto de tarefas organizadas em fases, que se executam de maneira coordenada mediante uma sequência que pode ser manual (o operador executa cada passo), semi-automatizada (o sistema executa com confirmações em fases críticas) ou completamente automatizada (sem intervenção do operador). Os planos podem ser associados a alarmes ou eventos, herdando contexto e proprietário automaticamente, ou serem lançados de forma independente pelo operador.

O módulo inclui uma biblioteca de tarefas reutilizáveis que padroniza as ações disponíveis (enviar ordens a subsistemas, enviar mensagens, executar scripts, solicitar input do operador) e simplifica a criação de novos planos. Adicionalmente, suporta simulação de planos como modo de execução específico, permitindo validação em ambiente de pré-produção e transferência de conhecimento para operadores.

## **Recursos**

### **Planos**

Recurso central de definição e gestão dos planos de execução. Um plano é um template estático que descreve a sequência completa de fases, tarefas, ações e regras de execução. O plano não executa ações diretamente , ele define o que deve ser feito. A execução efetiva é gerida pelo recurso Execuções.

**Funcionalidades**

* **Cadastro e dados gerais:** Registro completo de cada plano incluindo identificador único, nome, descrição, tipo de plano, versão, organização responsável, criador e data de criação. Configuração de modo de lançamento (manual, semi-automático, automático) e restrição de instância (“mono-instância” para limitar a uma única execução simultânea, ou “multi-instância” para múltiplas execuções paralelas). Definição de perfis de usuário autorizados a lançar o plano.

* Tipos de plano: Cada plano é classificado por seu tipo, que determina o mecanismo de avanço das fases:

| Tipo de Plano | Mecanismo de Avanço das Fases |
| :---- | :---- |
| Sequenciado | Fases executadas em ordem sequencial. Cada fase inicia após a conclusão da anterior. |
| Baseado em estado de evento | Fases lançadas quando o evento associado muda de estado (ex: evento passa de “Aberto” para “Em atendimento” → fase 2 inicia). |
| Baseado em planificação de evento | Fases configuradas para executar um tempo antes ou depois do início ou fim esperado do evento (ex: fase de preparação inicia 30 min antes do evento). |
| Baseado em estado de alarma | Fases lançadas pela ativação ou desativação da alarma associada ao plano. |

* **Estrutura de fases:** Um plano contém uma ou mais fases que agrupam tarefas cuja execução está relacionada ou deve ser realizada de maneira coordenada. Cada fase define: nome, descrição, ordem de execução, condição de avanço (automática, com confirmação do operador, ou manual), tipo de execução das tarefas internas (sequencial ou workflow com ramificações) e tempo de espera máximo (timeout).  
* **Flujograma visual:** Cada plano dispõe de um fluxograma definido com todas as fases, árvore de decisões, tipo de resposta em cada ponto (manual, com confirmação ou automática) e tipo de usuário que pode lançar cada ação. A criação é realizada desde a interface gráfica específica do módulo, com estrutura hierárquica e biblioteca de símbolos.  
* **Associação com alarmes e eventos:** Planos podem ser associados a alarmes e/ou eventos do sistema. Quando associado, o plano pode ser lançado automaticamente pela ativação de uma alarma ou pela criação/mudança de estado de um evento. O plano herda o proprietário do evento (o operador responsável pelo evento torna-se responsável pela execução do plano).  
* **Ciclo de vida do plano:** Cada plano possui um estado explícito que reflete sua situação no ciclo de aprovação:


| Estado | Descrição | Ações Disponíveis |
| :---- | :---- | :---- |
| Rascunho | Plano em elaboração. Configuração incompleta ou em edição. | Editar, submeter para aprovação, duplicar. |
| Pendente de confirmação | Submetido para aprovação. Aguardando que um operador autorizado confirme, rejeite ou devolva a edição. | Confirmar, rejeitar, devolver a edição. |
| Disponível | Plano aprovado e pronto para execução. Pode ser lançado manual ou automaticamente. | Executar, simular, editar (gera nova versão), obsolescer. |
| Rejeitado | Plano não aprovado no ciclo de confirmação. Mantido no histórico. | Consultar. Pode ser duplicado para criar nova versão. |
| Obsoleto | Plano desativado. Substituído por versão mais recente ou não mais aplicável. | Consultar no histórico. Não pode ser executado. |

* **Duplicação e versionamento:** Planos podem ser duplicados para simplificar a criação de novos planos baseados em planos existentes. Quando um plano “Disponível” é editado, o sistema gera automaticamente uma nova versão, mantendo a versão anterior no histórico. Todas as modificações são registradas com usuário, data e hora.  
* **Propriedade do plano:** Um plano associado a um evento herda o proprietário do evento. Planos lançados manualmente são de propriedade do operador que os lançou. A propriedade pode ser adquirida, transferida ou liberada. Notificações e tarefas pendentes são direcionadas ao operador proprietário; na ausência de proprietário, são enviadas de forma genérica para que qualquer operador as atenda.  
* **Relatórios e auditoria:** Todas as ações e operações realizadas sobre um plano são registradas pelo sistema (criação, edição, aprovação, rejeição, lançamento, duplicação). O registro completo é disponível para consulta e auditoria. Relatórios de detalhes de configuração e listagem de planos podem ser exportados em formato PDF e Excel.


### **Execuções**

Recurso de gestão das instâncias vivas de planos em execução. Uma execução é a realização concreta de um plano: possui estado próprio, operador responsável, log de ações e acompanhamento em tempo real. O mesmo plano pode ter múltiplas execuções simultâneas (salvo se configurado como mono-instância). A simulação de planos é tratada como um modo de execução específico dentro deste recurso.

**Funcionalidades**

* **Lançamento de execução:** Uma execução pode ser lançada de três formas: manual (o operador seleciona o plano e inicia), automática (o sistema lança em resposta a uma alarma ou evento associado) ou semi-automática (o sistema sugere o lançamento e o operador confirma). No momento do lançamento, o sistema verifica restrições de instância (mono-instância) e privilégios do operador.  
* **Estados da execução:** Cada execução possui um estado que reflete sua situação operacional:


| Estado | Descrição | Ações do Operador |
| :---- | :---- | :---- |
| Em execução | Plano sendo executado ativamente. Fases e tarefas em andamento segundo o tipo de plano. | Pausar, interromper, acompanhar em tempo real. |
| Pausada | Execução temporariamente suspensa pelo operador. Estado das tarefas preservado. | Continuar, interromper. |
| Interrompida | Execução finalizada prematuramente pelo operador antes da conclusão de todas as fases. | Consultar resultado parcial. |
| Finalizada | Todas as fases e tarefas concluídas com sucesso. Resultado registrado. | Consultar resultado completo, exportar relatório. |
| Erro | Falha durante a execução: timeout de tarefa, falha de comunicação com subsistema, ou erro de script. *Warning: “Execução em estado de erro. Intervenção requerida.”* | Retomar, interromper, consultar log de erro. |

* **Acompanhamento em tempo real:** A execução pode ser acompanhada em tempo real desde a interface de detalhe do plano e desde o próprio mapa. O sistema exibe: fase atual, tarefa em andamento, próximas ações, tempo decorrido por fase, resultado de cada tarefa concluída e status dos dispositivos envolvidos. Listagem de todas as execuções em curso disponível na interface de planos.  
* **Execução de tarefas:** As tarefas de cada fase são executadas segundo o tipo configurado: sequencial (lista ordenada com execução uma após outra) ou workflow (fluxo de trabalho com ramificações, condições e caminhos paralelos). Cada tarefa pode ser executada de forma manual (operador executa e registra resultado), semi-automática (sistema executa com confirmação do operador) ou automática (sem intervenção). Ações automáticas podem requerer confirmação de um operador com privilégios adequados; configura-se tempo de espera e resultado padrão por timeout.  
* **Tarefas-template com seleção dinâmica:** Tarefas configuradas como template permitem selecionar dispositivos em tempo real, dependendo do contexto do evento ou alarme. Por exemplo: uma tarefa “Enviar ordem a câmeras próximas” seleciona automaticamente as câmeras mais próximas ao evento no momento da execução, não na definição do plano.  
* **Registro completo de ações:** Todas as ações lançadas durante a execução são registradas para posterior inspeção, incluindo: dados identificativos do usuário que lançou cada ação, timestamp, resultado, dispositivos afetados e comentários do operador. O registro completo é disponível para consulta e auditoria.  
* **Notificações e envios automáticos:** O sistema permite configurar envios automatizados de informação quando uma execução é iniciada e quando é finalizada. Na finalização, o sistema pode enviar um arquivo PDF com o detalhe completo da execução (fases, tarefas, resultados, tempos, operadores envolvidos) para usuários ou endereços configurados.  
* **Modo de simulação:** A simulação é um modo de execução específico que permite validar um plano antes de utilizá-lo em produção, e funciona como ferramenta de transferência de conhecimento para operadores. O sistema informa em todo momento que a execução é simulada, modificando o aspecto gráfico da interface. A simulação pode ser pausada, continuada ou interrompida a qualquer momento.

Os modos de simulação disponíveis são:

| Modo de Simulação | Comportamento |
| :---- | :---- |
| Passo a passo | Cada passo requer confirmação explícita do operador antes de avançar. |
| Normal | Execução com tempos reais, respeitando retardos e esperas configuradas. |
| Rápida (sem esperas) | Execução acelerada, eliminando retardos e tempos de espera. |
| Desatendida | Sem esperas e sem necessidade de interação do operador. Resultado completo disponível ao final. |

Em cada simulação, o operador pode selecionar como executar as tarefas: sem execução (apenas visualização do fluxo), execução simulada (o sistema simula o resultado sem afetar subsistemas reais) ou execução real (ações são enviadas aos subsistemas reais, útil para validação de integração). É possível alternar entre modos a qualquer momento durante a simulação.

### **Biblioteca de Tarefas**

Recurso de gestão de templates de tarefas e ações reutilizáveis que podem ser incorporados aos planos de execução. A biblioteca padroniza as ações disponíveis no sistema e simplifica a criação de novos planos, garantindo consistência e reutilização.

**Funcionalidades**

* **Catálogo de ações disponíveis:** A biblioteca oferece um catálogo de tipos de ações que podem ser configuradas como tarefas dentro de um plano:


| Tipo de Ação | Descrição |
| :---- | :---- |
| Ordem a subsistema | Enviar comando a um subsistema ou dispositivo de campo: câmeras (PTZ, preset), controladores (mudança de plano, intermitente), painéis (mensagem PMV), cruces (configuração de plano de tráfego). |
| Mensagem interna | Enviar mensagem dentro da própria aplicação a um usuário específico ou a uma organização. |
| Envio de e-mail | Enviar e-mail a uma ou várias direções configuradas. |
| Solicitar input do operador | Requerer introdução de dados, seleção de resposta ou confirmação por parte do operador. Tarefa manual que bloqueia avanço até resolução. |
| Retardo | Atrasar a execução de uma rama do fluxo de trabalho por um tempo configurável. |
| Execução de script | Executar um script programado. Acesso restrito a pessoal especializado com privilégios adequados. |
| Seleção dinâmica de dispositivos | Tarefa-template que permite selecionar dispositivos em tempo real (dependendo do evento ou alarma) no momento da execução, não na definição. |

* **Templates de tarefas:** Criação de templates reutilizáveis que definem a ação, parâmetros padrão, subsistema alvo, modo de execução (manual, semi-automático, automático), tempo de espera máximo (timeout) e resultado padrão em caso de timeout. Os templates podem ser incorporados diretamente na construção de planos via drag-and-drop na interface de fluxograma.  
* **Biblioteca de símbolos:** A interface gráfica de criação de planos dispõe de uma biblioteca de símbolos que representa visualmente cada tipo de ação, condição, ramificação e estado. Cada elemento do fluxograma pode ser associado a um dispositivo específico, ação ou estado, para gerar a sequência de ações necessária.  
* **Versionamento e gestão:** Cada template de tarefa possui versionamento independente. Templates podem ser marcados como obsoletos sem afetar planos que já os utilizam (o plano mantém referência à versão específica usada na definição).

### **Dashboard**

Painel visual com indicadores-chave do domínio de planos de execução, oferecendo visão consolidada da atividade operacional dos planos.

**Funcionalidades**

* **Indicadores de execução:** Execuções em curso por tipo de plano, tempo médio de execução por plano, execuções finalizadas vs. interrompidas vs. em erro, tendência de atividade (gráfico temporal).  
* **Indicadores de planos:** Total de planos disponíveis por tipo, planos mais executados, planos com maior taxa de erro, planos pendentes de confirmação, distribuição por organização responsável.  
* **Indicadores de operadores:** Carga de trabalho por operador (execuções atribuídas), tarefas pendentes de atenção, tempo médio de resposta a tarefas manuais, operadores com mais execuções ativas.  
* **Indicadores de desempenho:** Taxa de sucesso de execuções (finalizadas com sucesso / total), tempo médio entre falhas, SLA de resposta por tipo de plano, comparação de tempos reais vs. tempos estimados.

## **Exemplo de Uso**

### **Cenário**

São 16:45 de segunda-feira. A operadora Ana Herrera está monitorando o sistema Attlas no centro de controle da EPMMOP quando o módulo de Alarmes detecta um incidente de tráfego grave: acidente com bloqueio total da Av. 10 de Agosto na altura da Av. Colón. O sistema possui um plano de resposta pré-configurado para este tipo de incidente: “PLAN-ACC-001 — Acidente com Bloqueio Total em Corredor Principal”.

### **Passo 1: Lançamento Automático do Plano**

A alarme ALM-2026-0847 (acidente grave) é ativada. O plano PLAN-ACC-001 está associado a este tipo de alarme e é lançado automaticamente:

| Atributo | Informação |
| ----- | ----- |
| Plano | PLAN-ACC-001 — Acidente com Bloqueio Total em Corredor Principal |
| Tipo | Baseado em estado de alarma (ativação) |
| Execução | EXE-2026-3421 — Lançada automaticamente às 16:45:12 |
| Modo | Semi-automático (confirmação em fases críticas) |
| Proprietária | Ana Herrera (herdou propriedade do evento EVT-2026-1547) |
| Fases | 4 fases: Verificação \-\> Resposta Imediata \-\> Gestão de Tráfego \-\> Normalização |

### 

### **Passo 2: Execução da Fase 1 (Verificação)**

A fase 1 inicia automaticamente. Possui 3 tarefas sequenciais:

| Tarefa | Ação | Modo | Resultado |
| ----- | ----- | ----- | ----- |
| 1.1 | Direcionar CAM-005 e CAM-006 para o local do acidente (tarefa-template com seleção dinâmica baseada em localização do evento). | Automática | PTZ direcionado. Confirmação visual disponível. |
| 1.2 | Solicitar confirmação visual do operador: “Confirma bloqueio total da via?” | Manual | Ana confirma: “Sim, bloqueio total, 2 veículos envolvidos.” |
| 1.3 | Enviar notificação interna ao supervisor de turno. | Automática | Mensagem enviada a Carlos Reyes. |

### 

### **Passo 3: Execução da Fase 2 (Resposta Imediata)**

Após confirmação visual, a fase 2 inicia. Tipo de execução: workflow com ramificações:

| Tarefa | Ação | Modo | Resultado |
| ----- | ----- | ----- | ----- |
| 2.1 | Enviar ordem ao CTRL-012: ativar plano de emergência na interseção 10 de Agosto / Colón. | Semi-automática | Ana confirma. Plano ativado. |
| 2.2 | Enviar ordem ao PMV-003: exibir “ACIDENTE — DESVIO PELA AV. AMÉRICA”. | Automática | Mensagem exibida no painel. |
| 2.3 | Enviar e-mail ao ECU-911 com dados do acidente (localização, imagens). | Automática | E-mail enviado às 16:47:30. |
| 2.4 | Ativar onda verde no corredor alternativo Av. América (ordem ao Modelo de Tráfego). | Semi-automática | Ana confirma. Estratégia ativada. |

### 

### **Passo 4: Acompanhamento em Tempo Real**

Ana acompanha a execução em tempo real desde a interface de detalhe:

| Indicador | Valor |
| ----- | ----- |
| Fase atual | Fase 3:  Gestão de Tráfego (em andamento) |
| Tarefas concluídas | 7 de 12 (58%) |
| Tempo decorrido | 23 minutos |
| Próxima tarefa | 3.3  Verificar nível de serviço no corredor alternativo (manual, aguardando Ana) |
| Notificações pendentes | 1 tarefa manual pendente de atenção |

### 

### **Passo 5:  Finalização e Relatório**

Às 17:30, a via é liberada. Ana executa a Fase 4 (Normalização): restaurar planos semafóricos originais, desativar PMVs e registrar a conclusão do evento. A execução é finalizada:

| Resultado da Execução | Detalhes |
| ----- | ----- |
| Estado | Finalizada com sucesso |
| Duração total | 45 minutos (16:45 → 17:30) |
| Tarefas executadas | 12 de 12 (100%) |
| Ações automáticas | 6 (todas bem-sucedidas) |
| Confirmações do operador | 4 (Ana Herrera) |
| Tarefas manuais | 2 (verificação visual, registro de conclusão) |
| Relatório | PDF enviado automaticamente ao supervisor e à direção da EPMMOP. |

## **Impacto em Outros Módulos**

* **Modelo de Tráfego:** Os planos de execução podem enviar ordens ao Modelo de Tráfego para ativar Estratégias (planos semafóricos, onda verde, planos de emergência). A integração permite que a resposta a incidentes inclua automaticamente ajustes de temporização semafórica.  
* **Controladores:** Tarefas dos planos podem enviar comandos diretos a controladores: ativar modo intermitente, mudar plano semafórico, desativar fases. Os comandos são enviados via a cadeia padrão (Estratégia → interseção → controlador).  
* **Câmeras:** Tarefas dos planos podem direcionar câmeras PTZ para posições específicas, ativar presets, exibir feeds no Video Wall. Tarefas-template com seleção dinâmica permitem selecionar automaticamente as câmeras mais próximas ao evento.  
* **Analítico:** Dados de detecção do Analítico podem gerar alarmes que disparam planos de execução automaticamente. A integração permite respostas automatizadas a incidentes detectados por videoanalítica.  
* **Alarmes:** Planos podem ser associados a alarmes para lançamento automático. A ativação/desativação de uma alarma pode iniciar ou avançar fases de um plano. Os planos de execução são o mecanismo de resposta operacional às alarmes.  
* **Relatórios:** Os resultados de execuções (tempos, ações, resultados, operadores) alimentam o módulo de Relatórios para geração de relatórios operacionais, gerenciais e de auditoria.

## **4.10. Prioridade Seletiva**

Tipo: **Dependente**

### **Contexto e Justificativa**

O módulo de Prioridade Seletiva (TSP: Transit Signal Priority) gerencia a concessão de prioridade semafórica a veículos específicos, tipicamente transporte público (ex: ônibus de BRT) ou veículos de emergência. É dependente porque necessita do **modelo de tráfego** (interseções e grupos semafóricos) e dos **controladores** para executar as prioridades em campo.

A separação deste módulo reflete a complexidade própria do domínio de TSP: regras de prioridade, detecção de veículos, configuração de regiões de ativação e integração com sistemas de rastreamento de frota são especificidades que justificam um módulo dedicado.

### **Recursos**

* **Construção:** Ferramenta para configuração das regras de prioridade seletiva. Define em quais interseções a prioridade está habilitada, quais critérios de ativação se aplicam (presença do veículo, atraso acumulado, horário) e qual o tipo de prioridade (extensão de verde, antecipação de fase).  
* **Elementos  Veículos:** Cadastro dos veículos elegíveis para prioridade: ônibus de linhas específicas, viaturas, ambulâncias. Inclui identificadores (GPS, transponder, placa) para detecção automática.  
* **Elementos  Regiões:** Definição das regiões geográficas onde a prioridade seletiva está ativa. Permite segmentar a aplicação por corredores de ônibus, áreas centrais ou zonas específicas.  
* **Elementos Terminais e Paradas:** Cadastro de terminais de ônibus e pontos de parada, relevantes para o cálculo de tempo de viagem e para determinar quando um veículo de transporte público está em rota e elegível para prioridade.  
* **Elementos Grupos semafóricos:** Configuração dos grupos semafóricos específicos que participam das regras de prioridade. Define quais fases podem ser estendidas ou antecipadas para conceder passagem prioritária.  
* **Dashboard:** Painel com métricas de prioridade seletiva: número de prioridades concedidas, tempo médio de economia para transporte público, impacto no tráfego geral e taxa de sucesso das solicitações.

# **4.11. PMV (Painéis de Mensagens Variáveis)**

Tipo: **Funcional**

## **Contexto e Justificativa**

O módulo PMV gerencia a integração, operação e monitoramento dos Painéis de Mensagens Variáveis instalados no DMQ. Classificado como Funcional, o módulo opera de forma autônoma: um operador pode gerenciar painéis, compor mensagens, enviar conteúdo e monitorar a rede de PMVs sem necessariamente interagir com outros módulos. O domínio de sinalização dinâmica possui tecnologias, protocolos de comunicação e workflows próprios (gestão de conteúdo visual, pilhas de mensagens, prioridades, caducidade) que justificam plenamente sua separação.

O paradigma fundamental deste módulo é a separação entre o dispositivo físico (o painel) e o conteúdo exibido (a mensagem). O painel é um executor que recebe e exibe mensagens; a mensagem é uma unidade de conteúdo independente, composta por layouts, textos, gráficos e variáveis dinâmicas, que pode ser enviada a um ou mais painéis simultaneamente. Essa separação permite que a mesma mensagem seja reutilizada em diferentes painéis e que o conteúdo seja gerido de forma centralizada através de uma biblioteca de mensagens.

O módulo integra-se com o módulo de Planos de Execução, permitindo que o envio ou remoção de mensagens seja automatizado como parte de sequências de resposta a eventos e alarmes. Adicionalmente, suporta variáveis automáticas que permitem exibir dados dinâmicos (tempos de percurso, itinerários recomendados, condições de tráfego) sem intervenção do operador.

## **Recursos**

### **Painéis**

Recurso central de cadastro, configuração técnica e monitoramento de todos os painéis de mensagem variável da rede. Um painel pode existir no sistema sem estar ativo operacionalmente (por estar em manutenção, em estoque ou desconectado). Somente quando ativo e online, o painel participa da operação de sinalização dinâmica.

**Funcionalidades**

* **Cadastro e configuração técnica:** Registro completo de cada painel incluindo: identificador único, nome, tipo (fixo ou móvel), formato do display (matricial, alfanumérico, full color), resolução (pixels), dimensões físicas, fabricante, modelo, versão de firmware, endereço IP, protocolo de comunicação, porta, localização geográfica (GPS para móveis, fixa para permanentes), via/corredor associado e parâmetros de conexão (intervalo de polling, timeout, modo de fallback).  
* **Estados do painel:** Cada painel possui um estado explícito que reflete sua situação no ciclo de vida:

| Estado | Descrição | Comandos Disponíveis |
| :---- | :---- | :---- |
| Em estoque | Painel cadastrado mas não instalado. Pode estar em almoxarifado ou aguardando designação. | Nenhum:  apenas gestão de cadastro técnico. |
| Em testes | Instalado em bancada ou em campo para validação de comunicação e exibição. Não participa da operação. | Envio de mensagens de teste e controle de luminosidade. *Warning: “Painel em modo de testes.”* |
| Em campo, sem configurar | Instalado fisicamente mas sem configuração validada no sistema. Pode estar exibindo mensagem padrão local. | Envio de mensagens e monitoramento disponíveis. *Warning permanente: “Painel instalado em campo sem configuração validada.”* |
| Operativo | Configurado, validado e participando plenamente da operação. Online e disponível para receber mensagens. | Todos disponíveis. Operação normal. |

* **Monitoramento em tempo real:** Supervisão contínua do estado de cada painel: status de conectividade (online/offline), mensagem atualmente exibida, nível de luminosidade atual, pilha de mensagens ativas, temperatura do equipamento (quando reportado pelo hardware) e estado de alimentação elétrica. Representação geoposicionada de painéis no mapa, com acesso direto ao estado e mensagem atual de cada painel.  
* **Controle de luminosidade:** Capacidade de controlar remotamente a intensidade e luminosidade dos píxels do painel, permitindo ajustar a visibilidade de acordo com condições de iluminação ambiente (dia, noite, clima). O controle pode ser manual (definido pelo operador) ou automático (baseado em sensor de luminosidade do próprio painel, quando disponível).  
* **Gestão de grupos:** Organização de painéis em grupos segundo critérios espaciais (corredor, área, região) ou funcionais (painéis de desvio, painéis informativos, painéis de velocidade). A gestão por grupos permite enviar a mesma mensagem simultaneamente a todos os painéis de um grupo com um único comando.  
* **Compatibilidade universal:** O módulo é projetado para gerenciar painéis de qualquer formato e fabricante, incluindo painéis matriciais de alta resolução a full color. A integração de novos painéis pode ser realizada pelo próprio operador da EPMMOP, sem necessidade de intervenção do fabricante ou integrador.  
* **Substituição de equipamento:** Quando um painel precisa ser substituído, o operador desativa o painel antigo (retorna a “Em estoque” para manutenção) e configura o novo na mesma localização, herdando o grupo, a via/corredor associado e a mensagem padrão.  
* **Eventos:** Registro automático de todos os eventos operacionais dos painéis: mudanças de estado (online/offline), falhas de comunicação, alterações de mensagem (qual mensagem foi enviada, por quem, quando), alterações de luminosidade, eventos de energia e alertas de hardware. Eventos críticos geram alarmes no módulo de **Alarmes.**  
* **Incidentes:** Gestão unificada de incidentes relacionados a painéis: falha de comunicação persistente, avaria de hardware, vandalismo, falha de exibição (píxels danificados, conteúdo não exibido corretamente). Fluxo de tratamento: abertura \-\> diagnóstico \-\> resolução (pode gerar ordem de serviço no módulo Inventário) \-\> fechamento.

### **Mensagens**

Recurso de gestão completa do conteúdo exibido nos painéis: criação, edição, armazenamento, envio e monitoramento de mensagens. Inclui a biblioteca de mensagens reutilizáveis, a biblioteca de gráficos e imagens, a composição de layouts, a gestão de variáveis dinâmicas e o controle da pilha de mensagens ativas em cada painel.

**Funcionalidades**

* **Biblioteca de mensagens:** Catálogo centralizado de mensagens reutilizáveis, organizadas por tipo de painel (fixo, móvel, por resolução) e por categoria funcional (informação de tráfego, desvio, emergência, evento especial, manutenção). Cada mensagem na biblioteca pode ser editada, duplicada e versionada. O operador pode enviar mensagens selecionando diretamente da biblioteca ou criando mensagens em tempo real.  
* **Composição de layouts:** Definição de layouts de exibição que combinam diferentes elementos visuais. Mínimo de três layouts disponíveis por tipo de painel, definidos em coordenação com o administrador do contrato:


| Layout | Composição |
| ----- | ----- |
| Gráfico \+ Texto | Imagem ou ícone na região superior ou lateral, com texto informativo complementar. |
| Gráfico \+ Texto \+ Gráfico | Dois elementos gráficos (ícones, setas, símbolos) com texto central. |
| Somente texto | Mensagem puramente textual, com configuração de fonte, tamanho e cor. |

* **Biblioteca de gráficos e imagens:** Repositório centralizado de gráficos, ícones e imagens compatíveis com cada tipo de painel. Os gráficos são organizados por categoria (sinalização, alerta, direcional, informativo) e são automaticamente redimensionados para se adequar ao formato e resolução do painel destino. Novos gráficos podem ser adicionados pelo administrador.  
* **Mensagens com páginas:** Uma mensagem pode conter múltiplas páginas que se alternam automaticamente no painel com tempo configurável entre cada página. Cada página pode ter um layout diferente, permitindo mensagens ricas que combinam informações complementares.  
* **Variáveis dinâmicas:** Capacidade de incluir variáveis automáticas nas mensagens que são atualizadas em tempo real sem intervenção do operador. Exemplos: tempo de percurso até destino (“Aeroporto: 25 min”), velocidade média no corredor, itinerários recomendados baseados em condições atuais de tráfego, data e hora, temperatura. Os dados das variáveis são consumidos do módulo Analítico, do Modelo de Tráfego e de fontes externas configuradas.  
* **Pré-visualização e simulação:** Antes de enviar uma mensagem ao painel, o operador pode visualizar e simular na interface do sistema a aparência final da mensagem, incluindo layout, cores, gráficos e texto, com representação fiel do formato e resolução do painel destino. Para mensagens com múltiplas páginas, a simulação mostra a alternância entre páginas no tempo configurado.  
* **Envio de mensagens:** Envio de mensagens a painéis individuais ou a grupos de painéis simultaneamente. O envio pode ser em tempo real (mensagem criada na hora) ou desde a biblioteca (mensagem pré-configurada). O operador pode selecionar o painel ou grupo destino, definir prioridade e condições de caducidade.  
* **Pilha de mensagens e prioridades:** Cada painel mantém uma pilha de mensagens ativas com níveis de prioridade configuráveis. O painel exibe sempre a mensagem de maior prioridade. Quando a mensagem prioritária é removida ou caduca, o painel exibe automaticamente a próxima mensagem na pilha. O operador pode consultar e gerenciar a pilha de qualquer painel em tempo real.  
* **Caducidade de mensagens:** Cada mensagem enviada a um painel pode ter uma data e hora de caducidade configurada. Quando a mensagem caduca, é removida automaticamente da pilha do painel. Adicionalmente, condições de caducidade podem ser baseadas em eventos (ex: mensagem caduca quando o evento associado é fechado).  
* **Integração com Planos de Execução:** Mensagens podem ser enviadas ou removidas automaticamente como parte de tarefas de planos de execução. A integração permite que respostas a incidentes incluam automaticamente a exibição de mensagens de alerta, desvio ou informação nos painéis afetados. Mensagens com parâmetros dinâmicos podem ser atualizadas automaticamente com base nos dados do evento.  
* **Histórico de mensagens:** Registro completo de todas as mensagens enviadas a cada painel: conteúdo, operador que enviou, timestamp de envio e remoção, prioridade, motivo (manual, plano de execução, automático), e resultado (exibida, não exibida por falha, substituída por prioridade superior).

### **Dashboard**

Painel visual com indicadores-chave do domínio de painéis de mensagem variável, oferecendo visão consolidada do estado e da atividade operacional da rede de PMVs.

**Funcionalidades**

* **Indicadores de conectividade:** Percentual de painéis online/offline, mapa de calor de disponibilidade por região, tendência de uptime, painéis com conexão intermitente.  
* **Indicadores operacionais:** Distribuição de painéis por tipo (fixo/móvel) e estado, painéis com mensagens ativa vs. inativos, distribuição por grupo funcional, mensagens exibindo variáveis dinâmicas.  
* **Indicadores de mensagens:** Total de mensagens ativas na rede, mensagens enviadas por período (hoje, semana, mês), mensagens mais utilizadas da biblioteca, distribuição por tipo de layout e categoria.  
* **Indicadores de incidentes:** Incidentes abertos por severidade, tempo médio de resolução, painéis com maior recorrência de problemas, mapa de calor de avarias.

## **Exemplo de Uso**

### **Cenário**

São 07:30 de segunda-feira. O operador Roberto Salazar está no centro de controle da EPMMOP. O Analítico detectou congestionamento severo no corredor Av. 10 de Agosto (sentido norte-sul) com tempo de percurso 40% acima do normal. Roberto precisa ativar mensagens de desvio nos painéis do corredor e configurar uma mensagem com variáveis dinâmicas.

### **Passo 1: Verificação do Estado da Rede**

Roberto abre o módulo PMV e consulta o dashboard:

| Indicador | Valor |
| :---- | :---- |
| Painéis online | 31 de 33 (93,9%) |
| Painéis offline | 2 (PMV-017 móvel — bateria descarregada; PMV-028 fixo — falha de comunicação) |
| Painéis no corredor Av. 10 de Agosto | 5 painéis fixos (PMV-001 a PMV-005) — todos online |
| Mensagens ativas na rede | 12 mensagens distribuídas em 18 painéis |

### **Passo 2: Envio de Mensagem da Biblioteca**

Roberto seleciona o grupo “Corredor 10 de Agosto — Desvio” (PMV-001, PMV-002, PMV-003) e busca na biblioteca a mensagem pré-configurada:

| Atributo | Configuração |
| :---- | :---- |
| Mensagem | MSG-DEV-012 — “CONGESTIONAMENTO — DESVIO PELA AV. AMÉRICA” |
| Layout | Gráfico \+ Texto (seta direcional \+ texto de desvio) |
| Destino | Grupo “Corredor 10 de Agosto — Desvio” (3 painéis) |
| Prioridade | Alta (sobrescreve mensagens informativas atuais) |
| Caducidade | Automática — quando o nível de serviço do corredor retornar ao normal (condição baseada em evento). |

Roberto pré-visualiza a mensagem na interface, confirmando que a seta e o texto estão corretamente posicionados no formato dos painéis PMV-001 a PMV-003. Após aprovação visual, envia a mensagem ao grupo.

### 

### **Passo 3:  Mensagem com Variável Dinâmica**

Roberto cria uma mensagem adicional para os painéis PMV-004 e PMV-005 (localizados antes da zona congestionada), incluindo variável dinâmica:

| Atributo | Configuração |
| :---- | :---- |
| Mensagem | Nova — “AV. 10 DE AGOSTO: {tempo\_percurso} MIN ATÉ EL EJÉRCITO” |
| Variável dinâmica | {tempo\_percurso} — alimentada pelo módulo Analítico (tempo de viagem no corredor, atualização a cada 5 min) |
| Layout | Somente texto (2 linhas, fonte grande) |
| Prioridade | Média (abaixo da mensagem de desvio) |
| Caducidade | Manual — Roberto remove quando a situação normalizar. |

O sistema exibe a pré-visualização: “AV. 10 DE AGOSTO: 32 MIN ATÉ EL EJÉRCITO”. O valor 32 é atualizado automaticamente pelo Analítico sem intervenção de Roberto.

### **Passo 4:  Monitoramento e Pilha de Mensagens**

Roberto verifica a pilha de mensagens do PMV-003:

| Prioridade | Mensagem | Origem | Caducidade |
| :---- | :---- | :---- | :---- |
| Alta | MSG-DEV-012 — CONGESTIONAMENTO — DESVIO PELA AV. AMÉRICA | Roberto (manual) | Evento |
| Média | MSG-INFO-005 — Informação geral de tráfego (programação semanal) | Automático | Sexta 23:59 |
| Baixa | MSG-INS-001 — “EPMMOP — Mobilidade Inteligente para Quito” (mensagem institucional padrão) | Sistema | Sem caducidade |

O PMV-003 está exibindo a mensagem de prioridade Alta (desvio). Quando essa mensagem caducar (congestionamento normalizado), o painel exibirá automaticamente a mensagem de prioridade Média (informação semanal).

### **Passo 5:  Normalização**

Às 09:15, o **analítico** detectou que o nível de serviço do corredor retornou ao normal. A condição de caducidade é atingida:

| Ação | Detalhes |
| :---- | :---- |
| Remoção automática | MSG-DEV-012 removida dos PMV-001, PMV-002, PMV-003 (caducidade por evento atingida). |
| Exibição automática | Painéis exibem a próxima mensagem da pilha (MSG-INFO-005). |
| Mensagem dinâmica | Roberto removeu manualmente a mensagem de tempo de percurso dos PMV-004 e PMV-005. |
| Registro | Histórico completo: mensagens enviadas às 07:35, removidas às 09:15. Duração: 1h40min. Operador: Roberto Salazar. |

## 

## **Impacto em Outros Módulos**

* **Modelo de Tráfego:** Os painéis são posicionados no mapa geográfico dentro do Modelo de Tráfego (Mapa de Construção). Painéis móveis atualizam sua posição GPS no mapa. Dados de variáveis dinâmicas (tempos de percurso, itinerários) podem ser consumidos do Modelo de Tráfego.  
* **Planos de Execução:** Tarefas dos planos de execução podem enviar ou remover mensagens automaticamente como parte de sequências de resposta. O módulo PMV é receptor de ordens dos planos, executando o envio de conteúdo conforme configurado na tarefa.  
* **Analítico:** O módulo Analítico fornece dados para variáveis dinâmicas (tempos de percurso, velocidades médias, níveis de serviço). Eventos de tráfego detectados pelo Analítico podem disparar condições de caducidade de mensagens.  
* **Alarmes:** Eventos críticos de painéis (perda de comunicação, vandalismo, falha de exibição) geram alarmes no módulo de Alarmes.  
* **Controladores:** Quando um incidente requer ativação de desvio, a operação coordenada envolve tanto a mudança de temporização nos controladores quanto a exibição de mensagens de desvio nos PMVs.

## **4.12. Inventário e Manutenção**

Tipo: **Dependente**

**Contexto e Justificativa**

O módulo de Inventário e Manutenção gere de forma integral todos os aspectos relacionados com a exploração e a manutenção das infraestruturas do sistema semafórico do DMQ. Classificado como Transversal, este módulo é consumido por praticamente todos os módulos funcionais da plataforma: controladores, PMVs, câmeras, detectores e demais dispositivos de campo são ativos registrados neste módulo, e qualquer operação de manutenção sobre eles é gerida através dos seus recursos.

O paradigma fundamental deste módulo é a gestão completa do ciclo de vida dos ativos: desde o cadastro e recepção em almoxarifado, passando pela instalação em campo, operação, manutenções preventivas e corretivas, até a desativação ou substituição. Cada ativo possui um histórico completo de intervenções, movimentações e estados que permite análise de confiabilidade, custos de manutenção e planejamento de reposição.

O módulo integra-se com os módulos funcionais como provedor de contexto patrimonial: quando um controlador apresenta falha, o módulo de **controladores** gera um atendimento que é processado aqui como ordem de serviço. Quando um **PMV** precisa de manutenção, o incidente registrado no módulo PMV resulta em uma OS gerida neste módulo. Adicionalmente, integra-se com o módulo de **alarmes** para receber alertas automáticos que podem gerar atendimentos, e com o módulo de **relatórios** para fornecer dados de manutenção e inventário.

# **Recursos**

## **Inventário**

Recurso central de cadastro, classificação e rastreamento de todos os ativos que compõem a infraestrutura semafórica. Um ativo representa qualquer equipamento ou componente físico: controladores, lâmpadas LED, PMVs, câmeras, detectores, nobreaks, postes, cabos, entre outros. Cada ativo é geoposicionado e associado à topologia da rede no **modelo de Tráfego.**

**Funcionalidades**

* **Cadastro completo de ativos:** Registro detalhado de cada ativo incluindo: identificador único, número de série, tipo de equipamento, fabricante, modelo, versão de firmware/hardware, data de aquisição, data de instalação, garantia, localização geográfica (coordenadas GPS), interseção/via associada, módulo funcional ao qual pertence (Controladores, PMV, Câmeras, etc.), estado no ciclo de vida e fotografia do equipamento.  
* **Estados do ciclo de vida:** Cada ativo possui um estado que reflete sua situação atual no ciclo de vida patrimonial, com transições controladas e auditadas.  
* **Classificação e taxonomia:** Hierarquia de classificação configurável pelo administrador: Categoria (ex: Controlador, PMV, Câmera) → Subcategoria (ex: Controlador de interseção, Controlador de corredor) → Modelo (ex: Marca X Modelo Y). Permite filtros avançados e relatórios por qualquer nível da hierarquia.  
* **Geoposicionamento:** Todos os ativos instalados em campo são geoposicionados e visualizados no mapa da plataforma, associados aos ícones correspondentes no painel de controle. O operador pode localizar qualquer ativo espacialmente e acessar seus dados diretamente desde o **painel de operações**.  
* **Histórico completo do ativo:** Registro cronológico de todas as intervenções, movimentações, mudanças de estado, ordens de serviço executadas, peças substituídas e comentários técnicos. Permite análise de confiabilidade (MTBF, MTTR) e custo total de propriedade por ativo.  
* **Transferência e movimentação:** Gestão de movimentações de ativos entre localizações: transferência de almoxarifado para campo, remanejamento entre interseções, retorno para manutenção em bancada, envio para descarte. Cada movimentação registra origem, destino, responsável, data e motivo.  
* **Associação hierárquica:** Ativos podem ser associados entre si em relação pai-filho (ex: um controlador contém módulos de potência, que contêm fusíveis). Permite rastrear componentes internos e substituições parciais.  
* **Importação massiva:** Capacidade de importar dados de ativos em massa a partir de planilhas (CSV/Excel), permitindo a carga inicial dos dados fornecidos pela EPMMOP sem necessidade de cadastro manual individual.

| Estado | Descrição | Transições Permitidas |
| :---- | :---- | :---- |
| Em estoque | Ativo recebido e armazenado no almoxarifado. Aguarda designação para instalação. | Instalado, Em testes, Descartado |
| Em testes | Ativo em bancada para validação técnica antes de instalação em campo. | Em estoque, Instalado |
| Instalado | Ativo instalado e operando em campo. Participando da operação. | Em manutenção, Desativado, Em estoque |
| Em manutenção | Ativo retirado de campo ou com intervenção em curso. OS aberta associada. | Instalado, Em estoque, Descartado |
| Desativado | Ativo fora de operação permanentemente. Pode estar em campo aguardando retirada. | Em estoque, Descartado |
| Descartado | Ativo dado de baixa definitiva. Registro mantido para histórico. | Nenhuma (estado final) |

## **Estoque**

Recurso de gestão de almoxarifado, controle de estoque de peças de reposição, materiais de consumo e equipamentos reserva. O Estoque é o provedor logístico das operações de manutenção: quando uma ordem de serviço requer peças ou materiais, o consumo é registrado e baixado automaticamente do estoque.

**Funcionalidades**

* **Cadastro de itens de estoque:** Registro de todos os itens armazáveis: peças de reposição (lâmpadas LED, módulos de potência, fusíveis, cabos), materiais de consumo (conectores, braçadeiras, fita isolante) e equipamentos reserva (controladores, cabeças semafóricas). Cada item inclui: código, descrição, unidade de medida, categoria, fornecedor, preço de referência e quantidade mínima de segurança.  
* **Controle de entradas e saídas:** Registro de todas as movimentações de estoque: entradas por compra ou devolução, saídas por consumo em ordens de serviço ou transferência. Cada movimentação registra quantidade, data, responsável, OS associada (quando aplicável) e observações.  
* **Alertas de estoque mínimo:** Monitoramento contínuo dos níveis de estoque. Quando um item atinge a quantidade mínima de segurança, o sistema gera alerta automático para providências de reposição. Alertas configuráveis por item e por criticidade.  
* **Inventário físico:** Funcionalidade de apoio à realização de inventários físicos periódicos: geração de listas de contagem, registro de contagens, identificação de divergências entre estoque físico e lógico, ajustes com justificativa e aprovação.  
* **Rastreabilidade por OS:** Vinculação bidirecional entre itens de estoque e ordens de serviço: a partir de uma OS, é possível consultar todos os materiais consumidos; a partir de um item de estoque, é possível consultar todas as OS que o utilizaram.  
* **Relatórios de consumo:** Análise de consumo por período, por tipo de item, por tipo de manutenção (preventiva/corretiva) e por localização. Permite identificar tendências e planejar compras.

## **Incidências**

Recurso unificado de registro, classificação e resolução de todos os problemas e eventos anômalos relacionados a qualquer dispositivo do parque semafórico. Uma incidência é a entidade primária de entrada para qualquer problema detectado: pode originar-se de alarmes automáticos de controladores, câmeras, detectores, nobreaks ou PMVs, de inspeções de campo, de comunicações externas ou de observações do operador. A incidência é o elo direto entre a detecção de um problema e a geração da ordem de serviço, sem camadas intermediárias, garantindo resposta rápida e eficiente.

**Funcionalidades**

* **Registro de incidência:** Abertura de incidência com: identificador sequencial, data/hora, origem (alarme automático, inspeção, comunicação externa, operador), canal de entrada (sistema, telefone, e-mail, presencial), tipo de dispositivo afetado (controlador, câmera, detector, nobreak, PMV, outro), ativo(s) específico(s) afetado(s), localização (interseção/via), descrição do problema, severidade (crítica, alta, média, baixa) e prioridade calculada.  
* **Templates por tipo de dispositivo:** Cada tipo de dispositivo possui um template de incidência pré-configurado com campos específicos. Para controladores: modo de operação atual, estado de temporização. Para câmeras: estado do streaming, ângulo/posição. Para detectores: tipo de leitura anômala. Para nobreaks: nível de batería, modo de operação. Para PMVs: estado de exibição, píxels danificados. Os templates agilizam o registro e padronizam a informação coletada.  
* **Auto-regras de despacho:** Motor de regras configuráveis que permite o tratamento automático de incidências sem intervenção humana na triagem. Cada regra define: condição de disparão (tipo de dispositivo \+ tipo de alarme \+ severidade), ação automática (gerar OS corretiva, atribuir técnico, definir SLA), e critérios de atribuição (proximidade, especialização, carga). Exemplos: "Perda de comunicação com controlador \+ severidade crítica → gerar OS corretiva urgente \+ atribuir técnico mais próximo especializado em controladores"; "Nobreak em modo batería → gerar OS corretiva alta \+ atribuir eletricista disponível". A triagem humana ocorre apenas quando não existe regra aplicável ou a incidência é ambígua.  
* **Correlação automática de incidências:** Quando múltiplos dispositivos na mesma localização reportam problemas simultaneamente (ex: controlador offline \+ câmera offline \+ detector sem leituras na mesma interseção), o sistema correlaciona as incidências e sugere causa raíz comum (ex: falha elétrica geral, falha do nobreak). Incidências correlacionadas são agrupadas e podem gerar uma única OS que aborda a causa raíz em vez de múltiplas OS isoladas.  
* **Triagem manual (quando necessária):** Para incidências que não possuem auto-regra aplicável ou que são classificadas como ambíguas, o operador realiza triagem manual: classificação do tipo de incidência (falha elétrica, avaria mecânica, vandalismo, falha de comunicação, degradação), avaliação de impacto operacional e geração manual da OS com parâmetros complementados.  
* **Geração de OS direta:** A partir de uma incidência (seja por auto-regra ou por triagem manual), o sistema gera a ordem de serviço com os dados herdados: ativo afetado, localização, descrição, severidade, tipo de dispositivo e SLA. Não existe entidade intermediária; a incidência é a origem direta da OS.  
* **Integração com alarmes:** Incidências são geradas automaticamente a partir de alarmes de qualquer módulo funcional: perda de comunicação de controlador, câmera offline, detector com leituras anômalas, nobreak em modo batería, PMV com falha de exibição. A integração é bidirecional: o estado da incidência atualiza o estado do alarme correspondente.  
* **Acompanhamento e SLA:** Monitoramento do tempo de vida de cada incidência, com indicadores visuais de SLA: dentro do prazo (verde), próximo ao vencimento (amarelo), prazo excedido (vermelho). SLAs configuráveis por severidade e tipo de dispositivo. Escalonamento automático quando o SLA é ultrapassado.  
* **Estados da incidência:** Fluxo simplificado: Aberta \-\> Triada (automático ou manual) \-\> OS Gerada \-\> Em Execução \-\> Resolvida \-\> Fechada. Para incidências com auto-regra, os estados Aberta \-\> Triada \-\> OS Gerada ocorrem automaticamente em sequência, sem intervenção do operador. Cada transição registra data, responsável (sistema ou operador) e observação.  
* **Histórico e vinculação:** Cada incidência mantém histórico completo: comentários, mudanças de estado, OS gerada, correlações com outras incidências. Incidências podem ser vinculadas a incidências anteriores do mesmo ativo para análise de recorrência.


**Exemplos de auto-regras por tipo de dispositivo:**

| Tipo de Dispositivo | Condição de Disparo | Ação Automática |
| :---- | :---- | :---- |
| Controlador | Perda de comunicação \> 5 min, severidade crítica | Gerar OS corretiva urgente. Atribuir técnico mais próximo especializado em controladores. SLA: 4h. |
| Câmera | Câmera offline \> 15 min | Gerar OS corretiva alta. Atribuir técnico de videomonitoramento. SLA: 8h. |
| Detector | Leituras anômalas persistentes \> 30 min | Gerar OS corretiva média. Atribuir técnico de detectores. SLA: 24h. |
| Nobreak | Modo batería ativado | Gerar OS corretiva alta. Atribuir eletricista. SLA: 4h. Notificar concessionária elétrica. |
| PMV | Falha de exibição ou comunicação | Gerar OS corretiva média. Atribuir técnico de PMV. SLA: 12h. |
| Múltiplos (correlação) | 2+ dispositivos na mesma interseção com falha simultânea | Correlacionar incidências. Sugerir causa raíz. Gerar OS única para causa raíz. SLA: da incidência mais crítica. |

## **Ordens de Serviço**

Recurso de gestão completa das ordens de trabalho de manutenção para qualquer tipo de dispositivo do parque semafórico, abrangendo tanto manutenção corretiva (gerada a partir de incidências) quanto manutenção preventiva (gerada por calendário programado). A ordem de serviço é a unidade de execução de manutenção: define o que fazer, em que dispositivo, onde, quem executa, com que materiais e em que prazo.

**Funcionalidades**

* **Criação de OS corretiva:** Gerada automaticamente a partir de uma incidência (via auto-regra ou triagem manual). Herda dados da incidência: ativo, tipo de dispositivo, localização, descrição, severidade. O técnico complementa com diagnóstico, ações planejadas e materiais necessários. O tempo de resolução é monitorado com base no SLA da incidência.  
* **Criação de OS preventiva:** Gerada automaticamente pelo calendário de manutenção preventiva. O sistema cria OS preventivas com base em regras configuráveis por tipo de dispositivo: periodicidade (dias, semanas, meses), contador de operações ou condição técnica. Cada tipo de ativo possui um plano de manutenção preventiva com tarefas pré-definidas (checklist).  
* **Calendário de manutenção preventiva:** Programação visual de manutenções preventivas por ativo, por tipo de dispositivo ou por região geográfica. O calendário mostra: manutenções programadas, executadas, pendentes e atrasadas. Permite reprogramação com justificativa.  
* **Estados visuais de manutenção preventiva:** Indicadores visuais por cores conforme estado da manutenção preventiva: Verde \-\> Manutenção preventiva em dia e correta. Amarelo \-\> A ponto de vencer (próximo ao prazo). Vermelho \-\> Não realizada (prazo excedido). Os estados são visíveis tanto na lista de OS quanto no mapa geoposicionado de ativos.  
* **Estados visuais de manutenção corretiva:** Indicadores visuais por cores conforme estado da OS corretiva: Azul \-\> OS corretiva aberta com tempo de resolução dentro do prazo. Amarelo \-\> OS aberta com tempo de resolução próximo ao limite. Vermelho — Tempo de resolução excedido.  
* **Fluxo de execução:** Estados da OS: Criada \-\> Atribuída \-\> Em deslocamento \-\> Em execução \-\> Pendente (aguardando peças/condições) \-\> Concluída \-\> Validada \-\> Fechada. Cada transição registra data/hora, técnico, observações e evidências (fotos, assinaturas).  
* **Atribuição e despacho:** Atribuição de OS a técnicos ou equipes de campo. O sistema sugere o técnico mais adequado com base em: proximidade geográfica, especialização por tipo de dispositivo, carga de trabalho atual e disponibilidade. O despacho pode ser manual (operador seleciona) ou automático (via auto-regras de incidência).  
* **Checklist de tarefas por tipo de dispositivo:** Cada OS possui uma lista de tarefas a executar, configurável por tipo de manutenção e tipo de dispositivo. Exemplos: para controladores (inspeção visual, teste de comunicação, teste de temporização, verificação de cabeação); para câmeras (limpeza de lente, ajuste de foco, teste de streaming); para nobreaks (teste de carga, verificação de baterias, limpeza). Tarefas obrigatórias impedem o fechamento da OS se não completadas.  
* **Consumo de materiais:** Registro de peças e materiais consumidos durante a execução da OS, com baixa automática no estoque. O técnico seleciona os itens utilizados a partir do catálogo de estoque (filtrado por tipo de dispositivo), registrando quantidade e observações.  
* **Evidências e registro fotográfico:** Capacidade de anexar fotografias, documentos e assinaturas digitais à OS. Mínimo de foto "antes" e "depois" para manutenções corretivas. Evidências são armazenadas vinculadas ao histórico do ativo.  
* **Tempo de resolução e SLA:** Monitoramento automático do tempo desde a abertura até a conclusão da OS. Comparação com SLA definido por severidade, tipo de dispositivo e tipo de manutenção. Alertas escalonados quando o prazo se aproxima ou é ultrapassado.

## **Dashboard**

Painel visual com indicadores-chave do domínio de inventário e manutenção de todo o parque semafórico, oferecendo visão consolidada do estado patrimonial, da saúde da infraestrutura e da eficiência das operações de manutenção por tipo de dispositivo.

**Funcionalidades**

* **Indicadores de inventário:** Total de ativos por tipo de dispositivo, estado e localização. Distribuição geográfica por região/corredor. Ativos em garantia vs. fora de garantia. Idade média da frota por tipo de equipamento. Evolução do parque ao longo do tempo.  
* **Indicadores de manutenção preventiva:** Percentual de manutenções em dia (verde), a ponto de vencer (amarelo), não realizadas (vermelho), segmentado por tipo de dispositivo. Aderência ao calendário preventivo por período. Próximas manutenções programadas.  
* **Indicadores de manutenção corretiva:** OS corretivas abertas por severidade e por tipo de dispositivo. Tempo médio de resolução (MTTR) por tipo de equipamento. Tendência de falhas. Mapa de calor de incidências por localização.  
* **Indicadores de incidências:** Incidências abertas por estado, severidade e tipo de dispositivo. SLA cumprido vs. excedido. Volume de incidências por período (dia, semana, mês). Percentual resolvidas por auto-regra vs. triagem manual. Top 10 ativos com mais incidências recorrentes.  
* **Indicadores de estoque:** Itens abaixo do estoque mínimo por tipo de dispositivo. Consumo de materiais por período. Custo de materiais por tipo de manutenção e tipo de dispositivo. Itens sem movimentação (estoque parado). Projeção de demanda.  
* **Indicadores de eficiência:** Taxa de auto-despacho (incidências resolvidas sem triagem humana). Tempo médio de triagem para incidências manuais. Efetividade das auto-regras (OS geradas automaticamente vs. reclassificadas pelo técnico).

# 

# **Exemplo de Uso**

**Cenário**

São 06:45 de terça-feira. A operadora María Fernanda López está no centro de controle da EPMMOP. O módulo de alarmes reportou simultaneamente: perda de comunicação com o controlador CTRL-087, câmera CAM-042 offline e detector DET-019 sem leituras,  todos na interseção da Av. Amazonas e Av. Naciones Unidas. Adicionalmente, a manutenção preventiva trimestral de 15 controladores do corredor Av. 10 de Agosto está programada para esta semana. O cenário demonstra a resolução eficiente de incidências múltiplas correlacionadas e o acompanhamento simultâneo da preventiva.

**Passo 1: Verificação do Dashboard**

María Fernanda abre o módulo Inventário e Manutenção e consulta o Dashboard:

| Indicador | Valor |
| :---- | :---- |
| Total de ativos registrados | 4.287 equipamentos (1.240 controladores, 890 câmeras, 650 detectores, 320 nobreaks, 33 PMVs, 1.154 outros) |
| Ativos operativos | 4.185 (97,6%) |
| Incidências abertas | 11 (3 críticas, 4 altas, 4 médias) — 3 novas na Av. Amazonas/Naciones Unidas |
| Manutenção preventiva esta semana | 15 controladores — Corredor 10 de Agosto (0 de 15 concluídas) |
| Taxa de auto-despacho (mês) | 78% das incidências resolvidas sem triagem manual |
| Estoque: alertas ativos | 2 itens abaixo do mínimo (módulos de potência, fusíveis 10A) |

**Passo 2 : Correlação Automática de Incidências**

Os três alarmes geraram automaticamente três incidências. O sistema detectou que os três dispositivos estão na mesma interseção e correlacionou:

| Incidência | Dispositivo | Tipo de Alarme | Status |
| :---- | :---- | :---- | :---- |
| INC-2024-01205 | CTRL-087 (Controlador) | Perda de comunicação | Correlacionada |
| INC-2024-01206 | CAM-042 (Câmera PTZ) | Câmera offline | Correlacionada |
| INC-2024-01207 | DET-019 (Detector indutivo) | Sem leituras | Correlacionada |

O sistema identifica que o nobreak NBK-015 alimenta os três dispositivos (associação hierárquica) e sugere causa raíz: "Possível falha elétrica ou falha do nobreak NBK-015 na interseção Av. Amazonas / Av. Naciones Unidas". As três incidências são agrupadas sob uma incidência pai INC-2024-01205.

**Passo 3: Auto-despacho e Geração de OS**

A auto-regra para correlação de múltiplos dispositivos gera uma única OS para a causa raíz:

| Atributo | Configuração |
| :---- | :---- |
| OS | OS-2024-01523 (Corretiva — Causa Raíz) |
| Incidências vinculadas | INC-2024-01205, INC-2024-01206, INC-2024-01207 |
| Causa raíz sugerida | Falha elétrica / nobreak NBK-015 |
| Ativos afetados | NBK-015 (nobreak), CTRL-087 (controlador), CAM-042 (câmera), DET-019 (detector) |
| Severidade | Crítica (interseção sem controle semafórico) |
| Técnico atribuído | Carlos Mendoza (auto-regra: eletricista mais próximo, carga: 2 OS) |
| SLA | 4 horas (da incidência mais crítica: controlador offline) |
| Checklist | Inspeção elétrica geral, teste nobreak, verificação controlador, teste câmera, teste detector |

María Fernanda verifica a OS gerada automaticamente. Não foi necessária triagem manual: o sistema identificou a causa raíz, agrupou as incidências e despachou o técnico adequado. María Fernanda apenas confirma a atribuição.

**Passo 4: Execução e Resolução**

Carlos chega ao local às 07:20 e registra o início da execução:

| Ação | Detalhes |
| :---- | :---- |
| Diagnóstico | Nobreak NBK-015 com batería esgotada após queda de energia noturna. Dispositivos alimentados ficaram sem energia. |
| Materiais consumidos | 2x Baterias 12V 7Ah para nobreak (EST-00456) — baixa automática do estoque. |
| Evidências | Foto antes: painel do nobreak com indicador de falha. Foto depois: baterias substituídas, todos os dispositivos operativos. |
| Checklist | 8 de 8 tarefas concluídas (inspeção elétrica, troca baterias, teste nobreak, reset controlador, teste temporização, verificação câmera, teste streaming, teste detector). |
| Conclusão | 08:30 — Interseção totalmente operativa. Tempo: 1h45. SLA cumprido (\< 4h). |

Ao concluir a OS, o sistema fecha automaticamente as três incidências correlacionadas e atualiza o histórico de todos os ativos envolvidos (NBK-015, CTRL-087, CAM-042, DET-019).

**Passo 5: Acompanhamento da Manutenção Preventiva**

Enquanto a corretiva era resolvida, María Fernanda consulta o calendário de manutenção preventiva do corredor Av. 10 de Agosto:

| Controlador | OS Preventiva | Estado | Técnico |
| :---- | :---- | :---- | :---- |
| CTRL-001 | OS-PREV-0891 | Concluída (verde) | Ana Torres |
| CTRL-002 | OS-PREV-0892 | Em execução (azul) | Pedro Gómez |
| CTRL-003 | OS-PREV-0893 | Atribuída (amarelo) | Carlos Mendoza |
| CTRL-004 a CTRL-015 | OS-PREV-0894 a 0905 | Programadas para Qua-Sex | — |

**Passo 6: Alerta de Estoque**

O consumo de baterias para nobreak dispara alerta:

| Ação | Detalhes |
| :---- | :---- |
| Alerta gerado | Item EST-00456 (Bateria 12V 7Ah nobreak): estoque atual 4, mínimo de segurança 6\. |
| Notificação | E-mail automático ao responsável de compras com lista de itens abaixo do mínimo. |
| Projeção | Consumo médio: 3 un./mês. Estoque atual cobre \~1,3 meses. Recomenda-se compra de 12 un. |

# **Impacto em Outros Módulos**

* **Controladores:** Controladores são ativos registrados neste módulo. Alarmes de controladores (perda de comunicação, modo intermitente, falha de temporização) geram incidências que, via auto-regras, resultam em OS corretivas. Manutenções preventivas de controladores são programadas e executadas através deste módulo.  
* **PMV:** Painéis de mensagem variável são ativos do inventário. Incidentes de PMV (vandalismo, falha de exibição, perda de comunicação) geram incidências que resultam em OS. Dados patrimoniais dos PMV são mantidos neste módulo.  
* **Câmeras:** Câmeras de videomonitoramento são ativos registrados no inventário. Alarmes de câmera offline, perda de sinal ou falha mecânica geram incidências com auto-regras específicas para técnicos de videomonitoramento.  
* **Detectores:** Detectores de tráfego (indutivos, magnéticos, radar) são ativos registrados. Leituras anômalas ou ausência de dados geram incidências que são resolvidas via OS neste módulo.  
* **Alarmes:** O Módulo de Alarmes é a principal fonte de incidências automáticas. A integração é bidirecional: alarmes geram incidências, e o fechamento de incidências atualiza o estado dos alarmes correspondentes.  
* **Modelo de Tráfego:** Os ativos geoposicionados são representados no mapa dentro do Modelo de Tráfego. A associação hierárquica de ativos por interseção é compartilhada para análise de impacto e correlação de incidências.  
* **Relatórios:** Fornece dados de manutenção, custos, MTBF, MTTR por tipo de dispositivo, aderência a SLA, efetividade de auto-regras e consumo de materiais para o módulo de Relatórios.

## **4.13. Painel de Operação**

Tipo: **Core**

# **Contexto e Justificativa**

O Painel de Operações é a interface central e unificada através da qual os operadores do centro de controle supervisionam e controlam toda a infraestrutura semafórica. Classificado como dependente, este módulo não possui lógica de negócio própria: ele consome dados e expõe ações de todos os módulos funcionais da plataforma, Modelo de Tráfego, Controladores, PMV, Inventário e Manutenção, Emergências, Alarmes, Câmeras, Detectores, Analítico e Planos de Execução, num único ambiente operacional baseado em mapa GIS.

O paradigma fundamental deste módulo é que o mapa é a interface. O operador não navega por menus ou telas para operar a plataforma: ele interage diretamente com os elementos geoposicionados no mapa da cidade. O mapa apresenta duas dimensões integradas: os elementos topológicos do Modelo de Tráfego (interseções, áreas, subáreas, rotas, acessos e pontos de medição) e os dispositivos físicos associados a eles (controladores, câmeras, detectores, PMVs, nobreaks). Um click numa interseção abre seu detalhe integrado com dados de controladores, detectores e câmeras; um click num controlador mostra seu estado e permite comandar ações diretas. Toda ação operacional frequente é acessível em no máximo dois clicks a partir do mapa.

O eixo central do controle semafórico é a interseção, não o controlador. Este princípio, estabelecido no Modelo de Tráfego e no módulo de Controladores, reflete-se diretamente na operação do Painel: quando o operador precisa alterar o comportamento semafórico de um cruzamento, trocar plano, modificar temporizações, forçar uma fase, ativar uma estratégia ele interage com a interseção no mapa, não com o controlador. A interseção é a entidade que persiste toda a configuração semafórica (planos, fases, tempos de ciclo, defasagens, grupos semafóricos) e o controlador associado é um executor que recebe e aplica as ordens que a interseção propaga. Isso significa que, no mapa, o popup de uma interseção é o ponto primário de operação semafórica: é ali que o operador vê o estado real do cruzamento (qual plano está ativo, qual fase, qual tempo restante) e comanda ações que a interseção persiste e propaga ao controlador. O popup do controlador individual, por sua vez, é orientado ao equipamento físico: estado de comunicação, modo de operação, qualidade do link, intervenção manual, e ações diretas que não passam pela interseção (reset, forçar modo intermitente de emergência). A substituição de controladores reforça esse paradigma: se um controlador for substituído, a interseção mantém toda a sua configuração intacta e o novo equipamento a herda automaticamente, garantindo continuidade operacional sem reconfiguração manual.

A informação no mapa é organizada por camadas que o operador pode ativar, desativar e combinar. Existem camadas de base geográfica, camadas de elementos topológicos (a estrutura lógica da rede semafórica), camadas de dispositivos físicos, camadas de estado operacional (alarmes, emergências, manutenção) e camadas de tráfego (níveis de serviço, fluxos, velocidades). A combinação de camadas permite ao operador construir a visão exata que precisa para cada situação operacional.

# **Recurso**

## **Mapa Operacional**

Mapa GIS interativo da cidade que funciona como a interface única e central de operação de toda a plataforma semafórica. Todos os elementos topológicos, dispositivos, eventos, alarmes, emergências e indicadores são apresentados no mapa, e todas as ações operacionais frequentes são acessíveis diretamente. O mapa de fundo utiliza cartografia atualizada e suporta múltiplos níveis de zoom, desde visão metropolitana (mostrando áreas e corredores) até detalhamento ao nível de interseção (mostrando geometria, faixas, movimentos e dispositivos individuais).

**Funcionalidades**

**Sistema de Camadas**

Toda a informação no mapa é organizada em camadas que o operador pode ativar, desativar, combinar e configurar a transparência. As camadas são organizadas em cinco grupos hierárquicos:

* **Camadas de base geográfica:** Cartografia atualizada do DMQ: vias arteriais, coletoras e locais com classificação funcional; edifícios e lotes; pontes, viadutos e passagens de nível; ferrovias e estações; hidrografia (rios, quebradas); relevo e topografia; limites administrativos (parroquias, zonas). Estas camadas fornecem o contexto geográfico sobre o qual todos os elementos operacionais são sobrepostos.  
* **Camadas de elementos topológicos:** Os elementos que definem a estrutura lógica da rede semafórica, consumidos do módulo Modelo de Tráfego: Interseções (ícone de cruzamento, cor indica estado operacional: verde=todas as fases normais, amarelo=com alarme ou intervenção manual, vermelho=falha crítica, cinza=sem controlador associado; ao dar zoom, o ícone se expande para mostrar a geometria da interseção com aproximações e movimentos). Áreas (perímetros geográficos com preenchimento semitransparente e label com nome da área). Subáreas (perímetros internos às áreas com cor conforme modo de funcionamento: verde=central, azul=local, amarelo=manual, laranja=intermitente, vermelho=apagado). Rotas (linhas conectando interseções em sequência, com setas indicando direção de progressão; ao ativar, a onda verde é visualizada como animação ao longo da rota). Pontos de Medição (ícone de sensor com label mostrando valor de fluxo em tempo real). Acessos (ícone de seta indicando entrada ou saída da zona controlada).  
* **Camadas de dispositivos físicos:** Cada tipo de dispositivo do parque semafórico é representado por uma camada independente com iconografia própria: Controladores semafóricos (ícone de semáforo; cor indica estado: verde=operativo, amarelo=com alarme, vermelho=offline/crítico, cinza=desativado, azul=sob intervenção manual; contorno tracejado indica controlador em campo sem associação à interseção). Câmeras de videomonitoramento (ícone de câmera, cor indica online/offline, ícone de visão representado no mapa). Detectores de tráfego (ícone de sensor, cor indica estado, dados de fluxo como label). Painéis de Mensagem Variável (ícone de painel, tooltip mostra mensagem atual). Nobreaks (ícone de bateria, cor indica modo: rede normal, bateria, falha).  
* **Camadas de estado operacional:** Informação dinâmica sobre a situação atual da operação: Alarmes ativos (halo pulsante ao redor de dispositivos, cor conforme criticidade). Emergências ativas (área de influência com perímetro destacado, dispositivos sob controle do evento, veículos prioritários em deslocamento, corredor verde animado). Incidências abertas (marcador no ativo com cor conforme SLA). Manutenção preventiva (ícone de ferramenta sobre ativos com cor: verde=em dia, amarelo=a vencer, vermelho=atrasada). OS em campo (posição de técnicos e marcador na interseção com OS ativa). Estratégias ativas (subáreas com borda reforçada e label indicando nome da estratégia vigente).  
* **Camadas de tráfego:** Dados de tráfego em tempo real sobrepostos à malha viária, consumidos do módulo Analítico: Níveis de serviço (LOS) (segmentos de via coloridos: verde=A/B, amarelo=C/D, vermelho=E/F). Fluxo veicular (setas com espessura proporcional ao volume). Velocidades médias (labels sobre segmentos). Filas e congestionamento (extensão estimada nas aproximações). Tempos de percurso (entre pontos de referência, ao longo de rotas).

**Interação com Elementos Topológicos**

Os elementos topológicos são a estrutura lógica da rede semafórica. Ao clicar em qualquer elemento topológico no mapa, o operador acessa uma tela de detalhe integrada que reúne dados topológicos próprios e informações consumidas em tempo real dos módulos de dispositivos associados, sem navegar para outros módulos. A interseção é o elemento topológico mais importante: é a unidade fundamental de controle semafórico e o ponto primário de operação no mapa. É na interseção onde se persiste toda a configuração semafórica (planos, fases, tempos, defasagens) e o controlador associado responde às ordens que a interseção propaga. Por isso, as ações de controle semafórico no mapa são realizadas preferencialmente através do popup da interseção, não do popup do controlador.

**Interseções**

| Tipo | Informação / Ação | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| Dados topológicos | Geometria: nº de aproximações, faixas por aproximação, movimentos permitidos, fases | Sim, diagrama visual da interseção no popup |  |
| Controlador | Estado do controlador associado: online/offline, modo (central/local/manual/intermitente), plano ativo, fase atual, tempo restante, estado de cada grupo semafórico | Sim, consumido do módulo Controladores em tempo real |  |
| Controlador | Indicador de controlador sem associação (interseção sem controlador — ícone cinza) | Sim, visual no mapa |  |
| Detectores | Dados de fluxo dos detectores nas aproximações: volume, velocidade, ocupação em tempo real | Sim,consumido do módulo Detectores/Analítico |  |
| Câmeras | Feeds ao vivo das câmeras que monitoram a interseção (thumbnails com click para expandir) | Sim, consumido do módulo Câmeras |  |
| Alarmes | Alarmes ativos nesta interseção (de qualquer dispositivo associado) | Sim,  lista integrada no popup |  |
| Ação rápida | Comandar controlador associado (mudar plano, modo intermitente, forçar fase) — mesmas ações do popup do controlador, acessíveis pelo popup da interseção | Sim, botões de ação no popup |  |
| Ação rápida | Abrir incidência para a interseção | Sim,  formulário simplificado |  |
| Configuração | Editar geometria, movimentos, fases, associar/desassociar controlador |  | Modelo de Tráfego |

**Áreas e Subáreas**

| Tipo | Informação / Ação | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| Visualização | Área: perímetro geográfico, lista de interseções e subáreas, métricas agregadas (volume total, velocidade média, LOS) | Sim, popup com resumo ao clicar no perímetro ou label |  |
| Visualização | Subárea: modo de funcionamento atual (central/local/manual/intermitente/apagado), estratégia ativa, interseções contidas, métricas de tráfego | Sim, cor do perímetro indica modo \+ popup com detalhes |  |
| Visualização | Estado consolidado dos dispositivos na área: % operativos, alarmes, incidências | Sim, indicadores no popup |  |
| Ação rápida | Alterar modo de funcionamento de uma subárea (ex: passar de central para intermitente) | Sim, dropdown \+ confirmação no popup da subárea |  |
| Configuração | Editar perímetro, reorganizar interseções, criar subáreas |  | Modelo de Tráfego |

**Rotas**

| Tipo | Informação / Ação | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| Visualização | Sequência de interseções conectadas com direção de progressão, distâncias, velocidade de progressão desejada | Sim, linha animada com setas no mapa |  |
| Visualização | Onda verde: animação visual da progressão semafórica ao longo da rota quando estratégia de coordenação está ativa | Sim, pulso verde animado ao longo da rota |  |
| Visualização | Tempos de percurso: real vs. planejado, consumido do módulo Analítico | Sim,  labels sobre a rota |  |
| Configuração | Editar sequência de interseções, velocidade de progressão, parâmetros |  | Modelo de Tráfego |

**Pontos de Medição e Acessos**

| Tipo | Informação / Ação | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| Ponto de Medição | Localização do sensor, tipo de medição, sentido de fluxo, métricas em tempo real (volume, velocidade, ocupação), histórico de medições recente | Sim,  ícone com label de fluxo \+ popup com gráfico temporal |  |
| Ponto de Medição | Detector físico associado: estado, modelo, última comunicação | Sim,  consumido do módulo Detectores no popup |  |
| Acesso | Ponto de entrada/saída da zona controlada, direção do fluxo, volume atual | Sim,  ícone de seta com label de volume |  |
| Configuração | Editar localização, parâmetros de medição, associar/desassociar detector |  | Modelo de Tráfego |

**Gestão de Estratégias no Mapa**

Estratégias são o mecanismo pelo qual o engenheiro de tráfego define e executa o comportamento operacional da rede. O Painel de Operações permite ao operador visualizar as estratégias ativas, monitorar sua execução em tempo real e realizar intervenções rápidas diretamente do mapa. A criação e edição detalhada de estratégias (definição de escopo, condições, configuração semafórica) navega ao módulo Modelo de Tráfego.

| Tipo | Informação / Ação | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| Visualização | Estratégias ativas: subáreas com borda reforçada e label com nome da estratégia, tipo de ativação (programada, por condição, manual) e horário de ativação | Sim, camada de estado operacional \+ popup com detalhes |  |
| Visualização | Execução em tempo real: quais controladores já receberam a configuração, quais estão em transição, quais tiveram falha | Sim, ícones dos controladores mudam conforme recebem config (check/loading/erro) |  |
| Visualização | Conflitos entre estratégias: quando duas estratégias tentam atuar sobre a mesma subárea, o mapa destaca a área em conflito e mostra notificação | Sim, área com borda pulsante \+ popup de conflito |  |
| Visualização | Onda verde ativa ao longo de rotas: animação mostrando a progressão semafórica coordenada | Sim, pulso verde animado sobre a rota |  |
| Ação rápida | Ativar estratégia manualmente: selecionar de lista de estratégias disponíveis para a subárea/área/rota clicada | Sim, dropdown de estratégias no popup da subárea \+ confirmação |  |
| Ação rápida | Desativar estratégia ativa (retornar ao modo programado/padrão) | Sim, botão no popup com confirmação |  |
| Ação rápida | Resolver conflito: escolher qual estratégia prevalece quando há conflito | Sim,  popup de conflito com opções |  |
| Configuração | Criar/editar estratégia (escopo, condições, configuração semafórica, defasagens, onda verde) |  | Modelo de Tráfego |
| Análise | Histórico de estratégias, eficácia, métricas de desempenho |  | Analítico |

**Interação com Controladores no Mapa**

Ao clicar num controlador no mapa, o operador acessa um painel contextual orientado ao equipamento físico. Diferente do popup da interseção (que é o ponto primário de controle semafórico), o popup do controlador foca no estado do hardware, na comunicação e nas ações diretas sobre o equipamento. As ações de controle semafórico regular (trocar plano, alterar temporizações) são realizadas preferencialmente pelo popup da interseção, que persiste a configuração e a propaga ao controlador. O popup do controlador oferece ações diretas sobre o equipamento que não passam pela interseção: reset, forçar modo intermitente de emergência, liberar de intervenção manual. Quando o operador envia um comando direto que conflita com a estratégia ativa, o sistema registra a intervenção manual e notifica sobre o conflito.

| Tipo | Ação / Informação | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| Visualização | Estado no ciclo de vida: Operativo (verde), Em testes (azul claro+warning), Em campo sem associar (contorno tracejado+warning permanente), Offline (vermelho) | Sim, ícone diferenciado por estado |  |
| Visualização | Modo de operação: central, local, manual, intermitente, apagado | Sim, indicador visual no ícone |  |
| Visualização | Plano semafórico ativo (herdado da interseção/estratégia), fase atual, tempo restante | Sim, diagrama de fases em tempo real no popup |  |
| Visualização | Estado de cada grupo semafórico, intensidade luminosa (quando suportado) | Sim, diagrama de grupos no popup |  |
| Visualização | Qualidade da comunicação: latência, taxa de perda de pacotes | Sim, indicadores no popup |  |
| Visualização | Indicador de intervenção manual ativa (controlador sob controle manual, fora da estratégia) | Sim, ícone azul \+ badge "Manual" |  |
| Via interseção | Trocar plano, forçar fase, alterar temporizações, ações de controle semafórico são realizadas pelo popup da interseção associada. O popup do controlador oferece link direto: “Abrir interseção” para navegar ao ponto de controle correto | Sim, link para popup da interseção, que persiste e propaga ao controlador |  |
| Ação direta | Alterar modo de operação de emergência (intermitente/apagado),  ação direta sobre o equipamento, não passa pela interseção, registra intervenção manual | Sim, botão toggle com confirmação \+ warning |  |
| Ação direta | Reset do equipamento | Sim, botão com dupla confirmação (ação crítica) |  |

**Interação com Câmeras no Mapa**

| Tipo | Ação / Informação | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| Visualização | Streaming ao vivo (vídeo em tempo real) | Sim, janela de vídeo no popup ou monitor secundário |  |
| Visualização | Estado, modelo, última comunicação, cone de visão no mapa | Sim,  ícone colorido \+ cone \+ tooltip |  |
| Ação rápida | Controle PTZ (pan, tilt, zoom) | Sim, controles no popup |  |
| Ação rápida | Selecionar preset de posição | Sim, dropdown de presets |  |
| Ação rápida | Enviar vídeo para monitor secundário / captura / gravação | Sim, botões no popup |  |
| Configuração | Presets, qualidade, videoanalítica, gravações históricas |  | Módulo Câmeras |
| Patrimonial | Dados do ativo e histórico de OS |  | Inventário |

**Interação com PMVs no Mapa**

| Tipo | Ação / Informação | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| Visualização | Mensagem atualmente exibida (preview visual no tooltip) | Sim, tooltip \+ popup com layout renderizado |  |
| Visualização | Estado, luminosidade, pilha de mensagens, alarmes | Sim, ícone colorido \+ resumo |  |
| Ação rápida | Enviar mensagem da biblioteca / Limpar mensagem / Ajustar luminosidade | Sim, busca \+ pré-visualização \+ envio / botão / slider |  |
| Configuração | Compor mensagens, editar biblioteca, layouts, variáveis, grupos |  | PMV |
| Patrimonial | Dados do ativo e histórico de OS |  | Inventário |

**Interação com Detectores no Mapa**

| Tipo | Ação / Informação | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| Visualização | Dados em tempo real: fluxo, ocupação, velocidade \+ gráfico temporal | Sim, labels \+ popup com gráfico |  |
| Visualização | Estado (operativo/offline/leitura anômala) e alarmes | Sim, ícone colorido \+ lista no popup |  |
| Ação rápida | Confirmar alarme de leitura anômala | Sim,  botão no popup |  |
| Configuração | Calibração, parâmetros de detecção |  | Módulo Detectores |
| Patrimonial | Dados do ativo e histórico de OS |  | Inventário  |

**Gestão de Alarmes no Mapa**

Alarmes ativos são visíveis diretamente no mapa como halos pulsantes ao redor dos dispositivos afetados. Um painel lateral de alarmes, lista todos os alarmes ativos em ordem decrescente de prioridade. A janela de confirmação obrigatória para alarmes críticos aparece como overlay sobre o mapa.

| Tipo | Ação / Informação | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| Visualização | Alarmes geoposicionados com halo pulsante por criticidade \+ painel lateral ordenado | Sim, camada \+ painel ancorável |  |
| Visualização | Notificação sonora diferenciada por tipo e localização | Sim, conforme regras do módulo de alarmes |  |
| Ação rápida | Confirmar alarme (incluindo janela obrigatória para críticos) | Sim, popup/overlay de confirmação |  |
| Ação rápida | Centrar mapa no dispositivo / Filtrar alarmes no painel | Sim, click \+ filtros |  |
| Configuração | Catálogo, regras de notificação, retenção, arquivo, tendências |  | Alarmes |

**Gestão de Emergências no Mapa**

Quando há uma emergência ativa, o mapa destaca a área de influência, marca dispositivos sob controle do evento, e mostra veículos prioritários em deslocamento com corredor verde animado:

| Tipo | Ação / Informação | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| Visualização | Área de influência, veículos prioritários, corredor verde animado, checklist de ações | Sim, overlay \+ ícones móveis \+ animação |  |
| Ação rápida | Abrir/confirmar evento, expandir/reduzir área, ativar corredor verde, escalar, encerrar | Sim, click no mapa \+ popup/painel |  |
| Configuração | Protocolos, cadastro de veículos, análise pós-evento |  | Emergências |

**Inventário e Manutenção no Mapa**

| Tipo | Ação / Informação | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| Visualização | Incidências abertas com SLA, OS em campo, manutenção preventiva (verde/amarelo/vermelho) | Sim, camada de estado operacional |  |
| Ação rápida | Abrir incidência para qualquer ativo, consultar resumo de incidência/OS | Sim, formulário simplificado \+ popup |  |
| Gestão completa | Triagem, calendário preventivo, estoque, gestão de OS |  | Inventário |

**Tráfego e Analítico no Mapa**

| Ação / Informação | Tipo | Disponível no Mapa | Navega ao Módulo |
| :---- | :---- | :---- | :---- |
| LOS (level of Service) )em tempo real, fluxos, velocidades, filas, tempos de percurso | Visualização | Sim, camadas de tráfego |  |
| Relatórios históricos, comparações, predições, eficácia de estratégias | Análise |  | Analítico |

**Busca e Navegação Rápida**

* **Busca global:** Campo de busca que localiza qualquer elemento por: identificador do dispositivo (“CTRL-087”), nome da interseção (“Av. Amazonas / Naciones Unidas”), nome de área ou subárea (“Zona Norte”), nome de rota (“Corredor Av. América”), tipo e estado (“câmeras offline”, “controladores com alarme crítico”, “subáreas em modo manual”). Ao selecionar, o mapa centraliza e abre popup contextual.  
* **Navegação por favoritos:** O operador marca interseções, corredores, áreas ou rotas como favoritos para navegação em um click.  
* **Atalhos de teclado:** Teclas configuráveis para ações frequentes e camadas. Personalizáveis por operador.  
* **Navegação contextual entre módulos:** Botão “Abrir no módulo” no popup de qualquer elemento navega diretamente ao módulo correspondente no contexto do item selecionado (ex: clique em “Abrir no módulo” numa estratégia abre Modelo de Tráfego já com a estratégia selecionada). Retorno ao mapa preserva estado.

**Dashboard Operacional Integrado**

Painel de indicadores consolidados de toda a plataforma, exibível num monitor secundário ou como overlay.

**Saúde da infraestrutura:** Percentual de dispositivos operacionais por tipo. Tendência 24h. Alerta quando a disponibilidade cai abaixo do limiar.

**Alarmes:** Total ativos por criticidade. Aguardando confirmação. Tempo médio de confirmação no turno.

**Emergências:** Eventos ativos, tipo, severidade, protocolos em execução, veículos prioritários.

**Manutenção:** Incidências abertas, OS em execução, técnicos em campo, preventivas do dia.

**Estratégias:** Estratégias ativas por tipo de ativação (programada, condição, manual). Subáreas sob controle manual. Conflitos pendentes.

**Tráfego:** LOS médios da rede. Corredores com pior desempenho. Fluxo total vs. média histórica.

**Operação:** Operadores logados. Ações no turno. Planos de execução ativos. Timeline resumida.

# **Exemplo de Uso**

**Cenário**

São 07:30 de segunda-feira. O operador Diego Ramírez inicia seu turno. Sua consola possui três monitores. Nas próximas duas horas ele verifica o estado geral da rede, trata alarmes, ativa uma estratégia de pico matutino, acompanha manutenção preventiva, e responde a um sinistro com ambulância. Tudo desde o mapa.

**Passo 1: Início do Turno**

| Monitor | Conteúdo |
| :---- | :---- |
| Monitor 1 (principal) | Mapa com camadas: elementos topológicos (interseções \+ subáreas) \+ controladores \+ alarmes \+ tráfego (LOS). Zoom na zona norte. |
| Monitor 2 (esquerdo) | Grade 2x2: 4 câmeras dos corredores principais. |
| Monitor 3 (direito) | Superior: Painel de alarmes. Inferior: Dashboard operacional integrado. |

O Dashboard mostra: 97,2% operativo, 4 alarmes, 0 emergências, 2 estratégias de madrugada ativas (programadas), 3 OS em campo.

**Passo 2: Ativação de Estratégia de Pico**

Às 07:45 o sistema notifica: estratégia de pico matutino “EST-PICO-AM-NORTE” será ativada por tabela horária às 07:50 na subárea “Zona Norte Centro”.

| Evento no Mapa | O que Diego Vê |
| :---- | :---- |
| Às 07:50 — Estratégia ativa | Subárea “Zona Norte Centro” ganha borda reforçada com label “EST-PICO-AM-NORTE (programada)”. Os controladores dentro da subárea mostram ícone de loading conforme recebem a nova configuração. |
| 07:50-07:51 — Execução | Controladores mudam de loading para check (✓) conforme confirmam. CTRL-087 mostra erro (X). Diego clica no CTRL-087 no mapa, vê no popup: “Falha ao receber configuração — timeout de comunicação”. |
| 07:51 — Tratamento | Diego clica “Reset” no popup do CTRL-087 (dupla confirmação). Controlador reinicia, recebe config. Check (✓). Estratégia 100% aplicada. |
| 07:52 — Rota onda verde | Diego ativa camada de rotas. Vê animação de onda verde no Corredor Av. 10 de Agosto: pulso verde percorrendo as interseções coordenadas. |

**Passo 3: Sinistro com Ambulância**

Às 08:15, videoanalítica detecta sinistro na Av. Amazonas / Naciones Unidas:

| Tempo | Mapa | Ação de Diego |
| :---- | :---- | :---- |
| 08:15 | Área de influência alaranjada aparece. Popup pede confirmação. | Click “Confirmar”. Severidade Alta. |
| 08:16 | Protocolo PROT-SIN-002 sugerido. Checklist de ações visível. | Click “Ativar Protocolo”. |
| 08:16 | 11 controladores mudam para azul (“modo emergência”). PMVs mostram tooltip com mensagem de desvio. Câmeras reposicionam (cone muda no mapa). | Verifica câmera do sinistro no monitor 2\. |
| 08:17 | O Ícone móvel AMB-ECU-047 aparece com rota tracejada. Corredor verde dinâmico animado avança. | Acompanha. |
| 08:22 | Ambulância chega. O corredor verde encerra. | Continua monitorando. |
| 08:45 | Fluxo normaliza nos detectores. | Click “Encerrar Evento”. Rollback gradual inicia. Controladores retornam ao plano da estratégia de pico. |
| 08:52 | Todos dispositivos restaurados. | Evento fechado. Registro armazenado. |

Zero navegação para outros módulos durante todo o turno. Ativação de estratégia, tratamento de falha de controlador, resposta a sinistro e corredor verde,  tudo operado desde o mapa.

## **4.12. Emergências**

Tipo: **Dependente**

# **Contexto e Justificativa**

O módulo de Emergências é responsável pela gestão completa de situações emergentes que alteram o fluxo normal do trânsito no DMQ: sinistros viários, presença de veículos detenidos, colapsos de interseção, desastres naturais e operativos de segurança. Classificado como Funcional, este módulo opera com um domínio de negócio próprio que nenhum outro módulo da plataforma cobre: a orquestração dinâmica e coordenada de múltiplos dispositivos em resposta a eventos emergentes, com capacidade de rollback automático ao estado anterior quando a emergência é encerrada.

A diferença fundamental entre este módulo e os demais reside no conceito de ciclo de vida do evento emergente com restauração de estado. Quando um evento de emergência é ativado, o sistema captura um snapshot do estado atual de todos os dispositivos afetados (temporizações dos controladores, mensagens nos PMVs, configurações de câmeras) antes de aplicar qualquer modificação. Durante a emergência, os dispositivos operam sob controle deste módulo. Quando o evento é encerrado, o sistema executa automaticamente o rollback, restaurando cada dispositivo ao seu estado pré-emergência. Essa capacidade de snapshot-modificação-rollback não existe em nenhum outro módulo: o módulo de Alarmes detecta problemas mas não orquestra respostas; o módulo de Planos de Execução executa sequências estáticas mas não tem conceito de rollback nem de evento com duração; o módulo de Controladores modifica temporizações mas não coordena múltiplos dispositivos simultaneamente.

Adicionalmente, o módulo gere um domínio exclusivo de veículos prioritários: o cadastro de ambulâncias, bombeiros e patrulhas que podem solicitar prioridade semafórica, os métodos de identificação desses veículos (reconhecimento de placas por LPR, videoanalítica, transponders, solicitação manual), e as regras de priorização que definem como o sistema reage quando um veículo prioritário é identificado, funcionalidade que não pertence a nenhum outro módulo da plataforma.

O módulo integra-se com todos os elementos de controle e monitoramento da plataforma: consome dados de **Alarmes** para detecção automática de condições emergentes, envia comandos aos **Controladores** para modificação de fases e criação de corredores verdes, ordena envio de mensagens ao módulo **PMV** para alertar motoristas e indicar rotas alternativas, consome dados de **Câmeras** e **Detectores** para identificação de veículos prioritários e monitoramento visual do evento, e pode disparar Planos de Execução complementares quando necessário. O Painel de Operações da plataforma consome dados deste módulo para apresentar o estado das emergências ativas na visão geral do operador.

# **Recursos**

## **Veículos Prioritários**

Recurso de cadastro, identificação e gestão de todos os veículos autorizados a solicitar prioridade semafórica na rede do DMQ. Um veículo prioritário é qualquer veículo de emergência ou serviço público que, por sua natureza operacional, possui direito a tratamento semafórico preferencial: ambulâncias, veículos de bombeiros, patrulhas policiais, veículos de defesa civil e, opcionalmente, ônibus de transporte público em corredores prioritários. Este recurso é exclusivo do módulo de Emergências porque nenhum outro módulo da plataforma gere a relação entre veículos externos e o comportamento semafórico: o módulo de **Controladores** executa mudanças de fase mas não sabe quem é o veículo; o módulo de **Câmeras** detecta placas mas não decide a ação; este módulo conecta a identificação do veículo à ação semafórica.

**Funcionalidades**

* **Cadastro de veículos prioritários:** Registro completo de cada veículo autorizado incluindo: placa (principal e alternativa quando aplicável), tipo de veículo (ambulância, bombeiro, patrulha, defesa civil, transporte público), entidade proprietária (ECU-911, Corpo de Bombeiros, Polícia Nacional), identificador do transponder (quando equipado), número de unidade operacional, fotografia do veículo, contacto da entidade responsável, e estado (ativo, inativo, em manutenção). O cadastro é mantido em coordenação com as entidades de emergência e pode ser atualizado por administradores autorizados.  
* **Métodos de identificação:** O sistema suporta múltiplos métodos para identificar um veículo prioritário em aproximação, permitindo redundância e cobertura em diferentes cenários operacionais. Reconhecimento de Placas (LPR): as câmeras da rede, através do módulo de Câmeras, detectam a placa do veículo e o sistema cruza com o cadastro de veículos prioritários; se houver correspondência, a priorização é ativada automaticamente. Videoanalítica: análise de vídeo em tempo real capaz de identificar características visuais de veículos de emergência (luzes intermitentes ativas, padrões visuais de ambulâncias/bombeiros) independentemente da placa. Transponder/GPS: veículos equipados com dispositivo transponder ou rastreador GPS que transmite sua posição em tempo real; o sistema acompanha a localização do veículo e ativa priorização conforme ele se aproxima de cada interseção. Ativação manual: o operador no centro de controle, mediante solicitação rádio/telefônica da entidade de emergência, registra manualmente o veículo e ativa a priorização em um corredor específico.  
* **Níveis de prioridade:** Hierarquia configurável de prioridade por tipo de veículo e tipo de emergência. Nível 1 (Máximo): ambulância em atendimento de emergência vital, bombeiros em combate a incêndio, preemption total, todas as fases passam a verde no corredor. Nível 2 (Alto): patrulha em perseguição, ambulância em transferência urgente,  preemption com respeito a pedestres em cruzamento. Nível 3 (Médio): ônibus em corredor prioritário, defesa civil em deslocamento, extensão de fase verde, sem preemption total. Quando dois veículos prioritários solicitam prioridade simultaneamente em rotas conflitantes, o nível de prioridade define qual é atendido primeiro. Conflitos de mesmo nível são resolvidos por ordem de chegada e notificados ao operador.  
* **Regras de priorização por corredor:** Cada corredor ou rota da rede pode ter regras específicas de priorização: quais interseções participam do corredor verde, qual a sequência de ativação (progressiva conforme o veículo avança ou simultânea em todo o corredor), tempo máximo de manutenção da prioridade por interseção (para evitar bloqueio prolongado do tráfego transversal), e comportamento de restauração após passagem do veículo (retorno imediato ao plano normal ou transição gradual).  
* **Monitoramento de veículos em operação:** Acompanhamento em tempo real dos veículos prioritários com priorização ativa: posição atual no corredor (quando disponível via GPS/transponder ou câmeras), interseções já liberadas, próxima interseção a ser ativada, tempo estimado de chegada, e estado da priorização (ativa, completada, cancelada). O operador pode intervir a qualquer momento para cancelar, estender ou redirecionar a priorização.  
* **Histórico de priorizações:** Registro completo de cada ativação de prioridade: veículo identificado, método de identificação utilizado, corredor ativado, interseções afetadas, duração total, operador responsável (para ativações manuais), e resultado (prioridade completada com sucesso, cancelada, falha de execução). O histórico permite análise de frequência de uso, tempos de resposta por entidade e efetividade dos corredores verdes.  
* **Gestão de entidades externas:** Cadastro das entidades de emergência que possuem veículos prioritários: ECU-911, Corpo de Bomberos de Quito, Policía Nacional, EPMTPQ (transporte público), Cruz Roja, Forças Armadas. Cada entidade tem: contacto operacional, horário de operação, tipos de veículos autorizados, e nível de prioridade máximo concedido. A gestão de entidades permite auditar quem tem acesso ao sistema de priorização e controlar autorizações.

**Comparação de métodos de identificação:**

| Método | Como Funciona | Vantagens | Limitações |
| :---- | :---- | :---- | :---- |
| LPR (Reconhecimento de Placas) | Câmera lê placa → cruza com cadastro → ativa prioridade automaticamente | Automático, sem hardware adicional no veículo, usa infraestrutura existente | Depende de visibilidade da placa, pode falhar com sujeira/obstrucao |
| Videoanalítica | Análise de vídeo identifica luzes intermitentes e padrões visuais de emergência | Não depende de placa, funciona com qualquer veículo de emergência visível | Menor precisão, depende de condições de iluminação e ângulo |
| Transponder/GPS | Dispositivo no veículo transmite posição em tempo real via rede celular ou rádio | Rastreamento contínuo, permite corredor verde progressivo, alta precisão | Requer hardware instalado em cada veículo, custo adicional |
| Ativação Manual | Operador registra solicitação via rádio/telefone e ativa corredor manualmente | Funciona sem qualquer tecnologia no veículo, fallback universal | Mais lento, depende de operador disponível, sujeito a erro humano |

## **Eventos de Emergência**

Recurso de registro, monitoramento e gestão do ciclo de vida completo de situações emergentes que afetam o trânsito no DMQ. Um evento de emergência é fundamentalmente diferente de um alarme ou uma incidência: um alarme (módulo 4.14) é a detecção de uma anomalia num dispositivo; uma incidência (módulo 4.11) é um problema técnico que requer manutenção; um evento de emergência é uma situação de trânsito que exige resposta operacional coordenada sobre múltiplos dispositivos com duração definida e restauração posterior. O evento é a entidade que agrupa todas as ações, dispositivos e operadores envolvidos na resposta, e é o responsável por garantir que, ao término da emergência, todos os dispositivos retornem ao seu estado normal de operação.

**Funcionalidades**

* **Abertura de evento:** Um evento de emergência pode ser aberto de três formas: Automática por alarme — quando o módulo de Alarmes (4.14) gera um alarme de tipo classificado como emergente (ex: condição de conflito, múltiplos controladores offline numa área), o sistema cria automaticamente um evento de emergência vinculado. Automática por detecção — quando a videoanalítica ou sensores de tráfego detectam condições emergentes (sinistro, veículo detenido bloqueando interseção, colapso de tráfego), o sistema cria o evento automaticamente. Manual por operador — o operador, mediante informação recebida por rádio, telefone ou observação visual nas câmeras, abre manualmente o evento com classificação e localização.  
* **Classificação de eventos:** Cada evento é classificado por tipo e severidade, determinando qual protocolo de resposta será ativado. Tipos de evento: Sinistro viário (acidente com veículos, atropelamento), Veículo detenido (bloqueio de via por avaria, carga derramada), Colapso de interseção (congestionamento severo que impede fluxo em todas as direções), Desastre natural (inundação, deslizamento, terremoto), Operativo de segurança (operação policial, evento presidencial, manifestação), Evento especial planejado (show, partida de futebol, marcha). Severidades: Crítica (via completamente bloqueada, risco de vida), Alta (via parcialmente bloqueada, impacto severo no tráfego), Média (redução de capacidade, impacto moderado), Baixa (evento controlado com impacto mínimo).  
* **Snapshot de estado pré-emergência:** No momento da ativação do evento, o sistema captura automaticamente o estado atual de todos os dispositivos na área de influência: temporizações e plano ativo de cada controlador afetado, mensagens exibidas nos PMVs da região, configurações de câmeras (preset, ângulo, zoom), estado dos detectores, e modo de operação dos nobreaks. Este snapshot é armazenado vinculado ao evento e serve como referência para o rollback automático ao encerramento. O snapshot também inclui o estado do tráfego no momento (níveis de serviço, fluxos nos detectores), permitindo análise posterior do impacto.  
* **Área de influência:** Definição automática ou manual da área geográfica afetada pela emergência. O sistema sugere automaticamente a área de influência com base no tipo e severidade do evento: para sinistro crítico, inclui as interseções adjacentes num raio configurável; para colapso de corredor, inclui todo o corredor e vias paralelas de desvio. O operador pode expandir ou reduzir a área manualmente. Todos os dispositivos dentro da área de influência ficam sob controle do evento e participam da resposta.  
* **Ativação de protocolo:** Uma vez classificado o evento é definida a área de influência, o sistema sugere ou ativa automaticamente o protocolo de resposta mais adequado (ver recurso Protocolos). A ativação pode ser automática (para eventos com classificação clara e protocolo único associado) ou assistida (o sistema sugere 2-3 protocolos e o operador seleciona). O protocolo executa ações coordenadas sobre os dispositivos da área de influência.  
* **Monitoramento em tempo real:** Acompanhamento contínuo do evento ativo com visualização do estado de todos os componentes envolvidos: interseções afetadas e seu estado semafórico atual (normal, modificado, intermitente), PMVs e mensagens sendo exibidas, câmeras posicionadas na área com acesso direto ao streaming, veículos prioritários em operação na área, estado de execução de cada ação do protocolo (pendente, em execução, concluída, com falha), e evolução do tráfego na área (melhoria ou piora). O operador pode intervir a qualquer momento: escalar o protocolo, adicionar interseções, enviar mensagens adicionais, solicitar recursos externos.  
* **Escalonamento:** Capacidade de escalar o evento quando a situação piora: aumentar severidade, expandir área de influência, ativar protocolo mais agressivo, notificar supervisores ou entidades externas. O escalonamento pode ser automático (baseado em indicadores de tráfego que pioram após ativação do protocolo) ou manual (decisão do operador). Cada escalonamento é registrado com timestamp, motivo e responsável.  
* **Rollback e encerramento:** Quando o evento é encerrado (manualmente pelo operador ou automaticamente quando as condições normalizam), o sistema executa o rollback automático: restaura cada dispositivo ao estado capturado no snapshot pré-emergência. A restauração pode ser instantânea (todos os dispositivos simultaneamente) ou gradual (transição progressiva para evitar choque de tráfego), conforme configuração do protocolo. O operador pode optar por não restaurar dispositivos específicos (ex: manter mensagens no PMV por mais tempo). Após o rollback, o evento é fechado e todo o registro fica disponível para análise posterior no Dashboard.  
* **Estados do evento:** Fluxo de estados: Detectado (condição identificada, aguardando confirmação) → Confirmado (operador validou, área de influência definida) → Protocolo Ativo (ações em execução sobre dispositivos) → Em Monitoramento (ações executadas, acompanhando evolução) → Em Rollback (restaurando dispositivos ao estado anterior) → Encerrado (evento fechado, registro completo armazenado). Cada transição registra timestamp, operador responsável e observações.  
* **Traçabilidade completa:** Todo evento mantém registro auditável de: hora de detecção, método de detecção (automático/manual), operador que confirmou, protocolo ativado, cada ação executada com timestamp (modificação de temporização, envio de mensagem, ativação de corredor verde), dispositivos envolvidos e seu estado durante todo o evento, veículos prioritários que operaram na área, escalonamentos realizados, hora de encerramento, execução do rollback, e tempo total de resposta (detecção até normalização).

| Tipo de Evento | Severidade Típica | Detecção | Resposta Típica |
| :---- | :---- | :---- | :---- |
| Sinistro viário | Crítica / Alta | Videoanalítica, sensores, operador, ECU-911 | Corredor verde para emergência, desvio em interseções adjacentes, mensagens PMV |
| Veículo detenido | Alta / Média | Detectores (ocupação prolongada), câmeras | Reconfigurar fases da interseção, mensagem PMV, desvio se necessário |
| Colapso de interseção | Alta | Analítico (LOS degradado), detectores | Reconfigurar temporizações no corredor, desvio por vias paralelas, mensagens PMV |
| Desastre natural | Crítica | Operador, defesa civil, sensores ambientais | Desativar interseções afetadas, corredores de evacuação, mensagens massivas PMV |
| Operativo de segurança | Média / Alta | Operador (pré-agendado ou em tempo real) | Corredor verde para comitiva, restrição de vias, mensagens PMV |
| Evento especial planejado | Média / Baixa | Operador (pré-agendado) | Temporizações especiais, mensagens informativas PMV, desvios programáveis |

## **Protocolos**

Recurso de definição, configuração e execução de sequências de resposta coordenada a eventos emergentes. Um protocolo é um conjunto ordenado de ações que o sistema executa sobre múltiplos dispositivos quando um evento de emergência é ativado. A diferença fundamental entre um protocolo de emergência e um plano de execução genérico reside em três características exclusivas: o protocolo é vinculado a um evento com duração (tem início e fim), possui capacidade de rollback automático (restauração ao estado anterior), e pode ser dinâmico (ajusta ações em tempo real conforme a evolução do evento, como avançar o corredor verde conforme a posição do veículo de emergência). Planos de execução genéricos são sequências estáticas sem conceito de evento nem rollback.

**Funcionalidades**

**Biblioteca de protocolos:** Catálogo de protocolos de resposta pré-configurados, organizados por tipo de evento e severidade. Cada protocolo define: tipo de evento aplicável, severidade mínima para ativação, área de influência padrão (raio, corredor, região), sequência de ações ordenadas, comportamento de rollback (instantâneo ou gradual), e condições de escalonamento. Protocolos podem ser criados, editados, duplicados e versionados pelo administrador.

**Ações sobre controladores:** Modificação de temporizações semafóricas nas interseções da área de influência. Tipos de ação: Corredor verde \-\> criação de faixa verde contínua para veículos de emergência ou evacuação, com ativação progressiva (interseção por interseção conforme o veículo avança) ou simultânea (todo o corredor de uma vez). Reconfigurar fases \-\> alteração de tempos de ciclo, duração de fases e coordenação para despejar rotas críticas, minimizar congestão secundária e facilitar manobras de desvio. Modo intermitente \-\> colocar interseções em modo intermitente quando não é possível operar com segurança (ex: desastre natural que afeta a visibilidade). O protocolo envia comandos ao módulo de Controladores que executa as modificações.

**Ações sobre PMVs:** Envio automático de mensagens informativas aos painéis de mensagem variável na área de influência e em vias de acesso à área. Tipos de mensagem: alerta sobre a emergência ("ACIDENTE — EVITE AV. AMAZONAS"), indicação de rotas alternativas ("DESVIO PELA AV. AMÉRICA"), prevenção de ingresso a zonas bloqueadas ("VIA INTERDITADA ADIANTE"). As mensagens são selecionadas da biblioteca do módulo PMV (4.10) ou criadas especificamente para o protocolo. O envio é ordenado ao módulo PMV, que executa a exibição.

**Ações sobre câmeras:** Reposicionamento automático de câmeras PTZ para focar a área do evento: preset de emergência (posição pré-configurada que oferece a melhor visão do ponto crítico), zoom automático, e ativação de gravação em alta qualidade. As câmeras adjacentes também podem ser reposicionadas para cobrir áreas de desvio. Os comandos são enviados ao módulo de Câmeras.

**Corredor verde dinâmico:** Funcionalidade especializada para priorização de veículos de emergência. Diferente de um corredor verde estático (todas as interseções abertas simultaneamente), o corredor verde dinâmico avança progressivamente conforme o veículo se desloca: o sistema acompanha a posição do veículo (via GPS/transponder, LPR nas câmeras, ou rastreamento manual do operador), ativa a fase verde na próxima interseção com antecedência configurável (ex: 30 segundos antes da chegada estimada), e restaura a interseção anterior após passagem confirmada. Isso minimiza o impacto no tráfego transversal comparado ao corredor estático.

**Condições de rollback:** Cada ação do protocolo tem uma condição de rollback associada que define como o dispositivo retorna ao estado anterior: Instantâneo — retorna ao estado do snapshot imediatamente ao encerrar o evento. Gradual — transição progressiva (ex: temporizações retornam ao normal em 3 ciclos para evitar choque de tráfego). Condicional — rollback depende de condição de tráfego (só restaurar quando o nível de serviço retornar ao aceitável). Manual — operador decide quando restaurar (ex: manter mensagem no PMV por tempo adicional).

**Execução autônoma vs. assistida:** Protocolos podem ser configurados para execução autônoma (todas as ações executadas automaticamente sem intervenção do operador, ideal para eventos críticos que exigem resposta em segundos) ou assistida (o sistema sugere cada ação e aguarda confirmação do operador antes de executar, ideal para eventos ambíguos ou de menor severidade). O modo pode ser configurado por protocolo e pode ser alterado pelo operador durante a execução.

**Simulação e teste:** Capacidade de simular a execução de protocolos sem afetar os dispositivos reais. O administrador pode executar um protocolo em modo simulação que mostra: quais dispositivos seriam afetados, quais ações seriam executadas, tempo estimado de execução, e impacto no tráfego (quando dados históricos estão disponíveis). Permite validar protocolos antes de ativá-los em produção e treinar operadores.

## **Dashboard**

Painel de análise pós-evento e indicadores de desempenho do domínio de emergências. Diferente do Painel de Operações (que mostra a operação em tempo real), este Dashboard foca na análise retrospectiva: efetividade dos protocolos, tempos de resposta, impacto no tráfego, e desempenho das equipes. É a ferramenta do supervisor e do gestor para melhoria contínua da resposta a emergências.

**Funcionalidades**

**Indicadores de volume:** Total de eventos por período (dia, semana, mês, ano). Distribuição por tipo de evento e severidade. Tendência temporal (crescente, estável, decrescente). Mapa de calor geográfico de concentração de emergências.

**Indicadores de resposta:** Tempo médio de detecção (evento real até registro no sistema). Tempo médio de ativação de protocolo (registro até execução da primeira ação). Tempo médio de resolução (detecção até encerramento). Comparação entre eventos automáticos vs. manuais.

**Indicadores de efetividade:** Percentual de protocolos que resolveram o evento sem escalonamento. Impacto no tráfego: comparação do nível de serviço durante o evento vs. cenário sem ação (estimado). Redução de tempo de congestão atribuível à resposta. Protocolos mais utilizados e mais efetivos por tipo de evento.

**Indicadores de veículos prioritários:** Total de ativações de prioridade por período. Distribuição por tipo de veículo e entidade. Tempo médio de percurso em corredor verde. Percentual de priorizações com sucesso vs. falhas. Método de identificação mais utilizado (LPR, transponder, manual).

**Indicadores de rollback:** Tempo médio de restauração pós-evento. Percentual de rollbacks completamente automáticos vs. com intervenção manual. Dispositivos que mais frequentemente requerem rollback manual. Tempo até normalização completa do tráfego após rollback.

**Análise comparativa:** Comparação de eventos similares ao longo do tempo: mesmo local, mesmo tipo, comparar tempos de resposta e efetividade. Identificação de pontos críticos (locais com alta recorrência de emergências). Evolução do desempenho da equipe por período.

# **Exemplo de Uso**

**Cenário**

São 08:15 de segunda-feira, horário de pico matutino. A operadora María Fernanda López está no centro de controle da EPMMOP. Um sinistro viário (colisão entre dois veículos) ocorreu na interseção Av. Amazonas e Av. Naciones Unidas, bloqueando dois dos três lanes no sentido norte-sul. Simultaneamente, uma ambulância do ECU-911 precisa chegar ao local. O cenário demonstra o ciclo completo: detecção, ativação de protocolo, corredor verde dinâmico para a ambulância, monitoramento, e rollback ao estado normal.

**Passo 1: Detecção Automática**

A videoanalítica da câmera CAM-042 detecta veículos parados em posição anormal e o detector DET-019 reporta ocupação prolongada. O sistema cria automaticamente o evento:

| Atributo | Valor |
| :---- | :---- |
| Evento | EMG-2024-00312 |
| Tipo | Sinistro viário |
| Severidade | Alta (via parcialmente bloqueada) |
| Detecção | Automática — Videoanalítica CAM-042 \+ Detector DET-019 |
| Localização | Av. Amazonas / Av. Naciones Unidas |
| Área de influência sugerida | 5 interseções adjacentes \+ corredor Av. Amazonas (3 interseções ao norte e sul) |
| Protocolo sugerido | PROT-SIN-002 — Sinistro em via arterial com bloqueio parcial |

**Passo 2:  Snapshot e Ativação do Protocolo**

María Fernanda confirma o evento e o sistema executa o snapshot e ativa o protocolo:

| Ação | Detalhes |
| :---- | :---- |
| Snapshot capturado | Estado de 11 controladores, 4 PMVs, 3 câmeras, 2 detectores e 1 nobreak na área de influência. Temporizações, mensagens ativas e configurações armazenados. |
| Controladores reconfigurados | CTRL-087 (interseção do sinistro): fase NS reduzida, fase EW estendida para desvio. CTRL-085, CTRL-089: temporizações ajustadas para absorver tráfego desviado. |
| PMVs ativados | PMV-008 e PMV-012 (ao norte): "ACIDENTE AV. AMAZONAS / NACIONES UNIDAS — DESVIO PELA AV. AMÉRICA". PMV-015 (ao sul): "VIA PARCIALMENTE BLOQUEADA ADIANTE — REDUZA VELOCIDADE". |
| Câmeras reposicionadas | CAM-042: zoom no ponto do sinistro. CAM-040, CAM-044: reposicionadas para cobrir vias de desvio. |

**Passo 3: Corredor Verde para Ambulância**

O ECU-911 notifica que a ambulância AMB-ECU-047 está em rota para o sinistro. O sistema identifica o veículo:

| Atributo | Valor |
| :---- | :---- |
| Veículo | AMB-ECU-047 — Ambulância ECU-911 |
| Identificação | Transponder GPS (posição em tempo real) \+ confirmação LPR na CAM-035 |
| Posição atual | Av. Eloy Alfaro / Av. 6 de Diciembre (2,3 km do sinistro) |
| Nível de prioridade | Nível 1 (Máximo) — emergência vital |
| Corredor ativado | Dinâmico — 7 interseções da rota, ativação progressiva 30s antes da chegada estimada |
| Tempo estimado | 4 minutos (rota otimizada pelo sistema) |

O corredor verde dinâmico avança conforme a ambulância se desloca: quando a AMB-ECU-047 passa pela interseção CTRL-102, o sistema já tem a interseção CTRL-099 em verde e está preparando CTRL-095. A interseção CTRL-102, após passagem confirmada, retorna automaticamente ao estado do protocolo de sinistro (não ao estado normal, pois o evento ainda está ativo). A ambulância chega ao local às 08:22 (7 minutos após ativação).

**Passo 4: Monitoramento e Evolução**

María Fernanda monitora o evento no painel:

| Horário | Evento | Ação |
| :---- | :---- | :---- |
| 08:15 | Sinistro detectado | Evento EMG-2024-00312 criado automaticamente |
| 08:16 | Protocolo ativado | Snapshot capturado. 11 controladores \+ 4 PMVs \+ 3 câmeras reconfigurados. |
| 08:17 | Ambulância identificada | Corredor verde dinâmico ativado para AMB-ECU-047 |
| 08:22 | Ambulância no local | Corredor verde encerrado. Interseções retornam ao modo protocolo sinistro. |
| 08:45 | Via desobstruída | Guincho removeu veículos. María Fernanda inicia encerramento. |
| 08:46 | Rollback iniciado | Restauração gradual: temporizações retornam em 3 ciclos, mensagens PMV mantidas por 10 min. |
| 08:52 | Evento encerrado | Todos os dispositivos restaurados. Tráfego normalizado. Registro completo armazenado. |

**Passo 5:  Análise Posterior (Dashboard)**

No dia seguinte, o supervisor consulta o Dashboard de Emergências:

| Indicador | Valor |
| :---- | :---- |
| Tempo de detecção | \< 1 minuto (automático por videoanalítica \+ detector) |
| Tempo de ativação de protocolo | 1 minuto (confirmação da operadora \+ execução automática) |
| Tempo total do evento | 37 minutos (detecção às 08:15 até encerramento às 08:52) |
| Tempo de chegada da ambulância | 7 minutos (com corredor verde dinâmico) vs. 14 minutos estimados (sem prioridade) |
| Dispositivos envolvidos | 11 controladores, 4 PMVs, 3 câmeras, 2 detectores, 1 nobreak |
| Rollback | 100% automático, concluído em 6 minutos (gradual) |
| Escalonamento | Nenhum (protocolo resolveu sem escalar) |
| Recorrência neste local | 3º sinistro em 6 meses na mesma interseção — recomendado análise de segurança viária |

# 

# **Impacto em Outros Módulos**

**Controladores:** Receptor de comandos durante emergências. O módulo de Emergências envia ordens de modificação de temporização, criação de corredor verde e modo intermitente. Controladores executa; Emergências decide e coordena. O rollback restaura o controlador ao estado capturado no snapshot.

**PMV:** Receptor de ordens de envio de mensagens de emergência. Emergências define o conteúdo e os painéis destino; PMV executa a exibição. Mensagens de emergência têm prioridade máxima na pilha de mensagens do painel.

**Câmeras:** Fornece detecção (videoanalítica, LPR para identificação de veículos prioritários) e recebe comandos de reposicionamento durante emergências. O streaming das câmeras é consumido para monitoramento visual do evento.

**Detectores: F**ornece dados de ocupação e fluxo que auxiliam na detecção automática de sinistros (ocupação prolongada anômala) e no monitoramento da evolução do tráfego durante o evento.

**Alarmes:** Fonte de detecção automática. Alarmes críticos classificados como emergentes geram eventos neste módulo. A integração é unidirecional: Alarmes detecta e notifica; Emergências recebe e orquestra a resposta.

**Planos de Execução:** Protocolos de emergência podem disparar planos de execução complementares quando necessário. A diferença: protocolos têm rollback e são dinâmicos; planos são sequências estáticas. Ambos coexistem e se complementam.

**Painel de Operações:** O Painel de Operações consome dados deste módulo para exibir emergências ativas na visão georreferenciada geral. Quando há evento ativo, o Painel destaca a área de influência e o estado dos dispositivos envolvidos.

**Inventário e Manutenção**: Se durante uma emergência um dispositivo apresenta falha (ex: controlador não responde ao comando de reconfigurar), o sistema gera automaticamente uma incidência no módulo 4.11 para tratamento técnico.

**Analítico:** Fornece dados de tráfego (níveis de serviço, fluxos) que auxiliam na detecção de colapsos e no monitoramento do impacto das ações durante o evento. Também consome dados pós-evento para análise de efetividade.

## 

## **4.13. Alarmes**

Tipo: **Dependente**

# **Contexto e Justificativa**

O módulo de Alarmes é responsável pela identificação, gestão e arquivo de todos os eventos anômalos detectados na infraestrutura semafórica. Classificado como dependente, este módulo é o sistema nervoso central de detecção de problemas da plataforma: recebe sinais de todos os módulos funcionais: controladores, câmeras, detectores, PMVs, nobreaks e demais dispositivos IoT e os transforma em alarmes estruturados com nível de criticidade, tipo, localização e contexto operacional.

O paradigma fundamental deste módulo é garantir que nenhum evento anômalo passe despercebido e que os operadores do centro de controle tenham consciência situacional completa em tempo real. Para isso, o módulo implementa múltiplos mecanismos de notificação: sonoros, visuais e de confirmação obrigatória. Alarmes críticos exigem confirmação explícita do operador através de uma janela dedicada em primeiro plano, assegurando que o operador tomou conhecimento do evento antes de prosseguir com qualquer outra atividade.

O módulo mantém um catálogo configurável de tipos de alarme organizado em três categorias definidas como mínimas: alarmes de funcionamento do sistema semafórico (falhas operativas e de sincronização), alarmes de segurança viária e operação em campo (riscos a condutores e pedestres), e alarmes de prioridade e mobilidade (veículos de emergência e transporte público). Novas categorias e tipos podem ser adicionados pelo administrador conforme a operação evolui.

A integração com o módulo de Inventário e Manutenção é bidirecional e constitui o principal fluxo operacional: alarmes persistentes ou críticos geram automaticamente incidências no módulo de inventário, que por sua vez gera ordens de serviço via auto-regras. Quando a incidência é resolvida e a OS fechada, o alarme correspondente neste módulo é atualizado para refletir a resolução. Essa integração garante rastreabilidade completa desde a detecção até a resolução.

Adicionalmente, o módulo integra-se com o módulo de planos de execução, permitindo que determinados alarmes disparem automaticamente sequências de resposta pré-configuradas (ex: alarme de congestionamento severo dispara plano de desvio com alteração de temporização e envio de mensagens nos PMVs).

# **Recursos**

## **Alarmes**

Recurso central de detecção, notificação e gestão em tempo real de todos os eventos anômalos da infraestrutura semafórica. Um alarme é um evento estruturado que indica uma condição anormal num dispositivo, subsistema ou processo operacional que requer atenção do operador ou ação automática do sistema. O recurso garante que nenhum evento crítico passe despercebido, implementando múltiplos níveis de notificação conforme a severidade.

**Funcionalidades**

* **Detecção e geração de alarmes:** Recepção contínua de eventos de todos os módulos funcionais da plataforma: controladores (perda de comunicação, modo intermitente, falha de alimentação, desfase de plano, reinicio inesperado, mudança não autorizada de parâmetros), câmeras (offline, falha de streaming), detectores (leituras anômalas, fora de serviço), PMVs (falha de exibição, perda de comunicação), nobreaks (modo batería, falha de alimentação), e dispositivos IoT (desconexão). Cada evento é transformado num alarme estruturado com: identificador único, timestamp, tipo, categoria, dispositivo de origem, localização, nível de criticidade e descrição.  
* **Níveis de criticidade:** Classificação hierárquica de alarmes em quatro níveis: Crítico (risco imediato à segurança viária ou perda total de controle — ex: condição de conflito vermelho/verde simultâneo, falha total de controlador), Alto (impacto operacional significativo — ex: modo intermitente não programado, falha de alimentação principal), Médio (degradação de serviço — ex: desfase de plano semafórico, sensor fora de serviço), Baixo (evento informativo que requer atenção não urgente — ex: tempo de espera excessivo em fase, prioridade não reconhecida). A criticidade determina o tipo de notificação, o SLA de resposta e as ações automáticas.  
* **Notificação sonora configurável:** Configuração de alertas acústicos diferenciados por tipo de alarme e localização do equipamento, permitindo ao operador identificar a natureza do problema apenas pelo som. Sons configuráveis por: nível de criticidade, tipo de dispositivo (controlador, câmera, nobreak), e localização (corredor, região). O administrador pode personalizar os sons e regras de reprodução (repetição, volume, duração).  
* **Janela de confirmação obrigatória:** Alarmes críticos são notificados através de uma janela dedicada que se apresenta em primeiro plano na interface do operador, bloqueando a interação com outras funcionalidades até que o operador confirme o alarme. A confirmação registra: operador, timestamp de confirmação, tempo de resposta (diferença entre geração e confirmação), e observação opcional. Este mecanismo assegura que eventos críticos para a segurança viária nunca passem despercebidos.  
* **Painel de alarmes em tempo real:** Visão consolidada de todos os alarmes ativos, apresentados por defeito em ordem decrescente de prioridade. O painel permite: visualização em lista e em mapa (geoposicionado), indicadores visuais por cor (vermelho para crítico, laranja para alto, amarelo para médio, azul para baixo), contadores por nível de criticidade, e atualização automática em tempo real sem necessidade de recarregar.  
* **Filtrado avançado:** Capacidade de filtrar alarmes por múltiplos critérios combinaveis: nível de criticidade, tipo de dispositivo (controlador, câmera, detector, nobreak, PMV), equipamento concreto (por identificador), localização geográfica ou lógica (interseção, corredor, região), operador responsável, estado (ativo, confirmado, em tratamento, resolvido), e período temporal. Os filtros podem ser salvos como perfis reutilizáveis.  
* **Organização e ordenação:** Alarmes podem ser organizados por diferentes critérios: tipo de equipamento, data de detecção, nível de criticidade, localização (geográfica ou lógica), e operador. A ordenação padrão é decrescente por prioridade (crítico primeiro), mas o operador pode alterar conforme necessidade operacional.  
* **Catálogo de alarmes:** Repositório configurável de tipos de alarme organizado em três categorias mínimas: Alarmes de Funcionamento do Sistema Semafórico (falha total de controlador, falha de alimentação, desfase de plano, modo intermitente não programado, erro de comunicação, mudança não autorizada, reinicio inesperado, desconexão IoT), Alarmes de Segurança Viária (condição de conflito vermelho/verde, falha em luzes de pedestres, sensor de cruzamento fora de serviço, tempo de espera excessivo, múltiplas chamadas de prioridade simultâneas), e Alarmes de Prioridade e Mobilidade (erro de execução de preemption, prioridade não reconhecida ou duplicada, atraso em mudança por prioridade). Novas categorias e tipos podem ser adicionados pelo administrador.  
* **Estados do alarme:** Fluxo de estados: Ativo (recém-gerado, aguardando atenção) → Confirmado (operador tomou conhecimento) → Em Tratamento (incidência gerada no módulo 4.11 ou ação em curso) → Resolvido (causa identificada e corrigida) → Fechado (registro finalizado). Alarmes podem retornar ao estado Ativo se a condição recorrer após resolução.  
* **Integração com Incidências:** Alarmes persistentes (que permanecem ativos além de um tempo configurável) ou alarmes críticos geram automaticamente incidências no módulo de Inventário e Manutenção. A integração é bidirecional: o alarme mantém referência à incidência gerada e à OS resultante; quando a incidência é resolvida, o alarme é automaticamente atualizado para Resolvido.  
* **Integração com Planos de Execução:** Determinados tipos de alarme podem disparar automaticamente planos de execução pré-configurados. Exemplo: alarme de congestionamento severo num corredor dispara plano de desvio (alteração de temporização nos controladores afetados \+ envio de mensagens de desvio nos PMVs). A associação entre tipo de alarme e plano de execução é configurável pelo administrador.  
* **Supressão e agrupamento:** Mecanismos para evitar sobrecarga de alarmes: supressão temporal (se o mesmo alarme ocorre repetidamente no mesmo dispositivo dentro de um período configurável, não gera novas notificações mas incrementa contador), e agrupamento por localização (múltiplos alarmes na mesma interseção são agrupados visualmente, facilitando a correlação de incidências no módulo 4.11).

**Catálogo mínimo de alarmes:**

| Categoria | Alarme | Criticidade |
| :---- | :---- | :---- |
| Funcionamento | Falha total de controlador semafórico (sem sinal, sem resposta) | Crítico |
| Funcionamento | Falha de alimentação elétrica (principal ou respaldo/UPS) | Alto |
| Funcionamento | Desfase no plano semafórico respecto ao horário programado | Médio |
| Funcionamento | Modo intermitente não programado (fail-safe) | Alto |
| Funcionamento | Erro de comunicação com o centro de controle | Alto |
| Funcionamento | Mudança não autorizada em parâmetros do controlador | Crítico |
| Funcionamento | Reinicio inesperado do controlador | Médio |
| Funcionamento | Desconexão de dispositivos IoT (sensores, câmeras, etc.) | Médio |
| Segurança Viária | Semáforo em vermelho e verde simultaneamente (condição de conflito) | Crítico |
| Segurança Viária | Falha em luzes de pedestres durante cruzamento habilitado | Crítico |
| Segurança Viária | Sensores de cruzamento pedestre ou veicular fora de serviço | Médio |
| Segurança Viária | Tempo de espera excessivo para alguma fase | Baixo |
| Segurança Viária | Múltiplas chamadas de prioridade (emergência) simultâneas | Alto |
| Prioridade e Mobilidade | Erro na execução de prioridade semafórica (preemption) | Alto |
| Prioridade e Mobilidade | Prioridade não reconhecida ou ativação duplicada | Médio |
| Prioridade e Mobilidade | Atraso na execução de mudança por prioridade | Médio |

## **Arquivo**

Recurso de armazenamento estruturado, consulta avançada e análise de todos os alarmes gerados pelo sistema ao longo do tempo. O Arquivo não é apenas um histórico passivo: é um repositório auditável que mantém o registro completo do ciclo de vida de cada alarme (geração, confirmação, tratamento, resolução), permitindo análises de tendência, recorrência e desempenho operacional. É a fonte primária de dados para auditorias, relatórios de gestão e melhoria contínua da operação semafórica.

**Funcionalidades**

* **Registro completo do ciclo de vida:** Cada alarme arquivado mantém o registro de: timestamp de geração, tipo e categoria, dispositivo de origem (com tipo e identificador), localização, nível de criticidade, operador que confirmou, timestamp de confirmação, tempo de resposta (entre geração e confirmação), ações tomadas (incidência gerada, plano de execução disparado), timestamp de resolução, causa raíz identificada (quando aplicável), e tempo total de vida (geração até fechamento).  
* **Consulta avançada:** Motor de consulta com filtros combinados por qualquer atributo do alarme: período temporal (data/hora início e fim), tipo de dispositivo, equipamento específico, localização, categoria, criticidade, operador, estado final, tempo de resposta (maior/menor que), e causa raíz. Suporta consultas salvas e favoritas para acesso rápido a consultas frequentes.  
* **Análise de recorrência:** Identificação automática de alarmes recorrentes: ativos que geram alarmes com frequência acima do normal, tipos de alarme com incidência crescente, e localizações com concentração anômala de eventos. A análise alimenta decisões de manutenção preventiva no módulo 4.11 e identifica equipamentos que necessitam substituição.  
* **Análise de tendência:** Visualização de tendências temporais: evolução do volume de alarmes por período (hora, dia, semana, mês), distribuição por tipo e criticidade ao longo do tempo, sazonalidade (horários de pico, dias da semana, eventos climáticos), e correlação com eventos externos (cortes de energia, obras, eventos especiais).  
* **Retenção temporal configurável:** Políticas de retenção de dados configuráveis por criticidade: alarmes críticos e altos retidos permanentemente (registro histórico completo), alarmes médios e baixos retidos por período configurável (padrão: 2 anos). Após o período de retenção, dados podem ser compactados (mantém estatísticas agregadas) ou exportados para armazenamento externo.  
* **Exportação:** Capacidade de exportar dados do arquivo em múltiplos formatos: CSV, Excel, PDF (relatório formatado). A exportação respeita os filtros aplicados, permitindo exportar subconjuntos específicos. Suporta exportações programadas (automáticas periódicas) para integração com sistemas externos.  
* **Auditoria:** Registro imutável de todas as ações sobre alarmes: quem confirmou, quando, que ações foram tomadas, se houve reclassificação. O registro de auditoria não pode ser editado ou excluído, garantindo integridade para fins de responsabilidade operacional e auditorias externas.

## **Dashboard**

Painel visual com indicadores-chave do domínio de alarmes, oferecendo visão consolidada da saúde da infraestrutura, da eficiência da resposta operacional e das tendências de eventos anômalos em todo o parque semafórico.

**Funcionalidades**

* **Indicadores de estado atual:** Total de alarmes ativos por nível de criticidade (crítico, alto, médio, baixo). Alarmes aguardando confirmação. Alarmes em tratamento. Mapa geoposicionado com alarmes ativos representados por cores de criticidade.  
* **Indicadores de resposta:** Tempo médio de confirmação por nível de criticidade. Percentual de alarmes críticos confirmados dentro do SLA. Tempo médio de resolução (geração até fechamento). Ranking de operadores por tempo de resposta.  
* **Indicadores por tipo de dispositivo:** Distribuição de alarmes por tipo de dispositivo (controladores, câmeras, detectores, nobreaks, PMVs). Taxa de alarmes por 100 dispositivos de cada tipo. Tipo de dispositivo com maior incidência.  
* **Indicadores de tendência:** Volume de alarmes por período (hoje vs. média histórica). Evolução semanal/mensal. Distribuição horária (identificação de picos). Comparação entre categorias (funcionamento vs. segurança viária vs. prioridade).  
* **Indicadores de recorrência:** Top 10 ativos com mais alarmes recorrentes. Top 10 interseções com maior concentração de alarmes. Alarmes que geraram incidências vs. alarmes resolvidos sem incidência. Mapa de calor de alarmes por localização.  
* **Indicadores de integração:** Percentual de alarmes que geraram incidência no módulo 4.11. Percentual de incidências geradas por alarme que foram resolvidas via auto-regra (sem triagem manual). Planos de execução disparados por alarmes no período.

# **Exemplo de Uso**

**Cenário**

São 17:45 de quarta-feira, horário de pico vespertino. O operador Diego Ramírez está no centro de controle da EPMMOP. Três eventos ocorrem em sequência rápida: um controlador entra em modo intermitente não programado numa interseção crítica, uma condição de conflito (vermelho e verde simultâneo) é detectada em outra interseção, e um veículo de emergência solicita prioridade num corredor com falha. O cenário demonstra como o módulo gerencia múltiplos alarmes de diferentes categorias simultaneamente.

**Passo 1: Detecção e Notificação**

O sistema detecta e gera três alarmes em sequência:

| Alarme | Categoria | Dispositivo | Criticidade | Notificação |
| :---- | :---- | :---- | :---- | :---- |
| ALM-2024-08901 | Funcionamento | CTRL-142 — Av. Patria / 6 de Diciembre | Alto | Som acústico diferenciado (controlador) \+ destaque visual laranja |
| ALM-2024-08902 | Segurança Viária | CTRL-067 — Av. Eloy Alfaro / Av. Granados | Crítico | Janela de confirmação obrigatória \+ som crítico \+ destaque vermelho |
| ALM-2024-08903 | Prioridade | CTRL-098 — Corredor Av. América (preemption) | Alto | Som acústico diferenciado (prioridade) \+ destaque visual laranja |

**Passo 2: Confirmação do Alarme Crítico**

O alarme ALM-2024-08902 (condição de conflito) apresenta janela de confirmação obrigatória em primeiro plano. Diego não pode interagir com nenhuma outra funcionalidade até confirmar. Ao ler a informação, confirma o alarme:

| Atributo | Valor |
| :---- | :---- |
| Alarme | ALM-2024-08902 — Condição de conflito (vermelho/verde simultâneo) |
| Operador | Diego Ramírez |
| Tempo de resposta | 12 segundos (SLA crítico: \< 30 segundos) |
| Observação | Confirmo o alarme crítico. Verificando o estado do controlador. |
| Ação automática | Incidência INC-2024-01890 gerada automaticamente no Módulo 4.11 (severidade crítica) |

**Passo 3: Tratamento dos Alarmes Altos**

Diego confirma os alarmes ALM-2024-08901 e ALM-2024-08903. O sistema processa ambos através das integrações configuradas:

| Alarme | Ação Automática | Resultado |
| :---- | :---- | :---- |
| ALM-2024-08901 (modo intermitente) | Incidência gerada no Módulo 4.11. Auto-regra: OS corretiva urgente atribuída a técnico. | INC-2024-01891 → OS-2024-02103. Técnico Carlos Mendoza despachado. |
| ALM-2024-08903 (falha preemption) | Plano de Execução disparado: rota alternativa para o veículo de emergência. Incidência gerada. | Plano PE-EM-005 ativado. Temporização manual aplicada no corredor. INC-2024-01892 gerada. |

**Passo 4: Monitoramento e Resolução**

Diego acompanha o estado dos alarmes no painel em tempo real:

| Alarme | Estado | Evolução |
| :---- | :---- | :---- |
| ALM-2024-08902 (conflito) | Em Tratamento | OS-2024-02104 gerada via auto-regra. Técnico despachado. Controlador colocado em modo intermitente seguro até resolução. |
| ALM-2024-08901 (intermitente) | Resolvido | Carlos Mendoza resolveu às 18:30. Causa: módulo de potência com mau contato. Substituído. Alarme fechado automaticamente. |
| ALM-2024-08903 (preemption) | Resolvido | Veículo de emergência completou rota alternativa. Plano de execução encerrado. Incidência registrada para análise posterior da falha de preemption. |

**Passo 5: Consulta ao Arquivo**

Na manhã seguinte, a supervisora Ana Torres consulta o Arquivo para análise do turno vespertino:

| Consulta | Resultado |
| :---- | :---- |
| Alarmes críticos ontem 17:00-18:00 | 1 alarme (condição de conflito CTRL-067). Tempo de resposta: 12s. Resolvido em 2h15. |
| Recorrência CTRL-067 (últimos 6 meses) | 3 alarmes relacionados. Tendência crescente. Recomendação: incluir em próxima manutenção preventiva. |
| Falhas de preemption no mês | 7 ocorrências em 4 controladores diferentes. Corredor Av.  América concentra 57%. |

# **Impacto em Outros Módulos**

* **Inventário e Manutenção:** Principal consumidor de alarmes. Alarmes persistentes ou críticos geram automaticamente incidências que, via auto-regras do módulo, resultam em ordens de serviço. Integração bidirecional: resolução de incidência atualiza o estado do alarme.  
* **Controladores:** Fonte primária de alarmes de funcionamento: perda de comunicação, modo intermitente, falha de temporização, mudança não autorizada, condições de conflito. O módulo de Controladores envia eventos; o módulo de Alarmes os transforma em alarmes estruturados.  
* **PMV:** Alarmes de falha de exibição, perda de comunicação e vandalismo são gerados a partir de eventos do módulo PMV.  
* **Câmeras e Detectores:** Alarmes de câmeras offline, falha de streaming, detectores com leituras anômalas ou fora de serviço são gerados a partir de eventos destes módulos.  
* **Planos de Execução:** Determinados alarmes disparam automaticamente planos de execução pré-configurados (sequências de resposta a eventos). O módulo de Alarmes é o gatilho; Planos de Execução orquestra as ações.  
* **Analítico:** Alarmes de tráfego (congestionamento severo, níveis de serviço degradados) podem ser gerados a partir de análises do módulo Analítico, ampliando o escopo além de falhas de hardware.  
* **Relatórios:** O Arquivo fornece dados históricos de alarmes para o módulo de Relatórios: relatórios de desempenho operacional, tempo de resposta, recorrência e tendências.

## **4.14. Simulação**

Tipo: **Dependente**

# **Contexto e Justificativa**

O módulo de Simulação de Tráfego permite avaliar, validar e otimizar estratégias de controle semafórico antes da sua implementação em campo, através da integração com ferramentas de **microsimulação** e **macrosimulação** de tráfego. Classificado como dependente, este módulo consome dados do modelo de tráfego (topologia da rede, interseções, rotas, estratégias), dos Controladores (planos semafóricos, temporizações, fases), dos detectores (dados de fluxo em tempo real) e do módulo **analítico** (dados históricos, métricas de desempenho) para alimentar as simulações.

A arquitetura fundamental deste módulo segue o princípio de separação de responsabilidades: a plataforma attlas é a fonte de verdade do modelo de tráfego (topologia, temporizações, dados de fluxo) e o motor de simulação SUMO (Simulation of Urban Mobility) é o motor de cálculo externo que processa as simulações. Attlas não simula: Attlas exporta cenários estruturados, orquestra a execução e consome os resultados. Esta separação garante que, caso seja necessário substituir o motor de simulação no futuro, apenas o adaptador de exportação/importação precisa ser modificado, sem impactar a lógica do módulo.

A integração entre Attlas e SUMO é realizada através de arquivos estruturados em formatos XML e JSON. O SUMO opera nativamente com XML para definição de redes (.net.xml), rotas e demanda (.rou.xml), controladores semafóricos (.add.xml) e detectores (.det.xml). Attlas traduz automaticamente seu modelo de tráfego para estes formatos, permitindo que toda a informação já existente na plataforma — interseções com geometria e movimentos, planos semafóricos com fases e temporizações, dados de fluxo dos detectores, defasagens de coordenação — seja utilizada diretamente como entrada para a simulação. Adicionalmente, um formato JSON intermediário é utilizado para metadados, configurações de cenário e resultados que não mapeiam diretamente aos formatos nativos SUMO.

O módulo atende três necessidades operacionais distintas: preprodução (validar uma nova configuração semafórica antes de implementá-la em campo, reduzindo o risco de impactos negativos no tráfego real), análise de cenários (avaliar o impacto de eventos especiais, obras, desvios, mudanças de infraestrutura ou políticas públicas) e análise preditiva (projetar cenários futuros de demanda utilizando modelos baseados em dados históricos).

A solução utiliza SUMO como motor de simulação, que é uma plataforma de simulação de tráfego de código aberto mantida pelo Instituto de Sistemas de Transporte do Centro Aeroespacial Alemão (DLR), amplamente utilizada em projetos de engenharia de tráfego ao redor do mundo. SUMO suporta microsimulação (interações veiculares individuais, lógicas de controle semafórico, prioridade de transporte público) e, através de ferramentas complementares como MAROUTER, macrosimulação (matrizes origem-destino, redes viárias completas, cenários de demanda futura). O módulo debe  disponibilizar quatro (4) instâncias de simulação: uma (1) dedicada a macrosimulação e três (3) dedicadas a microsimulação, permitindo execução paralela de múltiplos cenários.

# **Recursos**

## **Cenários**

Recurso de definição, configuração e gestão dos cenários de simulação. Um cenário é uma configuração completa que descreve as condições a serem simuladas: qual porção da rede, com que temporizações, sob que demanda de tráfego e com que modificações em relação ao estado atual. O cenário é o contrato de entrada para a simulação: ele encapsula tudo que o motor SUMO precisa para executar, sem que o usuario precise conhecer os formatos nativos do simulador.

**Funcionalidades**

* **Criação de cenário base (snapshot):** Captura automática do estado atual da rede a partir dos dados da plataforma Attlas. O sistema extrai: topologia do Modelo de Tráfego (interseções com geometria, número de aproximações, faixas, movimentos permitidos; vias com classificação funcional e velocidade regulamentar; rotas com sequência de interseções e parâmetros de progressão), planos semafóricos ativos dos Controladores (fases, tempos de ciclo, distribuição de verde, defasagens de coordenação), dados de fluxo reais dos Detectores (volumes por aproximação, ocupação, velocidades) e configuração de pontos de medição. O cenário base representa o estado "como está hoje" e serve de baseline para comparação com cenários modificados.  
* **Criação de cenário modificado:** A partir de um cenário base, o engenheiro de tráfego aplica modificações para responder à pergunta "o que aconteceria se...?". Modificações suportadas: alterar temporização de interseções específicas (tempos de ciclo, distribuição de verde, fases), modificar defasagens de coordenação ao longo de uma rota (onda verde), aplicar nova estratégia de controle a uma subárea/área, simular fechamento parcial ou total de via (obras, eventos), simular alteração de demanda (evento especial, horário atípico), adicionar ou remover interseções do escopo, alterar matrizes origem-destino, e simular prioridade de transporte público em corredores específicos.  
* **Tipos de simulação:** Cada cenário é classificado conforme o tipo de simulação a executar. Microsimulação: modela interações entre veículos individuais (seguimento, adelantamento, mudança de faixa), lógicas de controle semafórico (fixas, atuadas, adaptativas), avaliação de planos semafóricos, tempos de espera, níveis de serviço e impactos de obras, desvios ou mudanças operativas. Macrosimulação: modela redes viárias e de transporte público em escala ampla, calcula matrizes origem-destino (OD), avalia cenários futuros de demanda, mudanças em infraestrutura ou políticas públicas, e realiza estudos de mobilidade urbana sustentável.  
* **Escopo geográfico:** O cenário define qual porção da rede será simulada.  
* **Escopos suportados:** Interseção isolada (para validação de um plano semafórico específico), corredor/rota (para avaliação de coordenação e onda verde), subárea (para análise de uma região específica), área (para avaliação de controle zonal), ou rede completa (para macrosimulação e estudos de mobilidade). O sistema extrai automaticamente todos os elementos topológicos e dispositivos dentro do escopo selecionado, incluindo dependências (se uma rota é selecionada, todas as interseções da rota são incluídas automaticamente).  
* **Fontes de dados de demanda:** O cenário permite configurar a origem dos dados de demanda de tráfego a partir de três fontes: dados reais dos detectores (período selecionável: última hora, último dia, última semana, período personalizado), dados históricos do módulo Analítico (média de um período, dia típico por dia da semana, perfil horário típico), ou dados manuais inseridos pelo engenheiro (volumes por aproximação, matrizes OD, distribuições temporais personalizadas). As fontes podem ser combinadas: ex. dados reais para interseções com detector e dados históricos para interseções sem detector.  
* **Preprocessamento e normalização:** Antes de exportar para simulação, o sistema aplica automaticamente: limpeza de dados (eliminação de valores atípicos e correção de inconsistências nos dados dos detectores), transformação de dados (conversão de unidades, escalamento e normalização para o formato esperado pelo simulador), segmentação do tráfego (classificação por tipo de veículo quando disponível, faixas horárias e padrões de congestionamento). O engenheiro pode revisar e ajustar o resultado do preprocessamento antes de prosseguir.  
* **Versionamento de cenários:** Cenários são versionados e rastreados. O usuario pode duplicar um cenário existente, criar variantes (ex: "Pico AM v1", "Pico AM v2 com onda verde", "Pico AM v3 com prioridade BRT"), comparar versões e manter histórico completo. Cada versão registra: autor, data de criação, modificações aplicadas em relação ao cenário base, e simulações executadas a partir dela.  
* **Validação pré-exportação:** Antes de exportar para SUMO, o sistema executa validação automática: completude da topologia (todas as interseções do escopo possuem geometria e movimentos definidos), coerência de temporização (conflitos entre fases, tempos de entreverdes insuficientes), dados de demanda suficientes (todas as aproximações possuem dados de fluxo ou matrizes OD), consistência do escopo (se é uma rota, todas as interseções estão incluídas; se é uma subárea, as interseções de contorno possuem dados de acesso). O sistema apresenta relatório de validação com erros (impeditivos) e alertas (não impeditivos).

## **Simulações**

Recurso que orquestra o ciclo completo de vida da simulação: exportação do cenário para formatos nativos SUMO, execução do motor de simulação externo, monitoramento de progresso e importação de resultados. A simulação ocorre fora da plataforma Attlas (processo externo SUMO), e o módulo gerencia toda a orquestração sem que o engenheiro precise interagir diretamente com o simulador.

**Funcionalidades**

* **Exportação para SUMO:** Tradução automática do cenário Attlas para os formatos nativos do simulador SUMO. O sistema gera os seguintes arquivos a partir dos dados da plataforma:

| Dado em Attlas | Formato SUMO | Conteúdo Exportado |
| :---- | :---- | :---- |
| Topologia do Modelo de Tráfego (interseções, vias, geometria, faixas, movimentos) | .net.xml (rede) | Nós (interseções com coordenadas e tipo), arestas (vias com nº de faixas, velocidade, comprimento), conexões (movimentos permitidos entre faixas) |
| Planos semafóricos dos Controladores (fases, tempos de ciclo, distribuição de verde, defasagens) | .add.xml (semáforos) | Programas semafóricos por interseção (fases com duração, sequência, tempos de entreverdes), offsets de coordenação |
| Dados de fluxo dos Detectores / Matrizes OD | .rou.xml (demanda) | Rotas de veículos com distribuição temporal, volumes por O-D, tipos de veículos |
| Pontos de Medição | .det.xml (detectores) | Detectores virtuais posicionados nas mesmas localizações dos reais, para permitir comparação de resultados |
| Configuração geral da simulação | .sumocfg | Período simulado, passo de simulação, arquivos de entrada, parâmetros de saída |
| Metadados do cenário, configurações que não mapeiam diretamente aos formatos SUMO | .json | Identificação do cenário, versão, autor, modificações aplicadas, parâmetros de análise |

* **Execução e monitoramento:** Lançamento da simulação no motor SUMO como processo externo. O módulo monitora em tempo real: estado da simulação (em fila, em execução, concluída, com erro), progresso (percentual de tempo simulado), tempo estimado de conclusão e uso de recursos computacionais. O sistema suporta execução paralela de múltiplas simulações simultâneas (até 3 microsimulações e 1 macrosimulação em paralelo), permitindo comparar variantes de cenário simultaneamente. Em caso de erro, o sistema registra logs detalhados e permite reexecução.  
* **Importação de resultados:** Após a conclusão da simulação, o módulo importa automaticamente os resultados gerados pelo SUMO e os parseia para armazenamento estruturado na plataforma. Os resultados importados incluem:

| Nível de Agregação | Métricas Importadas |
| :---- | :---- |
| Por interseção | Atraso médio por aproximação, tempo médio de espera, comprimento máximo e médio de fila, nível de serviço (LOS) por movimento, número de paradas, taxa de saturação por fase |
| Por corredor/rota | Tempo de percurso ponta a ponta, velocidade média, número médio de paradas, tempo perdido em filas, índice de coordenação (percentual de veículos que percorrem o corredor sem parar) |
| Por detector virtual | Fluxo simulado vs. real (quando baseline), velocidade média, ocupação, headway médio |
| Por rede (global) | Total de veículos completados, tempo médio de viagem, velocidade média da rede, atraso total acumulado, emissões estimadas (CO2, NOx, PM quando configurado), consumo energético estimado |

**Pré-produção (validação pré-campo):** Fluxo específico para validar uma nova estratégia ou plano semafórico antes da implementação em campo. O usuário: (1) cria cenário base com estado atual, (2) cria cenário modificado com a nova configuração, (3) executa ambas as simulações, (4) compara resultados (nova config vs. atual) no Dashboard, (5) se o resultado é favorável, o sistema permite aplicar a configuração validada diretamente aos controladores via módulo de Controladores/Estratégias do Modelo de Tráfego. O sistema registra que a estratégia foi "validada por simulação" com link para a simulação correspondente, garantindo rastreabilidade completa.

**Gestão de instâncias SUMO:** Administração das quatro instâncias de simulação disponíveis: 1 instância dedicada a macrosimulação e 3 instâncias dedicadas a microsimulação. O sistema gerencia a fila de simulações pendentes, distribui execuções entre instâncias disponíveis, monitora o estado de cada instância e notifica o engenheiro quando uma simulação conclui ou falha.

**Histórico de simulações:** Registro completo de todas as simulações executadas: cenário utilizado (com versão), parâmetros de execução, data e hora de início e conclusão, duração da simulação (tempo computacional), instância SUMO utilizada, resultado (sucesso/erro), operador responsável, e link para os resultados armazenados. O histórico permite reexecutar simulações anteriores e comparar resultados ao longo do tempo.

## **Dashboard**

Painel de análise, visualização e comparação de resultados de simulação, permitindo ao engenheiro de tráfego avaliar o impacto de modificações, validar estratégias e tomar decisões baseadas em dados simulados.

**Funcionalidades**

* **Comparação cenário base vs. modificado:** Visualização lado a lado dos KPIs de duas simulações (tipicamente base vs. proposta). Para cada métrica (atraso médio, LOS, tempo de percurso, comprimento de fila, número de paradas), o sistema calcula a diferença absoluta e percentual, destacando melhorias em verde e pioras em vermelho. O usuario visualiza rapidamente se a modificação proposta produz resultado positivo ou negativo em cada interseção e corredor.  
* **Comparação múltipla:** Tabela e gráficos comparativos de N simulações para o mesmo escopo geográfico. Permite ao engenheiro comparar múltiplas variantes de cenário (ex: "Pico AM v1" vs. "v2 com onda verde" vs. "v3 com prioridade BRT") para identificar a melhor alternativa. Ranking automático por KPI selecionado (ex: ordenar por menor atraso médio, melhor LOS, menor tempo de percurso).  
* **Visualização geográfica de resultados:** Resultados projetados sobre o mapa da rede viária, permitindo análise espacial: interseções coloridas por LOS simulado (A-F), corredores com tempo de percurso simulado, filas representadas graficamente nas aproximações, fluxos simulados com setas proporcionais ao volume. O usuario pode alternar entre resultado da simulação base e da modificada para "ver" espacialmente o impacto da mudança.  
* **Avaliação de precisão:** Comparação dos resultados simulados com dados reais coletados após a implementação de uma estratégia validada por simulação. O sistema correlaciona: métricas simuladas vs. métricas reais (atraso, LOS, tempos de percurso) para calcular a precisão do modelo de simulação. Este feedback permite calibrar progressivamente os parâmetros do simulador e melhorar a acurácia das simulações futuras.  
* **Relatórios de simulação:** Exportação dos resultados em formatos estruturados (PDF, CSV, Excel) para documentação e tomada de decisão. Cada relatório inclui: descrição do cenário, modificações aplicadas, parâmetros de simulação, resultados por interseção/corredor/rede, comparação com baseline, e conclusão/recomendação do engenheiro.  
* **Indicadores operacionais:** Métricas de uso e efetividade do módulo: volume de simulações executadas por período, taxa de utilização das instâncias SUMO, tempo médio de simulação por tipo e escopo, taxa de validação pré-campo (percentual de estratégias que foram simuladas antes de implementar), precisão média das simulações (resultado simulado vs. real), e cenários mais simulados (interseções e corredores com maior volume de simulação).

# **Exemplo de Uso**

**Cenário**

O engenheiro de tráfego Ricardo Espinoza recebeu a solicitação de otimizar a coordenação semafórica (onda verde) do corredor Av. 10 de Agosto no sentido norte-sul durante o pico matutino (07:00–09:00). O corredor possui 12 interseções semaforizadas. A estratégia atual apresenta tempos de percurso elevados e recorrências de filas na interseção CTRL-045 (Av. 10 de Agosto / Av. Colón). Ricardo utilizará o módulo de Simulação para avaliar uma nova proposta de defasagens antes de implementá-la em campo.

**Passo 1: Criação do Cenário Base**

Ricardo cria um cenário base para o corredor:

| Parâmetro | Configuração |
| :---- | :---- |
| Tipo | Microsimulação |
| Escopo | Rota "Corredor Av. 10 de Agosto N-S" — 12 interseções |
| Fonte de demanda | Dados reais dos detectores — média das últimas 4 terças-feiras (07:00-09:00) |
| Temporização | Planos ativos atuais (capturados automaticamente dos Controladores) |
| Preprocessamento | Limpeza de dados: 2 leituras atípicas removidas do DET-034. Validação: 100% OK. |
| Identificação | CEN-2024-00187 "Av. 10 Agosto Pico AM — Baseline" |

**Passo 2: Criação do Cenário Modificado**

Ricardo duplica o cenário base e aplica modificações:

| Modificação | Detalhe |
| :---- | :---- |
| Defasagens | Recalculadas para velocidade de progressão de 40 km/h (atual: 35 km/h). Offsets de 8 interseções alterados. |
| Distribuição de verde CTRL-045 | Fase N-S: 38s → 45s. Fase E-W: 32s → 25s. Ciclo mantido em 90s. |
| Coordenação | Bandwidth ampliado na direção N-S priorizando fluxo do pico. |
| Identificação | CEN-2024-00188 "Av. 10 Agosto Pico AM — Proposta Onda Verde v1" |

**Passo 3: Exportação e Execução**

Ricardo executa ambas as simulações:

| Evento | Detalhes |
| :---- | :---- |
| Exportação CEN-00187 (base) | Gerados: corredor\_10agosto.net.xml (12 nós, 24 arestas), semaforos\_baseline.add.xml (12 programas), demanda\_pico\_am.rou.xml (14.300 veículos/2h), detectores.det.xml (18 detectores), config.sumocfg |
| Exportação CEN-00188 (proposta) | Mesma rede e demanda. Diferente: semaforos\_proposta\_v1.add.xml (offsets e fases alteradas) |
| Execução paralela | SIM-2024-00312 (base) na instância MICRO-01. SIM-2024-00313 (proposta) na instância MICRO-02. Ambas iniciadas simultaneamente. |
| Progresso | Microsimulação de 2h simuladas. Tempo computacional: \~8 min cada. Concluídas às 10:15. |

**Passo 4: Análise Comparativa no Dashboard**

Ricardo abre a comparação lado a lado no Dashboard:

| Métrica | Base (SIM-00312) | Proposta (SIM-00313) | Diferença |
| :---- | :---- | :---- | :---- |
| Tempo de percurso N-S | 14 min 20s | 11 min 05s | \-22,6% (melhoria) |
| Atraso médio por interseção | 28,4s | 19,7s | \-30,6% (melhoria) |
| Fila máxima CTRL-045 (N-S) | 187m (12 veículos) | 94m (6 veículos) | \-49,7% (melhoria) |
| Índice de coordenação (% sem parar) | 34% | 61% | \+27 p.p. (melhoria) |
| LOS médio do corredor | D | C | Melhoria de 1 nível |
| Atraso CTRL-045 direção E-W | 22,1s | 31,8s | \+43,9% (piora) |
| Paradas totais na rede | 4.820 | 3.290 | \-31,7% (melhoria) |

A análise mostra melhoria significativa no corredor N-S (objetivo principal), com piora aceitável na direção E-W do CTRL-045 (fluxo secundário no horário). Ricardo visualiza no mapa geográfico: todas as interseções verdes (LOS A-C) exceto CTRL-045 E-W (amarelo, LOS D) — resultado aceitável para o trade-off.

**Passo 5: Aplicação em Campo via Preprodução**

| Ação | Detalhes |
| :---- | :---- |
| Aprovação | Ricardo aprova o resultado da simulação SIM-2024-00313 e registra justificativa. |
| Aplicação | Click em "Aplicar Configuração em Campo". O sistema transfere as temporizações validadas para a estratégia EST-PICO-AM-10AGO no Modelo de Tráfego. |
| Rastreabilidade | A estratégia registra: "Validada por simulação SIM-2024-00313, cenário CEN-2024-00188, aprovada por Ricardo Espinoza em 15/03/2024". |
| Ativação | A estratégia é ativada no horário programado (07:00) pela tabela horária configurada no Modelo de Tráfego. |
| Acompanhamento | Após 1 semana, Ricardo compara dados reais dos detectores com o resultado simulado. Precisão: tempo de percurso real 11 min 40s vs. simulado 11 min 05s (erro de 5,3%). O sistema registra a acurácia para calibração futura. |

# **Impacto em Outros Módulos**

* **Modelo de Tráfego:** Fonte primária de topologia para a construção de cenários (interseções, áreas, subáreas, rotas, pontos de medição, acessos). Destino de estratégias validadas por simulação: após validação, as temporizações são transferidas para as estratégias do Modelo de Tráfego para ativação em campo.  
* **Controladores:** Fonte de planos semafóricos, temporizações, fases e defasagens que alimentam os cenários. Destino das configurações validadas: quando uma simulação é aprovada, as novas temporizações podem ser aplicadas aos controladores via estratégias.  
* **Detectores:** Fonte de dados de fluxo em tempo real e históricos para alimentar a demanda de tráfego nos cenários. Os pontos de medição definem onde posicionar detectores virtuais na simulação para permitir comparação de resultados.  
* **Analítico:** Fonte de dados históricos agregados (médias, perfis horários, dias típicos) para alimentar cenários. Consumidor de resultados de simulação para calibração e validação de precisão (comparar simulado vs. real após implementação). Provedor de modelos preditivos para projeção de demanda futura.  
* Relatórios: Os resultados de simulação, comparações e análises de precisão são fornecidos ao módulo de **Relatórios** para formatação e distribuição como documentos técnicos de engenharia de tráfego.  
* **Emergências**: Integração indireta: cenários de simulação podem modelar situações de emergência (sinistros, bloqueios) para avaliar a efetividade de protocolos de resposta, mas a simulação não é executada durante a emergência.

**4.15. Controle**

Tipo: **Dependente**

### **Contexto e Justificativa**

O módulo de Controle é o motor de otimização automática em tempo real da rede semafórica. Classificado como dependente, este módulo consome dados do **Modelo de Tráfego** (topologia da rede, interseções, conexões entre vias), dos Controladores (planos semafóricos em execução, fases, temporizações) e dos **Detectores** (dados de fluxo, ocupação e velocidade em tempo real) para tomar decisões autônomas de redistribuição de verde ciclo a ciclo.

A diferença fundamental entre o módulo de Controle e as Estratégias do Modelo de Tráfego é a natureza da decisão. As Estratégias são configurações estáticas definidas pelo engenheiro de tráfego: elas determinam qual plano semafórico se aplica, com que tempos de ciclo, distribuição de verde e defasagens, e são ativadas por tabela horária, por condição ou manualmente. O **Controle,** por outro lado, é uma camada de ajuste fino em tempo real que opera sobre os planos semafóricos já em execução: ele não substitui a estratégia vigente, mas altera dinamicamente a distribuição de verde dentro do plano ativo, ciclo a ciclo, com base nos dados de detecção em tempo real. A estratégia continua definindo o marco operacional (escopo, plano base, ciclo); o Controle decide, dentro desse marco, como distribuir o verde de forma ótima em cada instante.

Para operar de forma eficiente, o algoritmo de controle introduz uma abstração topológica própria: os subsistemas. Um subsistema é um conjunto de interseções que formam um grafo conexo — interseções cujos fluxos de tráfego se afetam mutuamente e que, portanto, devem ser otimizadas de forma coordenada. A partição da rede em subsistemas é gerada automaticamente pelo algoritmo com base em critérios de conectividade e interdependência de fluxos, não por decisão administrativa do operador. Isso significa que um subsistema pode cruzar os limites de áreas e subáreas definidas no Modelo de Tráfego, porque responde à realidade física do tráfego e não à organização administrativa da rede.

Cada subsistema opera de forma independente: possui sua própria parametrização, seu próprio estado de ativação, seu próprio log de eventos e suas próprias métricas de desempenho. O engenheiro de tráfego configura e monitora cada subsistema individualmente, podendo ativar a otimização em alguns subsistemas enquanto outros permanecem sob controle estático das estratégias. Quando a otimização está desativada num subsistema, os controladores continuam operando com o plano semafórico da estratégia vigente sem nenhuma alteração.

O fluxo operacional é: os Detectores fornecem dados de fluxo, em tempo real; o algoritmo de controle analisa esses dados no contexto do subsistema (quais interseções estão congestionadas, onde há capacidade ociosa); e decide a redistribuição de verde para o próximo ciclo de cada controlador do subsistema, enviando os comandos via módulo de Controladores. Cada decisão é registrada no log de eventos do subsistema, permitindo auditoria completa e análise de efetividade.

# **Recursos**

## **Subsistemas**

Recurso de visualização, exploração e gestão da partição topológica gerada pelo algoritmo de controle. Um subsistema é um grafo conexo de interseções cujos fluxos são interdependentes e que, portanto, devem ser otimizadas de forma coordenada. A partição é automática e baseada em critérios de conectividade do grafo viário, independente da organização administrativa em áreas e subáreas do Modelo de Tráfego.

**Funcionalidades**

* **Geração automática de subsistemas:** O algoritmo analisa a topologia completa do Modelo de Tráfego e particiona a rede em subsistemas com base em critérios de conectividade. Os critérios incluem: adjacência direta entre interseções (vias que conectam dois cruzamentos), interdependência de fluxos (quando a fila de uma interseção afeta a operação da interseção vizinha, baseado em distância entre stoplines e volumes de tráfego), e relações de coordenação existentes (interseções que pertencem a uma mesma rota de onda verde). A geração pode ser executada sob demanda pelo engenheiro ou programada para reavaliação periódica, pois mudanças na topologia (novas interseções, alterações viárias) podem alterar os grafos conexos.

* **Visualização de subsistemas:** Apresentação visual de todos os subsistemas da rede em formato de lista e sobre o mapa geográfico. Cada subsistema é representado como um grupo de interseções conectadas, com cor diferenciada para distinguir subsistemas adjacentes. No mapa, o engenheiro vê: o perímetro de cada subsistema, as interseções que o compõem, as vias que conectam as interseções (arestas do grafo), e os detectores associados que alimentam o algoritmo. A visualização permite entender por que o algoritmo agrupou determinadas interseções e identificar as fronteiras entre subsistemas.

* **Detalhe do subsistema:** Ao selecionar um subsistema, o engenheiro acessa sua tela de detalhe contendo: identificação (ícone, nome automático ou personalizável, número de interseções), lista de interseções com seus respectivos controladores e planos semafóricos ativos, grafo de conectividade (visualização do grafo conexo com nós e arestas), detectores associados e seu estado (online/offline, última leitura), estado da otimização (ativa/inativa, desde quando, parâmetros vigentes), métricas de desempenho atuais e históricas, e log de eventos recentes.

* **Relação subsistema vs. áreas/subáreas:** O sistema mantém e exibe a relação entre subsistemas e a organização administrativa do Modelo de Tráfego. Um subsistema pode conter interseções de múltiplas subáreas ou áreas, e uma subárea pode ter interseções distribuídas em múltiplos subsistemas. O engenheiro visualiza um mapa de correspondência que mostra como a partição administrativa se relaciona com a partição algorítmica, facilitando a compreensão de quando os limites operacionais divergem dos limites físicos do tráfego.

* **Subsistemas fronteira:** Interseções que estão no limite entre dois subsistemas recebem tratamento especial. O sistema identifica automaticamente as interseções fronteira e exibe como o algoritmo gerencia a transição entre subsistemas adjacentes, garantindo que as alterações de um subsistema não gerem impacto negativo nos fluxos que alimentam o subsistema vizinho.

* **Histórico de partições:** Registro de todas as gerações de subsistemas executadas, permitindo comparar como a partição evoluiu ao longo do tempo (ex: após adição de novas interseções ou alterações viárias). Cada geração registra: data, topologia utilizada, número de subsistemas resultantes, lista de interseções por subsistema, e critérios aplicados.

**Comparação: Subsistema vs. Subárea**

| Característica | Subárea (Modelo de Tráfego) | Subsistema (Controle) |
| :---- | :---- | :---- |
| Origem | Definida pelo engenheiro/operador | Gerada automaticamente pelo algoritmo |
| Critério de agrupamento | Administrativo/operacional (região da cidade, corredor) | Conectividade física do grafo viário (interdependência de fluxos) |
| Limites | Fixos, definidos manualmente | Dinâmicos, recalculados quando a topologia muda |
| Finalidade | Aplicar estratégias e modos de funcionamento | Otimizar distribuição de verde em tempo real |
| Pode cruzar limites do outro? | Não aplicável | Sim — um subsistema pode conter interseções de múltiplas subáreas |
| Relação | 1 subárea pode estar distribuída em N subsistemas | 1 subsistema pode conter interseções de N subáreas |

## **Otimização**

Recurso de parametrização, ativação e operação do motor de otimização automática por subsistema. O motor analisa dados de detecção em tempo real e decide autonomamente como redistribuir o verde dentro do plano semafórico em execução, ciclo a ciclo, em cada controlador do subsistema. A otimização não altera o plano base da estratégia vigente (ciclo, fases, estrutura) ela ajusta a distribuição de verde entre fases dentro do marco definido pela estratégia.

**Funcionalidades**

* **Parametrização por subsistema:** Cada subsistema possui configuração independente que define como o algoritmo de otimização se comporta. Parâmetros configuráveis incluem: função objetivo (minimizar atraso médio, minimizar fila máxima, maximizar vazão, ou combinação ponderada), pesos por interseção dentro do subsistema (permitindo priorizar interseções críticas), limites mínimo e máximo de verde por fase (restrições que o algoritmo não pode violar, garantindo segurança viária e tempos mínimos de pedestres), sensibilidade de resposta (quão agressivamente o algoritmo reage a mudanças de demanda), e intervalo de recálculo (frequência com que o algoritmo reavalia a distribuição: a cada ciclo, a cada N ciclos, ou por evento de detecção). 

* **Restrições de segurança:** O algoritmo opera dentro de restrições rígidas que não podem ser violadas independentemente da otimização: tempo mínimo de verde por fase (garantindo tempo de travessia de pedestres conforme norma), tempos de entreverdes (amarelo e vermelho geral) são fixos e nunca alterados, sequência de fases é mantida conforme definido no plano da estratégia, e o tempo de ciclo total pode ser mantido fixo ou ter uma faixa de variação permitida conforme parametrização. Estas restrições garantem que a otimização nunca comprometa a segurança viária.

* **Ativação e desativação por subsistema:** O engenheiro pode ativar ou desativar a otimização em cada subsistema de forma independente. Quando ativada, o motor começa a analisar dados de detecção e alterar a distribuição de verde ciclo a ciclo. Quando desativada, os controladores do subsistema retornam imediatamente ao plano semafórico estático da estratégia vigente sem nenhuma alteração. A transição entre otimização ativa e inativa é suave: o algoritmo converge gradualmente para os tempos do plano base ao desativar, evitando transições bruscas. O sistema suporta ativação seletiva: alguns subsistemas otimizados em tempo real enquanto outros operam em modo estático.

* **Ciclo de otimização:** O algoritmo executa um ciclo contínuo de otimização para cada subsistema ativo: (1) Coleta: recebe dados de todos os detectores do subsistema (fluxo, ocupação, velocidade por aproximação), (2) Análise: avalia o estado atual do tráfego em cada interseção (quais aproximações estão congestionadas, onde há capacidade ociosa, como as filas se propagam entre interseções), (3) Cálculo: determina a distribuição ótima de verde para o próximo ciclo de cada controlador, respeitando as restrições de segurança e os parâmetros configurados, (4) Comando: envia a nova distribuição de verde aos controladores do subsistema via módulo de Controladores, (5) Registro: armazena cada decisão no log de eventos do subsistema com timestamp, dados de entrada, saída calculada e justificativa algorítmica.

* **Dados de entrada (detectores):** O algoritmo consome dados em tempo real de todos os detectores posicionados nas intersecções do subsistema. Para cada detector: fluxo veicular (veículos por intervalo), ocupação (percentual de tempo que o detector está ocupado, indicando presença de fila), e velocidade média (indicando fluidez). Quando um detector está offline ou com leitura anômala, o algoritmo utiliza o último dado válido com penalização temporal (decaimento exponencial da confiança), e se a ausência persiste além de um limiar configurável, o subsistema pode ser automaticamente desativado com alerta ao operador.

* **Saída do algoritmo (comandos):** Para cada ciclo de otimização, o algoritmo produz, por controlador do subsistema: a duração de verde de cada fase (redistribuída em relação ao plano base), mantendo inalterados o ciclo total (quando parametrizado como fixo), os tempos de entreverdes e a sequência de fases. O comando é enviado ao módulo de **Controladores** que o aplica no próximo ciclo. O módulo de Controladores registra que a alteração foi originada pelo Controle (não por intervenção manual do operador).

* **Tratamento de falhas:** O algoritmo possui mecanismos de resiliência para situações anômalas: perda de dados de detectores (fallback para último dado válido com decaimento, desativação automática se persistência excede limiar), falha de comunicação com controlador (controlador opera com última distribuição recebida, subsistema entra em modo degradado), resultado de otimização fora dos limites (rejeitado automaticamente, mantendo distribuição anterior), e erro interno do algoritmo (subsistema desativado automaticamente com alerta, controladores retornam ao plano estático da estratégia). Cada falha é registrada no log de eventos.

* **Intervenção manual:** Embora o algoritmo opere de forma autônoma, o operador pode intervir a qualquer momento: desativar a otimização de um subsistema específico (retorna ao plano estático), excluir uma interseção específica da otimização (mantida no plano estático enquanto as demais do subsistema continuam otimizadas), ou forçar temporização manual num controlador (o controlador é removido temporariamente do subsistema, conforme funcionalidade de controle direto do módulo de Controladores). Toda intervenção manual é registrada no log do subsistema.


**O que o Controle altera vs. o que não altera:**

| Aspecto do Plano Semafórico | Alterado pelo Controle? | Responsável |
| :---- | :---- | :---- |
| Distribuição de verde entre fases | Sim,  ajustado ciclo a ciclo com base na demanda real | Algoritmo de Controle |
| Tempo de ciclo total | Configurável,  pode ser fixo ou com faixa de variação | Parâmetro do subsistema |
| Sequência de fases | Não, mantida conforme plano da estratégia | Estratégia (Modelo de Tráfego) |
| Tempos de entreverdes (amarelo, vermelho geral) | Não,  fixos por segurança | Configuração do Controlador |
| Defasagens de coordenação (offsets) | Não,  mantidas conforme estratégia ou pelo usuário | Estratégia (Modelo de Tráfego) |
| Plano semafórico ativo (qual plano) | Não,  definido pela estratégia ou pelo usuário | Estratégia (Modelo de Tráfego) |
| Modo de operação (central, intermitente, etc.) | Não,  definido pela subárea/estratégia | Modelo de Tráfego |

## 

## **Dashboard**

Painel de monitoramento, análise de desempenho e log de eventos do motor de otimização, organizado por subsistema. Permite ao engenheiro de tráfego avaliar a efetividade das otimizações, identificar subsistemas com problemas e auditar cada decisão do algoritmo.

**Funcionalidades**

* **Log de eventos por subsistema:** Registro cronológico detalhado de cada ação do algoritmo dentro de um subsistema. Cada entrada do log contém: timestamp, controlador afetado, distribuição de verde anterior vs. nova (ex: "CTRL-045: fase N-S 38s → 42s, fase E-W 32s → 28s"), dados de detecção que motivaram a decisão (ex: "DET-034: ocupação 87% na aproximação norte, fila estimada 14 veículos"), função objetivo calculada, e resultado da aplicação (sucesso/falha). O log também registra: ativações/desativações do subsistema, alterações de parâmetros, falhas de detectores, intervenções manuais do operador, e transições de modo (otimizado ↔ estático). O log é filtrável por período, por tipo de evento, por controlador e por severidade.

* **Métricas de desempenho por subsistema:** Indicadores em tempo real e históricos para cada subsistema: atraso médio por interseção (atual e tendência), comprimento médio e máximo de fila por aproximação, nível de serviço (LOS) por interseção e consolidado do subsistema, taxa de saturação por fase (verde utilizado vs. verde disponível), número de ajustes realizados por período (indicador de atividade do algoritmo), amplitude média dos ajustes (indicador de estabilidade, ajustes pequenos significam rede estável, ajustes grandes significam demanda flutuante), e vazão total do subsistema (veículos processados por hora).

* **Comparação otimizado vs. estático:** Análise comparativa do desempenho do subsistema quando otimizado vs. quando operando com plano estático da estratégia. O sistema calcula automaticamente: redução de atraso médio atribuível à otimização, melhoria de LOS, redução de filas, e aumento de vazão. Essa comparação permite ao engenheiro avaliar se a otimização está produzindo benefício real ou se os parâmetros precisam ser ajustados. A comparação pode ser feita para períodos específicos (ex: pico AM com otimização vs. pico AM sem otimização na semana anterior).

* **Visão consolidada da rede:** Painel geral com o estado de todos os subsistemas simultaneamente: quantidade de subsistemas ativos vs. inativos, subsistemas com melhor e pior desempenho, subsistemas com falhas ou alertas, mapa da rede com subsistemas coloridos por desempenho (verde=bom, amarelo=atenção, vermelho=problema), e ranking de subsistemas por métrica selecionada.

* **Alertas e anomalias:** O sistema gera alertas automáticos quando detecta anomalias na operação do controle: subsistema com desempenho pior que o modo estático (otimização contraproducente), subsistema com perdas de dados de detectores frequentes, subsistema com ajustes de amplitude excessiva (indica instabilidade), e subsistema desativado automaticamente por falha. Cada alerta inclui recomendação: revisar parâmetros, verificar detectores, ou desativar temporariamente.

* **Análise temporal:** Gráficos de evolução temporal das métricas de cada subsistema ao longo de horas, dias e semanas. Permite identificar padrões: horários em que a otimização produz maior benefício, períodos de instabilidade, correlação entre eventos externos (obras, eventos especiais) e desempenho do subsistema, e evolução da efetividade após ajuste de parâmetros.

* **Auditoria de decisões:** Capacidade de selecionar qualquer ciclo de otimização no histórico e examinar detalhadamente: dados de entrada (leituras de todos os detectores naquele instante), estado do subsistema antes da decisão (distribuição de verde vigente), cálculo realizado (função objetivo, restrições ativas), resultado produzido (nova distribuição de verde), e efeito observado (métricas do ciclo seguinte). Esta funcionalidade é essencial para que o engenheiro compreenda e confie nas decisões do algoritmo.

# 

# **Exemplo de Uso**

**Cenário**

São 07:15 de quarta-feira. O engenheiro de tráfego Ricardo Espinoza monitora o módulo de Controle. A rede do DMQ está particionada em 47 subsistemas. O subsistema SUB-012 ("Corredor Av. Amazonas Centro", 8 interseções) está com otimização ativa desde as 06:00. A estratégia EST-PICO-AM-AMAZONAS está vigente com plano de 90s de ciclo. O algoritmo está ajustando a distribuição de verde ciclo a ciclo com base nos 12 detectores do subsistema.

**Passo 1: Visão Geral dos Subsistemas**

Ricardo abre o Dashboard consolidado:

| Indicador | Valor |
| :---- | :---- |
| Total de subsistemas | 47 |
| Subsistemas com otimização ativa | 31 (66%) |
| Subsistemas em modo estático | 16 (34%) |
| Alertas ativos | 2 (SUB-023: detector offline, SUB-041: desempenho inferior ao estático) |
| Melhoria média de atraso (rede) | \-18,3% vs. modo estático |
|  |  |

**Passo 2: Monitoramento do SUB-012**

Ricardo seleciona o SUB-012 para verificar o desempenho durante o pico matutino:

| Interseção | LOS Atual | Atraso Médio | Fila Máxima | Ajuste Último Ciclo |
| :---- | :---- | :---- | :---- | :---- |
| CTRL-031 (Amazonas / Patria) | B | 14,2s | 45m | Fase N-S: \+2s, Fase E-W: \-2s |
| CTRL-032 (Amazonas / Mariana de Jesús) | B | 16,8s | 52m | Sem ajuste (estável) |
| CTRL-033 (Amazonas / Orellana) | C | 24,1s | 78m | Fase N-S: \+4s, Fase E-W: \-4s |
| CTRL-034 (Amazonas / Colón) | D | 38,5s | 142m | Fase N-S: \+6s, Fase E-W: \-3s, Fase Giro: \-3s |
| CTRL-035 (Amazonas / 18 de Septiembre) | C | 22,7s | 65m | Fase N-S: \+3s, Fase E-W: \-3s |
| CTRL-036 (Amazonas / Roca) | B | 17,3s | 48m | Sem ajuste (estável) |
| CTRL-037 (Amazonas / J. Washington) | B | 15,9s | 41m | Fase N-S: \+1s, Fase E-W: \-1s |
| CTRL-038 (Amazonas / Wilson) | B | 13,4s | 38m | Sem ajuste (estável) |

Ricardo observa que CTRL-034 (Amazonas / Colón) está em LOS D com ajustes agressivos (+6s na fase N-S). O algoritmo está priorizando o fluxo N-S (direção dominante no pico AM) mas a interseção permanece congestionada. As demais interseções do subsistema estão estáveis (LOS B-C).

**Passo 3:  Análise do Log de Eventos**

Ricardo consulta o log do SUB-012, filtrado para CTRL-034 nos últimos 30 minutos:

| Timestamp | Evento | Detalhe |
| :---- | :---- | :---- |
| 07:00:00 | Ajuste | Fase N-S: 38s → 41s. DET-067 reportou ocupação 72% (norte). |
| 07:01:30 | Ajuste | Fase N-S: 41s → 43s. DET-067 ocupação 79%, fila estimada 10 veículos. |
| 07:03:00 | Ajuste | Fase N-S: 43s → 44s. Limite máximo de verde atingido (44s). Restrição ativa. |
| 07:04:30 | Sem ajuste | Fase N-S em limite máximo. DET-067 ocupação 85%. Fila 14 veículos. |
| 07:06:00 | Alerta | CTRL-034: opera no limite máximo de verde N-S há 2 ciclos consecutivos. Recomendação: revisar plano base da estratégia. |
| 07:10:00 | Ajuste | Fase N-S: 44s (limite). DET-067 ocupação descendo para 68%. Fila 8 veículos. Demanda começa a estabilizar. |
| 07:13:00 | Ajuste | Fase N-S: 44s → 42s. DET-067 ocupação 55%. Devolvendo verde à fase E-W. |

**Passo 4: Comparação Otimizado vs. Estático**

Ricardo consulta a comparação do SUB-012 para o período 07:00-09:00:

| Métrica | Com Otimização (hoje) | Sem Otimização (quarta passada) | Diferença |
| :---- | :---- | :---- | :---- |
| Atraso médio do subsistema | 20,1s | 27,8s | \-27,7% (melhoria) |
| LOS consolidado | C | D | Melhoria de 1 nível |
| Fila máxima CTRL-034 | 142m | 215m | \-34,0% (melhoria) |
| Vazão total | 8.420 veíc/h | 7.650 veíc/h | \+10,1% (melhoria) |
| Ajustes realizados | 284 (média 2,4 por ciclo) | 0 (estático) | N/A |
| Amplitude média dos ajustes | 3,2s | N/A | Estabilidade boa |

**Passo 5: Ajuste de Parâmetros**

Com base na análise, Ricardo decide aumentar o limite máximo de verde da fase N-S no CTRL-034:

| Ação | Detalhe |
| :---- | :---- |
| Alteração | SUB-012 \> Parâmetros \> CTRL-034: Limite máximo fase N-S: 44s → 48s. Limite mínimo fase E-W: 20s → 18s. |
| Justificativa | "CTRL-034 atingindo limite máximo durante pico AM. Fluxo E-W reduzido neste horário justifica ampliação." |
| Validação | Sistema verifica: 18s E-W respeita tempo mínimo de pedestres (15s). OK. |
| Registro | Parâmetro v3.2 → v3.3. Autor: Ricardo Espinoza. Data: 12/03/2024 09:15. |
| Efeito | No próximo pico AM, o algoritmo poderá estender até 48s na fase N-S quando necessário. |

# 

# **Impacto em Outros Módulos**

* **Modelo de Tráfego:** Fonte da topologia para geração de subsistemas (interseções, vias, conexões). Mudanças na topologia (nova interseção, via alterada) podem exigir regeneração dos subsistemas. O Controle não altera a topologia nem as estratégias, opera sobre os planos semafóricos definidos pelas estratégias vigentes.  
* **Controladores:** Destino dos comandos de redistribuição de verde. O módulo de Controladores recebe e aplica as alterações de temporização decididas pelo algoritmo de Controle. Quando o operador força controle manual num controlador (via módulo de Controladores ou Painel de Operações), esse controlador é excluído temporariamente do subsistema até que a intervenção manual seja liberada.  
* **Detectores:** Fonte primária de dados de entrada para o algoritmo (fluxo, ocupação, velocidade em tempo real). A qualidade e disponibilidade dos dados de detecção impactam diretamente a capacidade de otimização. Detectores offline ou com leitura anônima degradam a operação do subsistema correspondente.  
* **Analítico:** Consumidor de dados de desempenho do Controle para análise de efetividade a longo prazo. O Analítico pode comparar períodos com e sem otimização para quantificar o benefício global do módulo.  
* **Simulação:** A simulação pode ser utilizada para testar novos parâmetros de otimização antes de aplicá-los em subsistemas reais, reduzindo o risco de configurações subótimas.  
* **Painel de Operações:** O painel consome o estado dos subsistemas para exibir no mapa quais interseções estão sob otimização ativa. O operador pode desativar a otimização de um subsistema diretamente do Painel em situações de emergência.  
* **Emergências:** Quando um evento de emergência é ativado e o módulo de Emergências assume o controle dos dispositivos na área de influência (snapshot-modify-rollback), os controladores afetados são automaticamente excluídos da otimização dos subsistemas correspondentes. Após o rollback da emergência, os controladores retornam à otimização do subsistema.  
* **Alarmes:** Falhas de detectores geram alarmes que o Controle consome para identificar degradação de dados de entrada. Subsistemas desativados automaticamente por perda de detectores geram alarmes específicos.  
* **Inventário:** Não há integração direta. O controle é independente do estado patrimonial dos ativos.  
* **Relatórios:** Dados de desempenho, logs de eventos, comparações otimizado vs. estático e efetividade da otimização são fornecidos ao módulo de Relatórios para documentação técnica.

## **4.16. Nobreaks**

Tipo: **Funcional**

### **Contexto e Justificativa**

O módulo de Nobreaks gerencia a operação, monitoramento e supervisão dos sistemas de alimentação ininterrupta (UPS) instalados na infraestrutura semafórica. Classificado como funcional, este módulo é responsável exclusivamente pela dimensão operacional dos nobreaks: estado de operação, leitura de parâmetros elétricos em tempo real, gestão de modos de funcionamento, associação com os dispositivos alimentados e análise de saúde das baterias. A gestão patrimonial do ativo (número de série, fabricante, garantia, histórico de manutenção) pertence ao módulo Inventário e Manutenção.

Os nobreaks são componentes críticos da infraestrutura semafórica: garantem a continuidade operacional dos controladores, câmeras, detectores e demais equipamentos durante interrupções de fornecimento de energia elétrica. Um nobreak com falha não afeta a operação imediatamente, o problema se manifesta quando ocorre um corte de energia e o nobreak não assume a alimentação, resultando na perda de múltiplos dispositivos simultaneamente. Por esse motivo, o monitoramento contínuo do estado dos nobreaks e da saúde das baterias é essencial para a operação 24/7 da rede semafórica.

A associação entre um nobreak e os dispositivos que ele alimenta é configurada manualmente pelo operador na interface do módulo. Não existe detecção automática dessa relação porque o nobreak é um equipamento elétrico que não possui protocolo de comunicação com os dispositivos que alimenta ele simplesmente fornece energia. A instalação física em campo determina quais dispositivos estão conectados a qual nobreak, e essa informação precisa ser registrada manualmente na plataforma. Esta associação é crítica para análise de impacto: quando um nobreak entra em modo bateria ou falha, o sistema sabe exatamente quais controladores, câmeras e detectores estão em risco.

O módulo integra-se com o módulo de Alarmes para gerar notificações automáticas quando um nobreak entra em modo bateria, apresenta bateria baixa, sobrecarga, temperatura elevada ou falha de transferência. Integra-se com o módulo de Inventário e Manutenção para o ciclo completo de manutenção (incidências e ordens de serviço de troca de baterias, reparos e substituições). E integra-se com o módulo de Controle de forma indireta: se um nobreak falha e os controladores que alimenta ficam offline, o subsistema correspondente é afetado.

### **Recursos**

## **Lista de Nobreaks**

Recurso central do módulo, responsável pelo cadastro operacional, configuração de comunicação, gestão de estados e associação manual de cada nobreak com os dispositivos que alimenta. Um nobreak pode existir no sistema sem estar associado a dispositivos (em estoque ou em testes), mas apenas quando associado a dispositivos específicos ele participa ativamente da análise de impacto e do monitoramento operacional.

**Funcionalidades**

* **Cadastro e configuração operacional:** Registro de cada nobreak com dados operacionais específicos: identificador único, modelo, capacidade nominal (VA/W), tipo de topologia (online/line-interactive/offline), modelo, tensão nominal de entrada e saída, frequência nominal, endereço IP ou porta de comunicação (protocolo SNMP, proprietário), intervalo de polling, timeout de conexão, e localização física (interseção, armário, coordenadas GPS). Esta configuração é exclusiva da operação do equipamento e não depende da associação com dispositivos.  
* **Estados do nobreak:** Cada nobreak possui um estado explícito que reflete sua situação operacional no ciclo de vida.

| Estado | Descrição | Indicador Visual |
| :---- | :---- | :---- |
| Em estoque | Equipamento cadastrado mas não instalado. Pode estar em almoxarifado ou aguardando designação. | Cinza |
| Em testes | Instalado em bancada para validação. Não alimenta dispositivos de produção. | Azul claro |
| Operativo — Modo Rede | Instalado e operando normalmente. Alimentando dispositivos a partir da rede elétrica. Baterias carregadas. | Verde |
| Operativo — Modo Batería | Rede elétrica ausente. Alimentando dispositivos a partir das baterias. Autonomia sendo consumida. | Laranja (pulsante) |
| Operativo — Modo Bypass | Rede elétrica alimentando diretamente os dispositivos sem condição de proteção do nobreak (manutenção ou falha interna). | Amarelo |
| Alarme | Operando com condição anômala: sobrecarga, temperatura elevada, batería baixa, falha de ventilador. | Vermelho |
| Offline | Sem comunicação com a central. Estado real desconhecido. | Vermelho (contorno tracejado) |
| Desativado | Fora de operação permanentemente. Aguardando retirada ou substituição. | Cinza escuro |

* **Comunicação com nobreaks:** Gestão da conexão entre a central Attlas e cada nobreak de campo. O sistema realiza polling periódico para coletar parâmetros elétricos e estado operacional. Suporta múltiplos protocolos de comunicação simultaneamente (SNMP v1/v2c/v3, protocolos proprietários de fabricantes), permitindo que a rede contenha nobreaks de diferentes fabricantes. O sistema monitora a qualidade da comunicação (latência, taxa de perda de pacotes) e gera alarme quando a comunicação é perdida.  
* **Associação manual de dispositivos alimentados:** O operador configura manualmente, através da interface do módulo, quais dispositivos são alimentados por cada nobreak. A associação é feita selecionando o nobreak e adicionando os dispositivos que ele alimenta a partir da lista de ativos registrados no Inventário: controladores, câmeras, detectores, PMVs e outros equipamentos. Cada dispositivo só pode estar associado a um nobreak (relação N:1). A associação registra: dispositivo, data da associação, operador responsável e observações. Quando a associação é alterada (dispositivo movido para outro nobreak), o histórico é mantido. Esta associação é utilizada para análise de impacto: ao consultar um nobreak em modo bateria, o operador vê imediatamente quais dispositivos estão em risco.  
* **Análise de impacto:** Com base na associação manual de dispositivos, o sistema calcula e exibe o impacto potencial de uma falha de cada nobreak: lista de dispositivos que ficariam sem energia, interseções afetadas (derivadas dos controladores associados), subsistemas de Controle que seriam impactados, e classificação de criticidade do nobreak (baseada no número e tipo de dispositivos que alimenta). Esta análise está disponível tanto na tela de detalhe do nobreak quanto como relatório consolidado de toda a rede.  
* **Capacidade e dimensionamento:** O sistema calcula a relação entre a capacidade nominal do nobreak (VA/W) e a carga total dos dispositivos associados. Exibe: carga total estimada (soma da potência dos dispositivos associados), percentual de utilização da capacidade, margem disponível, e autonomia estimada em modo bateria com base na carga real. Gera alerta quando a carga excede um percentual configurável da capacidade (ex: 80%), indicando risco de sobrecarga ou autonomia reduzida.  
* **Substituição de equipamento:** Quando um nobreak precisa ser substituído, o operador desassocia o equipamento antigo (que mantém seu histórico) e associa o novo nobreak aos mesmos dispositivos. O sistema facilita esse processo com opção de "transferir associações": ao substituir, os dispositivos previamente associados ao nobreak antigo são automaticamente sugeridos para associação ao novo, cabendo ao operador confirmar.

## **Monitoramento**

Recurso de leitura em tempo real dos parâmetros elétricos e operacionais de cada nobreak, histórico de eventos e acompanhamento da saúde das baterias. O monitoramento contínuo permite detectar degradações antes que se tornem falhas críticas, garantindo a disponibilidade da infraestrutura semafórica.

**Funcionalidades**

* Leitura de parâmetros elétricos em tempo real: O sistema coleta e exibe continuamente os parâmetros operacionais de cada nobreak. Os parâmetros coletados dependem do protocolo e modelo do equipamento, mas incluem no mínimo:

| Categoria | Parâmetro | Unidade | Uso |
| :---- | :---- | :---- | :---- |
| Entrada | Tensão de entrada (por fase) | V | Detectar sub/sobretensão da rede elétrica |
| Entrada | Frequência de entrada | Hz | Detectar instabilidade da rede |
| Saída | Tensão de saída (por fase) | V | Verificar alimentação aos dispositivos |
| Saída | Corrente de saída | A | Calcular carga real e comparar com capacidade |
| Saída | Potência de saída | W / VA | Monitorar percentual de carga |
| Saída | Frequência de saída | Hz | Verificar estabilidade da saída |
| Batería | Tensão do banco de baterias | V | Indicar carga e saúde das baterias |
| Batería | Nível de carga da batería | % | Autonomia disponível |
| Batería | Autonomia estimada | min | Tempo restante em modo batería |
| Batería | Estado da batería | Texto | Normal, carregando, descarregando, falha, necessita substituição |
| Ambiente | Temperatura interna | °C | Detectar sobreaquecimento |
| Sistema | Modo de operação | Texto | Rede, batería, bypass, ECO, falha |
| Sistema | Percentual de carga | % | Relação carga real / capacidade nominal |
| Sistema | Última transferência rede → batería | Datetime | Rastreabilidade de eventos de energia |
| Sistema | Total de transferências acumuladas | Número | Indicador de instabilidade da rede elétrica local |

* **Histórico de eventos:** Registro cronológico de todos os eventos operacionais de cada nobreak: transferências rede → bateria (com timestamp de início e fim, duração, nível de batería no início e no retorno à rede), alarmes gerados (sobrecarga, temperatura, bateria baixa, falha de transferência), alterações de modo de operação, quedas e retornos de comunicação, e testes de batería automáticos ou manuais. O histórico é filtrável por período, tipo de evento e severidade.  
* **Monitoramento de saúde das baterias:** Análise contínua do estado das baterias com base nos parâmetros coletados: tendência de tensão do banco de baterias ao longo do tempo (queda gradual indica degradação), autonomia real vs. nominal (redução progressiva indica necessidade de substituição), tempo de recarga após retorno da rede (aumento indica degradação), número de ciclos de descarga acumulados, e idade das baterias (calculada a partir da data de instalação registrada no Inventário). O sistema gera alertas proativos quando os indicadores sugerem que as baterias estão se aproximando do fim de vida útil, antes que uma falha ocorra em campo.  
* **Teste de bateria:** Capacidade de comandar um teste de batería no nobreak (quando suportado pelo protocolo de comunicação do equipamento). O teste consiste numa breve descarga controlada para verificar se as baterias respondem adequadamente sob carga. O resultado é registrado no histórico de eventos: teste aprovado (baterias responderam dentro dos parâmetros esperados) ou teste reprovado (tensão caiu abaixo do limiar, indicando degradação). Testes podem ser programados periodicamente ou executados sob demanda pelo operador.  
* **Gráficos temporais:** Visualização gráfica da evolução dos parâmetros ao longo do tempo para cada nobreak: tensão de entrada/saída, carga, temperatura, nível de bateria, e autonomia. Os gráficos permitem identificar padrões: horários com instabilidade de rede elétrica, interseções com cortes frequentes, degradação progressiva de baterias, e correlação entre temperatura ambiente e temperatura interna do nobreak.  
* **Notificações e alarmes:** O módulo gera eventos que alimentam o módulo de Alarmes para as seguintes condições:

| Condição | Criticidade | Descrição |
| :---- | :---- | :---- |
| Transferência para modo batería | Alto | Nobreak assumiu alimentação por batería. Dispositivos operando com autonomia limitada. |
| Batería baixa (\< limiar configurável) | Crítico | Autonomia restante insuficiente. Dispositivos alimentados em risco iminente de perda. |
| Sobrecarga (\> limiar configurável) | Alto | Carga excede capacidade segura. Risco de desligamento protetor. |
| Temperatura elevada (\> limiar configurável) | Médio | Temperatura interna acima do normal. Reduz vida útil de baterias e componentes. |
| Falha de transferência | Crítico | Nobreak não conseguiu transferir para modo batería. Dispositivos sem proteção contra corte de rede. |
| Perda de comunicação | Alto | Central perdeu contato com o nobreak. Estado real desconhecido. |
| Batería necessita substituição | Médio | Análise de saúde indica degradação significativa. Autonomia real muito inferior à nominal. |
| Teste de batería reprovado | Alto | Baterias não responderam adequadamente ao teste de descarga. |
| Modo bypass ativo | Médio | Dispositivos alimentados sem proteção do nobreak. |

## **Dashboard**

Painel de indicadores consolidados da frota de nobreaks, oferecendo visão geral da saúde da infraestrutura de alimentação elétrica e permitindo identificação rápida de situações que requerem atenção.

**Funcionalidades**

* **Estado geral da frota:** Visão consolidada do parque de nobreaks: total de equipamentos por estado (modo rede, modo bateria, bypass, alarme, offline, desativado), percentual de disponibilidade (nobreaks operativos vs. total instalado), tendência de disponibilidade nas últimas 24h/7 dias/30 dias. Gráfico de distribuição por estado com atualização em tempo real.  
* **Nobreaks em modo bateria:** Lista em tempo real de todos os nobreaks atualmente operando em modo bateria: identificação, localização, nível de bateria atual, autonomia estimada restante, dispositivos alimentados (com link para análise de impacto), e duração desde a transferência. Ordenados por criticidade (menor autonomia primeiro). Este painel é o primário para o operador durante eventos de falta de energia.  
* **Saúde das baterias:** Análise consolidada do estado das baterias de toda a frota: distribuição por faixa de autonomia (nominal vs. real), nobreaks com baterias em fim de vida (autonomia real \< 50% da nominal), nobreaks com baterias a vencer (baseado na data de instalação e vida útil esperada), ranking dos 10 nobreaks com pior relação autonomia real/nominal, e previsão de substituições necessárias nos próximos 30/60/90 dias.  
* **Estabilidade da rede elétrica:** Análise baseada nos eventos de transferência rede → bateria: localizações com maior frequência de cortes de energia (mapa de calor), horários com maior incidência de cortes, duração média dos cortes por região, e tendência temporal (rede elétrica melhorando ou piorando por região). Estas informações permitem ao gestor tomar ações com a concessionária elétrica e priorizar investimentos em infraestrutura elétrica.  
* **Capacidade e dimensionamento:** Análise de utilização da capacidade de toda a frota: distribuição de percentual de carga (nobreaks subdimensionados vs. sobredimensionados), nobreaks acima do limiar de carga segura, nobreaks sem dispositivos associados (possível cadastro incompleto), e relação entre capacidade instalada e carga real por região.  
* **Análise de impacto global:** Visão de risco da rede semafórica baseada no estado dos nobreaks: número de interseções protegidas por nobreak vs. não protegidas, interseções críticas (alto fluxo) cujos nobreaks apresentam batería degradada, cenário de impacto em caso de corte generalizado (quantas interseções manteriam operação e por quanto tempo, baseado na autonomia atual de cada nobreak).  
* **Indicadores operacionais:** Métricas de operação e manutenção: total de transferências rede → batería por período, tempo médio em modo bateria, percentual de testes de bateria aprovados vs. reprovados, tempo médio de resposta a alarmes de nobreak, e custo estimado de substituição de baterias previsto para os próximos meses.

# **Exemplo de Uso**

**Cenário**

Às 14:30 de quinta-feira, uma falha na rede elétrica afeta o setor norte do DMQ, deixando 23 interseções sem fornecimento de energia. Os nobreaks instalados assumem a alimentação dos dispositivos. A operadora María Fernanda López monitora a situação pelo módulo de Nobreaks enquanto a concessionária elétrica trabalha no restabelecimento.

**Passo 1 — Detecção e Visão Geral**

O Dashboard atualiza automaticamente:

| Indicador | Valor |
| :---- | :---- |
| Nobreaks em modo batería | 19 (de 320 instalados) — todos no setor norte |
| Interseções protegidas (com nobreak) | 19 de 23 afetadas pelo corte |
| Interseções sem proteção (sem nobreak) | 4 interseções — CTRL-102, CTRL-108, CTRL-115, CTRL-119 (sem nobreak associado, controladores offline) |
| Autonomia média dos nobreaks em batería | 47 min (faixa: 22 min a 68 min) |
| Dispositivos protegidos | 19 controladores, 14 câmeras, 11 detectores |
| Alarmes gerados | 19 alarmes de transferência para bateria \+ 4 alarmes de controlador offline |

**Passo 2:  Monitoramento por Criticidade**

María Fernanda consulta a lista de nobreaks em modo bateria, ordenada por menor autonomia:

| Nobreak | Localização | Batería | Autonomia | Dispositivos Alimentados |
| :---- | :---- | :---- | :---- | :---- |
| NBK-047 | Av. Amazonas / Av. Patria | 38% | 22 min | CTRL-031, CAM-028, DET-045 |
| NBK-052 | Av. Amazonas / Orellana | 45% | 29 min | CTRL-033, CAM-031 |
| NBK-061 | Av. 10 Agosto / Colón | 52% | 35 min | CTRL-045, CAM-042, DET-067, DET-068 |
| NBK-038 | Av. América / Mariana de Jesús | 71% | 51 min | CTRL-022, DET-034 |
| NBK-073 | Av. Eloy Alfaro / Granados | 82% | 68 min | CTRL-056, CAM-051, DET-079 |

NBK-047 tem apenas 22 minutos de autonomia. María Fernanda verifica a análise de impacto: se NBK-047 esgotar, a interseção Av. Amazonas / Av. Patria perde controlador, câmera e detector simultaneamente — interseção crítica com alto fluxo no horário. O subsistema SUB-012 do módulo de Controle seria diretamente afetado.

**Passo 3: Acompanhamento em Tempo Real**

| Horário | Evento | Detalhe |
| :---- | :---- | :---- |
| 14:30 | Transferência para batería | 19 nobreaks transferem simultaneamente. Dashboard atualiza. |
| 14:45 | Alerta crítico NBK-047 | Batería 25%, autonomia 14 min. María Fernanda notifica ECU-911. |
| 14:48 | Incidência gerada | Sistema gera incidência INC-2024-01890 para NBK-047 via auto-regra do 4.11 (nobreak em modo batería \+ batería crítica). |
| 14:52 | Energia restabelecida parcial | Rede elétrica retorna em 12 interseções. 12 nobreaks iniciam recarga. 7 permanecem em batería. |
| 14:55 | NBK-047 batería 15% | Autonomia 8 min. María Fernanda prepara equipe para modo intermitente no CTRL-031. |
| 14:58 | Energia restabelecida total | Rede retorna nas 11 interseções restantes. Todos os nobreaks iniciam recarga. |
| 14:58 | NBK-047 retorna à rede | Batería 12%. Duração total em batería: 28 min. Autonomia real: 28 min (nominal: 60 min — 46,7% da capacidade). |

**Passo 4: Análise Pós-Evento**

Após o restabelecimento, María Fernanda analisa o Dashboard:

| Análise | Resultado |
| :---- | :---- |
| NBK-047: autonomia real vs. nominal | 28 min vs. 60 min (46,7%). Batería degradada. Sistema gera alerta: "Batería necessita substituição". |
| 4 interseções sem nobreak | CTRL-102, CTRL-108, CTRL-115, CTRL-119 ficaram 28 min offline. Recomendação: solicitar instalação de nobreaks. |
| Estabilidade rede elétrica — setor norte | 3º corte no último mês nesta região. Duração média: 24 min. Recomendação: reportar padrão à concessionária. |
| Saúde geral das baterias | 6 nobreaks com autonomia real \< 50% da nominal. Programação de substituição recomendada para 30 dias. |

# 

# **Impacto em Outros Módulos**

* **Controladores:** Os nobreaks alimentam controladores semafóricos. A associação manual nobreak → controlador permite que, quando um nobreak entra em modo bateria ou falha, o sistema identifique imediatamente quais controladores estão em risco. O módulo de **controladores** consome o estado do nobreak para contextualizar o estado de cada controlador (controlador operativo, mas alimentado por bateria).  
* **Câmeras:** Câmeras de videomonitoramento podem estar alimentadas por nobreaks. A associação permite rastrear quais câmeras perderão sinal em caso de esgotamento de bateria.  
* **Detectores:** Detectores de tráfego alimentados por nobreaks. A perda de detectores impacta diretamente o módulo de Controle (4.16), que depende de dados de detecção em tempo real para otimizar a distribuição de verde.  
* **Alarmes:** O módulo de Nobreaks gera eventos que alimentam o módulo de Alarmes: transferência para bateria, bateria baixa, sobrecarga, temperatura, falha de transferência, perda de comunicação, teste reprovado, bypass ativo. Os alarmes são classificados por criticidade conforme tabela de condições do Monitoramento.  
* Inventário e Manutenção: Os nobreaks são ativos registrados no Inventário. Alertas de bateria degradada ou teste reprovado geram incidências no via auto-regras, resultando em ordens de serviço para substituição de baterias ou reparo do equipamento. O histórico patrimonial (data de instalação de baterias, garantia) é mantido no Inventário.  
* **Controle:** Integração indireta mas crítica. Quando um nobreak falha e os controladores alimentados ficam offline, os detectores associados também perdem dados. O subsistema correspondente no módulo de controle é afetado: perde dados de detecção e perde controladores do grafo conexo, podendo ser automaticamente desativado.  
* **Emergências**: Durante uma emergência, o estado dos nobreaks na área de influência é uma informação relevante: se o nobreak está em modo bateria, a autonomia restante limita o tempo disponível para manter os dispositivos operativos na zona de emergência.  
* **Painel de Operações:** O Painel de Operações consome o estado dos nobreaks para exibir na camada de dispositivos do mapa: ícone de bateria com cor conforme modo (verde=rede, laranja=batería, vermelho=falha). O operador pode consultar parâmetros e dispositivos alimentados diretamente do mapa.  
* **Relatórios:** Fornece dados de disponibilidade, saúde de baterias, frequência de cortes de energia, análise de impacto e dimensionamento para o módulo de Relatórios.

## **4.17. Relatórios**

Tipo: **Dependente**

### **Contexto e Justificativa**

O módulo de relatórios é responsável pela geração, formatação e distribuição de relatórios estruturados a partir dos dados produzidos por todos os módulos da plataforma Attlas. Classificado como dependente, este módulo não possui lógica de negócio própria: ele consome dados de Controladores, PMV, Inventário e Manutenção, Emergências, Alarmes, Simulação, Controle, Nobreaks, Câmeras, Detectores, Modelo de Tráfego e Analítico para produzir documentos formatados que suportam a tomada de decisão operacional, técnica e gerencial.

O módulo atende duas modalidades de geração de relatórios: geração sob demanda (o usuário seleciona um relatório do catálogo, configura filtros e solicita a geração) e geração programada (o usuário define uma programação periódica e o sistema gera e distribui automaticamente). Adicionalmente, a plataforma suporta exportação direta de tabelas e listas de dados visíveis na interface de qualquer módulo, com processamento em segundo plano para evitar gargalos no sistema.

O sistema contempla uma bateria inicial de relatórios pré-definidos que devem estar operacionais no momento da entrada em operação. Além desses, o sistema permite a criação de novos relatórios e a modificação dos existentes sem necessidade de desenvolvimento adicional, através de um editor visual de templates acessível ao administrador da plataforma.

# **Recursos**

## **Catálogo de Relatórios**

Biblioteca centralizada de todos os relatórios disponíveis na plataforma, incluindo relatórios pré-definidos (entregues na entrada em operação) e relatórios personalizados (criados pelo administrador). O catálogo organiza os relatórios por domínio funcional, permite a criação e modificação de templates sem desenvolvimento adicional, e define quais filtros e parâmetros cada relatório aceita.

**Funcionalidades**

* **Organização por domínio funcional:** Os relatórios são organizados em categorias correspondentes aos módulos da plataforma, permitindo ao usuário localizar rapidamente o relatório desejado. Cada relatório pertence a uma categoria primária (domínio funcional de origem dos dados) e pode ser marcado com tags para facilitar a busca.  
* **Relatórios pré-definidos (bateria inicial):** Conjunto de relatórios que devem estar operativos no momento da entrada em operação, Este conjunto inclui, no mínimo:

| Categoria | Relatório | Descrição |
| :---- | :---- | :---- |
| Alarmes | Listado de alarmes | Relatório de todos os alarmes gerados no período, com classificação por criticidade, tipo, dispositivo e estado (confirmado, resolvido, fechado). |
| Dispositivos | Listado de dispositivos | Inventário completo de dispositivos com estado atual, localização e módulo funcional. |
| Câmeras | Estado de câmeras | Estado operacional de todas as câmeras: online, offline, com alarme, última comunicação. |
| PMV | Estado de painéis PMV | Estado de cada PMV: online, offline, mensagem ativa, alarmes. |
| PMV | Alarmes de painéis PMV | Alarmes específicos de PMV no período: falha de exibição, comunicação, luminosidade. |
| PMV | Listado de mensagens de painéis | Histórico de mensagens exibidas em cada PMV no período. |
| Usuários | Listado de usuários ativos e inativos | Lista de usuários da plataforma com estado (ativo/inativo), perfil e último acesso. |
| Auditoria | Log de auditoria | Listado de ações realizadas na plataforma: usuário, ação, módulo, data/hora, resultado. |
| Emergências | Eventos e planos de resposta | Relatório de eventos de emergência: tipo, severidade, protocolo ativado, duração, resultado. |
| Emergências | Listado de planos | Catálogo de protocolos de emergência com configuração e histórico de ativações. |
| Tráfego | Dados de tráfego por 15 minutos | Volumes, velocidades e ocupação por detector em intervalos de 15 minutos. |
| Tráfego | Dados de tráfego por hora | Agregação horária dos dados de tráfego por detector. |
| Tráfego | Dados de tráfego diário | Agregação diária dos dados de tráfego por detector e por interseção. |
| Tráfego | Dados de tráfego mensal | Agregação mensal dos dados de tráfego com tendências e comparações com períodos anteriores. |
| Manutenção | Incidências por período | Relatório de incidências abertas, resolvidas e pendentes por tipo de dispositivo e severidade. |
| Manutenção | Ordens de serviço por período | OS corretivas e preventivas: estado, SLA cumprido/excedido, técnico, materiais consumidos. |
| Manutenção | Aderência à manutenção preventiva | Percentual de manutenções preventivas realizadas vs. programadas por tipo de dispositivo. |
| Nobreaks | Estado de nobreaks | Estado de cada nobreak: modo, nível de batería, autonomia, dispositivos alimentados. |
| Nobreaks | Eventos de energia | Transferências rede/batería, duração, interseções afetadas por período. |
| Controle | Efetividade da otimização | Comparação de desempenho otimizado vs. estático por subsistema e período. |
| Simulação | Resultados de simulação | Resultados de simulações executadas: cenário, métricas, comparação base vs. proposta. |

* **Editor visual de templates:** Ferramenta integrada que permite ao administrador criar novos relatórios e modificar relatórios existentes sem necessidade de desenvolvimento adicional. O editor oferece: seleção de fontes de dados (qualquer base de dados da plataforma ou serviço exposto), construção visual do layout (cabeçalho, corpo, rodapé, tabelas, gráficos), definição de campos e colunas (arrastar e soltar campos das fontes de dados), configuração de filtros que o usuário poderá aplicar ao gerar (datas, dispositivos, regiões, tipos), definição de agrupamentos e ordenações, e configuração de formatos de saída suportados (PDF, Excel, HTML). Os templates são versionados: cada alteração registra autor, data e descrição da modificação.  
* **Filtros configuráveis:** Cada relatório do catálogo possui um conjunto de filtros que o usuário configura antes da geração. Filtros obrigatórios em todos os relatórios: período temporal com seleção manual de data de início e data de fim, e opções predefinidas periódicas (diária, semanal, mensal). Filtros adicionais conforme o domínio do relatório: tipo de dispositivo, localização (área, subárea, interseção), criticidade, estado, operador, técnico, entre outros. Os filtros de cada relatório são definidos no template e podem ser personalizados pelo administrador.  
* **Catálogo pessoal:** Cada usuário pode marcar relatórios como favoritos, criar atalhos com filtros pré-configurados (ex: "Alarmes críticos da minha região — última semana") e organizar seus relatórios mais utilizados para acesso rápido. Os atalhos armazenam os filtros selecionados, evitando que o usuário reconfigure os mesmos parâmetros repetidamente.  
* **Permissões por perfil:** O acesso aos relatórios é controlado por perfil de usuário. O administrador define quais categorias e relatórios específicos cada perfil pode acessar. Relatórios de auditoria, por exemplo, podem ser restritos ao perfil de gestor. Relatórios operacionais podem estar disponíveis a todos os operadores. A criação e edição de templates é restrita ao perfil de administrador.

## **Geração e Distribuição**

Recurso responsável pela execução do motor de geração de relatórios, processamento dos dados, formatação nos formatos de saída, programação automática e distribuição aos destinatários. O motor opera em segundo plano para não impactar a performance da plataforma, e implementa mecanismos de controle de carga para evitar gargalos.

**Funcionalidades**

* **Geração sob demanda:** O usuário seleciona um relatório do catálogo, configura os filtros desejados, seleciona o formato de saída e solicita a geração. O sistema processa a solicitação em segundo plano: o usuário não precisa aguardar na tela e pode continuar operando a plataforma. Quando o relatório está pronto, o sistema notifica o usuário e disponibiliza o arquivo para download. O histórico de relatórios gerados é mantido com: template utilizado, filtros aplicados, data de geração, formato, tamanho do arquivo, usuário solicitante e tempo de processamento.  
* **Geração programada (automática):** O usuário define uma programação periódica para geração automática de relatórios. Configurações disponíveis: frequência (diária, semanal, mensal, ou expressão cron personalizada), horário de execução (preferencialmente em horários de baixa carga), template e filtros fixos (o período é calculado automaticamente: ex. relatório diário gera dados do dia anterior), formato de saída, e destinatários (lista de usuários ou e-mails que receberão o relatório automaticamente). A programação pode ser ativada, desativada, editada e excluída a qualquer momento. O sistema registra cada execução automática: sucesso/falha, timestamp, tamanho, destinatários notificados.  
* **Formatos de saída:** O sistema suporta no mínimo três formatos de saída para todos os relatórios:

| Formato | Características | Uso Típico |
| :---- | :---- | :---- |
| PDF | Documento formatado com layout fixo, cabeçalho/rodapé institucional (logo EPMMOP), paginação, tabelas e gráficos. Não editável. | Documentação oficial, envio a entidades externas, arquivo. |
| Excel (XLS/XLSX) | Planilha com dados estruturados em colunas, formuláveis, filtráveis e pivotáveis pelo usuário. Editável. | Análise adicional pelo usuário, manipulação de dados, geração de gráficos personalizados. |
| HTML | Página web navegável com tabelas interativas, links internos e possibilidade de impressão. Visualizável no navegador. | Consulta rápida, compartilhamento via intranet, visualização sem software específico. |

* **Exportação direta da interface:** Além dos relatórios do catálogo, a plataforma permite exportar diretamente qualquer tabela ou lista de dados visível na interface de qualquer módulo. O usuário, ao visualizar uma lista (ex: lista de alarmes no módulo 4.14, lista de incidências no 4.11, lista de controladores), pode clicar em "Exportar" e gerar um arquivo PDF ou Excel com os dados visíveis, respeitando os filtros aplicados na interface. A exportação é processada em segundo plano para não bloquear a interface do usuário.  
* **Controle de carga e performance:** O sistema implementa mecanismos para evitar que a geração de relatórios impacte a performance da plataforma operacional: processamento em segundo plano (a geração ocorre em processos separados da aplicação principal), armazenamento temporário em cache (resultados parciais são armazenados para evitar reprocessamento), segmentação de dados (consultas grandes são divididas em blocos para não sobrecarregar as bases de dados), limite de 90.000 registros por solicitação (quando o resultado excede esse limite, o sistema sugere ao usuário segmentar o relatório por período ou por região, sem bloquear a geração mas alertando sobre possível lentidão), e fila de prioridade (relatórios sob demanda têm prioridade sobre relatórios programados).  
* **Filtros temporais padrão:** Todos os relatórios do sistema aceitam filtragem por período temporal com duas modalidades: seleção manual de data de início e data de fim (o usuário escolhe exatamente o período desejado), e opções predefinidas periódicas: diária (dia anterior), semanal (semana anterior, segunda a domingo), e mensal (mês anterior completo). As opções predefinidas agilizam a geração de relatórios recorrentes e são especialmente úteis na programação automática.  
* **Distribuição automática:** Relatórios gerados automaticamente são distribuídos conforme configuração: notificação na plataforma (o relatório fica disponível na caixa de relatórios do usuário), envio por e-mail com o arquivo anexo (PDF ou Excel), e armazenamento no repositório de relatórios gerados (acessível a todos os usuários com permissão). Cada distribuição registra: destinatários, canal (plataforma/e-mail), data de envio e confirmação de entrega.  
* **Repositório de relatórios gerados:** Todos os relatórios gerados (sob demanda e programados) são armazenados num repositório centralizado com busca por: template, período, usuário solicitante, data de geração e formato. O repositório possui política de retenção configurável: relatórios de períodos mais antigos podem ser automaticamente eliminados após um período definido (ex: 12 meses), com opção de arquivamento permanente para relatórios específicos marcados pelo usuário.  
* **Conectividade com fontes de dados:** O motor de geração de relatórios acessa dados de diversas fontes: bases de dados da plataforma (PostgreSQL, MySQL, MongoDB conforme a arquitetura de cada microsserviço), serviços REST/GraphQL expostos pelos módulos da plataforma (para dados calculados, agregações e métricas em tempo real), e dados pré-processados do módulo Analítico (métricas históricas, níveis de serviço, tendências). A conectividade é configurável pelo administrador no editor de templates, sem necessidade de código.

# **Exemplo de Uso**

**Cenário**

A engenheira de tráfego Ana Torres precisa preparar o relatório mensal de operação da rede semafórica para a gerência da EPMMOP. O relatório deve incluir dados de tráfego, estado de manutenção, alarmes e efetividade da otimização. Adicionalmente, ela configura a geração automática de um relatório diário de alarmes críticos para a equipe de manutenção.

**Passo 1 — Geração do Relatório Mensal sob Demanda**

Ana acessa o Catálogo de Relatórios e gera quatro relatórios para o mês de fevereiro:

| Relatório | Filtros Aplicados | Formato | Resultado |
| :---- | :---- | :---- | :---- |
| Dados de tráfego mensal | Período: Fev/2024. Escopo: toda a rede. | PDF | 42 páginas. Gerado em 45s. Volumes, LOS e tendências por corredor. |
| Incidências por período | Período: Fev/2024. Todos os tipos de dispositivo. | Excel | 1.847 registros. Gerado em 12s. Pivotável por tipo, severidade, região. |
| Aderência à preventiva | Período: Fev/2024. Todos os tipos. | PDF | 8 páginas. 94,2% de aderência. 12 manutenções atrasadas. |
| Efetividade da otimização | Período: Fev/2024. Todos os subsistemas. | PDF | 15 páginas. Redução média de atraso: 18,3%. |

Todos os relatórios são processados em segundo plano. Ana recebe uma notificação na plataforma conforme cada um é concluído. Ela faz download dos PDFs para compor o relatório gerencial e utiliza o Excel de incidências para análise detalhada das recorrências.

**Passo 2: Configuração de Relatório Diário Automático**

Ana configura a geração programada de um relatório diário:

| Parâmetro | Configuração |
| :---- | :---- |
| Template | Listado de alarmes |
| Filtros fixos | Criticidade: Crítico e Alto. Período: dia anterior (automático). |
| Frequência | Diária, às 06:00 |
| Formato | PDF |
| Destinatários | Equipe de manutenção (5 técnicos) \+ Supervisora María Fernanda |
| Distribuição | Notificação na plataforma \+ e-mail com PDF anexo |

A partir do dia seguinte, às 06:00, o sistema gera automaticamente o relatório com os alarmes críticos e altos do dia anterior e distribui para toda a equipe. Cada técnico inicia o dia com visibilidade dos problemas mais graves que requerem atenção.

**Passo 3:  Exportação Direta da Interface**

Durante a análise do relatório mensal, Ana identifica que a interseção CTRL-034 concentra 23% das incidências corretivas. Ela navega ao módulo de Inventário e Manutenção, filtra as incidências de fevereiro para CTRL-034, e utiliza a exportação direta:

| Ação | Resultado |
| :---- | :---- |
| Filtro na interface | Incidências de Fev/2024 para ativo CTRL-034: 47 registros. |
| Click "Exportar" | Seleção de formato: Excel. |
| Processamento | Em segundo plano. Arquivo disponível em 3s. |
| Resultado | Planilha com 47 incidências detalhadas: tipo, severidade, data, técnico, tempo de resolução, peças consumidas. |
| Uso | Ana identifica padrão: 18 de 47 incidências são falha de comunicação Ethernet, sugerindo degradação do módulo. Recomenda substituição preventiva. |

**Passo 4: Criação de Relatório Personalizado**

A gerência solicita um relatório específico que não existe no catálogo: "Resumo executivo de energia" cruzando dados de nobreaks com cortes de energia e impacto nas interseções. O administrador do sistema cria o novo template:

| Etapa | Detalhe |
| :---- | :---- |
| Fontes de dados | Módulo Nobreaks: eventos de transferência, autonomia. Módulo Alarmes: alarmes de controlador offline. |
| Layout | Cabeçalho EPMMOP \+ período. Seção 1: resumo de cortes (total, duração média, regiões). Seção 2: interseções sem proteção. Seção 3: nobreaks com batería degradada. |
| Filtros | Período (obrigatório). Região (opcional). |
| Formatos | PDF e Excel. |
| Publicação | Adicionado ao catálogo na categoria "Nobreaks". Disponível para perfis Gestor e Engenheiro. |

O novo relatório é criado no editor visual sem nenhuma linha de código. Ana configura programação mensal para a gerência.

# **Impacto em Outros Módulos**

**Modelo de Tráfego:** Fornece dados de topologia (interseções, áreas, rotas) para contextualizar relatórios geográficos. Estratégias vigentes e histórico de ativações alimentam relatórios de operação.

**Controladores:** Fornece dados de estado, temporizações, intervenções manuais e histórico de comandos para relatórios de operação de controladores.

**PMV:** Fornece estado dos painéis, histórico de mensagens exibidas e alarmes de PMV para relatórios específicos de PMV.

**Inventário e Manutenção**: Fonte principal de dados para relatórios de manutenção: incidências, OS, aderência à preventivas, consumo de materiais, MTBF, MTTR, custos. Também fornece o cadastro de ativos para relatórios de inventário.

**Emergências:** Fornece dados de eventos de emergência, protocolos ativados, tempos de resposta e efetividade para relatórios de emergências e planos de resposta.

**Alarmes:** Fornece dados de alarmes gerados, tempos de confirmação, recorrências e tendências para relatórios de alarmes. Fonte crítica para o relatório diário de alarmes críticos.

**Simulação:** Fornece resultados de simulações, comparações base vs. proposta e análise de precisão para relatórios técnicos de engenharia de tráfego.

**Controle:** Fornece dados de desempenho de subsistemas, logs de otimização, comparação otimizado vs. estático para relatórios de efetividade da otimização.

**Nobreaks:** Fornece dados de estado de nobreaks, eventos de energia, saúde de baterias e análise de impacto para relatórios de energia e continuidade operacional.

**Câmeras:** Fornece estado operacional, disponibilidade e histórico de câmeras para relatórios de videomonitoramento.

**Analítico**: Fornece métricas processadas e agregadas (níveis de serviço, tempos de percurso, tendências) para relatórios de desempenho da rede.

**Painel de Operações:** A exportação direta da interface é acessada a partir de qualquer tela do Painel ou de módulos individuais. O Painel não fornece dados próprios, mas é o ponto de acesso mais frequente para exportações rápidas.

**4.18. Dashboard (Global)**

Tipo: **Dependente**

### **Contexto e Justificativa**

O módulo de Dashboard Global é a camada de visualização, monitoramento e apoio à tomada de decisão que consolida informações de todos os módulos da plataforma Attlas em quadros de comando (quadros de mando) interativos e configuráveis. Classificado como dependente, este módulo não possui lógica de negócio própria: ele consome dados de Controladores, Detectores, Câmeras, PMV, Inventário e Manutenção, Emergências, Alarmes, Simulação, Controle, Nobreaks, Modelo de Tráfego e Analítico para produzir visões consolidadas através de indicadores de rendimento (KPIs), gráficos interativos e painéis configuráveis.

A diferença fundamental entre o Dashboard Global e os dashboards individuais de cada módulo é o escopo e o público-alvo. Cada módulo funcional possui seu próprio dashboard focado exclusivamente no seu domínio: o dashboard de Alarmes mostra KPIs de alarmes, o de Nobreaks mostra saúde de baterias, o de Controle mostra efetividade da otimização. O Dashboard Global, por outro lado, cruza dados de múltiplos domínios para responder perguntas transversais: "qual é o estado geral da rede semafórica neste momento?", "como está a saúde operacional da infraestrutura completa?", "quais são as tendências de tráfego e manutenção ao longo do tempo?". Também se diferencia do Dashboard Operacional Integrado do Painel de Operações (4.15), que é focado na operação em tempo real do turno: o Dashboard Global inclui visões estratégicas de longo prazo e analíticas que não pertencem ao ciclo operacional imediato.

O módulo disponibiliza três tipos de quadros de comando, cada um direcionado a um perfil de usuário e a um tipo de decisão: o Quadro de Comando Estratégico (KPIs de alto nível, cumprimento de metas, tendências de longo prazo, comparações entre períodos), o Quadro de Comando Operacional (para supervisores e coordenadores — estado atual da rede, situações que requerem atenção, indicadores de disponibilidade e resposta), e o Quadro de Comando Analítico (para engenheiros de tráfego, análise de tendências, padrões históricos, correlações entre variáveis, apoio à predição).

O módulo pode ser desenvolvido nativamente na plataforma ou integrado a ferramentas de análise de dados de terceiros (ex: Grafana, Metabase, Apache Superset), garantindo estabilidade e evitando ralentização da plataforma operacional. Os dados são consumidos através dos serviços e bases de dados da plataforma, sem impactar as operações em tempo real.

**Relação entre os diferentes níveis de dashboard da plataforma**

| Dashboard | Módulo | Escopo | Público |
| :---- | :---- | :---- | :---- |
| Dashboard de domínio | Cada módulo funcional (Alarmes, Nobreaks, Controle, etc.) | KPIs de um único domínio funcional | Operadores e engenheiros do domínio |
| Dashboard Operacional Integrado | Painel de Operações | Estado atual da operação em tempo real (turno) | Operadores do centro de controle |
| Quadro de Comando Estratégico | Dashboard Global (este módulo) | KPIs de alto nível, metas, tendências de longo prazo | Gerência e direção da EPMMOP |
| Quadro de Comando Operacional | Dashboard Global (este módulo) | Estado consolidado da rede, saúde da infraestrutura | Supervisores e coordenadores |
| Quadro de Comando Analítico | Dashboard Global (este módulo) | Tendências, padrões, correlações, predição | Engenheiros de tráfego |

# **Recursos**

## **Quadros de Comando**

Recurso central do módulo, responsável pela apresentação dos três tipos de quadros de comando que consolidam informações transversais da plataforma. Cada quadro é composto por widgets (indicadores numéricos, gráficos, tabelas, mapas) que consomem dados em tempo real e históricos de múltiplos módulos.

**Funcionalidades**

**Quadro de Comando Estratégico**

Direcionado à gerência. Apresenta visão de alto nível sobre o desempenho global da rede semafórica, cumprimento de metas operacionais e tendências de longo prazo. Atualização típica: diária/semanal.

| Categoria de KPI | Indicadores |
| :---- | :---- |
| Disponibilidade da rede | Percentual de controladores operativos vs. total instalado (meta configurável, ex: 98%). Percentual de câmeras online. Percentual de detectores operativos. Tendência mensal de disponibilidade (gráfico de evolução). Comparação com período anterior (mês atual vs. mês anterior, trimestre vs. trimestre). |
| Qualidade do tráfego | Nível de serviço médio da rede (LOS consolidado). Tempo médio de percurso nos principais corredores vs. meta. Redução de atraso atribuível à otimização do Controle (4.16). Evolução mensal do LOS por região. |
| Manutenção e confiabilidade | Aderência à manutenção preventiva (% realizado vs. programado). MTBF e MTTR médios por tipo de dispositivo. Custo total de manutenção por período. Top 10 ativos com mais incidências recorrentes. |
| Resposta a emergências | Tempo médio de resposta (detecção a normalização). Número de eventos por tipo e severidade. Percentual resolvidos sem escalonamento. Tempo médio de chegada de veículos prioritários com corredor verde. |
| Alarmes e SLA | Tempo médio de confirmação de alarmes críticos vs. SLA. Percentual de alarmes confirmados dentro do SLA. Volume de alarmes por período (tendência: subindo ou descendo). |
| Energia e continuidade | Número de cortes de energia por região e período. Autonomia média dos nobreaks. Percentual de interseções protegidas por nobreak. Nobreaks com batería degradada (previsão de substituição). |
| Simulação e validação | Percentual de estratégias validadas por simulação antes de implementar. Precisão média das simulações (simulado vs. real). Volume de simulações executadas por período. |

**Quadro de Comando Operacional**

Direcionado a supervisores e coordenadores operacionais. Apresenta o estado atual consolidado da rede semafórica, identificando situações que requerem atenção imediata. Diferente do Dashboard Operacional do Painel de Operações (que é focado na operação do turno com visão de mapa), este quadro apresenta visão consolidada em gráficos e indicadores sem dependência de contexto geográfico. Atualização: tempo real.

| Categoria de KPI | Indicadores |
| :---- | :---- |
| Saúde da infraestrutura | Dispositivos por estado (operativo, com alarme, offline, em manutenção) — segmentado por tipo. Percentual de disponibilidade atual vs. meta. Dispositivos que mudaram de estado nas últimas 4 horas (detecção de degradação rápida). |
| Alarmes ativos | Total de alarmes ativos por criticidade (crítico, alto, médio, baixo). Alarmes aguardando confirmação (com tempo decorrido). Tempo médio de confirmação no turno atual. Últimos alarmes críticos com dispositivo e localização. |
| Tráfego atual | Fluxo veicular total da rede (veículos/hora atual vs. média histórica para este horário). Corredores com pior nível de serviço. Interseções com congestionamento (LOS E/F). Detecção automática de congestionamentos e embotellamentos (interseções com ocupação acima de limiar configurável). |
| Emergências e eventos | Eventos de emergência ativos (quantidade, tipo, severidade, tempo desde ativação). Protocolos em execução. Veículos prioritários em operação. Eventos em via registrados (acidentess, obras, condições climáticas). |
| Manutenção em campo | OS corretivas abertas por severidade e SLA. Técnicos em campo (quantidade, localização). Manutenções preventivas do dia (concluídas vs. pendentes). |
| Otimização em tempo real | Subsistemas com otimização ativa vs. inativos. Melhoria média de atraso da rede atribuível ao Controle. Subsistemas com alertas (desempenho inferior ao estático, detector offline). |
| Energia | Nobreaks em modo batería (quantidade, localização, autonomia restante). Interseções sem proteção de nobreak afetadas por corte de energia. |

**Quadro de Comando Analítico**

Direcionado a engenheiros de tráfego e analistas. Apresenta ferramentas de análise de tendências, padrões históricos, correlações entre variáveis e apoio à predição de comportamentos futuros do tráfego. Atualização: sob demanda (o engenheiro seleciona períodos e parâmetros).

| Categoria | Funcionalidades Analíticas |
| :---- | :---- |
| Tendências de tráfego | Evolução de volumes por detector, interseção, corredor e área ao longo do tempo (horas, dias, semanas, meses). Comparação de perfis horários entre dias da semana (ex: terça vs. quarta). Identificação de sazonalidades e padrões recorrentes. Detecção de anomalias (dias com tráfego significativamente diferente do padrão). |
| Análise de congestionamento | Mapa de calor de congestionamento por horário e dia da semana. Identificação de interseções gargalo (LOS E/F recorrente). Tempos médios de espera por interseção e corredor (visualização temporal). Correlação entre congestionamento e eventos (obras, acidentes, clima). |
| Desempenho de estratégias | Comparação de métricas de tráfego durante vigência de diferentes estratégias na mesma subárea. Identificação de estratégias com melhor e pior desempenho por horário. Histórico de ativações de estratégias com impacto medido. |
| Confiabilidade de dispositivos | Curvas de falha por tipo de dispositivo (evolução de MTBF ao longo do tempo). Correlação entre idade do ativo e frequência de falhas. Predição de falhas baseada em tendência de degradação (especialmente baterias de nobreaks). Análise de causa raíz: tipos de incidência mais frequentes por modelo/fabricante. |
| Predição de padrões | Apoio à predição de padrões futuros de tráfego com base em dados históricos. Projeção de volumes para os próximos dias/semanas com base em séries temporais. Predição de congestionamentos para eventos programados (baseado em histórico de eventos similares). Identificação de períodos críticos futuros (cruzamento de demanda projetada com capacidade da rede). |
| Correlações multivariáveis | Explorador de correlações entre variáveis de diferentes domínios: fluxo veicular vs. alarmes gerados, temperatura ambiente vs. falha de nobreaks, eventos de emergência vs. fluxo nas regiões adjacentes, cortes de energia vs. região geográfica e horário. Permite ao engenheiro descobrir relações não óbvias entre variáveis operacionais. |
| Reportes de fluxo vehicular | Geração de relatórios de fluxos veiculares segmentados por horário e dia, diretamente a partir das visualizações analíticas. O engenheiro pode selecionar um gráfico ou tabela e exportar para o módulo de Relatórios (4.18) para formatação e distribuição. |

Elementos visuais interativos: Todos os quadros de comando utilizam elementos visuais interativos: indicadores numéricos (KPIs) com tendência (seta indicando melhoria/piora), gráficos de linha (evolução temporal), gráficos de barra (comparações entre períodos ou regiões), gráficos de pizza/donut (distribuições por tipo ou estado), mapas de calor (concentração geográfica), gauges (velocimetros para percentuais vs. meta), tabelas interativas (orderáveis, filtráveis, com drill-down para detalhes), e sparklines (mini-gráficos de tendência dentro de tabelas). Cada elemento é interativo: ao clicar num ponto de dados, o usuário pode navegar até o detalhe no módulo correspondente.

Filtros globais: Cada quadro de comando possui filtros globais que se aplicam a todos os widgets simultâneamente: período temporal (hoje, últimas 24h, última semana, último mês, período personalizado), região geográfica (área, subárea, ou toda a rede), e tipo de dispositivo (quando aplicável). Os filtros permitem ao usuário focar na dimensão de interesse sem reconfigurar cada widget individualmente.

Drill-down para módulos: Todos os KPIs e gráficos são navegáveis: ao clicar num indicador, o usuário é direcionado ao módulo funcional correspondente com o contexto preservado. Exemplos: clicar num alarme crítico navega ao detalhe do alarme no módulo; clicar numa interseção com congestionamento navega ao painel de operações centrado nessa interseção; clicar num indicador de manutenção preventiva navega ao calendário do módulo. Esta navegação contextual elimina a necessidade de o usuário buscar manualmente a informação de detalhe.

Atualização automática: Cada quadro de comando tem frequência de atualização configurável: o Quadro Operacional atualiza em tempo real (WebSocket ou polling curto), o Quadro Estratégico atualiza em intervalos configuráveis (ex: a cada hora, diário), e o Quadro Analítico atualiza sob demanda quando o usuário altera filtros ou períodos. A atualização é incremental: apenas os widgets com dados alterados são redesenhados, evitando recarregamento completo da tela.

## **Configuração e Personalização**

Recurso que permite ao administrador e aos usuários configurar e personalizar os quadros de comando de acordo com suas necessidades, sem dependência de desenvolvimento adicional. A personalização opera em dois níveis: configuração institucional (definida pelo administrador, aplicável a perfis de usuário) e configuração pessoal (definida pelo próprio usuário, aplicável apenas à sua sessão).

**Funcionalidades**

* **Editor de layouts:** O administrador define o layout padrão de cada quadro de comando: quais widgets são exibidos, em qual posição e tamanho, com quais fontes de dados e configurações de visualização. O editor é visual (drag-and-drop): o administrador arrasta widgets para uma grade configurável, redimensiona, e configura cada widget individualmente (fonte de dados, tipo de gráfico, cores, limiares de alerta). Os layouts padrão são associados a perfis de usuário: o perfil "Gerência" carrega o Quadro Estratégico por padrão, o perfil "Supervisor" carrega o Quadro Operacional, o perfil "Engenheiro" carrega o Quadro Analítico.  
* **Biblioteca de widgets:** O sistema disponibiliza uma biblioteca de widgets pré-configurados que podem ser adicionados a qualquer quadro de comando: indicador numérico (KPI com valor, tendência, meta e limiar de cor), gráfico de linha (série temporal com múltiplas séries), gráfico de barra (horizontal ou vertical, simples ou agrupado), gráfico de pizza/donut (distribuição percentual), mapa de calor (geográfico ou temporal), gauge/velocímetro (percentual vs. meta), tabela interativa (com ordenação, filtros e drill-down), sparkline (mini tendência embutida em tabela), mapa geográfico (com camadas de dados), e contador animado (para KPIs de destaque). Cada widget é configurável em: fonte de dados, período, filtros fixos, cores, limiares e frequência de atualização.  
* **Personalização por usuário:** Cada usuário pode personalizar sua visão do quadro de comando sem afetar os demais: reorganizar widgets (arrastar para nova posição), ocultar widgets que não utiliza, adicionar widgets da biblioteca ao seu layout pessoal, alterar tamanho de widgets, e salvar múltiplos layouts pessoais para alternar (ex: "Minha visão diária", "Minha visão de pico AM"). O layout institucional é mantido como baseline: o usuário pode sempre restaurar o layout padrão do seu perfil.  
* **Configuração de metas e limiares:** O administrador define metas institucionais que alimentam os indicadores estratégicos: meta de disponibilidade da rede (ex: 98%), meta de aderência à preventiva (ex: 95%), SLA de confirmação de alarmes críticos (ex: 30 segundos), SLA de resolução de incidências por severidade, meta de tempo de percurso por corredor. Cada meta é associada a limiares de cor: verde (acima da meta), amarelo (próximo), vermelho (abaixo). Os KPIs estratégicos exibem automaticamente a comparação valor real vs. meta.  
* **Permissões por perfil:** O acesso a cada quadro de comando é controlado por perfil de usuário. O administrador define quais perfis têm acesso a cada tipo de quadro e quais widgets podem visualizar. Widgets com dados sensíveis (ex: custos de manutenção, dados de auditoria) podem ser restritos a perfis específicos. A edição de layouts institucionais e configuração de metas é restrita ao perfil de administrador.  
* **Modo apresentação:** Os quadros de comando podem ser exibidos em modo de apresentação (fullscreen), ideal para exibição em telas de grandes dimensões no centro de controle ou em reuniões gerenciais. No modo apresentação, os widgets são redimensionados automaticamente, os filtros são ocultados, e o quadro pode rotacionar automaticamente entre múltiplas visões (ex: alternar entre Estratégico e Operacional a cada 60 segundos).

# **Exemplo de Uso**

**Cenário**

Três usuários da EPMMOP acessam o Dashboard Global na mesma manhã de segunda-feira, cada um com uma necessidade diferente: a diretora de operações Lucía Morales precisa do resumo semanal para a reunião gerencial, o supervisor Carlos Mendoza precisa verificar o estado geral da rede para o início do turno, e o engenheiro Ricardo Espinoza precisa analisar tendências de congestionamento num corredor específico.

**Passo 1: Quadro Estratégico (Diretora Lucía Morales)**

Lucía faz login e o sistema carrega automaticamente o Quadro Estratégico (padrão do perfil Gerência). Filtro global: última semana.

| KPI | Valor | Meta | Status |
| :---- | :---- | :---- | :---- |
| Disponibilidade da rede | 97,8% | 98% | Amarelo (↓ 0,2 p.p. vs. meta) |
| Aderência à preventiva | 96,1% | 95% | Verde (↑ 1,1 p.p. acima da meta) |
| Tempo médio confirmação alarme crítico | 18s | 30s | Verde (40% abaixo do SLA) |
| LOS médio da rede | C | C | Verde (dentro da meta) |
| Redução de atraso por otimização | \-18,3% | — | Indicador informativo |
| Cortes de energia (setor norte) | 3 | 0 | Vermelho (3 eventos na semana) |

Lucía identifica dois pontos de atenção: disponibilidade ligeiramente abaixo da meta (clica no KPI e vê que 4 controladores estão offline por manutenção corretiva) e 3 cortes de energia no setor norte (clica e navega ao Dashboard de Nobreaks para detalhes). Exporta a visão como PDF para a reunião gerencial via módulo de Relatórios.

**Passo 2: Quadro Operacional (Supervisor Carlos Mendoza)**

Carlos faz login e o sistema carrega o Quadro Operacional (padrão do perfil Supervisor). Visão em tempo real.

| Seção | Informação Exibida |
| :---- | :---- |
| Saúde da infraestrutura | 1.236 controladores operativos (97,8%), 4 offline, 2 com alarme. 887 câmeras online (99,2%). 648 detectores operativos (99,7%). |
| Alarmes ativos | 7 alarmes: 1 crítico (CTRL-102 offline há 45 min, aguardando confirmação), 2 altos, 4 médios. Tempo médio de confirmação no turno: 22s. |
| Tráfego atual | Fluxo 92% da média histórica para 07:30 segunda-feira. 3 interseções em LOS E (congestionamento): CTRL-034, CTRL-045, CTRL-078. |
| Emergências | Nenhum evento ativo. |
| Manutenção | 6 OS corretivas abertas (2 críticas). 3 técnicos em campo. 4 preventivas programadas para hoje (0 concluídas). |
| Otimização | 31 de 47 subsistemas ativos. Melhoria média de atraso: \-17,9%. 1 alerta: SUB-041 desempenho inferior ao estático. |
| Energia | Todos os nobreaks em modo rede. Nenhum corte ativo. |

Carlos identifica o alarme crítico pendente de confirmação (CTRL-102 offline há 45 min). Clica no indicador e o sistema navega ao módulo de Alarmes diretamente no detalhe do alarme. Também observa o alerta do SUB-041 no Controle e programa verificação após tratar o alarme crítico.

**Passo 3: Quadro Analítico (Engenheiro Ricardo Espinoza)**

Ricardo faz login e acessa o Quadro Analítico. Seleciona filtros: Corredor Av. Amazonas, últimos 30 dias.

| Análise | Resultado |
| :---- | :---- |
| Tendência de volume | Volume matutino (07:00-09:00) aumentou 8,3% nos últimos 30 dias vs. período anterior. Gráfico mostra crescimento progressivo. |
| Congestionamento recorrente | CTRL-034 (Amazonas/Colón) aparece em LOS E/F em 78% dos dias úteis no pico AM. Mapa de calor confirma o gargalo. |
| Correlação | Ricardo ativa o explorador de correlações: fluxo no CTRL-034 vs. fluxo no CTRL-033 adjacente. Coeficiente 0,91 — alta interdependência. |
| Predição | Modelo projeta que, mantida a tendência, o corredor atingirá LOS F consolidado em 45 dias. Recomendação: revisar estratégia de pico ou redistribuir demanda. |
| Ação | Ricardo exporta a análise para o módulo de Simulação (4.15) como base para um novo cenário de teste com temporizações otimizadas. |

# **Impacto em Outros Módulos**

* **Modelo de Tráfego:** Fornece dados topológicos para contextualizar indicadores geográficos. Estratégias e seu histórico alimentam o Quadro Estratégico e o Quadro Analítico.  
* **Controladores:** Fornece estado operacional, disponibilidade e histórico de intervenções para indicadores de saúde da infraestrutura em todos os quadros.  
* **Detectores:** Fonte primária de dados de tráfego (volumes, velocidades, ocupação) para indicadores de fluxo veicular, tendências e análise de congestionamento.  
* **Analítico:** Fornece métricas processadas (LOS, tempos de percurso, tendências, predições) que alimentam especialmente o Quadro Analítico e os indicadores de qualidade de tráfego do Quadro Estratégico.  
* **Alarmes**: Fornece volume, distribuição e tempos de confirmação de alarmes para indicadores operacionais e estratégicos.  
* I**nventário e Manutenção**: Fornece dados de incidências, OS, aderência preventiva, MTBF, MTTR e custos para indicadores de manutenção nos Quadros Estratégico e Operacional.  
* **Emergências**: Fornece dados de eventos, tempos de resposta e efetividade para indicadores de emergência em todos os quadros.  
* **Controle**: Fornece métricas de otimização (subsistemas ativos, melhoria de atraso, alertas) para indicadores de operação e estratégia.  
* **Nobreaks**: Fornece estado de nobreaks, eventos de energia e saúde de baterias para indicadores de continuidade operacional.  
* **Simulação**: Fornece dados de validação e precisão para indicadores estratégicos. O Quadro Analítico pode exportar análises como base para novos cenários de simulação.  
* **PMV**: Fornece estado de painéis e histórico de mensagens para indicadores de disponibilidade de dispositivos.  
* **Câmeras:** Fornece disponibilidade e estado operacional para indicadores de saúde da infraestrutura.  
* **Relatórios**: Os quadros de comando permitem exportar visualizações e dados para o módulo de Relatórios para formatação como documentos oficiais.  
* **Painel de Operações:** O Dashboard Global complementa o Painel de Operações: o Painel é a interface operacional baseada em mapa; o Dashboard Global é a interface analítica baseada em indicadores. O operador navega entre ambos conforme a necessidade.

# **5\. Considerações Finais**

## **5.1. Princípios de Agrupamento**

A organização modular do Attlas segue os seguintes princípios:

* Coerência funcional: cada módulo agrupa recursos que pertencem ao mesmo domínio de negócio e são operados pelo mesmo perfil de usuário.

* Independência de navegação: cada módulo pode existir como um item de menu próprio na interface, com suas próprias telas e workflows.

* Reutilização transversal: módulos dependentes podem consumir dados de múltiplos módulos sem duplicação de responsabilidades.

* Flexibilidade comercial: a classificação em Core/Funcional/Dependente permite compor licenças adaptadas às necessidades e orçamento de cada cliente.

## **5.2. Próximos Passos**

Após a validação deste documento, os seguintes passos são:

* Validação de stakeholders de negócio para confirmar a taxonomia de módulos e a classificação de tipos.

* Definição da matriz de dependências detalhada para planejamento de implementação incremental.

* Alinhamento com a equipe de design (wireframes) para garantir que a estrutura modular se reflita na experiência de navegação do usuário.

* Revisão periódica da estrutura modular conforme o sistema evolui e novos requisitos surgem.