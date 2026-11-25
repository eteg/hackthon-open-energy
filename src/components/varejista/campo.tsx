import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Rótulo + controle + mensagem de erro ou dica, ligados por id (`${id}-ajuda`). */
export function Campo({
  id,
  rotulo,
  erro,
  dica,
  opcional,
  className,
  children,
}: {
  id: string;
  rotulo: React.ReactNode;
  erro?: string;
  dica?: string;
  opcional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ajuda = erro ?? dica;
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {rotulo}
        {opcional && <span className="font-normal text-muted-foreground">(opcional)</span>}
      </Label>
      {children}
      {ajuda && (
        <p id={`${id}-ajuda`} role={erro ? "alert" : undefined} className={cn("text-xs", erro ? "text-destructive" : "text-muted-foreground")}>
          {ajuda}
        </p>
      )}
    </div>
  );
}

type PropsInput = Omit<React.ComponentProps<typeof Input>, "id"> & {
  id: string;
  rotulo: React.ReactNode;
  erro?: string;
  dica?: string;
  opcional?: boolean;
  campoClassName?: string;
};

/** Campo de texto completo, com `aria-invalid` e `aria-describedby` já ligados. */
export function CampoTexto({ id, rotulo, erro, dica, opcional, campoClassName, className, ...input }: PropsInput) {
  return (
    <Campo id={id} rotulo={rotulo} erro={erro} dica={dica} opcional={opcional} className={campoClassName}>
      <Input id={id} name={id} aria-invalid={erro ? true : undefined} aria-describedby={erro || dica ? `${id}-ajuda` : undefined} className={cn("h-11 bg-card md:text-[15px]", className)} {...input} />
    </Campo>
  );
}
