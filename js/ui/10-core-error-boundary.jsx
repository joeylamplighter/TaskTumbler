// ===========================================
// CORE: Error Boundary
// ===========================================

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            countdown: 4
        };
        this.countdownInterval = null;
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Store error details
        this.setState({
            error,
            errorInfo,
            countdown: 4
        });

        // Log to recentErrors array for debugging
        if (!window.recentErrors) window.recentErrors = [];
        window.recentErrors.push({
            type: 'ErrorBoundary',
            time: new Date().toISOString(),
            message: error?.toString() || 'Unknown error',
            stack: error?.stack || '',
            componentStack: errorInfo?.componentStack || ''
        });

        // Keep only last 10 errors
        if (window.recentErrors.length > 10) {
            window.recentErrors = window.recentErrors.slice(-10);
        }

        // Start countdown
        this.countdownInterval = setInterval(() => {
            this.setState(prevState => {
                const newCountdown = prevState.countdown - 1;
                if (newCountdown <= 0) {
                    clearInterval(this.countdownInterval);
                    // Clear localStorage to prevent infinite error loops
                    try {
                        localStorage.clear();
                    } catch {}
                    window.location.reload();
                    return prevState;
                }
                return { countdown: newCountdown };
            });
        }, 1000);
    }

    componentWillUnmount() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }

    render() {
        if (this.state.hasError) {
            const { error, errorInfo, countdown } = this.state;

            return (
                <div style={{
                    minHeight: '100vh',
                    background: '#0a0a0a',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{
                        maxWidth: '600px',
                        width: '100%',
                        textAlign: 'center'
                    }}>
                        {/* Icon and Title */}
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>💥</div>
                        <h1 style={{
                            fontSize: '28px',
                            margin: '0 0 8px 0',
                            color: '#ff6b6b'
                        }}>
                            App Recovering
                        </h1>
                        <p style={{
                            fontSize: '16px',
                            margin: '0 0 24px 0',
                            color: '#888'
                        }}>
                            Cleaning up data and restarting in {countdown}...
                        </p>

                        {/* Countdown Progress Bar */}
                        <div style={{
                            width: '100%',
                            height: '4px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '2px',
                            overflow: 'hidden',
                            marginBottom: '32px'
                        }}>
                            <div style={{
                                height: '100%',
                                background: '#ff6b6b',
                                width: `${(countdown / 4) * 100}%`,
                                transition: 'width 1s linear'
                            }} />
                        </div>

                        {/* Debug Info */}
                        <div style={{
                            background: 'rgba(255, 107, 107, 0.1)',
                            border: '1px solid rgba(255, 107, 107, 0.3)',
                            borderRadius: '8px',
                            padding: '16px',
                            textAlign: 'left',
                            marginBottom: '16px'
                        }}>
                            <div style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#ff6b6b',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Debug Information
                            </div>
                            <div style={{
                                fontSize: '13px',
                                color: '#ffcccc',
                                marginBottom: '8px',
                                wordBreak: 'break-word'
                            }}>
                                <strong>Error:</strong> {error?.toString() || 'Unknown error'}
                            </div>
                            {error?.stack && (
                                <details style={{ marginTop: '8px' }}>
                                    <summary style={{
                                        cursor: 'pointer',
                                        color: '#ff9999',
                                        fontSize: '12px',
                                        marginBottom: '4px'
                                    }}>
                                        Stack Trace
                                    </summary>
                                    <pre style={{
                                        fontSize: '10px',
                                        color: '#ffcccc',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        overflow: 'auto',
                                        maxHeight: '200px',
                                        marginTop: '4px',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all'
                                    }}>
                                        {error.stack}
                                    </pre>
                                </details>
                            )}
                            {errorInfo?.componentStack && (
                                <details style={{ marginTop: '8px' }}>
                                    <summary style={{
                                        cursor: 'pointer',
                                        color: '#ff9999',
                                        fontSize: '12px',
                                        marginBottom: '4px'
                                    }}>
                                        Component Stack
                                    </summary>
                                    <pre style={{
                                        fontSize: '10px',
                                        color: '#ffcccc',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        overflow: 'auto',
                                        maxHeight: '200px',
                                        marginTop: '4px',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all'
                                    }}>
                                        {errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => {
                                    const errorText = [
                                        'ERROR DETAILS',
                                        '=============',
                                        '',
                                        `Time: ${new Date().toISOString()}`,
                                        `Error: ${error?.toString() || 'Unknown error'}`,
                                        '',
                                        'STACK TRACE:',
                                        error?.stack || 'No stack trace available',
                                        '',
                                        'COMPONENT STACK:',
                                        errorInfo?.componentStack || 'No component stack available'
                                    ].join('\n');

                                    navigator.clipboard.writeText(errorText).then(() => {
                                        // Show brief feedback
                                        const btn = event.target;
                                        const originalText = btn.textContent;
                                        btn.textContent = 'Copied!';
                                        setTimeout(() => {
                                            btn.textContent = originalText;
                                        }, 2000);
                                    }).catch(() => {
                                        alert('Failed to copy to clipboard');
                                    });
                                }}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s ease',
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                            >
                                Copy Error Details
                            </button>
                            <button
                                onClick={() => {
                                    try {
                                        localStorage.clear();
                                    } catch {}
                                    window.location.reload();
                                }}
                                style={{
                                    background: '#ff6b6b',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s ease',
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                            >
                                Reload Now
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

window.ErrorBoundary = ErrorBoundary;
