Implemente o vínculo bidirecional entre o ACOM e as instâncias de analítico, com orquestração pelo ms-video-analytics.

Antes de alterar o código, examine os contratos, fluxos e documentos atuais no repositório e no Obsidian. A solicitação original cita ms-acom, mas a documentação do projeto indica que essa responsabilidade foi absorvida por ms-controllers. Confirme qual serviço é responsável pelo ACOM na arquitetura vigente, siga essa arquitetura e registre qualquer divergência encontrada.

Confirme também, no código e na documentação do equipamento, a que dispositivo e protocolo pertencem as portas 81 e 82. Não presuma endpoints, formatos de mensagem ou responsabilidades que não estejam documentados ou implementados.

O serviço responsável pelo ACOM deve informar ao ms-video-analytics o IP, a porta e os identificadores necessários para associar o ACOM à instância correta de analítico. O ms-video-analytics deve orquestrar a leitura e a configuração do vínculo e atualizar ou confirmar seu estado quando aplicável. Defina o contrato dessa comunicação e trate validação dos dados, falhas, repetição de requisições e consistência do vínculo.

O Virtual Loop usa comunicação TCP com mensagens JSON. O ATSPM usa requisições HTTP à API do aplicativo de analítico. A porta 81 é indicada para leitura (GET) e a porta 82 para escrita (PUT); confirme essas informações na documentação e no código antes de implementá-las. Se as portas variarem por tipo de analítico, equipamento ou ambiente, documente e implemente a regra confirmada.

Na tela de detecção do analítico, exiba a porta associada em um campo somente leitura. O valor deve vir do estado retornado pelo backend e refletir o vínculo atual.

Atualize a documentação pertinente, incluindo o mapa de endpoints, exemplos de requisição e resposta e regras de negócio confirmadas durante a implementação. Adicione testes para os fluxos e falhas relevantes e execute as verificações adequadas aos projetos alterados.

Abra uma PR com um resumo da solução, das decisões técnicas, dos documentos atualizados e das verificações executadas. Se a arquitetura ou o protocolo documentado contradisser algum requisito deste pedido, explique a divergência na PR e implemente o comportamento sustentado pelas fontes atuais do projeto.
