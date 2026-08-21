Pronto, funcionando:

- openssh-server instalado, serviço ativo e ouvindo em 0.0.0.0:22, ufw inativo, então nada bloqueia. Login por senha e por chave habilitados, authorized_keys ainda vazio.
- Tailscale SSH ligado (RunSSH: true nas prefs). Não consegui validar daqui porque conexão do próprio nó pro próprio IP do tailnet não passa pelo interceptador do tailscaled, o teste local caiu no sshd normal como esperado. O teste de verdade é do Mac: se ssh afonso@afonso-dell-dc14250 entrar sem pedir senha, o Tailscale SSH está valendo; se der Permission denied, é a ACL do tailnet que não tem regra de ssh, e aí sudo tailscale set --ssh=false volta ao sshd normal, que atende tanto na LAN quanto pelo IP do tailnet. Você não fica sem acesso em nenhum dos casos.

Do Mac: ssh afonso@afonso-dell-dc14250 (qualquer rede, pelo tailnet) ou ssh afonso@10.0.0.178 na LAN, e Remote-SSH no mesmo host abrindo ~/Área de trabalho/Developer/attlas-2026.