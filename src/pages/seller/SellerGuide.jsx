import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, CheckCircle, AlertCircle, Camera, FileText, Shield, Clock, MessageCircle, DollarSign } from 'lucide-react';
import BackButton from '../../components/BackButton';

const GUIDE_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: CheckCircle,
    content: [
      {
        title: 'Complete Your Profile',
        description: 'Fill in your phone number, location, and payment details. This helps buyers trust you and ensures smooth transactions.',
        tips: ['Use a phone number you check regularly', 'Provide accurate location for vehicle viewing', 'Set up M-Pesa or bank details for payments'],
      },
      {
        title: 'Verify Your Account',
        description: 'Phone verification is required to start selling. This ensures all sellers are genuine and builds trust with buyers.',
        tips: ['Verify your phone number during onboarding', 'Keep your contact information updated', 'Respond to verification requests promptly'],
      },
    ],
  },
  {
    id: 'listing-your-vehicle',
    title: 'Listing Your Vehicle',
    icon: Camera,
    content: [
      {
        title: 'Take Great Photos',
        description: 'High-quality photos are essential for attracting buyers. Take photos in good lighting and show all angles of the vehicle.',
        tips: ['Take 8+ photos for 3x more views', 'Include exterior, interior, engine, and trunk', 'Show any damage or wear honestly', 'Use natural lighting for best results'],
      },
      {
        title: 'Write a Detailed Description',
        description: 'Be thorough and honest about your vehicle. Include condition, history, maintenance records, and reason for selling.',
        tips: ['List all features and modifications', 'Mention any accidents or repairs', 'Include service history if available', 'Be honest about condition'],
      },
      {
        title: 'Set the Right Price',
        description: 'Research similar vehicles to set a competitive price. Overpriced vehicles take longer to sell.',
        tips: ['Check prices for similar vehicles on KAYAD', 'Consider mileage and condition', 'Be willing to negotiate slightly', 'Price competitively for faster sales'],
      },
    ],
  },
  {
    id: 'escrow-protection',
    title: 'Escrow Protection',
    icon: Shield,
    content: [
      {
        title: 'How Escrow Works',
        description: 'When a buyer makes an offer, their payment is held securely in escrow. You only receive payment after confirming successful handover.',
        tips: ['Funds are held until you confirm delivery', 'Buyers are verified before payment', 'Dispute resolution available if issues arise', 'Payment released after successful transfer'],
      },
      {
        title: 'Confirming Handover',
        description: 'After meeting the buyer and transferring the vehicle, confirm the handover in the platform to release payment.',
        tips: ['Meet in a safe, public location', 'Verify buyer identity before transfer', 'Complete all paperwork together', 'Confirm handover only after transfer'],
      },
    ],
  },
  {
    id: 'managing-inquiries',
    title: 'Managing Inquiries',
    icon: MessageCircle,
    content: [
      {
        title: 'Respond Quickly',
        description: 'Buyers appreciate fast responses. Aim to reply within 24 hours to maintain interest and build trust.',
        tips: ['Check messages regularly', 'Be polite and professional', 'Answer all buyer questions', 'Schedule viewings promptly'],
      },
      {
        title: 'Screen Buyers',
        description: 'All buyers on KAYAD are verified, but it\'s still good practice to ensure serious interest before scheduling viewings.',
        tips: ['Ask about their budget and timeline', 'Confirm they have financing ready', 'Schedule viewings with serious buyers only', 'Keep communication on platform'],
      },
    ],
  },
  {
    id: 'completing-the-sale',
    title: 'Completing the Sale',
    icon: DollarSign,
    content: [
      {
        title: 'Vehicle Inspection',
        description: 'Allow the buyer to inspect the vehicle thoroughly. Be transparent about any issues.',
        tips: ['Have all documents ready', 'Allow test drives with valid license', 'Explain any known issues', 'Be present during inspection'],
      },
      {
        title: 'Paperwork Transfer',
        description: 'Complete all necessary paperwork for vehicle transfer. This includes logbook transfer and any other required documents.',
        tips: ['Prepare logbook and transfer forms', 'Complete NTSA transfer together', 'Provide receipt of sale', 'Keep copies of all documents'],
      },
      {
        title: 'Payment Release',
        description: 'After successful handover and paperwork completion, confirm in the platform to release escrow payment.',
        tips: ['Confirm only after transfer is complete', 'Ensure all paperwork is signed', 'Verify payment details are correct', 'Keep records of the transaction'],
      },
    ],
  },
  {
    id: 'tips-for-success',
    title: 'Tips for Success',
    icon: CheckCircle,
    content: [
      {
        title: 'Best Practices',
        description: 'Follow these tips to sell faster and at better prices.',
        tips: [
          'List on weekends for more visibility',
          'Refresh your listing weekly',
          'Price competitively based on market',
          'Respond to inquiries within 24 hours',
          'Be honest about vehicle condition',
          'Use high-quality photos',
          'Write detailed descriptions',
          'Be flexible with viewing times',
        ],
      },
      {
        title: 'Common Mistakes to Avoid',
        description: 'Avoid these common pitfalls that can delay your sale.',
        tips: [
          'Overpricing your vehicle',
          'Poor quality or few photos',
          'Vague or incomplete descriptions',
          'Slow response to inquiries',
          'Not disclosing known issues',
          'Meeting in unsafe locations',
          'Accepting payment outside platform',
          'Not completing proper paperwork',
        ],
      },
    ],
  },
];

export default function SellerGuide() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const navigate = useNavigate();

  const activeGuide = GUIDE_SECTIONS.find(g => g.id === activeSection);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 1200 }}>
        <div style={{ marginBottom: 32 }}>
          <BackButton fallback="/seller" />
          <div className="section-eyebrow">Private Seller Hub</div>
          <h2>Seller Guide</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Everything you need to know to sell successfully on KAYAD
          </p>
        </div>

        <div className="grid gap-8 grid-cols-1 lg:grid-cols-4">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="card p-4">
              <h3 className="font-display font-bold text-white text-sm mb-4">Topics</h3>
              <div className="space-y-1">
                {GUIDE_SECTIONS.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                      activeSection === section.id
                        ? 'bg-gold/10 text-gold'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <section.icon size={16} />
                    {section.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-4 mt-4">
              <h3 className="font-display font-bold text-white text-sm mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link to="/sell" className="block btn btn-gold text-sm text-center no-underline">
                  List a Vehicle
                </Link>
                <Link to="/seller/analytics" className="block btn btn-outline text-sm text-center no-underline">
                  View Analytics
                </Link>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {activeGuide && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                    <activeGuide.icon size={24} className="text-gold" />
                  </div>
                  <h2 className="font-display font-bold text-white text-2xl">{activeGuide.title}</h2>
                </div>

                {activeGuide.content.map((item, index) => (
                  <div key={index} className="card p-6">
                    <h3 className="font-display font-bold text-white text-lg mb-3">{item.title}</h3>
                    <p className="text-white/60 text-sm mb-4">{item.description}</p>

                    <div className="bg-gold/5 rounded-lg p-4 border border-gold/10">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={16} className="text-gold" />
                        <span className="text-gold font-bold text-sm">Tips</span>
                      </div>
                      <ul className="space-y-2">
                        {item.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="flex items-start gap-2 text-white/70 text-sm">
                            <span className="text-gold mt-1">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}

                <div className="card p-6 bg-gold/5 border border-gold/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-gold flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-display font-bold text-white text-sm mb-2">Need Help?</h4>
                      <p className="text-white/60 text-sm mb-3">
                        If you have questions or need assistance, our support team is here to help.
                      </p>
                      <Link to="/seller/support" className="text-gold text-sm font-bold no-underline">
                        Contact Support →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
