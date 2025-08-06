import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Mail, Lock, Globe, FileText, Users, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  const { t, i18n } = useTranslation();
  const lastUpdated = '2024-01-15'; // Update this when policy changes
  const version = '1.0';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <Shield className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">
              {t('gdpr.privacyPolicy.title')}
            </h1>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>{t('gdpr.privacyPolicy.lastUpdated')}: {lastUpdated}</span>
            <span>{t('gdpr.privacyPolicy.version')}: {version}</span>
            <span>{t('gdpr.privacyPolicy.language')}: {i18n.language.toUpperCase()}</span>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">{t('gdpr.privacyPolicy.tableOfContents')}</h2>
          <ul className="space-y-2">
            <li><a href="#controller" className="text-blue-600 hover:underline">1. {t('gdpr.privacyPolicy.sections.dataController')}</a></li>
            <li><a href="#collection" className="text-blue-600 hover:underline">2. {t('gdpr.privacyPolicy.sections.dataCollection')}</a></li>
            <li><a href="#purposes" className="text-blue-600 hover:underline">3. {t('gdpr.privacyPolicy.sections.purposes')}</a></li>
            <li><a href="#legal-basis" className="text-blue-600 hover:underline">4. {t('gdpr.privacyPolicy.sections.legalBasis')}</a></li>
            <li><a href="#sharing" className="text-blue-600 hover:underline">5. {t('gdpr.privacyPolicy.sections.dataSharing')}</a></li>
            <li><a href="#retention" className="text-blue-600 hover:underline">6. {t('gdpr.privacyPolicy.sections.dataRetention')}</a></li>
            <li><a href="#rights" className="text-blue-600 hover:underline">7. {t('gdpr.privacyPolicy.sections.yourRights')}</a></li>
            <li><a href="#security" className="text-blue-600 hover:underline">8. {t('gdpr.privacyPolicy.sections.security')}</a></li>
            <li><a href="#cookies" className="text-blue-600 hover:underline">9. {t('gdpr.privacyPolicy.sections.cookies')}</a></li>
            <li><a href="#contact" className="text-blue-600 hover:underline">10. {t('gdpr.privacyPolicy.sections.contact')}</a></li>
          </ul>
        </div>

        {/* Section 1: Data Controller */}
        <section id="controller" className="bg-white shadow-sm rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-semibold">{t('gdpr.privacyPolicy.sections.dataController')}</h2>
          </div>
          <div className="prose max-w-none text-gray-700">
            <p>{t('gdpr.privacyPolicy.content.controller.intro')}</p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="font-semibold">Authentika Holistic Lifestyle</p>
              <p>123 Wellness Street</p>
              <p>Paris, France 75001</p>
              <p>Email: privacy@authentika.com</p>
              <p>Phone: +33 1 23 45 67 89</p>
            </div>
            <p className="mt-4">{t('gdpr.privacyPolicy.content.controller.dpo')}</p>
          </div>
        </section>

        {/* Section 2: Data Collection */}
        <section id="collection" className="bg-white shadow-sm rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <FileText className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-semibold">{t('gdpr.privacyPolicy.sections.dataCollection')}</h2>
          </div>
          <div className="prose max-w-none text-gray-700">
            <p>{t('gdpr.privacyPolicy.content.collection.intro')}</p>
            
            <h3 className="text-lg font-semibold mt-4">{t('gdpr.privacyPolicy.content.collection.personalData')}</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t('gdpr.privacyPolicy.content.collection.items.identity')}</li>
              <li>{t('gdpr.privacyPolicy.content.collection.items.contact')}</li>
              <li>{t('gdpr.privacyPolicy.content.collection.items.billing')}</li>
              <li>{t('gdpr.privacyPolicy.content.collection.items.transaction')}</li>
              <li>{t('gdpr.privacyPolicy.content.collection.items.technical')}</li>
              <li>{t('gdpr.privacyPolicy.content.collection.items.usage')}</li>
              <li>{t('gdpr.privacyPolicy.content.collection.items.preferences')}</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4">{t('gdpr.privacyPolicy.content.collection.specialCategories')}</h3>
            <p>{t('gdpr.privacyPolicy.content.collection.noSpecialCategories')}</p>
          </div>
        </section>

        {/* Section 3: Purposes */}
        <section id="purposes" className="bg-white shadow-sm rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <Globe className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-semibold">{t('gdpr.privacyPolicy.sections.purposes')}</h2>
          </div>
          <div className="prose max-w-none text-gray-700">
            <p>{t('gdpr.privacyPolicy.content.purposes.intro')}</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                <strong>{t('gdpr.privacyPolicy.content.purposes.items.orderFulfillment')}</strong>
                <p className="text-sm text-gray-600">{t('gdpr.privacyPolicy.content.purposes.descriptions.orderFulfillment')}</p>
              </li>
              <li>
                <strong>{t('gdpr.privacyPolicy.content.purposes.items.customerService')}</strong>
                <p className="text-sm text-gray-600">{t('gdpr.privacyPolicy.content.purposes.descriptions.customerService')}</p>
              </li>
              <li>
                <strong>{t('gdpr.privacyPolicy.content.purposes.items.marketing')}</strong>
                <p className="text-sm text-gray-600">{t('gdpr.privacyPolicy.content.purposes.descriptions.marketing')}</p>
              </li>
              <li>
                <strong>{t('gdpr.privacyPolicy.content.purposes.items.analytics')}</strong>
                <p className="text-sm text-gray-600">{t('gdpr.privacyPolicy.content.purposes.descriptions.analytics')}</p>
              </li>
              <li>
                <strong>{t('gdpr.privacyPolicy.content.purposes.items.legal')}</strong>
                <p className="text-sm text-gray-600">{t('gdpr.privacyPolicy.content.purposes.descriptions.legal')}</p>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Legal Basis */}
        <section id="legal-basis" className="bg-white shadow-sm rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <Scale className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-semibold">{t('gdpr.privacyPolicy.sections.legalBasis')}</h2>
          </div>
          <div className="prose max-w-none text-gray-700">
            <p>{t('gdpr.privacyPolicy.content.legalBasis.intro')}</p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">{t('gdpr.privacyPolicy.content.legalBasis.activity')}</th>
                    <th className="text-left py-2">{t('gdpr.privacyPolicy.content.legalBasis.basis')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">{t('gdpr.privacyPolicy.content.legalBasis.activities.accountCreation')}</td>
                    <td className="py-2">{t('gdpr.privacyPolicy.content.legalBasis.bases.contract')}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">{t('gdpr.privacyPolicy.content.legalBasis.activities.orderProcessing')}</td>
                    <td className="py-2">{t('gdpr.privacyPolicy.content.legalBasis.bases.contract')}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">{t('gdpr.privacyPolicy.content.legalBasis.activities.marketing')}</td>
                    <td className="py-2">{t('gdpr.privacyPolicy.content.legalBasis.bases.consent')}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">{t('gdpr.privacyPolicy.content.legalBasis.activities.analytics')}</td>
                    <td className="py-2">{t('gdpr.privacyPolicy.content.legalBasis.bases.legitimateInterest')}</td>
                  </tr>
                  <tr>
                    <td className="py-2">{t('gdpr.privacyPolicy.content.legalBasis.activities.taxRecords')}</td>
                    <td className="py-2">{t('gdpr.privacyPolicy.content.legalBasis.bases.legalObligation')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 5: Data Sharing */}
        <section id="sharing" className="bg-white shadow-sm rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-semibold">{t('gdpr.privacyPolicy.sections.dataSharing')}</h2>
          </div>
          <div className="prose max-w-none text-gray-700">
            <p>{t('gdpr.privacyPolicy.content.sharing.intro')}</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                <strong>{t('gdpr.privacyPolicy.content.sharing.categories.paymentProcessors')}</strong>
                <p className="text-sm text-gray-600">{t('gdpr.privacyPolicy.content.sharing.descriptions.paymentProcessors')}</p>
              </li>
              <li>
                <strong>{t('gdpr.privacyPolicy.content.sharing.categories.shippingPartners')}</strong>
                <p className="text-sm text-gray-600">{t('gdpr.privacyPolicy.content.sharing.descriptions.shippingPartners')}</p>
              </li>
              <li>
                <strong>{t('gdpr.privacyPolicy.content.sharing.categories.emailProviders')}</strong>
                <p className="text-sm text-gray-600">{t('gdpr.privacyPolicy.content.sharing.descriptions.emailProviders')}</p>
              </li>
              <li>
                <strong>{t('gdpr.privacyPolicy.content.sharing.categories.analyticsProviders')}</strong>
                <p className="text-sm text-gray-600">{t('gdpr.privacyPolicy.content.sharing.descriptions.analyticsProviders')}</p>
              </li>
            </ul>
            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <p className="text-sm">{t('gdpr.privacyPolicy.content.sharing.international')}</p>
            </div>
          </div>
        </section>

        {/* Section 6: Data Retention */}
        <section id="retention" className="bg-white shadow-sm rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <Lock className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-semibold">{t('gdpr.privacyPolicy.sections.dataRetention')}</h2>
          </div>
          <div className="prose max-w-none text-gray-700">
            <p>{t('gdpr.privacyPolicy.content.retention.intro')}</p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">{t('gdpr.privacyPolicy.content.retention.dataType')}</th>
                    <th className="text-left py-2">{t('gdpr.privacyPolicy.content.retention.period')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">{t('gdpr.privacyPolicy.content.retention.types.account')}</td>
                    <td className="py-2">{t('gdpr.privacyPolicy.content.retention.periods.untilDeletion')}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">{t('gdpr.privacyPolicy.content.retention.types.orders')}</td>
                    <td className="py-2">{t('gdpr.privacyPolicy.content.retention.periods.sevenYears')}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">{t('gdpr.privacyPolicy.content.retention.types.marketing')}</td>
                    <td className="py-2">{t('gdpr.privacyPolicy.content.retention.periods.untilWithdrawn')}</td>
                  </tr>
                  <tr>
                    <td className="py-2">{t('gdpr.privacyPolicy.content.retention.types.cookies')}</td>
                    <td className="py-2">{t('gdpr.privacyPolicy.content.retention.periods.varies')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 7: Your Rights */}
        <section id="rights" className="bg-white shadow-sm rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <Shield className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-semibold">{t('gdpr.privacyPolicy.sections.yourRights')}</h2>
          </div>
          <div className="prose max-w-none text-gray-700">
            <p>{t('gdpr.privacyPolicy.content.rights.intro')}</p>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-600">{t('gdpr.privacyPolicy.content.rights.access.title')}</h3>
                <p className="text-sm mt-2">{t('gdpr.privacyPolicy.content.rights.access.description')}</p>
                <Link to="/privacy-center" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                  {t('gdpr.privacyPolicy.content.rights.access.action')}
                </Link>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-600">{t('gdpr.privacyPolicy.content.rights.rectification.title')}</h3>
                <p className="text-sm mt-2">{t('gdpr.privacyPolicy.content.rights.rectification.description')}</p>
                <Link to="/profile" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                  {t('gdpr.privacyPolicy.content.rights.rectification.action')}
                </Link>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-600">{t('gdpr.privacyPolicy.content.rights.erasure.title')}</h3>
                <p className="text-sm mt-2">{t('gdpr.privacyPolicy.content.rights.erasure.description')}</p>
                <Link to="/privacy-center" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                  {t('gdpr.privacyPolicy.content.rights.erasure.action')}
                </Link>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-600">{t('gdpr.privacyPolicy.content.rights.portability.title')}</h3>
                <p className="text-sm mt-2">{t('gdpr.privacyPolicy.content.rights.portability.description')}</p>
                <Link to="/privacy-center" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                  {t('gdpr.privacyPolicy.content.rights.portability.action')}
                </Link>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-600">{t('gdpr.privacyPolicy.content.rights.restriction.title')}</h3>
                <p className="text-sm mt-2">{t('gdpr.privacyPolicy.content.rights.restriction.description')}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-600">{t('gdpr.privacyPolicy.content.rights.objection.title')}</h3>
                <p className="text-sm mt-2">{t('gdpr.privacyPolicy.content.rights.objection.description')}</p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
              <p className="text-sm">{t('gdpr.privacyPolicy.content.rights.complaint')}</p>
            </div>
          </div>
        </section>

        {/* Section 8: Security */}
        <section id="security" className="bg-white shadow-sm rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <Lock className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-semibold">{t('gdpr.privacyPolicy.sections.security')}</h2>
          </div>
          <div className="prose max-w-none text-gray-700">
            <p>{t('gdpr.privacyPolicy.content.security.intro')}</p>
            <ul className="list-disc pl-6 space-y-1 mt-4">
              <li>{t('gdpr.privacyPolicy.content.security.measures.encryption')}</li>
              <li>{t('gdpr.privacyPolicy.content.security.measures.access')}</li>
              <li>{t('gdpr.privacyPolicy.content.security.measures.monitoring')}</li>
              <li>{t('gdpr.privacyPolicy.content.security.measures.training')}</li>
              <li>{t('gdpr.privacyPolicy.content.security.measures.audits')}</li>
            </ul>
            <p className="mt-4">{t('gdpr.privacyPolicy.content.security.breach')}</p>
          </div>
        </section>

        {/* Section 9: Cookies */}
        <section id="cookies" className="bg-white shadow-sm rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <FileText className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-semibold">{t('gdpr.privacyPolicy.sections.cookies')}</h2>
          </div>
          <div className="prose max-w-none text-gray-700">
            <p>{t('gdpr.privacyPolicy.content.cookies.intro')}</p>
            <p className="mt-4">
              {t('gdpr.privacyPolicy.content.cookies.manage')} 
              <Link to="/privacy-center" className="text-blue-600 hover:underline ml-1">
                {t('gdpr.privacyPolicy.content.cookies.privacyCenter')}
              </Link>
            </p>
          </div>
        </section>

        {/* Section 10: Contact */}
        <section id="contact" className="bg-white shadow-sm rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <Mail className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-semibold">{t('gdpr.privacyPolicy.sections.contact')}</h2>
          </div>
          <div className="prose max-w-none text-gray-700">
            <p>{t('gdpr.privacyPolicy.content.contact.intro')}</p>
            <div className="bg-blue-50 p-6 rounded-lg mt-4">
              <h3 className="font-semibold mb-3">{t('gdpr.privacyPolicy.content.contact.dpo')}</h3>
              <p>Email: <a href="mailto:dpo@authentika.com" className="text-blue-600 hover:underline">dpo@authentika.com</a></p>
              <p>Phone: +33 1 23 45 67 89</p>
              <p className="mt-3">{t('gdpr.privacyPolicy.content.contact.address')}:</p>
              <p>Authentika Holistic Lifestyle<br />
                Attn: Data Protection Officer<br />
                123 Wellness Street<br />
                Paris, France 75001</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="bg-gray-100 rounded-lg p-6 text-center text-sm text-gray-600">
          <p>{t('gdpr.privacyPolicy.footer.updates')}</p>
          <div className="mt-4 flex justify-center space-x-4">
            <Link to="/terms" className="text-blue-600 hover:underline">
              {t('gdpr.links.termsOfService')}
            </Link>
            <span>•</span>
            <Link to="/cookie-policy" className="text-blue-600 hover:underline">
              {t('gdpr.links.cookiePolicy')}
            </Link>
            <span>•</span>
            <Link to="/privacy-center" className="text-blue-600 hover:underline">
              {t('gdpr.links.privacyCenter')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;