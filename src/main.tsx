import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Error boundary so the app never shows a blank brown screen
class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: '#0d0a05', color: '#f4e8c1', fontFamily: 'Inter, sans-serif',
                    padding: '2rem', textAlign: 'center',
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
                    <h2 style={{
                        fontFamily: "'Cinzel Decorative', serif",
                        fontSize: '1.3rem', marginBottom: '0.5rem',
                        color: '#c9a84c',
                    }}>Erro no Umbra</h2>
                    <p style={{ fontSize: '0.85rem', color: '#e8d49a', marginBottom: '1.5rem', maxWidth: 420 }}>
                        {this.state.error?.message ?? 'Erro inesperado.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '.75rem 2rem', background: 'linear-gradient(135deg, #8b6914, #c9a84c)',
                            color: '#1a1208', border: 'none', borderRadius: '4px', cursor: 'pointer',
                            fontFamily: "'Cinzel', serif", fontWeight: 700, letterSpacing: '.1em',
                        }}
                    >Recarregar</button>
                </div>
            );
        }
        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)
