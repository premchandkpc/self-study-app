import { Component } from 'react';
import Button from '../Button/Button';
import styles from './ErrorBoundary.module.css';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  }

  handleGoHome() {
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = '/';
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorBox}>
            <h2>Something went wrong</h2>
            <p className={styles.errorMessage}>{this.state.error?.message}</p>

            {this.state.errorInfo && (
              <div className={styles.detailsSection}>
                <button
                  className={styles.detailsToggle}
                  onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                >
                  {this.state.showDetails ? 'Hide' : 'Show'} error details
                </button>
                {this.state.showDetails && (
                  <pre className={styles.stackTrace}>{this.state.errorInfo.componentStack}</pre>
                )}
              </div>
            )}

            <div className={styles.errorActions}>
              <Button variant="secondary" onClick={() => this.handleReset()}>
                Try Again
              </Button>
              <Button variant="primary" onClick={() => this.handleGoHome()}>
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
