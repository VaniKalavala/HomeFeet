import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, Eye, Filter, Mail, MapPin, MessageCircle, Pencil, Phone, Search, Trash2, UserPlus, X } from 'lucide-react';
import { API_BASE, API_ORIGIN } from '../lib/api';
import { isAdminUser } from '../lib/admin';

interface Property {
  _id: string;
  projectName: string;
  developmentType: string;
  listingIntent?: string;
  totalArea: string;
  areaUnit: string;
  flatSize?: string;
  state?: string;
  city: string;
  locality: string;
  societyName?: string;
  landmark: string;
  goodwill: string;
  advance: string;
  imageUrl: string;
  plotDiagramUrl?: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  facing?: string;
  developerRatio?: string;
  source?: string;
  intakePeriod?: string;
  bedrooms?: string;
  bathrooms?: string;
  floorNumber?: string;
  totalFloors?: string;
  furnishingStatus?: string;
  possessionStatus?: string;
}

const stateCapitalOptions = [
  { state: 'Telangana', capital: 'Hyderabad' },
  { state: 'Karnataka', capital: 'Bengaluru' },
  { state: 'Tamil Nadu', capital: 'Chennai' },
  { state: 'Maharashtra', capital: 'Mumbai' },
  { state: 'Delhi', capital: 'Delhi' },
  { state: 'West Bengal', capital: 'Kolkata' },
  { state: 'Gujarat', capital: 'Ahmedabad' },
  { state: 'Rajasthan', capital: 'Jaipur' },
  { state: 'Kerala', capital: 'Kochi' },
  { state: 'Uttar Pradesh', capital: 'Lucknow' },
  { state: 'Chandigarh', capital: 'Chandigarh' }
];

const builderContactCityOptions = [
  'Hyderabad',
  'Bengaluru',
  'Chennai',
  'Mumbai',
  'Pune',
  'Delhi NCR',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Kochi',
  'Lucknow',
  'Chandigarh',
  'Vijayawada',
  'Visakhapatnam'
];

const normalizeLocationName = (value = '') => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizePhoneNumber = (value = '') => String(value || '').replace(/\D/g, '').slice(-10);
const isDisplayableImage = (url = '') => Boolean(url) && !/\.pdf(?:$|\?)/i.test(url);
const mediaSrc = (url = '') => url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
const getPropertyImageUrl = (property: Pick<Property, 'imageUrl' | 'plotDiagramUrl'>) =>
  property.imageUrl || (isDisplayableImage(property.plotDiagramUrl) ? property.plotDiagramUrl || '' : '');

const commercialDevelopmentTypes = ['commercial-plot', 'office-space', 'retail', 'hospitality', 'industrial'];

const apartmentLikeDevelopmentTypes = ['apartment', 'standalone', 'high-rise', 'gated-community', 'group-house'];

const getPropertyCategory = (property: Pick<Property, 'listingIntent' | 'developmentType'>) => {
  const intent = (property.listingIntent || 'development').toLowerCase();
  const type = (property.developmentType || '').toLowerCase();
  if (intent === 'buy') return 'Buyers';
  if (intent === 'sell' && commercialDevelopmentTypes.includes(type)) return 'Commercial Plot';
  if (intent === 'sell' && apartmentLikeDevelopmentTypes.includes(type)) return 'Sell Flat';
  if (intent === 'sell' && type === 'villa') return 'Sell Villa';
  if (intent === 'sell' && type === 'farm-house') return 'FarmHouse';
  if (intent === 'sell') return 'Sell Plot';
  return 'ForDevelopers';
};

const getPropertyCategoryClass = (category: string) => {
  if (category === 'Buyers') return 'bg-blue-50 text-blue-800 border-blue-100';
  if (category === 'Sell Flat') return 'bg-emerald-50 text-emerald-800 border-emerald-100';
  if (category === 'Sell Villa') return 'bg-orange-50 text-orange-800 border-orange-100';
  if (category === 'FarmHouse') return 'bg-green-50 text-green-800 border-green-100';
  if (category === 'Sell Plot') return 'bg-amber-50 text-amber-800 border-amber-100';
  if (category === 'Commercial Plot') return 'bg-purple-50 text-purple-800 border-purple-100';
  return 'bg-teal-50 text-teal-800 border-teal-100';
};

const capitalAliases: Record<string, string[]> = {
  bengaluru: ['bengaluru', 'bangalore'],
  mumbai: ['mumbai', 'bombay'],
  delhi: ['delhi', 'newdelhi'],
  kolkata: ['kolkata', 'calcutta'],
  kochi: ['kochi', 'cochin']
};

interface BuilderContact {
  _id: string;
  city: string;
  companyName: string;
  contactPersonName?: string;
  mobile?: string;
  email?: string;
  website?: string;
  logoDataUrl?: string;
  logoFileName?: string;
  sourceNote?: string;
  isGenuineContact?: boolean;
  dailyDigestEnabled?: boolean;
  lastDigestSentAt?: string;
  loginUserId?: string;
}

interface Testimonial {
  _id: string;
  name: string;
  role: string;
  city?: string;
  summary: string;
  status: 'pending' | 'approved' | 'hidden';
  createdAt: string;
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [whatsAppIntake, setWhatsAppIntake] = useState<any>({ intakes: [], pendingProperties: [], counts: { morningPending: 0, eveningPending: 0, totalPending: 0 } });
  const [whatsAppPeriod, setWhatsAppPeriod] = useState<'all' | 'morning' | 'evening'>('all');
  const [whatsAppForm, setWhatsAppForm] = useState({ ownerPhone: '', ownerName: '', summary: '' });
  // Campaign state
  const [campaignStep, setCampaignStep] = useState<1 | 2>(1);
  const [campaignFromId, setCampaignFromId] = useState('Homefeet - +918019008351');
  const [campaignFromIds, setCampaignFromIds] = useState([
    { label: 'Homefeet', number: '+918019008351' }
  ]);
  const [showAddNumber, setShowAddNumber] = useState(false);
  const [newNumberLabel, setNewNumberLabel] = useState('');
  const [newNumberPhone, setNewNumberPhone] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignNumbers, setCampaignNumbers] = useState('');
  const [campaignNumberTab, setCampaignNumberTab] = useState<'insert' | 'contacts' | 'upload'>('insert');
  const [contactsFilterType, setContactsFilterType] = useState<'group' | 'category' | 'tag'>('category');
  const [contactsCategory, setContactsCategory] = useState('');
  const [uploadContactFile, setUploadContactFile] = useState<File | null>(null);
  const [uploadCountryCodeMissing, setUploadCountryCodeMissing] = useState(false);
  const [uploadMobileField, setUploadMobileField] = useState('');
  const [uploadContactColumns, setUploadContactColumns] = useState<string[]>([]);
  const [templateStep, setTemplateStep] = useState<1 | 2 | 3>(1);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState<'marketing' | 'utility' | 'authentication'>('marketing');
  const [templateMarketingType, setTemplateMarketingType] = useState('Custom');
  const [templateLanguage, setTemplateLanguage] = useState('en');
  const [templateHeaderType, setTemplateHeaderType] = useState('');
  const [templateHeaderText, setTemplateHeaderText] = useState('');
  const [templateHeaderFile, setTemplateHeaderFile] = useState<File | null>(null);
  const [templateHeaderPreview, setTemplateHeaderPreview] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateFooter, setTemplateFooter] = useState('');
  const [templateActions, setTemplateActions] = useState('');
  const [actionType, setActionType] = useState('');
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [advancedSearch, setAdvancedSearch] = useState(false);
  type ActionItem = { label: string; urlType: string; url: string };
  type QuickReplyItem = { text: string };
  const [websiteActions, setWebsiteActions] = useState<ActionItem[]>([]);
  const [phoneActions, setPhoneActions] = useState<ActionItem[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReplyItem[]>([]);
  // Campaign submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle'|'pending'|'approved'|'rejected'|'sending'|'done'>('idle');
  const [submitError, setSubmitError] = useState('');
  const [submittedTemplateName, setSubmittedTemplateName] = useState('');
  const [campaignResult, setCampaignResult] = useState<{sent:number;failed:number}|null>(null);
  // Template Jobs
  const [whatsappView, setWhatsappView] = useState<'campaign'|'templates'>('campaign');
  const [templateJobs, setTemplateJobs] = useState<any[]>([]);
  const [templateJobsLoading, setTemplateJobsLoading] = useState(false);
  const [builderContacts, setBuilderContacts] = useState<BuilderContact[]>([]);
  const [builderContactCity, setBuilderContactCity] = useState('all');
  const [builderContactForm, setBuilderContactForm] = useState({
    city: 'Hyderabad',
    companyName: '',
    contactPersonName: '',
    mobile: '',
    email: '',
    website: '',
    logoDataUrl: '',
    logoFileName: '',
    sourceNote: 'Official or consented business contact',
    isGenuineContact: true,
    dailyDigestEnabled: false
  });
  const [builderImportText, setBuilderImportText] = useState('');
  const [builderImportSource, setBuilderImportSource] = useState('T-RERA / CREDAI official public registry');
  const [builderImportStatus, setBuilderImportStatus] = useState('');
  const [builderSeedCity, setBuilderSeedCity] = useState('Hyderabad');
  const [builderDigestSending, setBuilderDigestSending] = useState(false);
  const [builderDigestStatus, setBuilderDigestStatus] = useState('');
  const [activeAdminPage, setActiveAdminPage] = useState<'properties' | 'builders' | 'builderContacts' | 'membership' | 'inquiries' | 'whatsapp' | 'testimonials' | 'loginHistory'>('properties');
  const [activeMembershipTab, setActiveMembershipTab] = useState('all');
  const [activeMembershipTypeTab, setActiveMembershipTypeTab] = useState('all');
  const [adminLoadError, setAdminLoadError] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    developmentType: 'all',
    headerType: 'all',
    state: 'all',
    capitalCity: 'all',
    searchQuery: ''
  });

  useEffect(() => {
    // Check if user is admin
    const phone = localStorage.getItem('phone');
    const accountType = localStorage.getItem('accountType');
    const email = localStorage.getItem('email');

    if (!isAdminUser(phone, accountType, email)) {
      alert('Access denied. Admin only.');
      navigate('/');
      return;
    }

    fetchPendingProperties();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [properties, filters]);

  const fetchPendingProperties = async () => {
    setLoading(true);
    setAdminLoadError('');
    try {
      const token = localStorage.getItem('token');
      const [propertiesRes, usersRes, inquiriesRes, whatsAppRes, builderContactsRes, testimonialsRes, loginHistoryRes] = await Promise.all([
        fetch(`${API_BASE}/admin/properties`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/admin/inquiries`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/admin/whatsapp-intakes`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/admin/builder-contacts`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/admin/testimonials`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/admin/login-history`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (propertiesRes.ok) {
        const data = await propertiesRes.json();
        setProperties(data);
      } else {
        const data = await propertiesRes.json().catch(() => ({}));
        setProperties([]);
        setAdminLoadError(data.error || `Unable to load admin properties (${propertiesRes.status})`);
      }
      if (usersRes.ok) setUsers(await usersRes.json());
      if (inquiriesRes.ok) setInquiries(await inquiriesRes.json());
      if (whatsAppRes.ok) setWhatsAppIntake(await whatsAppRes.json());
      if (builderContactsRes.ok) setBuilderContacts(await builderContactsRes.json());
      if (testimonialsRes.ok) setTestimonials(await testimonialsRes.json());
      if (loginHistoryRes.ok) setLoginHistory(await loginHistoryRes.json());
    } catch (error) {
      console.error('Error fetching properties:', error);
      setAdminLoadError(error instanceof Error ? error.message : 'Unable to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const updateTestimonialStatus = async (testimonialId: string, status: Testimonial['status']) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/testimonials/${testimonialId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update testimonial');
      setTestimonials((current) => current.map((item) => item._id === testimonialId ? data.testimonial : item));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to update testimonial');
    }
  };

  const resetPropertyFilters = () => {
    setFilters({
      status: 'all',
      developmentType: 'all',
      headerType: 'all',
      state: 'all',
      capitalCity: 'all',
      searchQuery: ''
    });
  };

  const applyFilters = () => {
    let filtered = [...properties];

    if (filters.state !== 'all') {
      filtered = filtered.filter(p => normalizeLocationName(getStateForProperty(p)) === normalizeLocationName(filters.state));
    }

    if (filters.capitalCity !== 'all') {
      const selectedCapital = normalizeLocationName(filters.capitalCity);
      const aliases = capitalAliases[selectedCapital] || [selectedCapital];
      filtered = filtered.filter(p => {
        const city = normalizeLocationName(getCapitalForProperty(p) || p.city || '');
        const locationText = [p.locality, p.societyName, p.projectName, p.landmark]
          .filter(Boolean)
          .map(value => normalizeLocationName(String(value)))
          .join(' ');
        return aliases.some(alias => city === alias || locationText.includes(alias));
      });
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    // Header type filter
    if (filters.headerType !== 'all') {
      filtered = filtered.filter(p => {
        const intent = (p.listingIntent || 'development').toLowerCase();
        const type = (p.developmentType || '').toLowerCase();
        if (filters.headerType === 'development') return intent === 'development';
        if (filters.headerType === 'buy') return intent === 'buy';
        if (filters.headerType === 'sell') return intent === 'sell' && !commercialDevelopmentTypes.includes(type);
        if (filters.headerType === 'commercial') return intent === 'sell' && commercialDevelopmentTypes.includes(type);
        if (filters.headerType === 'map-view') return Boolean(p.city || p.locality || p.landmark);
        return true;
      });
    }

    // Development type filter
    if (filters.developmentType !== 'all') {
      filtered = filtered.filter(p => p.developmentType === filters.developmentType);
    }

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.locality?.toLowerCase().includes(query) ||
        p.societyName?.toLowerCase().includes(query) ||
        p.city?.toLowerCase().includes(query) ||
        p.developmentType?.toLowerCase().includes(query)
      );
    }

    setFilteredProperties(filtered);
  };

  const handleApprove = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/properties/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        alert('Property approved successfully!');
        setProperties(prev => prev.map(p => 
          p._id === id ? { ...p, status: 'approved' as const } : p
        ));
        fetchWhatsAppIntake();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error approving property:', error);
      alert('Failed to approve property');
    }
  };

  const handleReject = async (id: string, defaultReason = '') => {
    const reason = prompt(
      'Add feedback for the owner/mediator. This will be visible in their My Listings page:',
      defaultReason
    );
    if (reason === null) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/properties/${id}/reject`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedProperty = data.property || { status: 'rejected', rejectionReason: reason };
        alert('Property rejected');
        setProperties(prev => prev.map(p => 
          p._id === id ? { ...p, ...updatedProperty, status: 'rejected' as const } : p
        ));
        setSelectedProperty(prev => prev && prev._id === id ? { ...prev, ...updatedProperty, status: 'rejected' as const } : prev);
        fetchWhatsAppIntake();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error rejecting property:', error);
      alert('Failed to reject property');
    }
  };

  const handleEditProperty = (id: string) => {
    setShowModal(false);
    navigate(`/edit-property/${id}?admin=true`);
  };

  const verifyBuilder = async (id: string, status: 'approved' | 'rejected') => {
    const token = localStorage.getItem('token');
    const reason = status === 'rejected' ? prompt('Reason for rejecting builder verification:') : '';
    if (status === 'rejected' && reason === null) return;
    const res = await fetch(`${API_BASE}/admin/builders/${id}/verify`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason })
    });
    if (res.ok) fetchPendingProperties();
  };

  const deleteBuilder = async (builder: any) => {
    const name = builder.builderCompanyName || `${builder.firstName || ''} ${builder.lastName || ''}`.trim() || builder.phone;
    const confirmed = window.confirm(`Delete builder user ${name}? This removes their builder login, requests, and chat messages. This cannot be undone.`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/builders/${builder._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete builder user');

      setUsers(prev => prev.filter(user => user._id !== builder._id));
      setBuilderContacts(prev => prev.map(contact =>
        contact.loginUserId === builder._id ? { ...contact, loginUserId: '' } : contact
      ));
      alert('Builder user deleted successfully.');
    } catch (error) {
      console.error('Error deleting builder:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete builder user');
    }
  };

  const resetMembershipAccess = async (user: any) => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phone;
    const confirmed = window.confirm(`Reset membership access for ${name}? This will remove the active plan and reset contact unlock usage.`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/users/${user._id}/reset-membership`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset membership');

      setUsers(prev => prev.map(item => item._id === user._id ? data.user : item));
      alert('Membership access reset successfully.');
    } catch (error) {
      console.error('Error resetting membership:', error);
      alert(error instanceof Error ? error.message : 'Failed to reset membership');
    }
  };

  const deleteMembershipAccess = async (user: any) => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phone;
    const confirmed = window.confirm(`Delete membership for ${name}? This removes active access and deletes saved membership payment/order records for this user.`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/users/${user._id}/membership`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete membership');

      setUsers(prev => prev.map(item => item._id === user._id ? data.user : item));
      alert('Membership deleted successfully.');
    } catch (error) {
      console.error('Error deleting membership:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete membership');
    }
  };

  const extendMembershipAccess = async (user: any, plan: '3_months' | '6_months' | '12_months') => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phone;
    const confirmed = window.confirm(`Extend membership for ${name} with ${plan.replace('_', ' ')} access?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/users/${user._id}/extend-membership`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend membership');

      setUsers(prev => prev.map(item => item._id === user._id ? data.user : item));
      alert('Membership access extended successfully.');
    } catch (error) {
      console.error('Error extending membership:', error);
      alert(error instanceof Error ? error.message : 'Failed to extend membership');
    }
  };

  const fetchWhatsAppIntake = async (period: 'all' | 'morning' | 'evening' = whatsAppPeriod) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/whatsapp-intakes?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setWhatsAppIntake(await res.json());
    } catch (error) {
      console.error('Error fetching WhatsApp intake:', error);
    }
  };

  const submitWhatsAppIntake = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/whatsapp-intakes/manual`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsAppForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create WhatsApp intake');
      setWhatsAppForm({ ownerPhone: '', ownerName: '', summary: '' });
      await Promise.all([fetchPendingProperties(), fetchWhatsAppIntake()]);
      alert('WhatsApp property intake submitted for admin approval.');
    } catch (error) {
      console.error('Error submitting WhatsApp intake:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit WhatsApp intake');
    }
  };

  const fetchTemplateJobs = async () => {
    setTemplateJobsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/whatsapp/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d.success) setTemplateJobs(d.templates || []);
    } catch (e) { console.error(e); }
    finally { setTemplateJobsLoading(false); }
  };

  const loadTemplateForEdit = (tpl: any) => {
    setTemplateName(tpl.name || '');
    setTemplateCategory((tpl.category?.toLowerCase() || 'marketing') as any);
    setTemplateLanguage(tpl.language || 'en');
    setTemplateHeaderType('');
    setTemplateHeaderText('');
    setTemplateHeaderFile(null);
    setTemplateHeaderPreview('');
    setTemplateBody('');
    setTemplateFooter('');
    setWebsiteActions([]);
    setPhoneActions([]);
    setQuickReplies([]);
    setSubmitStatus('idle');
    setSubmitError('');

    for (const comp of tpl.components || []) {
      if (comp.type === 'HEADER') {
        setTemplateHeaderType(comp.format?.toLowerCase() || '');
        if (comp.format === 'TEXT') setTemplateHeaderText(comp.text || '');
      }
      if (comp.type === 'BODY')   setTemplateBody(comp.text || '');
      if (comp.type === 'FOOTER') setTemplateFooter(comp.text || '');
      if (comp.type === 'BUTTONS') {
        const urlBtns: ActionItem[]   = [];
        const phoneBtns: ActionItem[] = [];
        const qrBtns: QuickReplyItem[] = [];
        for (const btn of comp.buttons || []) {
          if (btn.type === 'URL') {
            const isDynamic = (btn.url || '').includes('{{1}}');
            urlBtns.push({ label: btn.text || '', urlType: isDynamic ? 'Dynamic' : 'Static', url: (btn.url || '').replace('/{{1}}', '') });
          } else if (btn.type === 'PHONE_NUMBER') {
            phoneBtns.push({ label: btn.text || '', urlType: '', url: btn.phone_number || '' });
          } else if (btn.type === 'QUICK_REPLY') {
            qrBtns.push({ text: btn.text || '' });
          }
        }
        setWebsiteActions(urlBtns);
        setPhoneActions(phoneBtns);
        setQuickReplies(qrBtns);
      }
    }

    setCampaignStep(2);
    setTemplateStep(2);
    setWhatsappView('campaign');
  };

  const fetchBuilderContacts = async (city = builderContactCity) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/builder-contacts?city=${encodeURIComponent(city)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setBuilderContacts(await res.json());
    } catch (error) {
      console.error('Error fetching builder contacts:', error);
    }
  };

  const sendBuilderDigestNow = async () => {
    const token = localStorage.getItem('token');
    const city = builderContactCity === 'all' ? 'Hyderabad' : builderContactCity;
    setBuilderDigestSending(true);
    setBuilderDigestStatus("Sending today's digest...");

    try {
      const response = await fetch(`${API_BASE}/admin/builder-digest/send-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ city, period: 'manual', fallbackToRecent: true })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const missing = Array.isArray(data.missingConfig) && data.missingConfig.length
          ? ` Missing env: ${data.missingConfig.join(', ')}.`
          : '';
        const provider = data.whatsappError?.message
          ? ` WhatsApp says: ${data.whatsappError.message}.`
          : '';
        const code = data.whatsappError?.code
          ? ` Code: ${data.whatsappError.code}.`
          : '';
        const trace = data.whatsappError?.fbtraceId
          ? ` Trace: ${data.whatsappError.fbtraceId}.`
          : '';
        const hint = data.hint ? ` ${data.hint}` : '';
        throw new Error(`${data.error || "Unable to send today's digest"}${provider}${code}${trace}${missing}${hint}`);
      }

      const firstFailure = Array.isArray(data.failures) && data.failures.length ? data.failures[0] : null;
      const failureCode = firstFailure?.whatsappError?.code ? ` Code: ${firstFailure.whatsappError.code}.` : '';
      const failureTrace = firstFailure?.whatsappError?.fbtraceId ? ` Trace: ${firstFailure.whatsappError.fbtraceId}.` : '';
      const failureDetails = firstFailure
        ? ` First failure: ${firstFailure.builder || 'Builder'} - ${firstFailure.error || 'WhatsApp send failed'}.${failureCode}${failureTrace}${firstFailure.hint ? ` ${firstFailure.hint}` : ''}`
        : '';
      const propertyLabel = data.propertySource === 'recent'
        ? 'recent approved properties'
        : "today's new properties";
      const fallbackDetails = data.usedFallback
        ? ' No same-day property updates were found, so recent approved open listings were checked.'
        : '';
      const alreadySentDetails = data.propertyCount > 0 && data.sent === 0 && data.skipped > 0 && data.failed === 0
        ? ' These listings may already have been sent to the selected builders today.'
        : '';
      setBuilderDigestStatus(
        `Digest checked ${data.propertyCount || 0} ${propertyLabel} for ${data.builderCount || 0} builders. Sent ${data.sent || 0}, skipped ${data.skipped || 0}, failed ${data.failed || 0}.${fallbackDetails}${alreadySentDetails}${failureDetails}`
      );
      fetchBuilderContacts(builderContactCity);
    } catch (error) {
      setBuilderDigestStatus(error instanceof Error ? error.message : "Unable to send today's digest");
    } finally {
      setBuilderDigestSending(false);
    }
  };

  const parseCsvLine = (line: string) => {
    const values: string[] = [];
    let current = '';
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"' && quoted && next === '"') {
        current += '"';
        index += 1;
        continue;
      }

      if (char === '"') {
        quoted = !quoted;
        continue;
      }

      if (char === ',' && !quoted) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  };

  const parseBuilderImportRows = (text: string) => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map(header => header.trim());
    return lines.slice(1).map(line => {
      const values = parseCsvLine(line);
      return headers.reduce<Record<string, string>>((row, header, index) => {
        row[header] = values[index] || '';
        return row;
      }, {});
    });
  };

  const readBuilderImportFile = (file?: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setBuilderImportText(String(reader.result || ''));
    reader.readAsText(file);
  };

  const importBuilderContacts = async () => {
    try {
      const rows = parseBuilderImportRows(builderImportText);
      if (!rows.length) {
        alert('Paste CSV data with a header row, or upload the official export saved as CSV.');
        return;
      }

      const token = localStorage.getItem('token');
      setBuilderImportStatus('Importing official builder contacts...');
      const res = await fetch(`${API_BASE}/admin/builder-contacts/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, sourceNote: builderImportSource, defaultCity: builderSeedCity })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import builder contacts');

      setBuilderImportStatus(`Imported ${data.imported} contacts under ${builderSeedCity}. Skipped ${data.skipped}.`);
      setBuilderImportText('');
      setBuilderContactCity(builderSeedCity);
      setBuilderContactForm(prev => ({ ...prev, city: builderSeedCity }));
      fetchBuilderContacts(builderSeedCity);
    } catch (error) {
      console.error('Error importing builder contacts:', error);
      setBuilderImportStatus(error instanceof Error ? error.message : 'Failed to import builder contacts');
    }
  };

  const loadHyderabadBuilderSeedContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      setBuilderImportStatus('Loading Hyderabad builder contacts...');
      const res = await fetch(`${API_BASE}/admin/builder-contacts/seed-hyderabad`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Hyderabad builder contacts');

      setBuilderImportStatus(`Loaded ${data.imported} Hyderabad builder contacts. Skipped ${data.skipped}. Landline contacts are excluded.`);
      fetchBuilderContacts('Hyderabad');
      setBuilderContactCity('Hyderabad');
    } catch (error) {
      console.error('Error loading Hyderabad builder contacts:', error);
      setBuilderImportStatus(error instanceof Error ? error.message : 'Failed to load Hyderabad builder contacts');
    }
  };

  const loadMumbaiBuilderSeedContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      setBuilderImportStatus('Loading Mumbai builder contacts...');
      const res = await fetch(`${API_BASE}/admin/builder-contacts/seed-mumbai`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Mumbai builder contacts');

      setBuilderImportStatus(`Loaded ${data.imported} Mumbai builder contacts. Moved ${data.migratedToMumbai || 0} existing contacts to Mumbai. Skipped ${data.skipped}.`);
      fetchBuilderContacts('Mumbai');
      setBuilderContactCity('Mumbai');
    } catch (error) {
      console.error('Error loading Mumbai builder contacts:', error);
      setBuilderImportStatus(error instanceof Error ? error.message : 'Failed to load Mumbai builder contacts');
    }
  };

  const loadSelectedBuilderSeedContacts = () => {
    if (builderSeedCity === 'Mumbai') {
      loadMumbaiBuilderSeedContacts();
      return;
    }
    if (builderSeedCity !== 'Hyderabad') {
      setBuilderImportStatus(`No saved seed list is available for ${builderSeedCity} yet. Select ${builderSeedCity} here, paste or upload its CSV below, then click Import Contacts.`);
      setBuilderContactCity(builderSeedCity);
      setBuilderContactForm(prev => ({ ...prev, city: builderSeedCity }));
      fetchBuilderContacts(builderSeedCity);
      return;
    }
    loadHyderabadBuilderSeedContacts();
  };

  const saveBuilderContact = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/builder-contacts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(builderContactForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save builder contact');

      setBuilderContactForm(prev => ({
        ...prev,
        companyName: '',
        contactPersonName: '',
        mobile: '',
        email: '',
        website: '',
        logoDataUrl: '',
        logoFileName: '',
        dailyDigestEnabled: false
      }));
      fetchBuilderContacts(builderContactCity);
      alert('Builder contact saved.');
    } catch (error) {
      console.error('Error saving builder contact:', error);
      alert(error instanceof Error ? error.message : 'Failed to save builder contact');
    }
  };

  const readBuilderLogoFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file for the builder logo.');
      return;
    }
    if (file.size > 450 * 1024) {
      alert('Please keep the builder logo below 450 KB so it loads quickly from the database.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBuilderContactForm(prev => ({
        ...prev,
        logoDataUrl: String(reader.result || ''),
        logoFileName: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  const updateBuilderContact = async (contact: BuilderContact, updates: Partial<BuilderContact>) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/builder-contacts/${contact._id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update builder contact');

      setBuilderContacts(prev => prev.map(item => item._id === contact._id ? data.contact : item));
    } catch (error) {
      console.error('Error updating builder contact:', error);
      alert(error instanceof Error ? error.message : 'Failed to update builder contact');
    }
  };

  const updateBuilderDigestForAll = async (enabled: boolean) => {
    const scope = builderContactCity === 'all' ? 'all cities' : builderContactCity;
    setBuilderDigestStatus(`Turning ${enabled ? 'on' : 'off'} daily digest for ${scope}...`);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/builder-contacts/daily-digest`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: builderContactCity, enabled })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to update builder digest settings');

      if (Array.isArray(data.contacts)) {
        setBuilderContacts(data.contacts);
      } else {
        void fetchBuilderContacts(builderContactCity);
      }

      const affected = data.modifiedCount ?? data.matchedCount ?? 0;
      setBuilderDigestStatus(`Daily digest ${enabled ? 'enabled' : 'disabled'} for ${affected} builder contacts in ${scope}.`);
    } catch (error) {
      console.error('Error updating builder digest settings:', error);
      setBuilderDigestStatus(error instanceof Error ? error.message : 'Unable to update builder digest settings');
    }
  };

  const deleteBuilderContactsForScope = async () => {
    const scope = builderContactCity === 'all' ? 'all cities' : builderContactCity;
    const confirmed = window.confirm(`Delete all builder contacts for ${scope}? This cannot be undone.`);
    if (!confirmed) return;

    setBuilderDigestStatus(`Deleting builder contacts for ${scope}...`);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/builder-contacts`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: builderContactCity })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to delete builder contacts');

      setBuilderContacts([]);
      setBuilderDigestStatus(`Deleted ${data.deletedCount ?? 0} builder contacts from ${scope}.`);
    } catch (error) {
      console.error('Error deleting builder contacts:', error);
      setBuilderDigestStatus(error instanceof Error ? error.message : 'Unable to delete builder contacts');
    }
  };

  const createBuilderLogin = async (contact: BuilderContact) => {
    const confirmed = window.confirm(`Create or reuse builder login for ${contact.companyName}? The builder can login with OTP using the saved mobile number.`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/builder-contacts/${contact._id}/create-login`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create builder login');

      setBuilderContacts(prev => prev.map(item => item._id === contact._id ? data.contact : item));
      fetchPendingProperties();
      alert('Builder login is ready. They can use OTP login with this mobile number.');
    } catch (error) {
      console.error('Error creating builder login:', error);
      alert(error instanceof Error ? error.message : 'Failed to create builder login');
    }
  };

  const grabCopiedWhatsAppSummary = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        alert('Clipboard access is not available in this browser. Please copy the WhatsApp message and paste it into the summary box.');
        return;
      }

      const copiedText = (await navigator.clipboard.readText()).trim();
      if (!copiedText) {
        alert('No copied WhatsApp message found. Copy the group property message first, then click this button.');
        return;
      }

      const phoneMatch = copiedText.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
      const nameMatch = copiedText.match(/(?:owner|mediator|name)\s*[:\-]\s*([A-Za-z][A-Za-z .]{1,60})/i);

      setWhatsAppForm(prev => ({
        ownerPhone: prev.ownerPhone || phoneMatch?.[1] || '',
        ownerName: prev.ownerName || nameMatch?.[1]?.trim() || '',
        summary: copiedText
      }));
    } catch (error) {
      console.error('Error reading clipboard:', error);
      alert('Unable to read copied WhatsApp message. Please paste the group message into the summary box manually.');
    }
  };

  const formatMembershipStatus = (user: any) => {
    if (!user.builderSubscriptionPlan || user.builderSubscriptionPlan === 'none') return 'No active membership';
    const expiresAt = user.builderSubscriptionExpiresAt ? new Date(user.builderSubscriptionExpiresAt) : null;
    const valid = expiresAt && expiresAt > new Date();
    return `${user.builderSubscriptionPlan.replace('_', ' ')}${expiresAt ? ` | ${valid ? 'valid until' : 'expired'} ${expiresAt.toLocaleDateString()}` : ''}`;
  };

  const formatRegistrationDate = (createdAt?: string) => {
    if (!createdAt) return 'Not available';
    const registeredAt = new Date(createdAt);
    if (Number.isNaN(registeredAt.getTime())) return 'Not available';
    return registeredAt.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getCapitalForProperty = (property: Property) => {
    const stateMatch = stateCapitalOptions.find(option =>
      normalizeLocationName(option.state) === normalizeLocationName(property.state || '')
    );
    if (stateMatch) return stateMatch.capital;

    const city = normalizeLocationName(property.city || '');
    const cityMatch = stateCapitalOptions.find(option => {
      const capital = normalizeLocationName(option.capital);
      const aliases = capitalAliases[capital] || [capital];
      return aliases.includes(city);
    });
    return cityMatch?.capital || property.city || 'Unknown Capital';
  };

  const getStateForProperty = (property: Property) => {
    if (property.state) return property.state;

    const city = normalizeLocationName(property.city || '');
    const stateMatch = stateCapitalOptions.find(option => {
      const capital = normalizeLocationName(option.capital);
      const aliases = capitalAliases[capital] || [capital];
      return aliases.includes(city);
    });
    return stateMatch?.state || 'Unknown State';
  };

  const groupedFilteredProperties = filteredProperties.reduce<Array<{ key: string; state: string; capital: string; items: Property[] }>>((groups, property) => {
    const state = getStateForProperty(property);
    const capital = getCapitalForProperty(property);
    const key = `${state}__${capital}`;
    const existing = groups.find(group => group.key === key);
    if (existing) {
      existing.items.push(property);
    } else {
      groups.push({ key, state, capital, items: [property] });
    }
    return groups;
  }, []);

  const groupedMembershipUsers = users.reduce<Array<{ key: string; state: string; capital: string; items: any[] }>>((groups, user) => {
    const userPhone = normalizePhoneNumber(user.phone);
    const userProperties = properties.filter(property => normalizePhoneNumber(property.phone) === userPhone);
    const primaryProperty = userProperties.find(property => property.state || property.city) || userProperties[0];
    const resolvedState = primaryProperty ? getStateForProperty(primaryProperty) : 'Telangana';
    const resolvedCapital = primaryProperty ? getCapitalForProperty(primaryProperty) : 'Hyderabad';
    const state = resolvedState === 'Unknown State' ? 'Telangana' : resolvedState;
    const capital = resolvedCapital === 'Unknown Capital' ? 'Hyderabad' : resolvedCapital;
    const key = `${state}__${capital}`;
    const userWithListings = {
      ...user,
      propertyListingCount: user.propertyListingCount ?? userProperties.length
    };
    const existing = groups.find(group => group.key === key);
    if (existing) {
      existing.items.push(userWithListings);
    } else {
      groups.push({ key, state, capital, items: [userWithListings] });
    }
    return groups;
  }, []).sort((a, b) => {
    if (a.state === 'Unknown State') return 1;
    if (b.state === 'Unknown State') return -1;
    return a.state.localeCompare(b.state);
  });

  const membershipAccountTypes = Array.from(new Set(users.map(user => user.accountType || 'owner'))).sort();
  const membershipTypeCounts = membershipAccountTypes.reduce<Record<string, number>>((counts, type) => {
    counts[type] = users.filter(user => (user.accountType || 'owner') === type).length;
    return counts;
  }, {});

  const visibleMembershipGroups = (activeMembershipTab === 'all'
    ? groupedMembershipUsers
    : groupedMembershipUsers.filter(group => group.key === activeMembershipTab)
  ).map(group => ({
    ...group,
    items: activeMembershipTypeTab === 'all'
      ? group.items
      : group.items.filter(user => (user.accountType || 'owner') === activeMembershipTypeTab)
  })).filter(group => group.items.length > 0);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className={`${activeAdminPage === 'whatsapp' ? 'max-w-[104rem]' : 'max-w-7xl'} mx-auto px-4 py-8`}>
        {/* Header */}
        <div className="mb-6 rounded-lg bg-slate-950 p-8 text-white shadow-xl">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-300">Operations Console</p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">Admin Panel</h1>
          <p className="mt-3 text-slate-300">Review listings, verify builders, manage inquiries, and protect marketplace quality.</p>
        </div>

        <div className="mb-6 grid gap-3 rounded-lg bg-white p-3 shadow-sm md:grid-cols-8">
          {[
            { key: 'properties', label: 'Property Approval' },
            { key: 'builders', label: 'Builder Verification' },
            { key: 'builderContacts', label: 'Builder Contacts' },
            { key: 'membership', label: 'Membership Access' },
            { key: 'whatsapp', label: 'WhatsApp Intake' },
            { key: 'testimonials', label: 'Testimonials' },
            { key: 'inquiries', label: 'Contact Inquiries' },
            { key: 'loginHistory', label: 'Login History' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveAdminPage(tab.key as typeof activeAdminPage)}
              className={`rounded-lg px-4 py-3 text-sm font-semibold transition ${
                activeAdminPage === tab.key
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-700 hover:bg-teal-50 hover:text-teal-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className={`${activeAdminPage === 'properties' ? 'block' : 'hidden'} bg-white rounded-lg shadow-sm p-6 mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by location..."
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={filters.state}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                state: e.target.value,
                capitalCity: e.target.value === 'all' ? prev.capitalCity : 'all'
              }))}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All States</option>
              {stateCapitalOptions.map(option => (
                <option key={option.state} value={option.state}>{option.state}</option>
              ))}
            </select>

            <select
              value={filters.capitalCity}
              onChange={(e) => setFilters(prev => ({ ...prev, capitalCity: e.target.value }))}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Capital Cities</option>
              {stateCapitalOptions
                .filter(option => filters.state === 'all' || option.state === filters.state)
                .map(option => (
                  <option key={option.capital} value={option.capital}>{option.capital}</option>
                ))}
            </select>

            <select
              value={filters.headerType}
              onChange={(e) => setFilters(prev => ({ ...prev, headerType: e.target.value }))}
              aria-label="Property Category"
              title="Property Category"
              className="min-w-[180px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Categories</option>
              <option value="development">ForDevelopers</option>
              <option value="buy">Buyers</option>
              <option value="sell">Sell Flat / Plot</option>
              <option value="commercial">Commercial Plot</option>
              <option value="map-view">Properties Map-View</option>
            </select>
            <button
              type="button"
              onClick={resetPropertyFilters}
              className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 transition hover:bg-teal-100"
            >
              Reset Filters
            </button>
          </div>
          {adminLoadError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {adminLoadError}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className={`${activeAdminPage === 'properties' ? 'grid' : 'hidden'} grid-cols-1 md:grid-cols-4 gap-4 mb-6`}>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 text-sm">Total Properties</p>
            <p className="text-3xl font-bold text-gray-900">{properties.length}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-sm p-6">
            <p className="text-yellow-800 text-sm">Pending</p>
            <p className="text-3xl font-bold text-yellow-900">
              {properties.filter(p => p.status === 'pending').length}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm p-6">
            <p className="text-green-800 text-sm">Approved</p>
            <p className="text-3xl font-bold text-green-900">
              {properties.filter(p => p.status === 'approved').length}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-sm p-6">
            <p className="text-red-800 text-sm">Rejected</p>
            <p className="text-3xl font-bold text-red-900">
              {properties.filter(p => p.status === 'rejected').length}
            </p>
          </div>
        </div>

        <div className={`${activeAdminPage === 'builders' || activeAdminPage === 'inquiries' || activeAdminPage === 'testimonials' ? 'grid' : 'hidden'} grid-cols-1 gap-6 mb-6`}>
          <div className={`${activeAdminPage === 'builders' ? 'block' : 'hidden'} bg-white rounded-lg shadow-sm p-6`}>
            <h2 className="text-xl font-semibold mb-4">Builder Verification</h2>
            <div className="space-y-3">
              {users.filter(u => u.accountType === 'builder').length === 0 ? (
                <p className="text-sm text-gray-500">No builder accounts yet.</p>
              ) : users.filter(u => u.accountType === 'builder').slice(0, 6).map(builder => (
                <div key={builder._id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{builder.builderCompanyName || `${builder.firstName} ${builder.lastName}`}</p>
                      <p className="text-sm text-gray-600">{builder.phone} {builder.builderReraId ? `| RERA: ${builder.builderReraId}` : ''}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Registered: {formatRegistrationDate(builder.createdAt)}
                      </p>
                      {builder.builderVerificationStatus === 'pending' && (
                        <p className="mt-1 text-xs font-semibold text-teal-700">
                          Auto approval runs after 1 minute when builder details are available.
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => deleteBuilder(builder)}
                        className="inline-flex items-center gap-1 rounded bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase text-amber-800">{builder.builderVerificationStatus}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {builder.builderVerificationStatus === 'pending' && (
                      <>
                      <button onClick={() => verifyBuilder(builder._id, 'approved')} className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">Approve</button>
                      <button onClick={() => verifyBuilder(builder._id, 'rejected')} className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${activeAdminPage === 'inquiries' ? 'block' : 'hidden'} bg-white rounded-lg shadow-sm p-6`}>
            <h2 className="text-xl font-semibold mb-4">Contact Inquiries</h2>
            <div className="space-y-3">
              {inquiries.length === 0 ? (
                <p className="text-sm text-gray-500">No inquiries yet.</p>
              ) : inquiries.slice(0, 6).map(inquiry => (
                <div key={inquiry._id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{inquiry.subject}</p>
                      <p className="text-sm text-gray-600">{inquiry.name} | {inquiry.email}{inquiry.phone ? ` | ${inquiry.phone}` : ''}</p>
                      {(inquiry.companyName || inquiry.website) && (
                        <p className="mt-1 text-sm text-gray-600">
                          {inquiry.companyName ? `Company: ${inquiry.companyName}` : ''}
                          {inquiry.companyName && inquiry.website ? ' | ' : ''}
                          {inquiry.website ? `Website: ${inquiry.website}` : ''}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">{inquiry.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{inquiry.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`${activeAdminPage === 'testimonials' ? 'block' : 'hidden'} bg-white rounded-lg shadow-sm p-6`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Testimonials Approval</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Approve builder, owner, mediator, buyer, and land seeker testimonials before they appear publicly.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {testimonials.filter(item => item.status === 'pending').length} pending
              </span>
            </div>
            {testimonials.length === 0 ? (
              <p className="text-sm text-gray-500">No testimonials submitted yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {testimonials.map(testimonial => (
                  <div key={testimonial._id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{testimonial.name}</p>
                        <p className="mt-1 text-xs font-bold uppercase text-teal-700">
                          {[testimonial.role, testimonial.city].filter(Boolean).join(' / ')}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-gray-600">{testimonial.summary}</p>
                        <p className="mt-2 text-xs text-gray-500">Submitted: {formatRegistrationDate(testimonial.createdAt)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        testimonial.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : testimonial.status === 'hidden'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {testimonial.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateTestimonialStatus(testimonial._id, 'approved')}
                        className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTestimonialStatus(testimonial._id, 'hidden')}
                        className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        <X className="h-4 w-4" />
                        Hide
                      </button>
                      {testimonial.status !== 'pending' && (
                        <button
                          type="button"
                          onClick={() => updateTestimonialStatus(testimonial._id, 'pending')}
                          className="rounded bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                        >
                          Mark Pending
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`${activeAdminPage === 'builderContacts' ? 'block' : 'hidden'} space-y-6`}>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-teal-700" />
                  <h2 className="text-xl font-semibold">City Wise Builder Contacts</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Store official or consented builder contact details here. These contacts can be used later for daily property digest outreach and OTP login creation.
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Daily WhatsApp Business API updates should be sent only to contacts marked genuine and only when new or updated approved property details are available.
                </p>
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                  Use only official business contacts, direct consent contacts, or contacts shared by the builder. Do not add private scraped personal numbers.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={sendBuilderDigestNow}
                  disabled={builderDigestSending}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {builderDigestSending ? 'Sending...' : "Send Today's Digest Now"}
                </button>
                <select
                  value={builderContactCity}
                  onChange={(event) => {
                    setBuilderContactCity(event.target.value);
                    if (event.target.value !== 'all') {
                      setBuilderContactForm(prev => ({ ...prev, city: event.target.value }));
                    }
                    fetchBuilderContacts(event.target.value);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All Cities</option>
                  {builderContactCityOptions.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            {builderDigestStatus && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
                {builderDigestStatus}
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                value={builderContactForm.city}
                onChange={(event) => setBuilderContactForm(prev => ({ ...prev, city: event.target.value }))}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500"
              >
                {builderContactCityOptions.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <input
                value={builderContactForm.companyName}
                onChange={(event) => setBuilderContactForm(prev => ({ ...prev, companyName: event.target.value }))}
                placeholder="Builder company name *"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500"
              />
              <input
                value={builderContactForm.contactPersonName}
                onChange={(event) => setBuilderContactForm(prev => ({ ...prev, contactPersonName: event.target.value }))}
                placeholder="Contact person name"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500"
              />
              <input
                value={builderContactForm.mobile}
                onChange={(event) => setBuilderContactForm(prev => ({ ...prev, mobile: event.target.value }))}
                placeholder="Mobile number"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500"
              />
              <input
                value={builderContactForm.email}
                onChange={(event) => setBuilderContactForm(prev => ({ ...prev, email: event.target.value }))}
                placeholder="Email ID"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500"
              />
              <input
                value={builderContactForm.website}
                onChange={(event) => setBuilderContactForm(prev => ({ ...prev, website: event.target.value }))}
                placeholder="Website"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500"
              />
              <input
                value={builderContactForm.sourceNote}
                onChange={(event) => setBuilderContactForm(prev => ({ ...prev, sourceNote: event.target.value }))}
                placeholder="Source note"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500"
              />
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={builderContactForm.dailyDigestEnabled}
                  onChange={(event) => setBuilderContactForm(prev => ({ ...prev, dailyDigestEnabled: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                Daily digest opt-in
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={builderContactForm.isGenuineContact}
                  onChange={(event) => setBuilderContactForm(prev => ({ ...prev, isGenuineContact: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                Genuine / consented contact
              </label>
              <div className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-slate-700 md:col-span-2">
                <label className="block text-xs font-black uppercase text-teal-700">Builder logo stored in database</label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(event) => readBuilderLogoFile(event.target.files?.[0])}
                    className="text-sm"
                  />
                  {builderContactForm.logoDataUrl && (
                    <>
                      <img
                        src={builderContactForm.logoDataUrl}
                        alt="Selected builder logo"
                        className="h-10 w-20 rounded border border-gray-200 bg-white object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setBuilderContactForm(prev => ({ ...prev, logoDataUrl: '', logoFileName: '' }))}
                        className="rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">Upload once here. The home page will load this saved logo before external logo sources.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={saveBuilderContact}
              className="mt-4 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Save Builder Contact
            </button>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Import Official Builder Contacts</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Export the T-RERA Registered Promoters list or CREDAI Hyderabad contacts as CSV, then upload or paste it here.
                  Columns like Promoter Name, Mobile No, Email ID, Website, District, and RERA Registration No are supported.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-blue-700">
                CSV import
              </span>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Use only official public business records or consented builder contacts. Do not import private scraped personal numbers.
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-center">
                <div>
                  <p className="text-sm font-bold text-slate-900">Load saved city seed contacts</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Choose a city and load its prepared builder contact list into Builder Contacts.
                  </p>
                </div>
                <select
                  value={builderSeedCity}
                  onChange={(event) => {
                    setBuilderSeedCity(event.target.value);
                    setBuilderContactForm(prev => ({ ...prev, city: event.target.value }));
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                >
                  {builderContactCityOptions.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadSelectedBuilderSeedContacts}
                  className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Load Contacts
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={builderImportSource}
                onChange={(event) => setBuilderImportSource(event.target.value)}
                placeholder="Source note, e.g. T-RERA Registered Promoters export"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => readBuilderImportFile(event.target.files?.[0])}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              />
              <button
                type="button"
                onClick={importBuilderContacts}
                className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Import Contacts
              </button>
            </div>

            <textarea
              value={builderImportText}
              onChange={(event) => setBuilderImportText(event.target.value)}
              rows={6}
              placeholder="city,companyName,contactPersonName,mobile,email,website,registrationNumber&#10;Hyderabad,Example Developers,Sales Desk,9014011885,sales@example.com,https://example.com,RERA123"
              className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 focus:ring-2 focus:ring-teal-500"
            />

            {builderImportStatus && (
              <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                {builderImportStatus}
              </p>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Saved Builder Contacts</h3>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {builderContacts.length} contacts
                </span>
                <button
                  type="button"
                  disabled={!builderContacts.length}
                  onClick={() => updateBuilderDigestForAll(true)}
                  className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Turn On All
                </button>
                <button
                  type="button"
                  disabled={!builderContacts.length}
                  onClick={() => updateBuilderDigestForAll(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Turn Off All
                </button>
                <button
                  type="button"
                  disabled={!builderContacts.length}
                  onClick={deleteBuilderContactsForScope}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete All
                </button>
              </div>
            </div>
            {builderContacts.length === 0 ? (
              <p className="text-sm text-gray-500">No builder contacts saved for this city.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {builderContacts.map(contact => (
                  <div key={contact._id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-teal-700">{contact.city}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                          {contact.logoDataUrl && (
                            <img
                              src={contact.logoDataUrl}
                              alt={`${contact.companyName} logo`}
                              className="h-10 w-20 rounded border border-gray-200 bg-white object-contain"
                            />
                          )}
                          <h4 className="font-black text-slate-950">{contact.companyName}</h4>
                        </div>
                        {contact.contactPersonName && <p className="mt-1 text-sm text-slate-700">Person: {contact.contactPersonName}</p>}
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          {contact.mobile && (
                            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-teal-700" /> {contact.mobile}</p>
                          )}
                          {contact.email && (
                            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-teal-700" /> {contact.email}</p>
                          )}
                          {contact.website && <p>Website: {contact.website}</p>}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{contact.sourceNote || 'Official or consented business contact'}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                          <span className={`rounded-full px-2.5 py-1 ${contact.isGenuineContact !== false ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {contact.isGenuineContact !== false ? 'Genuine contact' : 'Needs verification'}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 ${contact.dailyDigestEnabled ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                            Daily digest: {contact.dailyDigestEnabled ? 'On' : 'Off'}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 ${contact.mobile && contact.dailyDigestEnabled && contact.isGenuineContact !== false ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
                            {contact.mobile && contact.dailyDigestEnabled && contact.isGenuineContact !== false ? 'Ready for WhatsApp updates' : 'Not ready for WhatsApp updates'}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            Last sent: {contact.lastDigestSentAt ? new Date(contact.lastDigestSentAt).toLocaleDateString() : 'Not sent'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:min-w-40">
                        <button
                          type="button"
                          onClick={() => createBuilderLogin(contact)}
                          disabled={Boolean(contact.loginUserId)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          <UserPlus className="h-4 w-4" />
                          {contact.loginUserId ? 'Login Ready' : 'Create Login'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBuilderContact(contact, { isGenuineContact: contact.isGenuineContact === false })}
                          className="rounded-lg border border-teal-200 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50"
                        >
                          {contact.isGenuineContact === false ? 'Mark Genuine' : 'Mark Not Genuine'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBuilderContact(contact, { dailyDigestEnabled: !contact.dailyDigestEnabled })}
                          className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                        >
                          {contact.dailyDigestEnabled ? 'Disable Digest' : 'Enable Digest'}
                        </button>
                        {contact.logoDataUrl && (
                          <button
                            type="button"
                            onClick={() => updateBuilderContact(contact, { logoDataUrl: '', logoFileName: '' })}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`${activeAdminPage === 'membership' ? 'block' : 'hidden'} bg-white rounded-lg shadow-sm p-6 mb-6`}>
          <h2 className="text-xl font-semibold mb-4">Membership Access</h2>
          {users.length > 0 && (
            <div className="mb-4 flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
              <button
                type="button"
                onClick={() => setActiveMembershipTab('all')}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition ${
                  activeMembershipTab === 'all'
                    ? 'bg-slate-950 text-white'
                    : 'bg-white text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                }`}
              >
                All ({users.length})
              </button>
              {groupedMembershipUsers.map(group => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActiveMembershipTab(group.key)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition ${
                    activeMembershipTab === group.key
                      ? 'bg-slate-950 text-white'
                      : 'bg-white text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                  }`}
                >
                  {group.state} / {group.capital} ({group.items.length})
                </button>
              ))}
            </div>
          )}
          {users.length > 0 && (
            <div className="mb-4 flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
              <button
                type="button"
                onClick={() => setActiveMembershipTypeTab('all')}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold capitalize transition ${
                  activeMembershipTypeTab === 'all'
                    ? 'bg-teal-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                }`}
              >
                All Types ({users.length})
              </button>
              {membershipAccountTypes.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveMembershipTypeTab(type)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold capitalize transition ${
                    activeMembershipTypeTab === type
                      ? 'bg-teal-700 text-white'
                      : 'bg-white text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                  }`}
                >
                  {type} ({membershipTypeCounts[type] ?? 0})
                </button>
              ))}
            </div>
          )}
          <div className="max-h-[620px] overflow-y-auto pr-2">
            {users.length === 0 ? (
              <p className="text-sm text-gray-500">No users found.</p>
            ) : visibleMembershipGroups.length === 0 ? (
              <p className="text-sm text-gray-500">No users match this filter.</p>
            ) : visibleMembershipGroups.map(group => (
              <div key={group.key} className="mb-5 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">{group.state} / {group.capital}</p>
                    <p className="text-xs text-slate-500">{group.items.length} membership users</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
            {group.items.map(user => {
              const hasMembership = user.builderSubscriptionPlan && user.builderSubscriptionPlan !== 'none';
              return (
                <div key={user._id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phone}</p>
                      <p className="text-sm text-gray-600">{user.phone} | {user.accountType || 'owner'}</p>
                      <p className="mt-1 text-xs text-gray-500">Registered: {formatRegistrationDate(user.createdAt)}</p>
                      <p className={`mt-1 text-sm font-semibold ${hasMembership ? 'text-teal-700' : 'text-gray-500'}`}>
                        {formatMembershipStatus(user)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Contact unlocks used: {user.contactUnlocksUsed ?? 0} | Free credits: {user.freeContactCredits ?? 2}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-blue-700">
                        Properties listed: {user.propertyListingCount ?? 0}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => resetMembershipAccess(user)}
                        disabled={!hasMembership && Number(user.contactUnlocksUsed || 0) === 0}
                        className="rounded bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        Reset Access
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMembershipAccess(user)}
                        disabled={!hasMembership && Number(user.contactUnlocksUsed || 0) === 0}
                        className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        Delete Membership
                      </button>
                      <div className="flex gap-1">
                        {(['3_months', '6_months', '12_months'] as const).map(plan => (
                          <button
                            key={plan}
                            type="button"
                            onClick={() => extendMembershipAccess(user, plan)}
                            className="rounded bg-teal-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                          >
                            +{plan.split('_')[0]}M
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
                </div>
              </div>
            ))}
            </div>
        </div>

        <div className={`${activeAdminPage === 'loginHistory' ? 'block' : 'hidden'} bg-white rounded-lg shadow-sm p-6 mb-6`}>
          <h2 className="text-xl font-semibold mb-4">Login History</h2>
          <p className="mb-4 text-sm text-slate-500">Most recent {loginHistory.length} logins, newest first.</p>
          {loginHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No login activity recorded yet.</p>
          ) : (
            <div className="max-h-[620px] overflow-y-auto pr-2">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Phone / Email</th>
                    <th className="py-2 pr-3">Account Type</th>
                    <th className="py-2 pr-3">Method</th>
                    <th className="py-2 pr-3">IP Address</th>
                    <th className="py-2 pr-3">Device</th>
                    <th className="py-2 pr-3">Logged In At</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((entry) => (
                    <tr key={entry._id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-semibold text-slate-900">{entry.name || '-'}</td>
                      <td className="py-2 pr-3 text-slate-600">{entry.phone || entry.email || '-'}</td>
                      <td className="py-2 pr-3 capitalize text-slate-600">{entry.accountType || 'owner'}</td>
                      <td className="py-2 pr-3 text-slate-600">{entry.method === 'otp' ? 'Phone OTP' : 'Email/Password'}</td>
                      <td className="py-2 pr-3 text-slate-600">{entry.ip || '-'}</td>
                      <td className="max-w-[220px] truncate py-2 pr-3 text-slate-500" title={entry.userAgent}>{entry.userAgent || '-'}</td>
                      <td className="py-2 pr-3 text-slate-600">{formatRegistrationDate(entry.loggedInAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* WhatsApp Campaign */}
        <div className={`${activeAdminPage === 'whatsapp' ? 'block' : 'hidden'} space-y-4`}>

          {/* View toggle — Campaign vs Template Jobs */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm border border-gray-100">
              <button
                onClick={() => setWhatsappView('campaign')}
                className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${whatsappView === 'campaign' ? 'bg-teal-700 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
              >
                📣 Campaign
              </button>
              <button
                onClick={() => { setWhatsappView('templates'); fetchTemplateJobs(); }}
                className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${whatsappView === 'templates' ? 'bg-teal-700 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
              >
                📋 Template Jobs
              </button>
            </div>
          </div>

          {/* ── Template Jobs view ─────────────────────────────────────────── */}
          {whatsappView === 'templates' && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Template Jobs</h2>
                <button
                  onClick={fetchTemplateJobs}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  🔄 Refresh
                </button>
              </div>

              {templateJobsLoading ? (
                <div className="py-12 text-center text-sm text-gray-400">Loading templates…</div>
              ) : templateJobs.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">No templates found. Create one via the Campaign tab.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="pb-3 pr-4">Template Name</th>
                        <th className="pb-3 pr-4">Category</th>
                        <th className="pb-3 pr-4">Language</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Rejected Reason</th>
                        <th className="pb-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {templateJobs.map((tpl: any) => (
                        <tr key={tpl.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4 font-medium text-gray-900">{tpl.name}</td>
                          <td className="py-3 pr-4 capitalize text-gray-600">{tpl.category?.toLowerCase()}</td>
                          <td className="py-3 pr-4 text-gray-600">{tpl.language}</td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              tpl.status === 'APPROVED'  ? 'bg-green-100 text-green-700' :
                              tpl.status === 'REJECTED'  ? 'bg-red-100 text-red-700' :
                              tpl.status === 'PENDING'   ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {tpl.status === 'APPROVED' ? '✅' : tpl.status === 'REJECTED' ? '❌' : '⏳'} {tpl.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs text-red-500">{tpl.rejected_reason || '—'}</td>
                          <td className="py-3">
                            <button
                              onClick={() => loadTemplateForEdit(tpl)}
                              className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {whatsappView === 'campaign' && (campaignStep === 1 ? (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              {/* Stepper */}
              <div className="mb-8 flex items-center gap-0">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">01</div>
                  <span className="mt-1 text-xs font-semibold text-teal-700">STEP-1</span>
                </div>
                <div className="h-0.5 flex-1 bg-gray-300" />
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-sm font-bold text-gray-400">02</div>
                  <span className="mt-1 text-xs font-semibold text-gray-400">STEP-2</span>
                </div>
              </div>

              {/* From ID + Campaign Name */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">From ID <span className="text-red-500">*</span></label>
                  <select
                    value={campaignFromId}
                    onChange={(e) => setCampaignFromId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {campaignFromIds.map((item) => (
                      <option key={item.number} value={`${item.label} - ${item.number}`}>
                        {item.label} - {item.number}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddNumber((v) => !v)}
                    className="mt-1 text-xs text-teal-600 hover:underline"
                  >
                    {showAddNumber ? '✕ Cancel' : '+ Register a new number?'}
                  </button>

                  {showAddNumber && (
                    <div className="mt-2 rounded-lg border border-teal-200 bg-teal-50 p-3 space-y-2">
                      <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">Business Name / Label</label>
                        <input
                          value={newNumberLabel}
                          onChange={(e) => setNewNumberLabel(e.target.value)}
                          placeholder="e.g. Homefeet Sales"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700">WhatsApp Phone Number</label>
                        <input
                          value={newNumberPhone}
                          onChange={(e) => setNewNumberPhone(e.target.value)}
                          placeholder="e.g. +918019008351"
                          type="tel"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newNumberLabel.trim() || !newNumberPhone.trim()) return;
                          const entry = { label: newNumberLabel.trim(), number: newNumberPhone.trim() };
                          setCampaignFromIds((prev) => [...prev, entry]);
                          setCampaignFromId(`${entry.label} - ${entry.number}`);
                          setNewNumberLabel('');
                          setNewNumberPhone('');
                          setShowAddNumber(false);
                        }}
                        className="w-full rounded-lg bg-teal-700 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                      >
                        Add Number
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Campaign Name <span className="text-red-500">*</span></label>
                  <input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Hey Builders! Ready to scale your sales velocity"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Number entry tabs */}
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setCampaignNumberTab('insert')}
                  className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${campaignNumberTab === 'insert' ? 'bg-teal-700 text-white' : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  ≡ Insert Number Here
                </button>
                <button
                  onClick={() => setCampaignNumberTab('contacts')}
                  className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${campaignNumberTab === 'contacts' ? 'bg-teal-700 text-white' : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  ☎ Get Contacts
                </button>
                <button
                  onClick={() => setCampaignNumberTab('upload')}
                  className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${campaignNumberTab === 'upload' ? 'bg-teal-700 text-white' : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  📄 Upload file
                </button>
              </div>

              {campaignNumberTab === 'insert' && (
                <>
                  <textarea
                    value={campaignNumbers}
                    onChange={(e) => setCampaignNumbers(e.target.value)}
                    rows={6}
                    placeholder="Enter phone numbers, one per line (e.g. 9100000000)"
                    className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="mt-2 flex justify-end gap-6 text-sm text-gray-500">
                    <span>Total Numbers: <strong className="text-gray-800">{campaignNumbers.split('\n').filter(l => l.trim()).length}</strong></span>
                    <span>CAN: <strong className="text-gray-800">{campaignNumbers.split('\n').filter(l => l.trim()).length}</strong></span>
                  </div>
                </>
              )}
              {/* ── Get Contacts tab ── */}
              {campaignNumberTab === 'contacts' && (
                <div className="mt-4 rounded-lg border border-gray-200 p-5">
                  {/* Group / Category / Tag radio */}
                  <div className="flex items-center justify-around border-b border-gray-100 pb-4">
                    {(['group', 'category', 'tag'] as const).map((opt) => (
                      <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="radio"
                          name="contactsFilter"
                          value={opt}
                          checked={contactsFilterType === opt}
                          onChange={() => { setContactsFilterType(opt); setContactsCategory(''); }}
                          className="h-4 w-4 accent-teal-600"
                        />
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </label>
                    ))}
                  </div>

                  <div className="mt-4">
                    <p className="mb-1.5 text-sm font-semibold text-teal-700">
                      Send To {contactsFilterType.charAt(0).toUpperCase() + contactsFilterType.slice(1)}
                    </p>
                    <select
                      value={contactsCategory}
                      onChange={(e) => setContactsCategory(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">— Select {contactsFilterType} —</option>
                      {contactsFilterType === 'group' && (
                        <>
                          <option value="builders">Builders</option>
                          <option value="mediators">Mediators</option>
                          <option value="buyers">Buyers</option>
                        </>
                      )}
                      {contactsFilterType === 'category' && (
                        <>
                          <option value="verified">Verified Contacts</option>
                          <option value="leads">Leads</option>
                          <option value="premium">Premium Members</option>
                        </>
                      )}
                      {contactsFilterType === 'tag' && (
                        <>
                          <option value="hyderabad">Hyderabad</option>
                          <option value="bangalore">Bangalore</option>
                          <option value="active">Active</option>
                        </>
                      )}
                    </select>
                  </div>

                  <p className="mt-3 text-sm text-gray-500">
                    Total Numbers: <strong className="text-gray-800">0</strong>
                  </p>
                </div>
              )}

              {/* ── Upload file tab ── */}
              {campaignNumberTab === 'upload' && (
                <div className="mt-4 space-y-4">
                  {/* Drop zone */}
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-teal-300 bg-teal-50 px-6 py-10 text-center hover:bg-teal-100">
                    {uploadContactFile ? (
                      <div className="space-y-1">
                        <span className="text-4xl">📂</span>
                        <p className="text-sm font-semibold text-teal-700">{uploadContactFile.name}</p>
                        <p className="text-xs text-gray-500">{(uploadContactFile.size / 1024).toFixed(1)} KB</p>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setUploadContactFile(null); setUploadContactColumns([]); setUploadMobileField(''); }}
                          className="mt-1 rounded border border-red-400 px-3 py-0.5 text-xs text-red-500 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-5xl text-teal-600">📁</span>
                        <p className="text-sm font-semibold text-gray-700">Upload a contact file here...</p>
                        <p className="text-xs text-teal-600">No file selected</p>
                        <span className="rounded border border-teal-500 px-4 py-1.5 text-sm font-semibold text-teal-600 hover:bg-teal-100">
                          Click to Upload
                        </span>
                        <p className="text-xs text-gray-400">Accepted: CSV, XLSX &nbsp;|&nbsp; Max 10 MB</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadContactFile(file);
                        // Mock column detection for CSV header
                        if (file.name.endsWith('.csv')) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const firstLine = (ev.target?.result as string || '').split('\n')[0] || '';
                            const cols = firstLine.split(',').map(c => c.replace(/"/g, '').trim()).filter(Boolean);
                            setUploadContactColumns(cols.length ? cols : ['mobile', 'phone', 'number']);
                          };
                          reader.readAsText(file);
                        } else {
                          setUploadContactColumns(['mobile', 'phone', 'number']);
                        }
                      }}
                    />
                  </label>

                  {/* Country code checkbox */}
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={uploadCountryCodeMissing}
                      onChange={(e) => setUploadCountryCodeMissing(e.target.checked)}
                      className="h-4 w-4 accent-teal-600"
                    />
                    Country Code not included in the file?
                  </label>

                  {/* Mobile field selector */}
                  <div>
                    <p className="mb-1.5 text-sm text-gray-700">Please select the mobile number field in your file..</p>
                    <select
                      value={uploadMobileField}
                      onChange={(e) => setUploadMobileField(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">— Select column —</option>
                      {uploadContactColumns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { if (!uploadContactFile) { alert('Please upload a file first.'); return; } alert('Numbers validated!'); }}
                      className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
                    >
                      Validate Numbers
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => { if (campaignName.trim()) setCampaignStep(2); }}
                  className="rounded-lg bg-indigo-500 px-8 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr_440px]">
              {/* Left: template form — step 2 */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                {/* Template stepper */}
                <div className="mb-6 flex items-center gap-2">
                  {(['Choose Type', 'Create Template', 'Sync Template'] as const).map((label, idx) => (
                    <React.Fragment key={label}>
                      <button
                        onClick={() => idx + 1 < templateStep && setTemplateStep((idx + 1) as 1 | 2 | 3)}
                        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${templateStep === idx + 1 ? 'bg-green-300 text-green-900' : templateStep > idx + 1 ? 'bg-green-100 text-green-700 cursor-pointer' : 'bg-gray-100 text-gray-400'}`}
                      >
                        {idx === 0 ? '👆' : idx === 1 ? '📄' : '🔄'} {label}
                      </button>
                      {idx < 2 && <div className={`h-0.5 flex-1 ${templateStep > idx + 1 ? 'bg-green-300' : 'bg-gray-200'}`} />}
                    </React.Fragment>
                  ))}
                </div>

                {/* ── templateStep 1: Choose Type ── */}
                {templateStep === 1 && (
                  <>
                    <h2 className="mb-5 text-lg font-bold text-gray-900">Template Name &amp; Type</h2>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Select Number</label>
                        <div className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-800">
                          <span>+918019008351 Homefeet</span>
                          <span className="text-gray-400">▼</span>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Template Name</label>
                        <input
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="Template name"
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Template Category</label>
                      <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-lg border border-gray-300">
                        {(['marketing', 'utility', 'authentication'] as const).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setTemplateCategory(cat)}
                            className={`py-2.5 text-sm font-semibold capitalize transition ${templateCategory === cat ? 'bg-teal-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                          >
                            {cat === 'marketing' ? '📢' : cat === 'utility' ? '🔔' : '🔒'} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Marketing Type</label>
                        <select value={templateMarketingType} onChange={(e) => setTemplateMarketingType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                          <option value="Custom">Custom</option>
                          <option value="Promotional">Promotional</option>
                          <option value="Transactional">Transactional</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Select Language</label>
                        <select value={templateLanguage} onChange={(e) => setTemplateLanguage(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                          <option value="en">English</option>
                          <option value="hi">Hindi</option>
                          <option value="te">Telugu</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
                      💡 If you wish to make any changes, please come back to this step and edit before submitting. Once submitted, the metadata cannot be modified.
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <button onClick={() => setCampaignStep(1)} className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Previous</button>
                      <button onClick={() => setTemplateStep(2)} className="rounded-lg bg-teal-700 px-8 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Next</button>
                    </div>
                  </>
                )}

                {/* ── templateStep 2: Create Template ── */}
                {templateStep === 2 && (
                  <>
                    {/* Summary bar */}
                    <div className="mb-5 flex items-start justify-between rounded-lg bg-gray-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{templateName || 'Untitled'}</p>
                        <p className="text-xs text-gray-500">Language: {templateLanguage}&nbsp;&nbsp;&nbsp;Category: {templateCategory}</p>
                      </div>
                      <button onClick={() => setTemplateStep(1)} className="text-gray-400 hover:text-gray-600" title="Edit">✏️</button>
                    </div>

                    {/* Header Type */}
                    <div className="mb-5">
                      <p className="text-sm font-bold text-gray-900">Header Type <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Optional</span></p>
                      <p className="mt-0.5 text-xs text-gray-500">Add a title or choose which type of media you'll use for this header.</p>
                      <select
                        value={templateHeaderType}
                        onChange={(e) => { setTemplateHeaderType(e.target.value); setTemplateHeaderText(''); setTemplateHeaderFile(null); setTemplateHeaderPreview(''); }}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">None</option>
                        <option value="text">Text</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="document">Document</option>
                      </select>

                      {/* Text header input */}
                      {templateHeaderType === 'text' && (
                        <div className="mt-4">
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Template Header <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={templateHeaderText}
                              onChange={(e) => setTemplateHeaderText(e.target.value)}
                              maxLength={60}
                              placeholder="Enter Header text"
                              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-32 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <button
                              type="button"
                              onClick={() => setTemplateHeaderText(prev => (prev.match(/\{\{\d+\}\}/g)?.length || 0) < 1 ? prev + '{{1}}' : prev)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                            >
                              Add Variable
                            </button>
                          </div>
                          <p className="mt-1 text-right text-xs text-gray-400">{templateHeaderText.length}/60</p>
                        </div>
                      )}

                      {/* File upload area for media header types */}
                      {(templateHeaderType === 'image' || templateHeaderType === 'video' || templateHeaderType === 'document') && (
                        <div className="mt-3">
                          {templateHeaderType === 'image' && (
                            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-teal-400 bg-teal-50 px-6 py-6 text-center hover:bg-teal-100">
                              {templateHeaderPreview ? (
                                <div className="relative w-full">
                                  <img src={templateHeaderPreview} alt="Header preview" className="mx-auto max-h-40 rounded-lg object-cover" />
                                  <button type="button" onClick={(e) => { e.preventDefault(); setTemplateHeaderFile(null); setTemplateHeaderPreview(''); }} className="absolute right-0 top-0 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">✕</button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-3xl">🖼️</span>
                                  <p className="text-sm font-semibold text-teal-700">Click to upload an Image</p>
                                  <p className="text-xs text-gray-500">Accepted formats: JPG, PNG, WEBP &nbsp;|&nbsp; Max size: 5 MB</p>
                                </>
                              )}
                              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setTemplateHeaderFile(file);
                                setTemplateHeaderPreview(URL.createObjectURL(file));
                              }} />
                            </label>
                          )}

                          {templateHeaderType === 'video' && (
                            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50 px-6 py-6 text-center hover:bg-blue-100">
                              {templateHeaderFile ? (
                                <div className="relative w-full">
                                  <video src={templateHeaderPreview} controls className="mx-auto max-h-40 w-full rounded-lg" />
                                  <button type="button" onClick={(e) => { e.preventDefault(); setTemplateHeaderFile(null); setTemplateHeaderPreview(''); }} className="absolute right-0 top-0 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">✕</button>
                                  <p className="mt-1 text-xs text-gray-600">{templateHeaderFile.name}</p>
                                </div>
                              ) : (
                                <>
                                  <span className="text-3xl">🎥</span>
                                  <p className="text-sm font-semibold text-blue-700">Click to upload a Video</p>
                                  <p className="text-xs text-gray-500">Accepted format: MP4 &nbsp;|&nbsp; Max size: 16 MB</p>
                                </>
                              )}
                              <input type="file" accept="video/mp4" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setTemplateHeaderFile(file);
                                setTemplateHeaderPreview(URL.createObjectURL(file));
                              }} />
                            </label>
                          )}

                          {templateHeaderType === 'document' && (
                            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-orange-400 bg-orange-50 px-6 py-6 text-center hover:bg-orange-100">
                              {templateHeaderFile ? (
                                <div className="relative w-full text-center">
                                  <span className="text-4xl">📄</span>
                                  <p className="mt-1 text-sm font-semibold text-orange-700">{templateHeaderFile.name}</p>
                                  <p className="text-xs text-gray-500">{(templateHeaderFile.size / 1024).toFixed(1)} KB</p>
                                  <button type="button" onClick={(e) => { e.preventDefault(); setTemplateHeaderFile(null); setTemplateHeaderPreview(''); }} className="mt-2 rounded-full bg-red-500 px-3 py-0.5 text-xs text-white">Remove</button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-3xl">📄</span>
                                  <p className="text-sm font-semibold text-orange-700">Click to upload a Document</p>
                                  <p className="text-xs text-gray-500">Accepted format: PDF &nbsp;|&nbsp; Max size: 100 MB</p>
                                </>
                              )}
                              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setTemplateHeaderFile(file);
                                setTemplateHeaderPreview('');
                              }} />
                            </label>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Template Format */}
                    <div className="mb-5">
                      <p className="text-sm font-bold text-gray-900">Template Format</p>
                      <p className="mt-0.5 text-xs text-gray-500">Enter the text for your message in the language you've selected.</p>
                      <textarea
                        value={templateBody}
                        onChange={(e) => setTemplateBody(e.target.value)}
                        rows={6}
                        placeholder={`Write your message in ${templateLanguage}...`}
                        maxLength={1024}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <div className="flex items-center justify-end gap-3 text-gray-400">
                        <button className="text-lg hover:text-gray-600" title="Emoji">😊</button>
                        <button className="text-sm font-bold hover:text-gray-600" title="Bold">B</button>
                        <button className="text-sm italic hover:text-gray-600" title="Italic">I</button>
                        <button className="text-sm line-through hover:text-gray-600" title="Strikethrough">S</button>
                        <button className="font-mono text-sm hover:text-gray-600" title="Code">&lt;/&gt;</button>
                        <button className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 hover:bg-gray-200">Add Variables</button>
                        <span className="text-xs text-gray-400">Chars: {templateBody.length}/1024</span>
                      </div>
                    </div>

                    {/* Template Footer */}
                    <div className="mb-5">
                      <p className="text-sm font-bold text-gray-900">Template Footer <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Optional</span></p>
                      <p className="mt-0.5 text-xs text-gray-500">Add a short line of text to the bottom of your message template.</p>
                      <input value={templateFooter} onChange={(e) => setTemplateFooter(e.target.value.slice(0, 60))} placeholder="Template Footer" className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                      <p className="mt-1 text-xs text-gray-400">Chars: {templateFooter.length}/60</p>
                    </div>

                    {/* Interactive Actions */}
                    <div className="mb-5">
                      <p className="text-sm font-bold text-gray-900">Interactive Actions <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Optional</span></p>
                      <p className="mt-0.5 text-xs text-gray-500">Create buttons that let customers respond to your message or take action.</p>

                      {/* Action type selector */}
                      <div className="relative mt-2">
                        <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 cursor-pointer" onClick={() => setShowActionDropdown(v => !v)}>
                          <span className="flex-1 text-sm text-gray-700">{actionType || 'Select action type...'}</span>
                          {actionType && <button type="button" onClick={(e) => { e.stopPropagation(); setActionType(''); setShowActionDropdown(false); }} className="text-gray-400 hover:text-gray-600">✕</button>}
                          <span className="text-blue-500">ℹ</span>
                          <span className="text-gray-400">{showActionDropdown ? '▲' : '▼'}</span>
                        </div>
                        {showActionDropdown && (
                          <div className="absolute z-20 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                            <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase text-gray-400">Call To Action</p>
                            {['Phone Number', 'Website', 'Copy Offer Code', 'Complete Flow'].map(opt => (
                              <button key={opt} type="button" onClick={() => { setActionType(opt); setShowActionDropdown(false); if (opt === 'Website' && websiteActions.length === 0) setWebsiteActions([{ label: 'homefeet', urlType: 'Dynamic', url: 'https://www.homefeet.in' }]); if (opt === 'Phone Number' && phoneActions.length === 0) setPhoneActions([{ label: '', urlType: 'Static', url: '' }]); if (opt === 'Copy Offer Code' && quickReplies.length === 0) setQuickReplies([{ text: '' }]); }}
                                className={`flex w-full items-center px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50 ${actionType === opt ? 'bg-gray-100 font-semibold' : ''}`}>
                                {opt}
                              </button>
                            ))}
                            <p className="px-4 pt-2 pb-1 text-xs font-bold uppercase text-gray-400">Quick Reply</p>
                            {['Custom'].map(opt => (
                              <button key={opt} type="button" onClick={() => { setActionType(opt); setShowActionDropdown(false); if (quickReplies.length === 0) setQuickReplies([{ text: '' }]); }}
                                className={`flex w-full items-center px-6 py-2.5 pb-3 text-sm text-gray-700 hover:bg-gray-50 ${actionType === opt ? 'bg-indigo-100 font-semibold text-indigo-700' : ''}`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Website action details */}
                      {actionType === 'Website' && (
                        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="mb-3 text-sm font-bold text-gray-800">Call To Action</p>
                          <label className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                            <button type="button" onClick={() => setAdvancedSearch(v => !v)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${advancedSearch ? 'bg-teal-600' : 'bg-gray-300'}`}>
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${advancedSearch ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                            Enable/Disable Advance Search
                          </label>
                          <p className="mb-2 text-sm font-semibold text-gray-700">Website</p>
                          {websiteActions.map((item, idx) => (
                            <div key={idx} className="mb-2 space-y-2">
                              <div className="flex items-center gap-2">
                                <input value={item.label} onChange={e => setWebsiteActions(prev => prev.map((a, i) => i === idx ? { ...a, label: e.target.value } : a))} placeholder="Button label" className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                                  <span>{item.urlType}</span>
                                  <button onClick={() => setWebsiteActions(prev => prev.map((a, i) => i === idx ? { ...a, urlType: a.urlType === 'Dynamic' ? 'Static' : 'Dynamic' } : a))} className="ml-1 text-gray-400">▼</button>
                                </div>
                                <div className="relative flex flex-1 items-center gap-1">
                                  <input value={item.url} onChange={e => setWebsiteActions(prev => prev.map((a, i) => i === idx ? { ...a, url: e.target.value } : a))} placeholder="https://www.homefeet.in" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                  <span className="text-blue-400">ℹ</span>
                                </div>
                                <button onClick={() => setWebsiteActions(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600" title="Remove">🗑</button>
                                <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-500">{'{{1}}'}</span>
                              </div>
                              {item.urlType === 'Dynamic' && (
                                <div className="flex gap-2">
                                  <span className="rounded bg-gray-100 px-3 py-2 font-mono text-xs text-gray-500">{'{{1}}'}</span>
                                  <input value={item.url} readOnly className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500" />
                                </div>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => setWebsiteActions(prev => [...prev, { label: '', urlType: 'Static', url: '' }])} className="mt-1 flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-800">
                            + Website
                          </button>
                        </div>
                      )}

                      {/* Phone Number action details */}
                      {actionType === 'Phone Number' && (
                        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="mb-3 text-sm font-bold text-gray-800">Call To Action</p>
                          <p className="mb-2 text-sm font-semibold text-gray-700">Phone Number</p>
                          {phoneActions.map((item, idx) => (
                            <div key={idx} className="mb-2 flex items-center gap-2">
                              <input value={item.label} onChange={e => setPhoneActions(prev => prev.map((a, i) => i === idx ? { ...a, label: e.target.value } : a))} placeholder="Button label" className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                              <input value={item.url} onChange={e => setPhoneActions(prev => prev.map((a, i) => i === idx ? { ...a, url: e.target.value } : a))} placeholder="+91 9100000000" type="tel" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                              <button onClick={() => setPhoneActions(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">🗑</button>
                            </div>
                          ))}
                          <button type="button" onClick={() => setPhoneActions(prev => [...prev, { label: '', urlType: 'Static', url: '' }])} className="mt-1 flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-800">
                            + Phone Number
                          </button>
                        </div>
                      )}

                      {/* Quick Reply / Custom */}
                      {(actionType === 'Custom' || actionType === 'Copy Offer Code') && (
                        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <p className="mb-3 text-sm font-bold text-gray-800">Quick Reply</p>
                          {quickReplies.map((item, idx) => (
                            <div key={idx} className="mb-2 flex items-center gap-2">
                              <input value={item.text} onChange={e => setQuickReplies(prev => prev.map((a, i) => i === idx ? { text: e.target.value } : a))} placeholder="Button text" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                              <button onClick={() => setQuickReplies(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">🗑</button>
                            </div>
                          ))}
                          <button type="button" onClick={() => setQuickReplies(prev => [...prev, { text: '' }])} className="mt-1 flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-800">
                            + Add Reply
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Status banner */}
                    {submitStatus === 'pending' && (
                      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        ⏳ <strong>Template submitted!</strong> Meta is reviewing it — this usually takes a few minutes to a few hours. Click <strong>Check Status</strong> to refresh.
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('token');
                              const r = await fetch(`${API_BASE}/whatsapp/templates/${submittedTemplateName}/status`, { headers: { Authorization: `Bearer ${token}` } });
                              const d = await r.json();
                              if (d.template?.status === 'APPROVED') setSubmitStatus('approved');
                              else if (d.template?.status === 'REJECTED') { setSubmitStatus('rejected'); setSubmitError(d.template.rejected_reason || 'Rejected by Meta'); }
                            } catch {}
                          }}
                          className="ml-3 rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                        >Check Status</button>
                      </div>
                    )}
                    {submitStatus === 'approved' && (
                      <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                        ✅ <strong>Template approved!</strong> Ready to send to {campaignNumbers.split('\n').filter(l => l.trim()).length} number(s).
                      </div>
                    )}
                    {submitStatus === 'rejected' && (
                      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        ❌ <strong>Template rejected by Meta:</strong> {submitError}
                      </div>
                    )}
                    {submitStatus === 'sending' && (
                      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        🚀 Sending campaign… please wait.
                      </div>
                    )}
                    {submitStatus === 'done' && campaignResult && (
                      <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                        🎉 Campaign sent! <strong>{campaignResult.sent} delivered</strong>, {campaignResult.failed} failed.
                      </div>
                    )}
                    {submitError && submitStatus === 'idle' && (
                      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">❌ {submitError}</div>
                    )}

                    <div className="flex items-center justify-between">
                      <button onClick={() => setTemplateStep(1)} className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Previous</button>

                      <div className="flex gap-3">
                        {/* Send Campaign — only visible once approved */}
                        {submitStatus === 'approved' && (
                          <button
                            disabled={submitting}
                            onClick={async () => {
                              const recipients = campaignNumbers.split('\n').map(l => l.trim()).filter(Boolean);
                              if (!recipients.length) { alert('No phone numbers entered in Step 1.'); return; }
                              setSubmitting(true); setSubmitStatus('sending');
                              try {
                                const token = localStorage.getItem('token');
                                const buttons = [
                                  ...websiteActions.map((a, i) => ({ type: 'url', index: i, value: '' })),
                                  ...quickReplies.map((a, i) => ({ type: 'quick_reply', index: i, value: a.text }))
                                ];
                                const res = await fetch(`${API_BASE}/whatsapp/send-campaign`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({
                                    recipients,
                                    templateName: submittedTemplateName,
                                    languageCode: templateLanguage || 'en',
                                    header: templateHeaderType && templateHeaderPreview ? { type: templateHeaderType.toUpperCase(), value: templateHeaderPreview } : null,
                                    bodyVariables: [],
                                    buttons
                                  })
                                });
                                const d = await res.json();
                                if (res.ok) { setCampaignResult({ sent: d.sent, failed: d.failed }); setSubmitStatus('done'); }
                                else { setSubmitError(d.error || 'Send failed'); setSubmitStatus('approved'); }
                              } catch (e: any) { setSubmitError(e.message); setSubmitStatus('approved'); }
                              finally { setSubmitting(false); }
                            }}
                            className="rounded-lg bg-green-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {submitting ? 'Sending…' : `🚀 Send Campaign (${campaignNumbers.split('\n').filter(l => l.trim()).length})`}
                          </button>
                        )}

                        {/* Send to Review */}
                        {(submitStatus === 'idle' || submitStatus === 'rejected') && (
                          <button
                            disabled={submitting || !templateName || !templateBody}
                            onClick={async () => {
                              setSubmitting(true); setSubmitError(''); setSubmitStatus('idle');
                              try {
                                const token = localStorage.getItem('token');
                                const allButtons = [
                                  ...websiteActions.map(a => ({ type: 'url', label: a.label, urlType: a.urlType, url: a.url })),
                                  ...phoneActions.map(a => ({ type: 'phone_number', label: a.label, url: a.url })),
                                  ...quickReplies.map(a => ({ type: 'quick_reply', label: a.text }))
                                ];
                                const res = await fetch(`${API_BASE}/whatsapp/submit-template`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({
                                    name: templateName,
                                    category: templateCategory.toUpperCase(),
                                    languageCode: templateLanguage || 'en',
                                    headerType: templateHeaderType || '',
                                    headerText: templateHeaderText || '',
                                    // blob: URLs are browser-only; backend detects & falls back to a public sample
                                    headerExampleUrl: templateHeaderPreview || '',
                                    bodyText: templateBody,
                                    footerText: templateFooter,
                                    buttons: allButtons
                                  })
                                });
                                const d = await res.json();
                                if (res.ok && d.success) {
                                  setSubmittedTemplateName(d.name);
                                  setSubmitStatus(d.status === 'APPROVED' ? 'approved' : 'pending');
                                } else {
                                  setSubmitError(d.error || d.raw?.error?.error_user_msg || 'Submission failed');
                                }
                              } catch (e: any) { setSubmitError(e.message); }
                              finally { setSubmitting(false); }
                            }}
                            className="rounded-lg bg-teal-700 px-8 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                          >
                            {submitting ? 'Submitting…' : 'Send to Review'}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right: phone preview */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-gray-700">Template Preview</h3>
                <div className="mx-auto w-[290px] rounded-[36px] border-4 border-gray-900 bg-[#e5ddd5] shadow-xl overflow-hidden" style={{ minHeight: 580 }}>
                  <div className="flex items-center gap-2 bg-teal-700 px-4 py-2">
                    <span className="text-xs font-semibold text-white">← {templateStep === 2 ? 'Add Template' : '999999999'}</span>
                  </div>
                  <div className="p-3">
                    {templateStep === 1 ? (
                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <div className="mb-2 h-32 w-full rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-400">Image Preview</div>
                        <p className="text-xs text-gray-800">Hello, take a look at our latest property listings on <strong>HomeFeet</strong>!</p>
                        <p className="mt-1 text-[10px] text-gray-400 text-right">11:45 ✓✓</p>
                        <div className="mt-2 border-t border-gray-200 pt-2 text-center text-xs font-semibold text-teal-600">🔗 View Properties</div>
                        <div className="mt-1 border-t border-gray-200 pt-2 text-center text-xs font-semibold text-teal-600">📋 Copy code</div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-white shadow-sm overflow-hidden">
                        {/* Header media preview */}
                        {templateHeaderType === 'image' && (
                          templateHeaderPreview
                            ? <img src={templateHeaderPreview} alt="header" className="h-36 w-full object-contain bg-gray-50" />
                            : <div className="h-28 w-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">🖼️ Image</div>
                        )}
                        {templateHeaderType === 'video' && (
                          templateHeaderPreview
                            ? <video src={templateHeaderPreview} className="h-36 w-full object-contain bg-black" />
                            : <div className="h-28 w-full bg-gray-800 flex items-center justify-center text-xs text-white">🎥 Video</div>
                        )}
                        {templateHeaderType === 'document' && (
                          <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 border-b">
                            <span className="text-lg">📄</span>
                            <span className="text-xs text-gray-600 truncate">{templateHeaderFile?.name || 'Document'}</span>
                          </div>
                        )}
                        {templateHeaderType === 'text' && (
                          <div className="px-3 pt-2 pb-1">
                            <p className="text-xs font-bold text-gray-800">{templateHeaderText || ''}<span className={templateHeaderText ? 'hidden' : 'font-normal text-gray-400'}>Header text…</span></p>
                          </div>
                        )}
                        <div className="p-2">
                          {templateBody ? (
                            <>
                              <p className="whitespace-pre-wrap text-xs text-gray-800">{templateBody}</p>
                              {templateFooter && <p className="mt-1 text-[10px] text-gray-400">{templateFooter}</p>}
                              <p className="mt-1 text-[10px] text-gray-400 text-right">11:45 ✓✓</p>
                              {websiteActions.map((a, i) => a.label && (
                                <div key={i} className="mt-1 border-t border-gray-200 pt-1 text-center text-xs font-semibold text-teal-600">🔗 {a.label}</div>
                              ))}
                              {phoneActions.map((a, i) => a.label && (
                                <div key={i} className="mt-1 border-t border-gray-200 pt-1 text-center text-xs font-semibold text-teal-600">📞 {a.label}</div>
                              ))}
                              {quickReplies.map((a, i) => a.text && (
                                <div key={i} className="mt-1 border-t border-gray-200 pt-1 text-center text-xs font-semibold text-blue-600">↩ {a.text}</div>
                              ))}
                            </>
                          ) : (
                            <p className="text-[10px] text-gray-400 italic">Message preview...</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {templateStep === 1 && (
                    <div className="px-3 pb-3">
                      <p className="text-[10px] text-gray-500">This template can be used for</p>
                      <p className="text-[10px] text-gray-500">Welcome messages, promotions, offers, coupons, newsletters, announcements</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Properties List */}
        <div className={`${activeAdminPage === 'properties' ? 'block' : 'hidden'} bg-white rounded-lg shadow-sm`}>
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">
              {filteredProperties.length} Properties
            </h2>
          </div>

          <div className="divide-y">
            {filteredProperties.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No properties found matching your filters
              </div>
            ) : (
              groupedFilteredProperties.map((group) => (
                <div key={group.key} className="divide-y">
                  <div className="bg-slate-50 px-6 py-3">
                    <p className="text-sm font-black text-slate-950">{group.state} / {group.capital}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{group.items.length} propert{group.items.length === 1 ? 'y' : 'ies'}</p>
                  </div>
                  {group.items.map((property) => (
                <div key={property._id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-32 h-32 flex-shrink-0 bg-gray-200 rounded-lg overflow-hidden">
                      {(() => {
                        const imageUrl = getPropertyImageUrl(property);
                        const isDiagramFallback = !property.imageUrl && Boolean(imageUrl);
                        return imageUrl ? (
                      <img
                            src={mediaSrc(imageUrl)}
                            alt={isDiagramFallback ? 'Auto generated plot diagram' : 'Property'}
                            className={`w-full h-full ${isDiagramFallback ? 'bg-white object-contain p-1' : 'object-cover'}`}
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image';
                        }}
                      />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-semibold text-slate-500">
                            No image
                          </div>
                        );
                      })()}
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {property.societyName || property.locality}
                          </h3>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            {property.locality}, {property.city}{property.state ? `, ${property.state}` : ''}
                          </div>
                        </div>
                        {getStatusBadge(property.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-gray-600">Category:</span>
                          <span className={`ml-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-black ${getPropertyCategoryClass(getPropertyCategory(property))}`}>
                            {getPropertyCategory(property)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <span className="ml-1 font-semibold capitalize">{property.developmentType}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Area:</span>
                          <span className="ml-1 font-semibold">{property.totalArea} {property.areaUnit}</span>
                        </div>
                        {property.flatSize && (
                          <div>
                            <span className="text-gray-600">Flat Size:</span>
                            <span className="ml-1 font-semibold">{property.flatSize} Sq Ft</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Phone:</span>
                          <span className="ml-1 font-semibold">{property.phone}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Posted:</span>
                          <span className="ml-1 font-semibold">
                            {new Date(property.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelectedProperty(property);
                            setShowModal(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </button>
                        <button
                          onClick={() => handleEditProperty(property._id)}
                          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit Details
                        </button>

                        {property.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(property._id)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(property._id)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </button>
                            <button
                              onClick={() => handleReject(
                                property._id,
                                'Duplicate listing: this property appears to be already submitted or listed on HomeFeet. Please update the existing listing instead of creating another one.'
                              )}
                              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                            >
                              <X className="h-4 w-4" />
                              Reject Duplicate
                            </button>
                          </>
                        )}
                        {property.status === 'rejected' && property.rejectionReason && (
                          <div className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                            <span className="font-bold">Feedback sent:</span> {property.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Property Detail Modal */}
      {showModal && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-bold">Property Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Images */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-semibold mb-2">Property Image</h3>
                  {(() => {
                    const imageUrl = getPropertyImageUrl(selectedProperty);
                    const isDiagramFallback = !selectedProperty.imageUrl && Boolean(imageUrl);
                    return imageUrl ? (
                      <img
                        src={mediaSrc(imageUrl)}
                        alt={isDiagramFallback ? 'Auto generated plot diagram' : 'Property'}
                        className={`w-full h-64 rounded-lg border ${isDiagramFallback ? 'bg-white object-contain' : 'object-cover'}`}
                      />
                    ) : (
                      <div className="flex h-64 w-full items-center justify-center rounded-lg border bg-slate-50 text-sm font-semibold text-slate-500">
                        No property image available
                      </div>
                    );
                  })()}
                </div>
                {selectedProperty.plotDiagramUrl && (
                  <div>
                    <h3 className="font-semibold mb-2">Plot Diagram</h3>
                    <img
                      src={`${API_ORIGIN}${selectedProperty.plotDiagramUrl}`}
                      alt="Plot Diagram"
                      className="w-full h-64 object-contain rounded-lg border"
                    />
                  </div>
                )}
              </div>

              {/* Property Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Development Type</p>
                    <p className="font-semibold capitalize">{selectedProperty.developmentType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Area</p>
                    <p className="font-semibold">{selectedProperty.totalArea} {selectedProperty.areaUnit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="font-semibold">{selectedProperty.city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Locality</p>
                    <p className="font-semibold">{selectedProperty.locality}</p>
                  </div>
                  {selectedProperty.societyName && (
                    <div>
                      <p className="text-sm text-gray-600">Society/Apartment</p>
                      <p className="font-semibold">{selectedProperty.societyName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Landmark</p>
                    <p className="font-semibold">{selectedProperty.landmark}</p>
                  </div>
                  {selectedProperty.facing && (
                    <div>
                      <p className="text-sm text-gray-600">Facing</p>
                      <p className="font-semibold">{selectedProperty.facing}</p>
                    </div>
                  )}
                  {selectedProperty.bedrooms && (
                    <div>
                      <p className="text-sm text-gray-600">Bedrooms</p>
                      <p className="font-semibold">{selectedProperty.bedrooms}</p>
                    </div>
                  )}
                  {selectedProperty.bathrooms && (
                    <div>
                      <p className="text-sm text-gray-600">Bathrooms</p>
                      <p className="font-semibold">{selectedProperty.bathrooms}</p>
                    </div>
                  )}
                  {selectedProperty.floorNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Floor</p>
                      <p className="font-semibold">{selectedProperty.floorNumber}{selectedProperty.totalFloors ? ` of ${selectedProperty.totalFloors}` : ''}</p>
                    </div>
                  )}
                  {selectedProperty.furnishingStatus && (
                    <div>
                      <p className="text-sm text-gray-600">Furnishing</p>
                      <p className="font-semibold">{selectedProperty.furnishingStatus}</p>
                    </div>
                  )}
                  {selectedProperty.possessionStatus && (
                    <div>
                      <p className="text-sm text-gray-600">Possession Status</p>
                      <p className="font-semibold">{selectedProperty.possessionStatus}</p>
                    </div>
                  )}
                  {selectedProperty.developerRatio && (
                    <div>
                      <p className="text-sm text-gray-600">Development Ratio (Owner : Builder)</p>
                      <p className="font-semibold">{selectedProperty.developerRatio}</p>
                    </div>
                  )}
                  {selectedProperty.goodwill && (
                    <div>
                      <p className="text-sm text-gray-600">Goodwill</p>
                      <p className="font-semibold">₹{parseInt(selectedProperty.goodwill).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedProperty.advance && (
                    <div>
                      <p className="text-sm text-gray-600">Advance</p>
                      <p className="font-semibold">₹{parseInt(selectedProperty.advance).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Contact Phone</p>
                    <p className="font-semibold">{selectedProperty.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    {getStatusBadge(selectedProperty.status)}
                  </div>
                </div>
                {selectedProperty.status === 'rejected' && selectedProperty.rejectionReason && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <p className="font-bold">Feedback shared with owner/mediator</p>
                    <p className="mt-1">{selectedProperty.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => handleEditProperty(selectedProperty._id)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold"
                >
                  <Pencil className="h-5 w-5" />
                  Edit Property Details
                </button>
                {selectedProperty.status === 'pending' && (
                  <>
                  <button
                    onClick={() => handleApprove(selectedProperty._id)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    <Check className="h-5 w-5" />
                    Approve Property
                  </button>
                  <button
                    onClick={() => handleReject(selectedProperty._id)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                  >
                    <X className="h-5 w-5" />
                    Reject Property
                  </button>
                  <button
                    onClick={() => handleReject(
                      selectedProperty._id,
                      'Duplicate listing: this property appears to be already submitted or listed on HomeFeet. Please update the existing listing instead of creating another one.'
                    )}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold"
                  >
                    <X className="h-5 w-5" />
                    Reject Duplicate
                  </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;




