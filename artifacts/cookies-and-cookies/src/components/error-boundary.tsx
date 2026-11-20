import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6 font-sans">
      <div className="max-w-lg w-full text-center bg-white p-8 rounded-3xl shadow-xl border border-stone-200">
        <h1 className="text-xl font-black text-stone-900">
          Ops, algo deu errado!
        </h1>
        <p className="mt-2 text-xs text-stone-600">
          Ocorreu um erro ao carregar os dados. Você pode recarregar ou limpar os dados locais.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl bg-stone-100 p-3 text-left text-xs text-red-600 max-h-48 overflow-y-auto font-mono">
          <p className="font-bold">{error?.message || String(error)}</p>
        </div>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={resetError}
            className="rounded-full bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 active:scale-95 transition-all shadow-xs"
          >
            Tentar Novamente
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.clear();
                window.location.reload();
              } catch {}
            }}
            className="rounded-full bg-stone-200 px-5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-300 active:scale-95 transition-all"
          >
            Limpar Cache Local
          </button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
