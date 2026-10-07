---
tags:
  - doc
  - cameras
  - explicação
aliases:
  - "Câmeras - Estados de cadastro"
atualizado: 2026-10-07
---

# Câmeras - Cadastro - Explicação - Estados de cadastro

Volta para [[Câmeras - Cadastro]].

## Resumo

Toda câmera cadastrada está em um de quatro estados, que dizem em que ponto da instalação o equipamento está.
O estado não é a conexão: uma câmera Operativa pode estar Offline, e uma câmera Em estoque pode responder na
rede.

| Estado | O que quer dizer |
| --- | --- |
| Em estoque | Cadastrada, ainda não instalada ou sem vídeo |
| Em testes | Em validação técnica |
| Em campo | Instalada, com a integração ainda pendente |
| Operativa | Pronta e liberada para a operação |

## Como o estado é decidido

1. **No cadastro pela tela, quem decide é o sistema.** Ao salvar, o Attlas se conecta à câmera e procura um
   vídeo que ele saiba exibir (H.264 ou H.265). Se acha, a câmera entra Operativa; se não acha, ou se a câmera
   não responde, ela entra Em estoque. O formulário de cadastro não tem campo de estado.
2. **A troca manual de estado não tem tela.** Depois do cadastro, só um integrador pela API consegue mudar o
   estado. A edição da câmera não troca o estado.
3. **O estado anda um passo por vez.** A ordem é Em estoque, Em testes, Em campo e Operativa. A câmera pode
   avançar ou voltar um passo, nunca pular: de Em estoque não se vai direto para Em campo.
4. **A substituição troca o estado das duas câmeras.** Só se substitui uma câmera Operativa ou Em campo, e a
   substituta precisa estar Em estoque. A substituta assume o estado da antiga, e a antiga volta para Em estoque.
5. **Fora de Operativa, o VMS pede confirmação.** No mosaico do VMS, o primeiro comando de PTZ numa câmera que
   não está Operativa abre uma confirmação. A confirmação vale para aquele quadro do mosaico até o fim da sessão.

## Exemplo

O operador cadastra duas câmeras no mesmo lote: a câmera 1, já instalada na Avenida A e transmitindo, e a
câmera 2, uma reserva que ainda está na caixa, desligada.

- A câmera 1 responde e tem vídeo H.264. Ela entra **Operativa** e já aparece com o vídeo ao vivo.
- A câmera 2 não responde. Ela entra **Em estoque**, e o cadastro avisa que a câmera não pôde ser verificada.
  O usuário e a senha digitados ficam gravados mesmo assim.
- Meses depois, a câmera 1 queima. O operador abre a substituição na câmera 1, escolhe a câmera 2 (que está Em
  estoque) e informa o motivo "defeito técnico". A câmera 2 passa a ser **Operativa**, com a posição da Avenida A
  e os presets padrão da câmera 1, e entra nas cenas do VMS onde a câmera 1 estava. A câmera 1 volta para
  **Em estoque**.
