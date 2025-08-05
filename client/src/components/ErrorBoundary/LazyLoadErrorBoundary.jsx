import React from 'react';
import { useTranslation } from 'react-i18next';
import './LazyLoadErrorBoundary.css';

class LazyLoadErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('Lazy load error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <LazyLoadErrorFallback error={this.state.error} retry={() => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
      }} />;
    }

    return this.props.children;
  }
}

const LazyLoadErrorFallback = ({ error, retry }) => {
  const { t } = useTranslation();

  return (
    <div className="lazy-load-error">
      <div className="lazy-load-error__content">
        <h2 className="lazy-load-error__title">
          {t('common.errorLoading', 'Something went wrong')}
        </h2>
        <p className="lazy-load-error__message">
          {t('common.errorLoadingPage', 'Failed to load this page. Please try again.')}
        </p>
        <div className="lazy-load-error__actions">
          <button 
            className="lazy-load-error__retry-btn"
            onClick={retry}
          >
            {t('common.retry', 'Retry')}
          </button>
          <button 
            className="lazy-load-error__home-btn"
            onClick={() => window.location.href = '/'}
          >
            {t('common.goHome', 'Go Home')}
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="lazy-load-error__details">
            <summary>Error Details (dev only)</summary>
            <pre>{error.toString()}</pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default LazyLoadErrorBoundary;