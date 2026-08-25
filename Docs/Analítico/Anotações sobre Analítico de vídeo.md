##### Analíticos avançados
- funcionalidades: 
  laço virtual (renomeado)
  ativação de laço (ativa o laço virtual)
  detecção automatica de incidentes
  métricas de desempenho
- considerar cada feature do atspm como um sub-produto

#### Virtual loop
	laço
	detecção de objetos

#### Métricas avançadas (ATSPM), ligado a um grupo semafórico
Garantir associação entre grupos de movimento e grupos semafóricos 1x1
Garantir que 1 movimento faz parte de apenas 1 grupo de movimento.
Guardar um snapshot da configuração do grupo semafórico.
Considerar listagem de features e arquitetura da câmera no momento do cadastro/analitico 
Considerar arquitetura do processador/modelo da camera, com a compatibilidade de cada variante da aplicação do virtual loop / analise avançada
#### Presets
Registrar snapshot e persistir em memória baseado em preset. (device PTZ pode ter mais de um)
Visualizar o snapshot do vídeo sobre o player enquanto estiver no momento do desenho.
#### Analítico
Não é possivel cadastrar dois analiticos do mesmo tipo associados a mesma cãmera. (salvo se for analítico servidor, e não o embarcado).
Healtcheck para saúde da conexão do analitico com a camera.
#### Acom
Portar toda a configuração de ACOM para controladores, lógica de sáida deverá ser considerado como configuraçoes avançadas. Devem se chamar **Pefiréfiros ACOM**.

O módulo controlador será o responsável por gerenciar ACOM, e dentro deste será configurado analíticos.
Remover feature de associações, pois teremos relação 1x1 entre ACOM e Controlador

Multiplas ACOMS podem estar associadas a um unico analitico (no caso de analitico servidor, desacoplado)
Um ACOM suporta até 4 analiticos,  e cada analitico tem um máximo de 4 laços por câmera.

### obs gerais a considerar:
	Considerar atualização da aplicação remotamente em cameras embarcadas
	Registrar número de detecções de incidentes por câmera, pois podem haver casos em que um mesmo incidente aparece diversas vezes.

As imagens de detecção de objetos no histórico do analítico no attlas 25, estão com as imagens com baixa qualidade.
Validar se a imagem é gerada pelo lado Attlas x camera, para que possamos propor uma solução melhor.
### Arquitetura de serviços:
	ms-cameras
	ms-atspm
	ms-dai
	ms-virtual-loop


