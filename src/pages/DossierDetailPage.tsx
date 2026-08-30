import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { DossierNavbar } from '../components/DossierNavbar';
import { ForkliftDetailsForm } from '../components/ForkliftDetailsForm';
import { EmptyContainerHandlerDetailsForm } from '../components/EmptyContainerHandlerDetailsForm';
import { ReachstackerDetailsForm } from '../components/ReachstackerDetailsForm';
import { TerminalTractorDetailsForm } from '../components/TerminalTractorDetailsForm';
import { BidsSection } from '../components/BidsSection';
import { PhotoUpload } from '../components/PhotoUpload';
import { PhotoGallery } from '../components/PhotoGallery';
import { VideoUpload } from '../components/VideoUpload';
import { VideoGallery } from '../components/VideoGallery';
import { PublicationSection } from '../components/PublicationSection';
import { PDFLanguageModal } from '../components/PDFLanguageModal';
import { ScreenshotUpload } from '../components/ScreenshotUpload';
import { DossierAttachments } from '../components/DossierAttachments';
import { LocationMap } from '../components/LocationMap';
import { DocumentUpload } from '../components/DocumentUpload';
import { DocumentList } from '../components/DocumentList';
import { Calendar, User, Package, MapPin, FileText, Truck, Image, Download, CreditCard as Edit2, Check, X, Video, Building2 } from 'lucide-react';
import { generateDossierPDF, generateExternalDossierPDF, generateCleanExternalPDF } from '../utils/pdfExport';
import { CustomerSelector } from '../components/CustomerSelector';

interface DossierDetailPageProps {
  dossierId: string;
  bidId?: string | null;
  onNavigate: (page: string, id?: string) => void;
  returnTo?: string;
}

interface Dossier {
  id: string;
  dossier_number: string;
  dossier_datum: string;
  title: string;
  description: string;
  equipment_type: string;
  brand: string;
  model: string;
  year: number | null;
  condition: string;
  location: string;
  estimated_value: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  sold_at: string | null;
  created_by: string;
  purchase_price: number | null;
  handelsprijs: number | null;
  eindklantprijs: number | null;
  sale_price: number | null;
  customer_name: string | null;
  customer_id: string | null;
  user_profiles?: {
    full_name: string;
  };
}

interface PublicationDate {
  platform: string;
  published_at: string;
}

export function DossierDetailPage({ dossierId, bidId, onNavigate, returnTo = 'dossiers' }: DossierDetailPageProps) {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForkliftForm, setShowForkliftForm] = useState(false);
  const [showECHForm, setShowECHForm] = useState(false);
  const [showReachstackerForm, setShowReachstackerForm] = useState(false);
  const [showTerminalTractorForm, setShowTerminalTractorForm] = useState(false);
  const [hasForkliftDetails, setHasForkliftDetails] = useState(false);
  const [hasECHDetails, setHasECHDetails] = useState(false);
  const [hasReachstackerDetails, setHasReachstackerDetails] = useState(false);
  const [hasTerminalTractorDetails, setHasTerminalTractorDetails] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [photosKey, setPhotosKey] = useState(0);
  const [videosKey, setVideosKey] = useState(0);
  const [documentsKey, setDocumentsKey] = useState(0);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [equipmentRemarks, setEquipmentRemarks] = useState<string | null>(null);
  const [hoursOnClock, setHoursOnClock] = useState<number | null>(null);
  const [publicationDates, setPublicationDates] = useState<PublicationDate[]>([]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [pdfType, setPdfType] = useState<'internal' | 'external' | 'clean'>('internal');
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [pendingSoldStatus, setPendingSoldStatus] = useState<string | null>(null);
  const [soldCustomerName, setSoldCustomerName] = useState<string>('');
  const [soldDate, setSoldDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [unpublishAds, setUnpublishAds] = useState(true);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationValue, setLocationValue] = useState<string>('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState<string>('');
  const [editingSoldDate, setEditingSoldDate] = useState(false);
  const [soldDateValue, setSoldDateValue] = useState<string>('');
  const [purchasePriceInput, setPurchasePriceInput] = useState<string>('');
  const [handelsprijsInput, setHandelsprijsInput] = useState<string>('');
  const [eindklantprijsInput, setEindklantprijsInput] = useState<string>('');
  const [salePriceInput, setSalePriceInput] = useState<string>('');
  const [estimatedValueInput, setEstimatedValueInput] = useState<string>('');

  useEffect(() => {
    loadDossier();
    checkEquipmentDetails();
    loadEquipmentRemarks();
    loadPublicationDates();
  }, [dossierId]);

  useEffect(() => {
    if (dossier) {
      setPurchasePriceInput(dossier.purchase_price?.toString() || '');
      setHandelsprijsInput(dossier.handelsprijs?.toString() || '');
      setEindklantprijsInput(dossier.eindklantprijs?.toString() || '');
      setSalePriceInput(dossier.sale_price?.toString() || '');
      setEstimatedValueInput(dossier.estimated_value?.toString() || '');
    }
  }, [dossier]);

  useEffect(() => {
    if (dossier) {
      setLocationValue(dossier.location || '');
      setTitleValue(dossier.title || '');
      setSoldDateValue(dossier.sold_at ? new Date(dossier.sold_at).toISOString().slice(0, 10) : '');
    }
  }, [dossier]);

  const loadDossier = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dossiers')
        .select(`
          *,
          user_profiles:created_by (
            full_name
          )
        `)
        .eq('id', dossierId)
        .maybeSingle();

      if (error) throw error;
      setDossier(data);
    } catch (error) {
      console.error('Error loading dossier:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkEquipmentDetails = async () => {
    try {
      const { data: forkliftData, error: forkliftError } = await supabase
        .from('forklift_details')
        .select('id')
        .eq('dossier_id', dossierId)
        .maybeSingle();

      if (forkliftError && forkliftError.code !== 'PGRST116') throw forkliftError;
      setHasForkliftDetails(!!forkliftData);

      const { data: echData, error: echError } = await supabase
        .from('empty_container_handler_details')
        .select('id')
        .eq('dossier_id', dossierId)
        .maybeSingle();

      if (echError && echError.code !== 'PGRST116') throw echError;
      setHasECHDetails(!!echData);

      const { data: reachstackerData, error: reachstackerError } = await supabase
        .from('reachstacker_details')
        .select('id')
        .eq('dossier_id', dossierId)
        .maybeSingle();

      if (reachstackerError && reachstackerError.code !== 'PGRST116') throw reachstackerError;
      setHasReachstackerDetails(!!reachstackerData);

      const { data: terminalTractorData, error: terminalTractorError } = await supabase
        .from('terminal_tractor_details')
        .select('id')
        .eq('dossier_id', dossierId)
        .maybeSingle();

      if (terminalTractorError && terminalTractorError.code !== 'PGRST116') throw terminalTractorError;
      setHasTerminalTractorDetails(!!terminalTractorData);
    } catch (error) {
      console.error('Error checking equipment details:', error);
    }
  };

  const loadEquipmentRemarks = async () => {
    try {
      // Check forklift details
      const { data: forkliftData } = await supabase
        .from('forklift_details')
        .select('remark, hours_on_clock')
        .eq('dossier_id', dossierId)
        .maybeSingle();

      if (forkliftData) {
        setEquipmentRemarks(forkliftData.remark);
        setHoursOnClock(forkliftData.hours_on_clock);
        return;
      }

      // Check ECH details
      const { data: echData } = await supabase
        .from('empty_container_handler_details')
        .select('remark, hours_on_clock')
        .eq('dossier_id', dossierId)
        .maybeSingle();

      if (echData) {
        setEquipmentRemarks(echData.remark);
        setHoursOnClock(echData.hours_on_clock);
        return;
      }

      // Check reachstacker details
      const { data: reachstackerData } = await supabase
        .from('reachstacker_details')
        .select('remark, hours_on_clock')
        .eq('dossier_id', dossierId)
        .maybeSingle();

      if (reachstackerData) {
        setEquipmentRemarks(reachstackerData.remark);
        setHoursOnClock(reachstackerData.hours_on_clock);
        return;
      }

      // Check terminal tractor details
      const { data: terminalTractorData } = await supabase
        .from('terminal_tractor_details')
        .select('remark, hours_on_clock')
        .eq('dossier_id', dossierId)
        .maybeSingle();

      if (terminalTractorData) {
        setEquipmentRemarks(terminalTractorData.remark);
        setHoursOnClock(terminalTractorData.hours_on_clock);
        return;
      }

      setEquipmentRemarks(null);
      setHoursOnClock(null);
    } catch (error) {
      console.error('Error loading equipment remarks:', error);
    }
  };

  const loadPublicationDates = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisement_publications')
        .select('platform, published_at')
        .eq('dossier_id', dossierId)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: true });

      if (error) throw error;
      setPublicationDates(data || []);
    } catch (error) {
      console.error('Error loading publication dates:', error);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Stock',
      stock: 'Stock',
      open: 'Open',
      bidding: 'Bieden actief',
      sold: 'Verkocht',
      archived: 'Gearchiveerd',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      stock: 'bg-slate-100 text-slate-700',
      open: 'bg-blue-100 text-blue-700',
      bidding: 'bg-amber-100 text-amber-700',
      sold: 'bg-emerald-100 text-emerald-700',
      archived: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getEquipmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      container: 'Container',
      trailer: 'Trailer',
      chassis: 'Chassis',
      other: 'Overig',
      heavy_duty_forklift: 'Heavy Duty Forklift',
      empty_container_handler: 'Empty Container Handler',
      reachstacker: 'Reachstacker',
      terminal_tractor: 'Terminal Tractor',
      general_equipment: 'Overige',
    };
    return labels[type] || type;
  };

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      excellent: 'Uitstekend',
      good: 'Goed',
      fair: 'Redelijk',
      poor: 'Slecht',
    };
    return labels[condition] || condition;
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'sold' && dossier?.status !== 'sold') {
      setPendingSoldStatus(newStatus);
      setSoldDate(new Date().toISOString().split('T')[0]);
      setSoldCustomerName('');
      setShowSoldModal(true);
      setShowStatusDropdown(false);
      return;
    }

    try {
      const updateData: { status: string; sold_at?: string | null; customer_name?: string | null } = { status: newStatus };

      if (newStatus !== 'sold' && dossier?.status === 'sold') {
        updateData.sold_at = null;
        updateData.customer_name = null;
      }

      const { error } = await supabase
        .from('dossiers')
        .update(updateData)
        .eq('id', dossierId);

      if (error) throw error;

      await loadDossier();
      setShowStatusDropdown(false);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Fout bij het wijzigen van de status');
    }
  };

  const handleConfirmSold = async () => {
    if (!soldCustomerName.trim()) {
      alert('Klantnaam is verplicht');
      return;
    }

    if (!soldDate) {
      alert('Verkocht op datum is verplicht');
      return;
    }

    try {
      const updateData: any = {
        status: 'sold',
        sold_at: new Date(soldDate).toISOString(),
        customer_name: soldCustomerName.trim(),
      };

      if (unpublishAds) {
        updateData.publish_to_forklift_international = false;
        updateData.publish_to_mascus = false;
        updateData.publish_to_trucksnl = false;
        updateData.publish_to_machineseeker = false;
        updateData.publish_to_truckscout24 = false;
      }

      const { error } = await supabase
        .from('dossiers')
        .update(updateData)
        .eq('id', dossierId);

      if (error) throw error;

      await loadDossier();
      setShowSoldModal(false);
      setPendingSoldStatus(null);
      setSoldCustomerName('');
      setSoldDate(new Date().toISOString().split('T')[0]);
      setUnpublishAds(true);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Fout bij het wijzigen van de status');
    }
  };

  const statusOptions = [
    { value: 'stock', label: 'Stock' },
    { value: 'open', label: 'Open' },
    { value: 'bidding', label: 'Bieden actief' },
    { value: 'sold', label: 'Verkocht' },
    { value: 'archived', label: 'Gearchiveerd' },
  ];

  const handleExportPDF = () => {
    setPdfType('internal');
    setShowLanguageModal(true);
  };

  const handleExportExternalPDF = () => {
    setPdfType('external');
    setShowLanguageModal(true);
  };

  const handleExportCleanPDF = () => {
    setPdfType('clean');
    setShowLanguageModal(true);
  };

  const handleLanguageSelect = async (language: 'nl' | 'en' | 'de' | 'es' | 'fr') => {
    setShowLanguageModal(false);
    try {
      setGeneratingPDF(true);
      if (pdfType === 'internal') {
        await generateDossierPDF(dossierId, language);
      } else if (pdfType === 'external') {
        await generateExternalDossierPDF(dossierId, language);
      } else {
        await generateCleanExternalPDF(dossierId, language);
      }
    } catch (error: any) {
      console.error('=== PDF GENERATION ERROR ===');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      const errorMessage = error?.message || 'Onbekende fout';
      alert(`Fout bij het genereren van het PDF-rapport:\n\n${errorMessage}\n\nControleer de browser console voor meer details.`);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handlePriceChange = async (field: 'purchase_price' | 'handelsprijs' | 'eindklantprijs' | 'sale_price' | 'estimated_value', value: number | null) => {
    if (!dossier) return;

    const currentValue = dossier[field];
    if (currentValue === value) return;

    try {
      const { error } = await supabase
        .from('dossiers')
        .update({ [field]: value })
        .eq('id', dossierId);

      if (error) throw error;

      setDossier(prev => prev ? { ...prev, [field]: value } : null);

      switch(field) {
        case 'purchase_price':
          setPurchasePriceInput(value?.toString() || '');
          break;
        case 'handelsprijs':
          setHandelsprijsInput(value?.toString() || '');
          break;
        case 'eindklantprijs':
          setEindklantprijsInput(value?.toString() || '');
          break;
        case 'sale_price':
          setSalePriceInput(value?.toString() || '');
          break;
        case 'estimated_value':
          setEstimatedValueInput(value?.toString() || '');
          break;
      }
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Fout bij het bijwerken van de prijs');
    }
  };

  const handleSoldViaPlatformChange = async (platform: string) => {
    if (!dossier) return;

    try {
      const { error } = await supabase
        .from('dossiers')
        .update({ sold_via_platform: platform || null })
        .eq('id', dossierId);

      if (error) throw error;

      setDossier(prev => prev ? { ...prev, sold_via_platform: platform || null } : null);
    } catch (error) {
      console.error('Error updating sold via platform:', error);
      alert('Fout bij het bijwerken van verkocht via platform');
    }
  };

  const handleCustomerChange = async (customerId: string | null, customerName: string | null) => {
    if (!dossier) return;

    try {
      // Extract real customer ID if it's a user_ or dossier_ prefixed ID
      let realCustomerId: string | null = customerId;

      if (customerId) {
        if (customerId.startsWith('user_')) {
          // Extract the UUID after "user_"
          realCustomerId = customerId.replace('user_', '');
        } else if (customerId.startsWith('dossier_')) {
          // For dossier-based customers, don't store the ID, only the name
          realCustomerId = null;
        }
      }

      const { error } = await supabase
        .from('dossiers')
        .update({
          customer_id: realCustomerId,
          customer_name: customerName?.trim() || null
        })
        .eq('id', dossierId);

      if (error) throw error;

      // Update local state after successful database update
      setDossier(prev => prev ? { ...prev, customer_id: realCustomerId, customer_name: customerName } : null);
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Fout bij het bijwerken van klant');
    }
  };

  const handleLocationSave = async () => {
    if (!dossier) return;

    try {
      const trimmedLocation = locationValue.trim();
      const { error } = await supabase
        .from('dossiers')
        .update({
          location: trimmedLocation || null,
          latitude: null,
          longitude: null
        })
        .eq('id', dossierId);

      if (error) throw error;

      setDossier(prev => prev ? { ...prev, location: trimmedLocation || '' } : null);
      setEditingLocation(false);
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Fout bij het bijwerken van de locatie');
    }
  };

  const handleLocationCancel = () => {
    setLocationValue(dossier?.location || '');
    setEditingLocation(false);
  };

  const handleTitleSave = async () => {
    if (!dossier) return;

    try {
      const trimmedTitle = titleValue.trim();
      if (!trimmedTitle) {
        alert('Titel mag niet leeg zijn');
        return;
      }

      const { error } = await supabase
        .from('dossiers')
        .update({ title: trimmedTitle })
        .eq('id', dossierId);

      if (error) throw error;

      setDossier(prev => prev ? { ...prev, title: trimmedTitle } : null);
      setEditingTitle(false);
    } catch (error) {
      console.error('Error updating title:', error);
      alert('Fout bij het bijwerken van de titel');
    }
  };

  const handleTitleCancel = () => {
    setTitleValue(dossier?.title || '');
    setEditingTitle(false);
  };

  const handleSoldAtChange = async (dateString: string) => {
    if (!dossier) return;

    try {
      const soldAt = dateString ? new Date(dateString).toISOString() : null;

      const { error } = await supabase
        .from('dossiers')
        .update({ sold_at: soldAt })
        .eq('id', dossierId);

      if (error) throw error;

      setDossier(prev => prev ? { ...prev, sold_at: soldAt } : null);
    } catch (error) {
      console.error('Error updating sold at date:', error);
      alert('Fout bij het bijwerken van verkoopdatum');
    }
  };

  const saveSoldDate = async () => {
    if (!dossier) return;

    try {
      const soldAt = soldDateValue ? new Date(soldDateValue).toISOString() : null;

      const { error } = await supabase
        .from('dossiers')
        .update({ sold_at: soldAt })
        .eq('id', dossierId);

      if (error) throw error;

      setDossier(prev => prev ? { ...prev, sold_at: soldAt } : null);
      setEditingSoldDate(false);
    } catch (error) {
      console.error('Error updating sold at date:', error);
      alert('Fout bij het bijwerken van verkoopdatum');
    }
  };

  const handleScreenshotDataExtracted = async (data: any) => {
    if (!dossier) return;

    try {
      const dossierUpdates: any = {};
      const detailUpdates: any = {};

      if (data.merk) {
        dossierUpdates.brand = data.merk;
        detailUpdates.brand = data.merk;
      }
      if (data.type) {
        dossierUpdates.model = data.type;
        detailUpdates.type = data.type;
      }
      if (data.bouwjaar) {
        dossierUpdates.year = data.bouwjaar;
        detailUpdates.year_of_manufacture = data.bouwjaar;
      }
      if (data.handelsprijs) dossierUpdates.handelsprijs = data.handelsprijs;
      if (data.eindklantprijs) dossierUpdates.eindklantprijs = data.eindklantprijs;
      if (data.land) dossierUpdates.location = data.land + (data.locatie ? `, ${data.locatie}` : '');
      else if (data.locatie) dossierUpdates.location = data.locatie;

      if (data.serienummer) detailUpdates.serial_no = data.serienummer;
      if (data.brandstof) detailUpdates.power = data.brandstof;
      if (data.capaciteit) detailUpdates.capacity_kg = data.capaciteit;
      if (data.lastzwaartepunt) detailUpdates.load_center_mm = data.lastzwaartepunt;
      if (data.hefhoogte) detailUpdates.lift_height_mm = data.hefhoogte;
      if (data.vrije_hef) detailUpdates.free_lift = data.vrije_hef?.toString();
      if (data.uren) detailUpdates.hours_on_clock = data.uren;
      if (data.masttype) detailUpdates.mast_type = data.masttype;
      if (data.notities) detailUpdates.remark = data.notities;

      if (Object.keys(dossierUpdates).length === 0 && Object.keys(detailUpdates).length === 0) {
        alert('Geen gegevens gevonden om bij te werken');
        return;
      }

      if (Object.keys(dossierUpdates).length > 0) {
        const { error: dossierError } = await supabase
          .from('dossiers')
          .update(dossierUpdates)
          .eq('id', dossierId);

        if (dossierError) throw dossierError;
      }

      if (Object.keys(detailUpdates).length > 0) {
        let detailTable = '';
        switch (dossier.equipment_type) {
          case 'heavy_duty_forklift':
            detailTable = 'forklift_details';
            break;
          case 'empty_container_handler':
            detailTable = 'empty_container_handler_details';
            break;
          case 'reachstacker':
            detailTable = 'reachstacker_details';
            break;
          case 'terminal_tractor':
            detailTable = 'terminal_tractor_details';
            break;
        }

        if (detailTable) {
          const { data: existingDetails, error: checkError } = await supabase
            .from(detailTable)
            .select('id')
            .eq('dossier_id', dossierId)
            .maybeSingle();

          if (checkError) throw checkError;

          if (existingDetails) {
            const { error: detailError } = await supabase
              .from(detailTable)
              .update(detailUpdates)
              .eq('dossier_id', dossierId);

            if (detailError) throw detailError;
          } else {
            const { error: detailError } = await supabase
              .from(detailTable)
              .insert({ dossier_id: dossierId, ...detailUpdates });

            if (detailError) throw detailError;
          }
        }
      }

      await loadDossier();
      await checkEquipmentDetails();
      alert('Gegevens succesvol bijgewerkt vanuit screenshot');
    } catch (error) {
      console.error('Error updating dossier from screenshot:', error);
      alert('Fout bij het bijwerken van gegevens vanuit screenshot');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DossierNavbar onNavigate={onNavigate} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-600 mt-2">Laden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DossierNavbar onNavigate={onNavigate} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">Dossier niet gevonden</p>
            <button
              onClick={() => onNavigate(returnTo)}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Terug naar overzicht
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {profile && <DossierNavbar onNavigate={onNavigate} />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {profile && (
          <div className="mb-6">
            <button
              onClick={() => onNavigate(returnTo)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Terug naar overzicht
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  {editingTitle ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="text"
                        value={titleValue}
                        onChange={(e) => setTitleValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleTitleSave();
                          } else if (e.key === 'Escape') {
                            handleTitleCancel();
                          }
                        }}
                        className="text-2xl font-bold text-slate-800 px-3 py-1 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                        autoFocus
                      />
                      <button
                        onClick={handleTitleSave}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Opslaan"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleTitleCancel}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Annuleren"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h1 className="text-2xl font-bold text-slate-800">{dossier.title}</h1>
                      {(profile?.role === 'verkoper' || profile?.role === 'manager' || profile?.role === 'eindgebruiker') && (
                        <button
                          onClick={() => setEditingTitle(true)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Titel bewerken"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                  {!editingTitle && (
                    <>
                      {(profile?.role === 'verkoper' || profile?.role === 'manager' || profile?.role === 'eindgebruiker') ? (
                        <div className="relative">
                          <button
                            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                              dossier.status
                            )} hover:opacity-80 transition-opacity cursor-pointer`}
                          >
                            {getStatusLabel(dossier.status)} ▼
                          </button>
                          {showStatusDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                              {statusOptions.map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => handleStatusChange(option.value)}
                                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                    dossier.status === option.value ? 'bg-slate-100 font-medium' : ''
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            dossier.status
                          )}`}
                        >
                          {getStatusLabel(dossier.status)}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-slate-500">
                  <span>
                    Dossiernummer: <span className="font-medium">{dossier.dossier_number}</span>
                  </span>
                  <span>•</span>
                  <span>
                    Datum: <span className="font-medium">{new Date(dossier.dossier_datum || dossier.created_at).toLocaleDateString('nl-NL')}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {dossier.estimated_value && (
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-slate-600">
                      <span className="text-2xl font-bold">
                        € {dossier.estimated_value.toLocaleString('nl-NL')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">Geschatte waarde</p>
                  </div>
                )}
                <button
                  onClick={handleExportPDF}
                  disabled={generatingPDF}
                  className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{generatingPDF ? 'Genereren...' : 'PDF Intern'}</span>
                </button>
                <button
                  onClick={handleExportExternalPDF}
                  disabled={generatingPDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{generatingPDF ? 'Genereren...' : 'PDF Extern'}</span>
                </button>
                <button
                  onClick={handleExportCleanPDF}
                  disabled={generatingPDF}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{generatingPDF ? 'Genereren...' : 'PDF Extern (zonder logo)'}</span>
                </button>
                {(profile?.role === 'verkoper' || profile?.role === 'manager') && dossier?.equipment_type !== 'general_equipment' && (
                  <>
                    {dossier?.equipment_type === 'heavy_duty_forklift' && (
                      <button
                        onClick={() => setShowForkliftForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Truck className="w-4 h-4" />
                        <span>{hasForkliftDetails ? 'Bewerk Forklift Details' : 'Voeg Forklift Details Toe'}</span>
                      </button>
                    )}
                    {dossier?.equipment_type === 'empty_container_handler' && (
                      <button
                        onClick={() => setShowECHForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Truck className="w-4 h-4" />
                        <span>{hasECHDetails ? 'Bewerk ECH Details' : 'Voeg ECH Details Toe'}</span>
                      </button>
                    )}
                    {dossier?.equipment_type === 'reachstacker' && (
                      <button
                        onClick={() => setShowReachstackerForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Truck className="w-4 h-4" />
                        <span>{hasReachstackerDetails ? 'Bewerk Reachstacker Details' : 'Voeg Reachstacker Details Toe'}</span>
                      </button>
                    )}
                    {dossier?.equipment_type === 'terminal_tractor' && (
                      <button
                        onClick={() => setShowTerminalTractorForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Truck className="w-4 h-4" />
                        <span>{hasTerminalTractorDetails ? 'Bewerk Terminal Tractor Details' : 'Voeg Terminal Tractor Details Toe'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('dossiers.equipmentDetails')}</h3>

                <div className="flex items-start space-x-3">
                  <Package className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">{t('dossiers.equipmentType')}</p>
                    <p className="font-medium text-slate-800">
                      {getEquipmentTypeLabel(dossier.equipment_type)}
                    </p>
                  </div>
                </div>

                {dossier.brand && (
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 flex items-center justify-center text-slate-400">
                      <span className="text-sm font-bold">B</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{t('dossiers.brand')}</p>
                      <p className="font-medium text-slate-800">{dossier.brand}</p>
                    </div>
                  </div>
                )}

                {dossier.model && (
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 flex items-center justify-center text-slate-400">
                      <span className="text-sm font-bold">M</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{t('dossiers.model')}</p>
                      <p className="font-medium text-slate-800">{dossier.model}</p>
                    </div>
                  </div>
                )}

                {dossier.year && (
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500">{t('dossiers.year')}</p>
                      <p className="font-medium text-slate-800">{dossier.year}</p>
                    </div>
                  </div>
                )}

                {hoursOnClock !== null && hoursOnClock !== undefined && (
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 flex items-center justify-center text-slate-400">
                      <span className="text-sm font-bold">U</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Urenstand</p>
                      <p className="font-medium text-slate-800">{hoursOnClock.toLocaleString('nl-NL')} uur</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center text-slate-400">
                    <span className="text-sm font-bold">C</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('dossiers.condition')}</p>
                    <p className={`font-medium ${dossier.condition === 'good' ? 'text-green-600' : dossier.condition === 'poor' ? 'text-red-600' : 'text-slate-800'}`}>{getConditionLabel(dossier.condition)}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-1">{t('dossiers.location')}</p>
                    {editingLocation ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={locationValue}
                          onChange={(e) => setLocationValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleLocationSave();
                            if (e.key === 'Escape') handleLocationCancel();
                          }}
                          className="flex-1 px-3 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Bijv. Rotterdam, Nederland"
                          autoFocus
                        />
                        <button
                          onClick={handleLocationSave}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Opslaan"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleLocationCancel}
                          className="p-1 text-slate-600 hover:bg-slate-50 rounded transition-colors"
                          title="Annuleren"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-slate-800">
                          {dossier.location || 'Niet opgegeven'}
                        </p>
                        {(profile?.role === 'verkoper' || profile?.role === 'manager') && (
                          <button
                            onClick={() => setEditingLocation(true)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Bewerk locatie"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('dossiers.dossierInfo')}</h3>

                <div className="flex items-start space-x-3">
                  <User className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">{t('dossiers.createdBy')}</p>
                    <p className="font-medium text-slate-800">
                      {dossier.user_profiles?.full_name || 'Onbekend'}
                    </p>
                  </div>
                </div>

                {(profile?.role === 'manager' || profile?.role === 'verkoper') && (
                  <div className="flex items-start space-x-3">
                    <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-500 mb-2">Klantnaam</p>
                      <CustomerSelector
                        value={dossier.customer_name}
                        customerId={dossier.customer_id}
                        onChange={handleCustomerChange}
                        disabled={false}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">{t('dossiers.createdAt')}</p>
                    <p className="font-medium text-slate-800">
                      {new Date(dossier.created_at).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">{t('dossiers.updatedAt')}</p>
                    <p className="font-medium text-slate-800">
                      {new Date(dossier.updated_at).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {dossier.location && (
              <LocationMap location={dossier.location} />
            )}

            {(profile?.role === 'manager' || profile?.role === 'verkoper') && (
              <div className="pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Tijdlijn</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 bg-blue-50 p-3 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">Aanmaakdatum</p>
                      <p className="text-sm text-blue-700">
                        {new Date(dossier.created_at).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {publicationDates.length > 0 && (
                    <div className="flex items-start space-x-3 bg-green-50 p-3 rounded-lg">
                      <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">Online gezet</p>
                        {publicationDates.map((pub, index) => (
                          <p key={index} className="text-sm text-green-700">
                            <span className="font-medium capitalize">{pub.platform}</span>:{' '}
                            {new Date(pub.published_at).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {dossier.sold_at && (
                    <div className="group flex items-start space-x-3 bg-amber-50 p-3 rounded-lg">
                      <Calendar className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900">Verkocht op</p>
                        {editingSoldDate ? (
                          <div className="flex items-center space-x-2 mt-1">
                            <input
                              type="date"
                              value={soldDateValue}
                              onChange={(e) => setSoldDateValue(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                              autoFocus
                            />
                            <button
                              onClick={saveSoldDate}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSoldDateValue(dossier.sold_at ? new Date(dossier.sold_at).toISOString().slice(0, 10) : '');
                                setEditingSoldDate(false);
                              }}
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <p className="text-sm text-amber-700">
                              {new Date(dossier.sold_at).toLocaleDateString('nl-NL', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                            {(profile?.role === 'manager' || profile?.role === 'verkoper') && (
                              <button
                                onClick={() => setEditingSoldDate(true)}
                                className="p-1 text-amber-600 hover:bg-amber-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                        {dossier.customer_name && (
                          <p className="text-sm text-amber-700 mt-1">
                            <span className="font-medium">Klant:</span> {dossier.customer_name}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {!publicationDates.length && !dossier.sold_at && (
                    <p className="text-sm text-slate-500 italic">
                      Dit dossier is nog niet online gezet of verkocht.
                    </p>
                  )}
                </div>
              </div>
            )}

            {(profile?.role === 'verkoper' || profile?.role === 'manager') && (
              <div className="pt-6 border-t border-slate-200">
                <ScreenshotUpload
                  onDataExtracted={handleScreenshotDataExtracted}
                  equipmentType={dossier.equipment_type}
                  dossierId={dossierId}
                  onPhotosUploaded={() => setPhotosKey(prev => prev + 1)}
                />
              </div>
            )}

            <div className="pt-6 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Prijzen</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-5 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">
                      Inkoopprijs (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={purchasePriceInput}
                      onChange={(e) => setPurchasePriceInput(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const value = parseFloat(parseFloat(e.target.value).toFixed(2));
                          handlePriceChange('purchase_price', value);
                        } else {
                          handlePriceChange('purchase_price', null);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      disabled={profile?.role !== 'manager' && profile?.role !== 'verkoper'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">
                      Geschatte waarde (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={estimatedValueInput}
                      onChange={(e) => setEstimatedValueInput(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const value = parseFloat(parseFloat(e.target.value).toFixed(2));
                          handlePriceChange('estimated_value', value);
                        } else {
                          handlePriceChange('estimated_value', null);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      disabled={profile?.role !== 'manager' && profile?.role !== 'verkoper'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">
                      Handelsprijs (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={handelsprijsInput}
                      onChange={(e) => setHandelsprijsInput(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const value = parseFloat(parseFloat(e.target.value).toFixed(2));
                          handlePriceChange('handelsprijs', value);
                        } else {
                          handlePriceChange('handelsprijs', null);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      disabled={profile?.role !== 'manager' && profile?.role !== 'verkoper'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">
                      Eindklantprijs (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={eindklantprijsInput}
                      onChange={(e) => setEindklantprijsInput(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const value = parseFloat(parseFloat(e.target.value).toFixed(2));
                          handlePriceChange('eindklantprijs', value);
                        } else {
                          handlePriceChange('eindklantprijs', null);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      disabled={profile?.role !== 'manager' && profile?.role !== 'verkoper'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">
                      Verkocht voor (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={salePriceInput}
                      onChange={(e) => setSalePriceInput(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value) {
                          const value = parseFloat(parseFloat(e.target.value).toFixed(2));
                          handlePriceChange('sale_price', value);
                        } else {
                          handlePriceChange('sale_price', null);
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      disabled={profile?.role !== 'manager' && profile?.role !== 'verkoper'}
                    />
                  </div>
                </div>
                {dossier.status === 'sold' && (
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">
                        Klantnaam <span className="text-red-500">*</span>
                      </label>
                      <CustomerSelector
                        value={dossier.customer_name}
                        customerId={dossier.customer_id}
                        onChange={handleCustomerChange}
                        disabled={profile?.role !== 'manager' && profile?.role !== 'verkoper'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">
                        Verkoopdatum
                      </label>
                      <input
                        type="date"
                        value={dossier.sold_at ? new Date(dossier.sold_at).toISOString().slice(0, 10) : ''}
                        onChange={(e) => handleSoldAtChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={profile?.role !== 'manager' && profile?.role !== 'verkoper'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">
                        Verkocht via
                      </label>
                      <select
                        value={dossier.sold_via_platform || ''}
                        onChange={(e) => handleSoldViaPlatformChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={profile?.role !== 'manager' && profile?.role !== 'verkoper'}
                      >
                        <option value="">Selecteer platform...</option>
                        <option value="eigen_netwerk">Eigen netwerk</option>
                        <option value="forklift_international">Forklift International</option>
                        <option value="mascus">Mascus</option>
                        <option value="trucksnl">TrucksNL</option>
                        <option value="machineseeker">Machineseeker</option>
                        <option value="truckscout24">TruckScout24</option>
                        <option value="machineryline">MachineryLine</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Opmerkingen</h3>
              {(dossier.description || equipmentRemarks) ? (
                <div className="space-y-3">
                  {dossier.description && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Interne opmerkingen</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{dossier.description}</p>
                    </div>
                  )}
                  {equipmentRemarks && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Externe opmerkingen</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{equipmentRemarks}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-slate-400 italic">Geen opmerkingen</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Video className="w-5 h-5 text-slate-500" />
                <h3 className="text-lg font-semibold text-slate-800">Video's</h3>
              </div>
            </div>
            <div className="p-6">
              {(profile?.role === 'verkoper' || profile?.role === 'manager') && (
                <div className="mb-6">
                  <VideoUpload
                    dossierId={dossierId}
                    onUploadComplete={() => setVideosKey(prev => prev + 1)}
                  />
                </div>
              )}
              <VideoGallery
                key={videosKey}
                dossierId={dossierId}
                canDelete={profile?.role === 'verkoper' || profile?.role === 'manager'}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Image className="w-5 h-5 text-slate-500" />
                <h3 className="text-lg font-semibold text-slate-800">Foto's</h3>
              </div>
            </div>
            <div className="p-6">
              {(profile?.role === 'verkoper' || profile?.role === 'manager') && (
                <div className="mb-6">
                  <PhotoUpload
                    dossierId={dossierId}
                    onUploadComplete={() => setPhotosKey(prev => prev + 1)}
                  />
                </div>
              )}
              <PhotoGallery
                key={photosKey}
                dossierId={dossierId}
                canDelete={profile?.role === 'verkoper' || profile?.role === 'manager' || profile?.role === 'eindgebruiker'}
                dossierNumber={dossier?.dossier_number}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-slate-500" />
                <h3 className="text-lg font-semibold text-slate-800">Documenten</h3>
              </div>
            </div>
            <div className="p-6">
              {(profile?.role === 'verkoper' || profile?.role === 'manager') && (
                <div className="mb-6">
                  <DocumentUpload
                    dossierId={dossierId}
                    onUploadComplete={() => setDocumentsKey(prev => prev + 1)}
                  />
                </div>
              )}
              <DocumentList
                key={documentsKey}
                dossierId={dossierId}
                onDocumentsChange={() => setDocumentsKey(prev => prev + 1)}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-slate-500" />
                <h3 className="text-lg font-semibold text-slate-800">Bijlagen (PDFs)</h3>
              </div>
            </div>
            <div className="p-6">
              <DossierAttachments
                dossierId={dossierId}
                canDelete={profile?.role === 'verkoper' || profile?.role === 'manager'}
              />
            </div>
          </div>

          {(profile?.role === 'manager') && (
            <PublicationSection
              dossierId={dossierId}
              isManager={true}
              onPublicationUpdate={loadPublicationDates}
            />
          )}

          <BidsSection
            dossierId={dossierId}
            bidId={bidId}
            canManageBids={profile?.role === 'verkoper' || profile?.role === 'manager' || profile?.role === 'eindgebruiker'}
          />
        </div>
      </div>

      {showForkliftForm && dossier && (
        <ForkliftDetailsForm
          dossierId={dossierId}
          dossierNumber={dossier.dossier_number}
          dossierBrand={dossier.brand}
          dossierModel={dossier.model}
          dossierYear={dossier.year}
          dossierDescription={dossier.description}
          onClose={() => setShowForkliftForm(false)}
          onSave={() => {
            checkEquipmentDetails();
            loadDossier();
            loadEquipmentRemarks();
          }}
        />
      )}

      {showECHForm && dossier && (
        <EmptyContainerHandlerDetailsForm
          dossierId={dossierId}
          dossierNumber={dossier.dossier_number}
          dossierBrand={dossier.brand}
          dossierModel={dossier.model}
          dossierYear={dossier.year}
          dossierDescription={dossier.description}
          onClose={() => setShowECHForm(false)}
          onSave={() => {
            checkEquipmentDetails();
            loadDossier();
            loadEquipmentRemarks();
          }}
        />
      )}

      {showReachstackerForm && dossier && (
        <ReachstackerDetailsForm
          dossierId={dossierId}
          dossierNumber={dossier.dossier_number}
          dossierBrand={dossier.brand}
          dossierModel={dossier.model}
          dossierYear={dossier.year}
          dossierDescription={dossier.description}
          onClose={() => setShowReachstackerForm(false)}
          onSave={() => {
            checkEquipmentDetails();
            loadDossier();
            loadEquipmentRemarks();
          }}
        />
      )}

      {showTerminalTractorForm && dossier && (
        <TerminalTractorDetailsForm
          dossierId={dossierId}
          dossierNumber={dossier.dossier_number}
          dossierBrand={dossier.brand}
          dossierModel={dossier.model}
          dossierYear={dossier.year}
          dossierDescription={dossier.description}
          onClose={() => setShowTerminalTractorForm(false)}
          onSave={() => {
            checkEquipmentDetails();
            loadDossier();
            loadEquipmentRemarks();
          }}
        />
      )}

      <PDFLanguageModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        onSelectLanguage={handleLanguageSelect}
        title={
          pdfType === 'internal'
            ? 'PDF Intern - Taal selecteren'
            : pdfType === 'external'
            ? 'PDF Extern - Taal selecteren'
            : 'PDF Extern (zonder logo) - Taal selecteren'
        }
      />

      {showSoldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">
              Dossier verkocht
            </h3>
            <p className="text-slate-600 mb-4">
              Vul de klantnaam in om dit dossier als verkocht te markeren:
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Klantnaam <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={soldCustomerName}
                onChange={(e) => setSoldCustomerName(e.target.value)}
                placeholder="Vul klantnaam in"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Verkocht op datum <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={soldDate}
                onChange={(e) => setSoldDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unpublishAds}
                  onChange={(e) => setUnpublishAds(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-800">
                    Advertenties offline halen
                  </span>
                  <p className="text-xs text-slate-600 mt-1">
                    Alle online publicaties (Forklift International, Mascus, etc.) worden automatisch uitgeschakeld
                  </p>
                </div>
              </label>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSoldModal(false);
                  setPendingSoldStatus(null);
                  setSoldCustomerName('');
                  setSoldDate(new Date().toISOString().split('T')[0]);
                  setUnpublishAds(true);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Annuleren
              </button>
              <button
                onClick={handleConfirmSold}
                disabled={!soldCustomerName.trim() || !soldDate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bevestigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
