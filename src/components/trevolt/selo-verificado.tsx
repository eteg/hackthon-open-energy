import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Só aparece em fornecedores homologados e revistos no mês. */
export function SeloVerificado({ className }: { className?: string }) {
  return (
    <Badge variant="verificado" className={className}>
      <BadgeCheck aria-hidden="true" /> Fornecedor verificado
    </Badge>
  );
}
