import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary global para capturar erros em componentes lazy-loaded
 * e evitar que a tela inteira quebre.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Algo deu errado
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Ocorreu um erro inesperado ao carregar esta seção. Tente novamente ou recarregue a página.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={this.handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            <Button variant="ghost" onClick={() => window.location.reload()}>
              Recarregar página
            </Button>
          </div>
          {this.state.error && (
            <details className="mt-6 text-left max-w-lg w-full">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                Detalhes do erro
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-muted text-xs text-muted-foreground overflow-auto max-h-40 font-mono">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}