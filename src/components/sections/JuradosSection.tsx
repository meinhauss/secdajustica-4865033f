import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Gavel, Shuffle, UserCheck, UserX } from "lucide-react";

export default function JuradosSection() {
  const { user, roles, profile } = useAuth();
  const qc = useQueryClient();
  const isPresidenteOrAdmin = roles.includes("admin") || roles.includes("presidente_tribunal");

  const { data: meuRegistro } = useQuery({
    queryKey: ["jurado-meu", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("jurados").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: jurados = [] } = useQuery({
    queryKey: ["jurados-todos"],
    enabled: isPresidenteOrAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("jurados").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: processos = [] } = useQuery({
    queryKey: ["processos-juri"],
    enabled: isPresidenteOrAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("processos").select("id, numero, assunto").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: convocacoes = [] } = useQuery({
    queryKey: ["convocacoes-juri"],
    queryFn: async () => {
      const { data } = await supabase
        .from("convocacoes_jurados")
        .select("*, processos(numero, assunto), jurados_convocados(jurado_id, jurados(nome_completo, id_personagem))")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Form inscrição
  const [form, setForm] = useState({
    nome_completo: profile?.nome_completo || "",
    id_personagem: profile?.id_personagem || "",
    profissao: "",
    disponibilidade: "integral",
    observacoes: "",
  });

  const inscreverMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sem sessão");
      const { error } = await supabase.from("jurados").insert({
        user_id: user.id,
        nome_completo: form.nome_completo.trim(),
        id_personagem: form.id_personagem.trim() || null,
        profissao: form.profissao.trim() || null,
        disponibilidade: form.disponibilidade,
        observacoes: form.observacoes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição realizada! Você está ativo na lista de jurados.");
      qc.invalidateQueries({ queryKey: ["jurado-meu"] });
      qc.invalidateQueries({ queryKey: ["jurados-todos"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (novoStatus: string) => {
      const { error } = await supabase.from("jurados").update({ status: novoStatus }).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["jurado-meu"] });
    },
  });

  // Sorteio
  const [sorteio, setSorteio] = useState({ processo_id: "", data_sessao: "", quantidade: 7, local: "Plenário do Tribunal do Júri", observacoes: "" });
  const [openSorteio, setOpenSorteio] = useState(false);

  const sortearMutation = useMutation({
    mutationFn: async () => {
      if (!sorteio.processo_id || !sorteio.data_sessao) throw new Error("Selecione processo e data");
      const { data, error } = await supabase.rpc("sortear_jurados", {
        _processo_id: sorteio.processo_id,
        _data_sessao: new Date(sorteio.data_sessao).toISOString(),
        _quantidade: sorteio.quantidade,
        _local: sorteio.local,
        _observacoes: sorteio.observacoes || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Jurados sorteados e intimados com sucesso!");
      setOpenSorteio(false);
      qc.invalidateQueries({ queryKey: ["convocacoes-juri"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const ativos = jurados.filter((j: any) => j.status === "ativo").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gavel className="h-7 w-7 text-gold" />
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Tribunal do Júri</h2>
          <p className="text-sm text-muted-foreground">Inscrição de jurados e convocações para sessões</p>
        </div>
      </div>

      <Tabs defaultValue={isPresidenteOrAdmin ? "gestao" : "minha"}>
        <TabsList>
          <TabsTrigger value="minha">Minha Inscrição</TabsTrigger>
          {isPresidenteOrAdmin && <TabsTrigger value="gestao">Lista de Jurados</TabsTrigger>}
          <TabsTrigger value="convocacoes">Convocações</TabsTrigger>
        </TabsList>

        <TabsContent value="minha" className="space-y-4">
          {meuRegistro ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-gold" />
                  Você está inscrito como jurado
                </CardTitle>
                <CardDescription>
                  Status: <Badge variant={meuRegistro.status === "ativo" ? "default" : "secondary"}>{meuRegistro.status}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Nome:</strong> {meuRegistro.nome_completo}</p>
                {meuRegistro.id_personagem && <p><strong>ID Personagem:</strong> {meuRegistro.id_personagem}</p>}
                {meuRegistro.profissao && <p><strong>Profissão:</strong> {meuRegistro.profissao}</p>}
                <p><strong>Disponibilidade:</strong> {meuRegistro.disponibilidade}</p>
                {meuRegistro.observacoes && <p><strong>Observações:</strong> {meuRegistro.observacoes}</p>}
                <div className="pt-3">
                  {meuRegistro.status === "ativo" ? (
                    <Button variant="outline" size="sm" onClick={() => toggleStatusMutation.mutate("inativo")}>
                      <UserX className="h-4 w-4 mr-2" />Desativar inscrição
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => toggleStatusMutation.mutate("ativo")}>
                      <UserCheck className="h-4 w-4 mr-2" />Reativar inscrição
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Cadastre-se como jurado</CardTitle>
                <CardDescription>Servir como jurado é um dever cívico. Após a inscrição, você poderá ser sorteado pelo Presidente do Tribunal para sessões do júri.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Nome completo *</Label>
                  <Input value={form.nome_completo} onChange={(e) => setForm({ ...form, nome_completo: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>ID Personagem</Label>
                    <Input value={form.id_personagem} onChange={(e) => setForm({ ...form, id_personagem: e.target.value })} />
                  </div>
                  <div>
                    <Label>Profissão</Label>
                    <Input value={form.profissao} onChange={(e) => setForm({ ...form, profissao: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Disponibilidade</Label>
                  <Select value={form.disponibilidade} onValueChange={(v) => setForm({ ...form, disponibilidade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="integral">Integral</SelectItem>
                      <SelectItem value="manha">Apenas manhã</SelectItem>
                      <SelectItem value="tarde">Apenas tarde</SelectItem>
                      <SelectItem value="noite">Apenas noite</SelectItem>
                      <SelectItem value="finais_semana">Finais de semana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
                </div>
                <Button onClick={() => inscreverMutation.mutate()} disabled={!form.nome_completo.trim() || inscreverMutation.isPending}>
                  Inscrever-se como jurado
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isPresidenteOrAdmin && (
          <TabsContent value="gestao" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-sm">
                <Badge variant="outline"><Users className="h-3 w-3 mr-1" />{jurados.length} inscritos</Badge>
                <Badge><UserCheck className="h-3 w-3 mr-1" />{ativos} ativos</Badge>
              </div>
              <Dialog open={openSorteio} onOpenChange={setOpenSorteio}>
                <DialogTrigger asChild>
                  <Button><Shuffle className="h-4 w-4 mr-2" />Sortear jurados</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sortear e convocar jurados</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Processo *</Label>
                      <Select value={sorteio.processo_id} onValueChange={(v) => setSorteio({ ...sorteio, processo_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o processo" /></SelectTrigger>
                        <SelectContent>
                          {processos.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.numero} — {p.assunto}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Data e hora da sessão *</Label>
                        <Input type="datetime-local" value={sorteio.data_sessao} onChange={(e) => setSorteio({ ...sorteio, data_sessao: e.target.value })} />
                      </div>
                      <div>
                        <Label>Quantidade de jurados</Label>
                        <Input type="number" min={1} max={ativos || 1} value={sorteio.quantidade} onChange={(e) => setSorteio({ ...sorteio, quantidade: parseInt(e.target.value) || 7 })} />
                      </div>
                    </div>
                    <div>
                      <Label>Local</Label>
                      <Input value={sorteio.local} onChange={(e) => setSorteio({ ...sorteio, local: e.target.value })} />
                    </div>
                    <div>
                      <Label>Observações</Label>
                      <Textarea value={sorteio.observacoes} onChange={(e) => setSorteio({ ...sorteio, observacoes: e.target.value })} rows={2} />
                    </div>
                    <p className="text-xs text-muted-foreground">{ativos} jurados ativos disponíveis para sorteio. Cada jurado sorteado receberá uma intimação automática.</p>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => sortearMutation.mutate()} disabled={sortearMutation.isPending || ativos === 0}>
                      {sortearMutation.isPending ? "Sorteando..." : "Sortear e intimar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>ID Personagem</TableHead>
                      <TableHead>Profissão</TableHead>
                      <TableHead>Disponibilidade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jurados.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum jurado inscrito ainda</TableCell></TableRow>
                    ) : jurados.map((j: any) => (
                      <TableRow key={j.id}>
                        <TableCell className="font-medium">{j.nome_completo}</TableCell>
                        <TableCell>{j.id_personagem || "—"}</TableCell>
                        <TableCell>{j.profissao || "—"}</TableCell>
                        <TableCell>{j.disponibilidade}</TableCell>
                        <TableCell><Badge variant={j.status === "ativo" ? "default" : "secondary"}>{j.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="convocacoes" className="space-y-3">
          {convocacoes.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma convocação registrada</CardContent></Card>
          ) : convocacoes.map((c: any) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base">Sessão de {new Date(c.data_sessao).toLocaleString("pt-BR")}</CardTitle>
                <CardDescription>
                  Processo {c.processos?.numero} — {c.processos?.assunto} • {c.local}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">Jurados convocados ({c.jurados_convocados?.length || 0}):</p>
                <div className="flex flex-wrap gap-2">
                  {c.jurados_convocados?.map((jc: any) => (
                    <Badge key={jc.jurado_id} variant="outline">{jc.jurados?.nome_completo}{jc.jurados?.id_personagem ? ` (${jc.jurados.id_personagem})` : ""}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
