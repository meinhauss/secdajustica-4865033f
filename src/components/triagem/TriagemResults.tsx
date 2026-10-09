import { AlertTriangle, Banknote, ClipboardCheck, Gavel, Scale, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/data/codigoPenal";
import { formatTriagemValue, triagemValueToText } from "@/lib/triagemFormatting";

function record(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try { return record(JSON.parse(value)); } catch { return {}; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): unknown[] {
  if (typeof value === "string") {
    try { return list(JSON.parse(value)); } catch { return value.trim() ? [value] : []; }
  }
  return Array.isArray(value) ? value : value ? [value] : [];
}

const text = (value: unknown) => triagemValueToText(value);
const amount = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? formatBRL(value) : text(value);
const months = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? `${value} meses` : text(value);

function RichText({ value }: { value: unknown }) {
  return <div className="break-words text-sm leading-relaxed text-muted-foreground [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:text-foreground" dangerouslySetInnerHTML={{ __html: formatTriagemValue(value) }} />;
}

function Details({ label = "Ver fundamento", value }: { label?: string; value: unknown }) {
  if (value == null || value === "" || (Array.isArray(value) && !value.length)) return null;
  return <Accordion type="single" collapsible>
    <AccordionItem value="details" className="border-0">
      <AccordionTrigger className="gap-3 py-3 text-xs text-muted-foreground">{label}</AccordionTrigger>
      <AccordionContent><RichText value={value} /></AccordionContent>
    </AccordionItem>
  </Accordion>;
}

export default function TriagemResults({ resultado }: { resultado: unknown }) {
  const data = record(resultado);
  const bail = record(data.fiança ?? data.fianca);
  const sentence = record(data.dosimetria);
  const qualification = record(data.qualificacao);
  const crimes = list(data.tipificacao);
  const alerts = list(data.alertas);
  const people = [
    ["autoresInvestigados", "Investigado"], ["vitimas", "Vítima"],
    ["testemunhas", "Testemunha"], ["policiaisCondutores", "Policial condutor"],
  ].flatMap(([key, role]) => list(qualification[key]).map(value => ({ person: record(value), role, original: value })));
  const tco = text(data.cabimentoTCO);
  const bailStatus = text(bail.cabimento ?? bail.status ?? (typeof data.fiança === "string" ? data.fiança : undefined));
  const tcoNegative = /n[aã]o|incab[ií]vel/i.test(tco);
  const bailNegative = /inafian|n[aã]o|sem fian/i.test(bailStatus);

  return <div className="space-y-7" aria-label="Resultados da triagem penal">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <section className="min-w-0 rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><ClipboardCheck className="h-4 w-4" /> TCO</div>
        <p className={`text-lg font-semibold ${tcoNegative ? "text-destructive" : "text-foreground"}`}>{tco}</p>
        <Details value={data.fundamentoTCO} />
      </section>
      <section className="min-w-0 rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Banknote className="h-4 w-4" /> Fiança</div>
        <p className={`break-words text-lg font-semibold ${bailNegative ? "text-destructive" : "text-foreground"}`}>{bailStatus}</p>
        {!bailNegative && bail.valorTotal != null && <p className="mt-1 text-sm tabular-nums text-muted-foreground">{amount(bail.valorTotal)}</p>}
        <Details value={bail.fundamento} />
      </section>
      <section className="min-w-0 rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Scale className="h-4 w-4" /> Pena final sugerida</div>
        <p className="text-xl font-semibold tabular-nums text-foreground">{months(sentence.penaFinalMeses)}</p>
        <p className="mt-2 text-xs text-muted-foreground">Pena-base: {months(sentence.penaBaseMeses)}</p>
      </section>
      <section className="min-w-0 rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Gavel className="h-4 w-4" /> Multa final sugerida</div>
        <p className="break-words text-xl font-semibold tabular-nums text-foreground">{amount(sentence.multaFinal)}</p>
        <p className="mt-2 text-xs text-muted-foreground">Multa-base: {amount(sentence.multaBase)}</p>
      </section>
    </div>

    <section>
      <div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-institutional" /><h4 className="font-display font-semibold">Envolvidos</h4><Badge variant="secondary">{people.length}</Badge></div>
      {people.length ? <div className="grid gap-3 md:grid-cols-2">{people.map(({ person, role, original }, index) => <article key={index} className="min-w-0 rounded-lg border border-border bg-card px-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h5 className="min-w-0 break-words font-medium">{text(person.nome ?? original)}</h5><Badge variant={role === "Investigado" ? "outline" : "secondary"}>{role}</Badge></div>
        <Details label="Ver evidências e participação" value={person.evidencias} />
        {!person.evidencias && <div className="h-4" />}
      </article>)}</div> : <p className="text-sm text-muted-foreground">Nenhum envolvido identificado.</p>}
    </section>

    <section>
      <div className="mb-3 flex items-center gap-2"><Gavel className="h-4 w-4 text-institutional" /><h4 className="font-display font-semibold">Enquadramento penal</h4><Badge variant="secondary">{crimes.length}</Badge></div>
      <div className="divide-y divide-border border-y border-border">{crimes.map((value, index) => {
        const crime = record(value);
        const unbailable = crime.inafiançavel === true || crime.inafiancavel === true;
        return <article key={index} className="grid min-w-0 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{text(crime.artigo)}</Badge><h5 className="break-words font-semibold">{text(crime.crime ?? value)}</h5>{unbailable && <Badge variant="destructive">Inafiançável</Badge>}</div><p className="mt-2 text-sm text-muted-foreground">{text(crime.autor)}</p></div>
          <dl className="flex flex-wrap gap-6 text-sm sm:text-right"><div><dt className="text-xs text-muted-foreground">Pena-base</dt><dd className="mt-1 font-medium tabular-nums">{months(crime.penaBaseMeses)}</dd></div><div><dt className="text-xs text-muted-foreground">Multa-base</dt><dd className="mt-1 font-medium tabular-nums">{amount(crime.multaBase)}</dd></div></dl>
        </article>;
      })}{!crimes.length && <p className="py-4 text-sm text-muted-foreground">Nenhum crime identificado.</p>}</div>
    </section>

    <Accordion type="single" collapsible className="border-y border-border">
      <AccordionItem value="sentence" className="border-0">
        <AccordionTrigger className="text-sm">Detalhamento da dosimetria</AccordionTrigger>
        <AccordionContent><div className="grid gap-6 sm:grid-cols-2"><div><h5 className="mb-2 text-sm font-medium">Reduções aplicadas</h5><RichText value={sentence.reducoes} /></div><div><h5 className="mb-2 text-sm font-medium">Majorações aplicadas</h5><RichText value={sentence.majoracoes} /></div></div></AccordionContent>
      </AccordionItem>
    </Accordion>

    {alerts.length > 0 && <section className="border-l-2 border-gold pl-4"><h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-gold" /> Pontos de atenção <Badge variant="outline">{alerts.length}</Badge></h4><RichText value={alerts} /></section>}
  </div>;
}