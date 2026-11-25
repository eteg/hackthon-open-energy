import { Progress } from "@/components/ui/progress";

/** "PASSO 2 DE 6" + barra em cobre. `sufixo` ex.: "SEM A CONTA". */
export function PassoProgress({ n, total = 6, sufixo }: { n: number; total?: number; sufixo?: string }) {
  return (
    <div className="px-4 pt-3" role="group" aria-label={`Passo ${n} de ${total}`}>
      <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Passo {n} de {total}
        {sufixo ? ` · ${sufixo}` : ""}
      </div>
      <Progress value={(n / total) * 100} className="mt-1.5 h-1.5 bg-[#e4dccb] [&>div]:bg-primary" />
    </div>
  );
}
