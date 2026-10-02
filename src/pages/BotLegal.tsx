import { Link } from "react-router-dom";
import { ArrowLeft, Bot, Shield, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const ATUALIZACAO = "10 de julho de 2026";

export default function BotLegal() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-institutional text-gold-light">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bot className="h-7 w-7" />
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">Bot Judicial — Termos e Privacidade</h1>
              <p className="text-xs md:text-sm opacity-80">
                Sistema Judicial da Secretaria de Justiça e Cidadania
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm" className="rounded-xl">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Início</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Atualizado em {ATUALIZACAO}</Badge>
          <Badge variant="outline">Aplicável ao Bot do Discord vinculado ao Sistema Judicial</Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Esta página é mantida pela administração do Sistema Judicial para esclarecer o
          funcionamento do bot do Discord utilizado para envio de notificações oficiais
          (intimações, movimentações processuais, prazos e comunicados). O uso do bot está
          condicionado à aceitação dos termos abaixo.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" /> Termos de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <section>
              <h2 className="font-semibold mb-1">1. Finalidade</h2>
              <p>
                O bot integra o Sistema Judicial e envia, por mensagem direta (DM) no Discord,
                comunicados oficiais decorrentes de atos processuais praticados na plataforma —
                notadamente intimações, ciência de movimentações, alertas de prazo, convocações
                de jurados e comunicados do cartório.
              </p>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">2. Elegibilidade</h2>
              <p>
                Somente usuários maiores de 13 anos, com conta válida no Discord e cadastro ativo
                no Sistema Judicial, podem receber mensagens do bot. O uso é destinado
                exclusivamente a fins de simulação jurídica dentro do ambiente do servidor.
              </p>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">3. Cadastro do Discord ID</h2>
              <p>
                Para receber as DMs, o usuário deve informar seu Discord ID (17–20 dígitos
                numéricos) em seu perfil e manter as DMs abertas para membros do servidor. O
                envio pode falhar se o usuário bloquear o bot, sair do servidor ou desativar DMs.
              </p>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">4. Uso permitido</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Receber comunicações judiciais destinadas ao próprio usuário;</li>
                <li>Consultar links diretos para o processo referenciado;</li>
                <li>Confirmar ciência de intimações pela plataforma.</li>
              </ul>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">5. Uso vedado</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Automatizar respostas, revender ou redistribuir mensagens do bot;</li>
                <li>Compartilhar conteúdo de processos em segredo de justiça ou sigilo absoluto;</li>
                <li>Utilizar o bot para fins alheios à simulação jurídica do servidor;</li>
                <li>Tentar personificar terceiros informando Discord ID que não seja o próprio.</li>
              </ul>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">6. Suspensão</h2>
              <p>
                A administração pode suspender o envio de DMs, revogar o acesso do usuário ao
                Sistema Judicial ou remover o bot do servidor a qualquer momento, especialmente
                em caso de abuso, violação destes termos ou determinação da moderação.
              </p>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">7. Isenção</h2>
              <p>
                O bot é fornecido "como está", sem garantia de disponibilidade ininterrupta. A
                administração não se responsabiliza por indisponibilidades do Discord, atrasos de
                entrega ou falhas decorrentes da configuração de privacidade do usuário.
              </p>
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" /> Política de Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <section>
              <h2 className="font-semibold mb-1">1. Dados coletados</h2>
              <ul className="list-disc list-inside space-y-1">
                <li><b>Discord ID</b> (snowflake numérico) informado pelo próprio usuário no perfil;</li>
                <li><b>Preferência</b> de recebimento de DMs (ativado/desativado);</li>
                <li><b>Conteúdo da notificação</b> a ser entregue (título, mensagem, tipo, link do processo);</li>
                <li><b>Registro técnico</b> mínimo do envio (status HTTP retornado pela API do Discord), para diagnóstico.</li>
              </ul>
              <p className="mt-2">
                O bot <b>não</b> lê mensagens do usuário, <b>não</b> acessa canais privados e
                <b> não</b> coleta e-mail, telefone, IP ou qualquer dado do computador do usuário.
              </p>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">2. Finalidade do tratamento</h2>
              <p>
                Os dados são utilizados exclusivamente para entregar comunicações judiciais ao
                destinatário correto e permitir que ele acesse, pelo link recebido, o processo
                ou seção correspondente no Sistema Judicial.
              </p>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">3. Base legal e consentimento</h2>
              <p>
                O tratamento ocorre mediante consentimento do usuário, manifestado ao cadastrar
                seu Discord ID e ao manter ativa a opção "Receber notificações por DM no Discord"
                em seu perfil. O consentimento pode ser revogado a qualquer momento.
              </p>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">4. Compartilhamento</h2>
              <p>
                O único destinatário externo dos dados é a <b>API oficial do Discord</b>
                (<span className="font-mono">discord.com/api</span>), que recebe o Discord ID e o
                conteúdo da mensagem para entregá-la ao usuário. Nenhum dado é vendido, alugado
                ou compartilhado com terceiros para fins publicitários.
              </p>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">5. Retenção e exclusão</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Notificações lidas são removidas automaticamente após 24 horas.</li>
                <li>O Discord ID permanece armazenado enquanto o cadastro do usuário estiver ativo.</li>
                <li>
                  O usuário pode, a qualquer momento, apagar seu Discord ID em "Meu Perfil" ou
                  desativar o recebimento de DMs, cessando imediatamente novos envios.
                </li>
              </ul>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">6. Segurança</h2>
              <p>
                O acesso ao banco de dados é restrito por políticas de segurança em nível de
                linha (RLS). Somente o próprio usuário, administradores e a função de envio do
                bot podem ler o Discord ID de um perfil, e apenas para a finalidade descrita.
              </p>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">7. Direitos do titular</h2>
              <p>
                Nos termos da LGPD (Lei nº 13.709/2018), o usuário pode solicitar confirmação de
                tratamento, acesso, correção, anonimização ou eliminação de seus dados, bem como
                informação sobre com quem foram compartilhados. Solicitações devem ser
                encaminhadas pelo canal indicado abaixo.
              </p>
            </section>
            <Separator />
            <section>
              <h2 className="font-semibold mb-1">8. Alterações</h2>
              <p>
                Estes termos podem ser atualizados a qualquer momento. Alterações relevantes
                serão comunicadas por meio do próprio Sistema Judicial e/ou por DM do bot.
              </p>
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" /> Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              Dúvidas, solicitações de titular ou denúncias de abuso podem ser encaminhadas pelo
              Discord Jurídico oficial:{" "}
              <a
                href="https://discord.gg/xmydYrYBKd"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                discord.gg/xmydYrYBKd
              </a>
              .
            </p>
            <p className="text-muted-foreground text-xs">
              Ao continuar utilizando o bot, o usuário declara ter lido e concordado integralmente
              com os Termos de Serviço e a Política de Privacidade acima.
            </p>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t py-6 mt-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sistema Judicial — Secretaria de Justiça e Cidadania.
        </div>
      </footer>
    </div>
  );
}
