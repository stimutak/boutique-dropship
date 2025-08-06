import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { X, Cookie, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/config';
import './CookieConsentBanner.css';

const CookieConsentBanner = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    checkConsentStatus();
  }, [user]);

  const checkConsentStatus = async () => {
    try {
      // Check localStorage first for quick check
      const storedConsent = localStorage.getItem('gdpr_consent');
      if (storedConsent) {
        const parsed = JSON.parse(storedConsent);
        // Check if consent is recent (less than 365 days old)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 365 * 24 * 60 * 60 * 1000) {
          setConsent(parsed.purposes || consent);
          return; // Don't show banner if valid consent exists
        }
      }

      // Check backend for logged-in users
      if (user) {
        const response = await api.get('/auth/consent');
        if (response.data.data && response.data.data.purposes) {
          setConsent(response.data.data.purposes);
          localStorage.setItem('gdpr_consent', JSON.stringify({
            purposes: response.data.data.purposes,
            timestamp: Date.now()
          }));
          return; // Don't show banner if valid consent exists
        }
      }

      // Show banner if no valid consent found
      setShow(true);
    } catch (error) {
      console.error('Error checking consent status:', error);
      setShow(true); // Show banner on error to be safe
    }
  };

  const handleAcceptAll = async () => {
    const fullConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    await saveConsent(fullConsent);
  };

  const handleRejectAll = async () => {
    const minimalConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
    await saveConsent(minimalConsent);
  };

  const handleSavePreferences = async () => {
    await saveConsent(consent);
  };

  const saveConsent = async (consentData) => {
    setLoading(true);
    try {
      // Save to backend
      const response = await api.post('/auth/consent', {
        purposes: consentData,
        consentVersion: '1.0'
      });

      // Save to localStorage for quick access
      localStorage.setItem('gdpr_consent', JSON.stringify({
        purposes: consentData,
        timestamp: Date.now(),
        version: '1.0'
      }));

      // Update Redux state if needed
      if (response.data.success) {
        dispatch({ 
          type: 'gdpr/consentUpdated', 
          payload: consentData 
        });
      }

      // Hide banner
      setShow(false);

      // Enable/disable cookies based on consent
      manageCookies(consentData);
    } catch (error) {
      console.error('Error saving consent:', error);
      // Still hide banner and save locally even if backend fails
      localStorage.setItem('gdpr_consent', JSON.stringify({
        purposes: consentData,
        timestamp: Date.now(),
        version: '1.0'
      }));
      setShow(false);
      manageCookies(consentData);
    } finally {
      setLoading(false);
    }
  };

  const manageCookies = (consentData) => {
    // This function would integrate with analytics/marketing scripts
    if (window.gtag && !consentData.analytics) {
      // Disable Google Analytics
      window.gtag('consent', 'update', {
        'analytics_storage': 'denied'
      });
    }
    
    if (window.fbq && !consentData.marketing) {
      // Disable Facebook Pixel
      window.fbq('consent', 'revoke');
    }

    // Dispatch event for other scripts to listen to
    window.dispatchEvent(new CustomEvent('gdprConsentUpdated', { 
      detail: consentData 
    }));
  };

  const toggleConsent = (type) => {
    if (type === 'necessary') return; // Can't toggle necessary cookies
    setConsent(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  if (!show) return null;

  return (
    <div className="cookie-consent-banner">
      <div className="cookie-consent-container">
        {/* Header Section */}
        <div className="cookie-consent-header">
          <div className="cookie-consent-title-wrapper">
            <Cookie className="cookie-consent-icon" />
            <h2 className="cookie-consent-title">
              {t('gdpr.cookieBanner.title')}
            </h2>
          </div>
          <button
            onClick={() => setShow(false)}
            className="cookie-consent-close"
            aria-label={t('common.close')}
          >
            <X className="cookie-consent-close-icon" />
          </button>
        </div>

        {/* Description */}
        <p className="cookie-consent-description">
          {t('gdpr.cookieBanner.description')}
        </p>

        {/* Manage Preferences Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="cookie-consent-toggle"
        >
          {showDetails ? <ChevronUp className="cookie-consent-toggle-icon" /> : <ChevronDown className="cookie-consent-toggle-icon" />}
          {t('gdpr.cookieBanner.managePreferences')}
        </button>

        {/* Detailed Preferences */}
        {showDetails && (
          <div className="cookie-consent-details">
            <div className="cookie-consent-options">
              {/* Necessary Cookies */}
              <div className="cookie-consent-option">
                <div className="cookie-consent-option-content">
                  <label className="cookie-consent-label">
                    <input
                      type="checkbox"
                      checked={consent.necessary}
                      disabled
                      className="cookie-consent-checkbox cookie-consent-checkbox-disabled"
                    />
                    <div className="cookie-consent-label-text">
                      <span className="cookie-consent-label-title">
                        {t('gdpr.cookieTypes.necessary.title')}
                        <span className="cookie-consent-badge">
                          {t('gdpr.cookieTypes.alwaysActive')}
                        </span>
                      </span>
                      <span className="cookie-consent-label-description">
                        {t('gdpr.cookieTypes.necessary.description')}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="cookie-consent-option">
                <div className="cookie-consent-option-content">
                  <label className="cookie-consent-label">
                    <input
                      type="checkbox"
                      checked={consent.analytics}
                      onChange={() => toggleConsent('analytics')}
                      className="cookie-consent-checkbox"
                    />
                    <div className="cookie-consent-label-text">
                      <span className="cookie-consent-label-title">
                        {t('gdpr.cookieTypes.analytics.title')}
                      </span>
                      <span className="cookie-consent-label-description">
                        {t('gdpr.cookieTypes.analytics.description')}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="cookie-consent-option">
                <div className="cookie-consent-option-content">
                  <label className="cookie-consent-label">
                    <input
                      type="checkbox"
                      checked={consent.marketing}
                      onChange={() => toggleConsent('marketing')}
                      className="cookie-consent-checkbox"
                    />
                    <div className="cookie-consent-label-text">
                      <span className="cookie-consent-label-title">
                        {t('gdpr.cookieTypes.marketing.title')}
                      </span>
                      <span className="cookie-consent-label-description">
                        {t('gdpr.cookieTypes.marketing.description')}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preference Cookies */}
              <div className="cookie-consent-option">
                <div className="cookie-consent-option-content">
                  <label className="cookie-consent-label">
                    <input
                      type="checkbox"
                      checked={consent.preferences}
                      onChange={() => toggleConsent('preferences')}
                      className="cookie-consent-checkbox"
                    />
                    <div className="cookie-consent-label-text">
                      <span className="cookie-consent-label-title">
                        {t('gdpr.cookieTypes.preferences.title')}
                      </span>
                      <span className="cookie-consent-label-description">
                        {t('gdpr.cookieTypes.preferences.description')}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="cookie-consent-actions">
          {showDetails ? (
            <button
              onClick={handleSavePreferences}
              disabled={loading}
              className="btn btn-primary cookie-consent-btn"
            >
              {loading ? t('common.saving') : t('gdpr.cookieBanner.savePreferences')}
            </button>
          ) : (
            <>
              <button
                onClick={handleRejectAll}
                disabled={loading}
                className="btn btn-secondary cookie-consent-btn"
              >
                {t('gdpr.cookieBanner.rejectAll')}
              </button>
              <button
                onClick={handleAcceptAll}
                disabled={loading}
                className="btn btn-primary cookie-consent-btn"
              >
                {loading ? t('common.saving') : t('gdpr.cookieBanner.acceptAll')}
              </button>
            </>
          )}
        </div>

        {/* Footer Links */}
        <div className="cookie-consent-footer">
          <a href="/privacy-policy" className="cookie-consent-link">
            {t('gdpr.links.privacyPolicy')}
          </a>
          <span className="cookie-consent-separator">•</span>
          <a href="/cookie-policy" className="cookie-consent-link">
            {t('gdpr.links.cookiePolicy')}
          </a>
          <span className="cookie-consent-separator">•</span>
          <div className="cookie-consent-badge-wrapper">
            <Shield className="cookie-consent-shield" />
            <span>{t('gdpr.compliant')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;