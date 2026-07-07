import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * Empty state ilustrado e reutilizável.
 * Substitui mensagens genéricas ("Nenhum registro") por um placeholder
 * com ícone destacado, descrição contextual e CTA opcional.
 */
export function EmptyState({ icon: Icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-border bg-card/40 ${className}`}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-gold/10 blur-2xl rounded-full" aria-hidden />
        <div className="relative bg-gradient-to-br from-secondary to-secondary/50 p-4 rounded-2xl border border-border shadow-sm">
          <Icon className="h-8 w-8 text-gold" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="default" size="sm" className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
}
