---
tags:
  - cameras
  - explicação
atualizado: 2026-10-01
---

# Câmeras - Estados de cadastro

Toda câmera cadastrada está em um de quatro estados:

1. **Em estoque**: cadastrada, ainda não instalada ou sem vídeo.
2. **Em testes**: em validação técnica.
3. **Em campo**: instalada, com a integração ainda pendente.
4. **Operativa**: pronta e liberada para a operação.

No cadastro pela tela, quem decide é o sistema: a câmera em que a validação de credenciais encontrou vídeo
entra Operativa, e a que não tem vídeo entra Em estoque. A troca manual de estado depois do cadastro ainda
não tem tela; hoje ela só é feita pela API.

A câmera avança um estado por vez e pode voltar um passo. Na substituição de equipamento, a câmera nova
precisa estar Em estoque e assume o estado da antiga, que volta para Em estoque.

Fora de Operativa, o VMS pede confirmação antes do primeiro comando de PTZ na câmera. Esse estado não é a
conexão: uma câmera Operativa pode estar Offline.
