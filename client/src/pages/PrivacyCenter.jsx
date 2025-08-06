import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Shield, Download, Trash2, Cookie, Mail, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api/config';

const PrivacyCenter = () => {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  
  const [activeTab, setActiveTab] = useState('consent');
  const [consent, setConsent] = useState(null);
  const [exportRequests, setExportRequests] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchPrivacyData();
  }, []);

  const fetchPrivacyData = async () => {
    setLoading(true);
    try {
      // Fetch consent status
      const consentRes = await api.get('/auth/consent');
      if (consentRes.data.data) {
        setConsent(consentRes.data.data);
      }

      // Fetch user profile to get export/deletion requests
      const profileRes = await api.get('/auth/profile');
      if (profileRes.data.data) {
        setExportRequests(profileRes.data.data.gdprConsent?.dataExportRequests || []);
        setDeletionRequests(profileRes.data.data.gdprConsent?.deletionRequests || []);
      }
    } catch (error) {
      console.error('Error fetching privacy data:', error);
      setMessage({ type: 'error', text: 'Failed to load privacy data' });
    } finally {
      setLoading(false);
    }
  };

  const handleConsentUpdate = async (purposes) => {
    setLoading(true);
    try {
      const response = await api.put('/auth/consent', { purposes });
      if (response.data.success) {
        setConsent(response.data.data);
        setMessage({ type: 'success', text: 'Consent preferences updated successfully' });
      }
    } catch (error) {
      console.error('Error updating consent:', error);
      setMessage({ type: 'error', text: 'Failed to update consent preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleDataExport = async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/export-data');
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        fetchPrivacyData(); // Refresh data
      }
    } catch (error) {
      console.error('Error requesting data export:', error);
      const errorMessage = error.response?.data?.error?.message || 'Failed to request data export';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    const password = prompt('Please enter your password to confirm account deletion:');
    if (!password) return;

    const reason = prompt('Please tell us why you want to delete your account (optional):');

    setLoading(true);
    try {
      const response = await api.post('/auth/delete-account', { password, reason });
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        // User will be logged out automatically
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      const errorMessage = error.response?.data?.error?.message || 'Failed to request account deletion';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/cancel-deletion');
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message });
        fetchPrivacyData(); // Refresh data
      }
    } catch (error) {
      console.error('Error cancelling deletion:', error);
      setMessage({ type: 'error', text: 'Failed to cancel deletion request' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <Shield className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Privacy Center</h1>
          </div>
          <p className="text-gray-600">
            Manage your privacy settings, consent preferences, and exercise your GDPR rights.
          </p>
        </div>

        {/* Alert Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('consent')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'consent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Cookie className="inline h-4 w-4 mr-2" />
                Cookie Consent
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'data'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Download className="inline h-4 w-4 mr-2" />
                Your Data
              </button>
              <button
                onClick={() => setActiveTab('communications')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'communications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail className="inline h-4 w-4 mr-2" />
                Communications
              </button>
              <button
                onClick={() => setActiveTab('deletion')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'deletion'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Trash2 className="inline h-4 w-4 mr-2" />
                Account Deletion
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Cookie Consent Tab */}
            {activeTab === 'consent' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Cookie Preferences</h2>
                <p className="text-gray-600 mb-6">
                  Control how we use cookies and similar technologies on our website.
                </p>
                
                {consent && consent.purposes ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Strictly Necessary</h3>
                          <p className="text-sm text-gray-600">Essential for website functionality</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={true}
                          disabled
                          className="h-5 w-5 text-blue-600 rounded cursor-not-allowed opacity-50"
                        />
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Analytics & Performance</h3>
                          <p className="text-sm text-gray-600">Help us improve our website</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={consent.purposes.analytics?.granted || false}
                          onChange={(e) => handleConsentUpdate({
                            ...consent.purposes,
                            analytics: e.target.checked
                          })}
                          className="h-5 w-5 text-blue-600 rounded"
                        />
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Marketing & Advertising</h3>
                          <p className="text-sm text-gray-600">Personalized ads and content</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={consent.purposes.marketing?.granted || false}
                          onChange={(e) => handleConsentUpdate({
                            ...consent.purposes,
                            marketing: e.target.checked
                          })}
                          className="h-5 w-5 text-blue-600 rounded"
                        />
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Functionality & Preferences</h3>
                          <p className="text-sm text-gray-600">Remember your preferences</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={consent.purposes.preferences?.granted || false}
                          onChange={(e) => handleConsentUpdate({
                            ...consent.purposes,
                            preferences: e.target.checked
                          })}
                          className="h-5 w-5 text-blue-600 rounded"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Loading consent preferences...</p>
                )}

                <div className="mt-6 text-sm text-gray-600">
                  <p>Last updated: {consent ? formatDate(consent.updatedAt) : 'N/A'}</p>
                  <p>Consent version: {consent?.consentVersion || 'N/A'}</p>
                </div>
              </div>
            )}

            {/* Your Data Tab */}
            {activeTab === 'data' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Your Data</h2>
                <p className="text-gray-600 mb-6">
                  Request a copy of all personal data we hold about you.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-900 mb-2">Right to Access (Data Portability)</h3>
                  <p className="text-sm text-blue-800 mb-4">
                    Under GDPR, you have the right to receive a copy of your personal data in a 
                    structured, commonly used, and machine-readable format.
                  </p>
                  <button
                    onClick={handleDataExport}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Download className="inline h-4 w-4 mr-2" />
                    Request Data Export
                  </button>
                </div>

                {exportRequests.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Export History</h3>
                    <div className="space-y-2">
                      {exportRequests.map((request, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm">
                                Requested: {formatDate(request.requestedAt)}
                              </p>
                              {request.completedAt && (
                                <p className="text-sm text-green-600">
                                  Completed: {formatDate(request.completedAt)}
                                </p>
                              )}
                            </div>
                            {request.downloadUrl && (
                              <a
                                href={request.downloadUrl}
                                className="text-blue-600 hover:underline text-sm"
                              >
                                Download
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Communications Tab */}
            {activeTab === 'communications' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Communication Preferences</h2>
                <p className="text-gray-600 mb-6">
                  Manage how we communicate with you.
                </p>

                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <label className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Marketing Emails</h3>
                        <p className="text-sm text-gray-600">Receive promotional offers and newsletters</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={user?.preferences?.emailPreferences?.promotionalEmails || false}
                        className="h-5 w-5 text-blue-600 rounded"
                      />
                    </label>
                  </div>

                  <div className="border rounded-lg p-4">
                    <label className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Order Updates</h3>
                        <p className="text-sm text-gray-600">Receive updates about your orders</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={user?.preferences?.emailPreferences?.orderUpdates !== false}
                        className="h-5 w-5 text-blue-600 rounded"
                      />
                    </label>
                  </div>

                  <div className="border rounded-lg p-4">
                    <label className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Product Reviews</h3>
                        <p className="text-sm text-gray-600">Reminders to review purchased products</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={user?.preferences?.notifications || false}
                        className="h-5 w-5 text-blue-600 rounded"
                      />
                    </label>
                  </div>
                </div>

                <button
                  className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  disabled={loading}
                >
                  Save Communication Preferences
                </button>
              </div>
            )}

            {/* Account Deletion Tab */}
            {activeTab === 'deletion' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Account Deletion</h2>
                
                {deletionRequests.some(req => req.status === 'scheduled') ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-red-900 mb-2">Deletion Scheduled</h3>
                    <p className="text-sm text-red-800 mb-4">
                      Your account is scheduled for deletion on{' '}
                      {formatDate(deletionRequests.find(req => req.status === 'scheduled')?.scheduledFor)}
                    </p>
                    <button
                      onClick={handleCancelDeletion}
                      disabled={loading}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      Cancel Deletion Request
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <h3 className="font-medium text-yellow-900 mb-2">Warning</h3>
                      <p className="text-sm text-yellow-800">
                        Deleting your account is permanent and cannot be undone. All your personal data,
                        order history, and preferences will be permanently removed after a 30-day grace period.
                      </p>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="font-medium text-red-900 mb-2">Right to Erasure (Right to be Forgotten)</h3>
                      <p className="text-sm text-red-800 mb-4">
                        Under GDPR, you have the right to request the deletion of your personal data.
                        Your account will be deactivated immediately and permanently deleted after 30 days.
                      </p>
                      <button
                        onClick={handleAccountDeletion}
                        disabled={loading}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="inline h-4 w-4 mr-2" />
                        Delete My Account
                      </button>
                    </div>
                  </>
                )}

                {deletionRequests.filter(req => req.status === 'cancelled').length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-3">Deletion History</h3>
                    <div className="space-y-2">
                      {deletionRequests
                        .filter(req => req.status === 'cancelled')
                        .map((request, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <p className="text-sm">
                              Requested: {formatDate(request.requestedAt)} - 
                              <span className="text-gray-600 ml-1">Cancelled</span>
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Links */}
        <div className="bg-gray-100 rounded-lg p-6 text-center text-sm text-gray-600">
          <div className="flex justify-center space-x-4">
            <a href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </a>
            <span>•</span>
            <a href="mailto:dpo@authentika.com" className="text-blue-600 hover:underline">
              Contact DPO
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyCenter;