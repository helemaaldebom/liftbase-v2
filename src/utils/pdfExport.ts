import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { PDFDocument } from 'pdf-lib';

type Language = 'nl' | 'en' | 'de' | 'es' | 'fr';

const translations = {
  nl: {
    internalReport: 'Intern taxatierapport',
    generatedOn: 'Gegenereerd op',
    generalInfo: 'Algemene informatie',
    dossierNumber: 'Dossiernummer',
    title: 'Titel',
    equipmentType: 'Type apparatuur',
    brand: 'Merk',
    model: 'Model',
    buildYear: 'Bouwjaar',
    condition: 'Conditie',
    location: 'Locatie',
    estimatedValue: 'Geschatte waarde',
    status: 'Status',
    createdBy: 'Aangemaakt door',
    createdOn: 'Aangemaakt op',
    internalRemarks: 'Interne opmerkingen',
    externalRemarks: 'Opmerkingen',
    description: 'Omschrijving',
    technicalSpecs: 'Technische specificaties',
    technicalSpecsForklift: 'Technische specificaties (Heftruck)',
    stockId: 'Stock ID',
    serialNumber: 'Serienummer',
    capacity: 'Capaciteit',
    loadCenter: 'Lastcentrum',
    readRunningHours: 'Afgelezen urenstand',
    mast: 'Mast',
    liftHeight: 'Hefhoogte',
    cabinType: 'Cabinetype',
    engineBrand: 'Motor merk',
    engineType: 'Motor type',
    bids: 'Biedingen',
    dealer: 'Dealer',
    amount: 'Bedrag',
    noAmount: 'Geen bedrag',
    date: 'Datum',
    photos: "Foto's",
    excellent: 'Uitstekend',
    good: 'Goed',
    fair: 'Redelijk',
    poor: 'Slecht',
    draft: 'Concept',
    open: 'Open',
    stock: 'Stock',
    biddingActive: 'Bieden actief',
    sold: 'Verkocht',
    archived: 'Gearchiveerd',
    pending: 'In behandeling',
    submitted: 'Ingediend',
    accepted: 'Geaccepteerd',
    rejected: 'Afgewezen',
    high: 'hoog',
  },
  en: {
    internalReport: 'Internal Valuation Report',
    generatedOn: 'Generated on',
    generalInfo: 'General Information',
    dossierNumber: 'Dossier Number',
    title: 'Title',
    equipmentType: 'Equipment Type',
    brand: 'Brand',
    model: 'Model',
    buildYear: 'Build Year',
    condition: 'Condition',
    location: 'Location',
    estimatedValue: 'Estimated Value',
    status: 'Status',
    createdBy: 'Created By',
    createdOn: 'Created On',
    internalRemarks: 'Internal Remarks',
    externalRemarks: 'Remarks',
    description: 'Description',
    technicalSpecs: 'Technical Specifications',
    technicalSpecsForklift: 'Technical Specifications (Forklift)',
    stockId: 'Stock ID',
    serialNumber: 'Serial Number',
    capacity: 'Capacity',
    loadCenter: 'Load Center',
    readRunningHours: 'Read running hours',
    mast: 'Mast',
    liftHeight: 'Lifting height',
    cabinType: 'Cabin Type',
    engineBrand: 'Engine Brand',
    engineType: 'Engine Type',
    bids: 'Bids',
    dealer: 'Dealer',
    amount: 'Amount',
    noAmount: 'No amount',
    date: 'Date',
    photos: 'Photos',
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
    draft: 'Draft',
    open: 'Open',
    stock: 'Stock',
    biddingActive: 'Bidding Active',
    sold: 'Sold',
    archived: 'Archived',
    pending: 'Pending',
    submitted: 'Submitted',
    accepted: 'Accepted',
    rejected: 'Rejected',
    high: 'high',
  },
  de: {
    internalReport: 'Interner Bewertungsbericht',
    generatedOn: 'Erstellt am',
    generalInfo: 'Allgemeine Informationen',
    dossierNumber: 'Dossiernummer',
    title: 'Titel',
    equipmentType: 'Gerätetyp',
    brand: 'Marke',
    model: 'Modell',
    buildYear: 'Baujahr',
    condition: 'Zustand',
    location: 'Standort',
    estimatedValue: 'Geschätzter Wert',
    status: 'Status',
    createdBy: 'Erstellt von',
    createdOn: 'Erstellt am',
    internalRemarks: 'Interne Bemerkungen',
    externalRemarks: 'Bemerkungen',
    description: 'Beschreibung',
    technicalSpecs: 'Technische Spezifikationen',
    technicalSpecsForklift: 'Technische Spezifikationen (Stapler)',
    stockId: 'Stock ID',
    serialNumber: 'Seriennummer',
    capacity: 'Kapazität',
    loadCenter: 'Lastschwerpunkt',
    readRunningHours: 'abgelesene Stundenzahl',
    mast: 'Mast',
    liftHeight: 'Hubhöhe',
    cabinType: 'Kabinentyp',
    engineBrand: 'Motormarke',
    engineType: 'Motortyp',
    bids: 'Gebote',
    dealer: 'Händler',
    amount: 'Betrag',
    noAmount: 'Kein Betrag',
    date: 'Datum',
    photos: 'Fotos',
    excellent: 'Ausgezeichnet',
    good: 'Gut',
    fair: 'Angemessen',
    poor: 'Schlecht',
    draft: 'Entwurf',
    open: 'Offen',
    stock: 'Lager',
    biddingActive: 'Bieten aktiv',
    sold: 'Verkauft',
    archived: 'Archiviert',
    pending: 'Ausstehend',
    submitted: 'Eingereicht',
    accepted: 'Akzeptiert',
    rejected: 'Abgelehnt',
    high: 'hoch',
  },
  es: {
    internalReport: 'Informe de Valoración Interna',
    generatedOn: 'Generado el',
    generalInfo: 'Información General',
    dossierNumber: 'Número de Expediente',
    title: 'Título',
    equipmentType: 'Tipo de Equipo',
    brand: 'Marca',
    model: 'Modelo',
    buildYear: 'Año de Fabricación',
    condition: 'Condición',
    location: 'Ubicación',
    estimatedValue: 'Valor Estimado',
    status: 'Estado',
    createdBy: 'Creado por',
    createdOn: 'Creado el',
    internalRemarks: 'Observaciones Internas',
    externalRemarks: 'Observaciones',
    description: 'Descripción',
    technicalSpecs: 'Especificaciones Técnicas',
    technicalSpecsForklift: 'Especificaciones Técnicas (Carretilla Elevadora)',
    stockId: 'ID de Stock',
    serialNumber: 'Número de Serie',
    capacity: 'Capacidad',
    loadCenter: 'Centro de Carga',
    readRunningHours: 'Horas de funcionamiento leídas',
    mast: 'Mástil',
    liftHeight: 'Altura de Elevación',
    cabinType: 'Tipo de Cabina',
    engineBrand: 'Marca del Motor',
    engineType: 'Tipo de Motor',
    bids: 'Ofertas',
    dealer: 'Distribuidor',
    amount: 'Importe',
    noAmount: 'Sin importe',
    date: 'Fecha',
    high: 'alto',
    photos: 'Fotos',
    excellent: 'Excelente',
    good: 'Bueno',
    fair: 'Regular',
    poor: 'Malo',
    draft: 'Borrador',
    open: 'Abierto',
    stock: 'Stock',
    biddingActive: 'Licitación Activa',
    sold: 'Vendido',
    archived: 'Archivado',
    pending: 'Pendiente',
    submitted: 'Presentado',
    accepted: 'Aceptado',
    rejected: 'Rechazado',
  },
  fr: {
    internalReport: 'Rapport d\'Évaluation Interne',
    generatedOn: 'Généré le',
    generalInfo: 'Informations Générales',
    dossierNumber: 'Numéro de Dossier',
    title: 'Titre',
    equipmentType: 'Type d\'Équipement',
    brand: 'Marque',
    model: 'Modèle',
    buildYear: 'Année de Construction',
    condition: 'Condition',
    location: 'Localisation',
    estimatedValue: 'Valeur Estimée',
    status: 'Statut',
    createdBy: 'Créé par',
    createdOn: 'Créé le',
    internalRemarks: 'Remarques Internes',
    externalRemarks: 'Remarques',
    description: 'Description',
    technicalSpecs: 'Spécifications Techniques',
    technicalSpecsForklift: 'Spécifications Techniques (Chariot Élévateur)',
    stockId: 'ID de Stock',
    serialNumber: 'Numéro de Série',
    capacity: 'Capacité',
    loadCenter: 'Centre de Charge',
    readRunningHours: 'Heures de fonctionnement lues',
    mast: 'Mât',
    liftHeight: 'Hauteur de Levage',
    cabinType: 'Type de Cabine',
    engineBrand: 'Marque du Moteur',
    engineType: 'Type de Moteur',
    bids: 'Offres',
    dealer: 'Distributeur',
    amount: 'Montant',
    noAmount: 'Pas de montant',
    date: 'Date',
    photos: 'Photos',
    excellent: 'Excellent',
    good: 'Bon',
    fair: 'Correct',
    poor: 'Mauvais',
    draft: 'Brouillon',
    open: 'Ouvert',
    stock: 'Stock',
    biddingActive: 'Enchères Actives',
    sold: 'Vendu',
    archived: 'Archivé',
    pending: 'En Attente',
    submitted: 'Soumis',
    accepted: 'Accepté',
    rejected: 'Rejeté',
    high: 'haut',
  },
};

const fieldTranslations: Record<string, Record<Language, string>> = {
  power: { nl: 'Aandrijving', en: 'Power', de: 'Antrieb', es: 'Potencia', fr: 'Puissance' },
  mastType: { nl: 'Masttype', en: 'Mast Type', de: 'Masttyp', es: 'Tipo de Mástil', fr: 'Type de Mât' },
  freeLift: { nl: 'Vrijheffing', en: 'Free Lift', de: 'Freihub', es: 'Elevación Libre', fr: 'Levage Libre' },
  totalLength: { nl: 'Totale lengte', en: 'Total Length', de: 'Gesamtlänge', es: 'Longitud Total', fr: 'Longueur Totale' },
  totalWidth: { nl: 'Totale breedte', en: 'Total Width', de: 'Gesamtbreite', es: 'Ancho Total', fr: 'Largeur Totale' },
  driveThroughHeight: { nl: 'Doorrijhoogte', en: 'Drive-through Height', de: 'Durchfahrtshöhe', es: 'Altura de Paso', fr: 'Hauteur de Passage' },
  serviceWeight: { nl: 'Eigen gewicht', en: 'Service Weight', de: 'Eigengewicht', es: 'Peso en Servicio', fr: 'Poids en Service' },
  heater: { nl: 'Verwarming', en: 'Heater', de: 'Heizung', es: 'Calefacción', fr: 'Chauffage' },
  airco: { nl: 'Airconditioning', en: 'Air Conditioning', de: 'Klimaanlage', es: 'Aire Acondicionado', fr: 'Climatisation' },
  seatBrand: { nl: 'Stoelmerk', en: 'Seat Brand', de: 'Sitzmarke', es: 'Marca del Asiento', fr: 'Marque du Siège' },
  seatSuspension: { nl: 'Stoelvering', en: 'Seat Suspension', de: 'Sitzfederung', es: 'Suspensión del Asiento', fr: 'Suspension du Siège' },
  frontAxleBrand: { nl: 'Vooras merk', en: 'Front Axle Brand', de: 'Vorderachsmarke', es: 'Marca del Eje Delantero', fr: 'Marque de l\'Essieu Avant' },
  frontAxleType: { nl: 'Vooras type', en: 'Front Axle Type', de: 'Vorderachstyp', es: 'Tipo de Eje Delantero', fr: 'Type d\'Essieu Avant' },
  transBrand: { nl: 'Transmissie merk', en: 'Transmission Brand', de: 'Getriebemarke', es: 'Marca de Transmisión', fr: 'Marque de Transmission' },
  transType: { nl: 'Transmissie type', en: 'Transmission Type', de: 'Getriebetyp', es: 'Tipo de Transmisión', fr: 'Type de Transmission' },
  forkLength: { nl: 'Vorkenlengte', en: 'Fork Length', de: 'Gabellänge', es: 'Longitud de Horquillas', fr: 'Longueur des Fourches' },
  forkWidth: { nl: 'Vorkenbreedte', en: 'Fork Width', de: 'Gabelbreite', es: 'Ancho de Horquillas', fr: 'Largeur des Fourches' },
  forkThickness: { nl: 'Vorkendikte', en: 'Fork Thickness', de: 'Gabeldicke', es: 'Espesor de Horquillas', fr: 'Épaisseur des Fourches' },
  hydraulicLines: { nl: 'Hydraulische leidingen', en: 'Hydraulic Lines', de: 'Hydraulikleitungen', es: 'Líneas Hidráulicas', fr: 'Lignes Hydrauliques' },
  frontTires: { nl: 'Voorbanden', en: 'Front Tires', de: 'Vorderreifen', es: 'Neumáticos Delanteros', fr: 'Pneus Avant' },
  rearTires: { nl: 'Achterbanden', en: 'Rear Tires', de: 'Hinterreifen', es: 'Neumáticos Traseros', fr: 'Pneus Arrière' },
  tireType: { nl: 'Bandentype', en: 'Tire Type', de: 'Reifentyp', es: 'Tipo de Neumático', fr: 'Type de Pneu' },
  fifthWheelHeight: { nl: 'Schotelhoogte', en: 'Fifth Wheel Height', de: 'Sattelkupplung Höhe', es: 'Altura de la Quinta Rueda', fr: 'Hauteur de la Sellette' },
  wheelbase: { nl: 'Wielbasis', en: 'Wheelbase', de: 'Radstand', es: 'Distancia entre Ejes', fr: 'Empattement' },
  attachment: { nl: 'Aanbouwdeel', en: 'Attachment', de: 'Anbaugerät', es: 'Accesorio', fr: 'Accessoire' },
  attachmentDetails: { nl: 'Aanbouwdeel details', en: 'Attachment Details', de: 'Anbaugerät Details', es: 'Detalles del Accesorio', fr: 'Détails de l\'Accessoire' },
  doubleBox: { nl: 'Double box type', en: 'Double box type', de: 'Double box type', es: 'Tipo de doble caja', fr: 'Type double boîte' },
  yes: { nl: 'Ja', en: 'Yes', de: 'Ja', es: 'Sí', fr: 'Oui' },
  no: { nl: 'Nee', en: 'No', de: 'Nein', es: 'No', fr: 'Non' },
  hours: { nl: 'uur', en: 'hrs', de: 'Std.', es: 'hrs', fr: 'h' },
};

const getLocale = (language: Language): string => {
  switch (language) {
    case 'de': return 'de-DE';
    case 'en': return 'en-GB';
    case 'es': return 'es-ES';
    case 'fr': return 'fr-FR';
    default: return 'nl-NL';
  }
};

const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

interface DossierData {
  id: string;
  dossier_number: string;
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
  user_profiles?: {
    full_name: string;
  };
}

interface ForkliftDetails {
  order_no?: string;
  date?: string;
  brand?: string;
  type?: string;
  power?: string;
  capacity_kg?: number;
  load_center_mm?: number;
  year_of_manufacture?: number;
  hours_on_clock?: number;
  mast?: string;
  mast_type?: string;
  free_lift?: string;
  lift_height_mm?: number;
  serial_no?: string;
  attachment?: string;
  attachment_other?: string;
  remark?: string;
  length_total_mm?: number;
  width_total_mm?: number;
  drive_through_height_mm?: number;
  serviceweight_kg?: number;
  cabin_type?: string;
  heater?: boolean;
  airco?: boolean;
  streetlights_front?: string;
  streetlights_rear?: string;
  work_light_front?: string;
  work_light_rear?: string;
  beacon?: string;
  radio?: string;
  extra_lights?: string;
  extra_lights_2?: string;
  wheelbase?: string;
  mirrors?: string;
  mirrors_heated?: boolean;
  seat_brand?: string;
  seat_type_suspension?: string;
  headrest?: string;
  seat_options?: string;
  engine_brand?: string;
  engine_type?: string;
  engine_remark?: string;
  front_axle_brand?: string;
  front_axle_type?: string;
  front_axle_remark?: string;
  trans_brand?: string;
  trans_type?: string;
  trans_remark?: string;
  shift_type?: string;
  adblue?: boolean;
  particle_filter?: string;
  forks_length_mm?: number;
  forks_width_mm?: number;
  forks_thickness_mm?: number;
  forks_spread_min_mm?: number;
  forks_spread_max_mm?: number;
  no_forks?: boolean;
  hydraulic_lines?: number;
  tires_front?: string;
  tires_front_brand?: string;
  tires_rear?: string;
  tires_rear_brand?: string;
}

interface Photo {
  id: string;
  storage_path: string;
  filename: string;
}

interface Bid {
  id: string;
  bedrag: number | null;
  amount: number | null;
  valuta: string;
  status: string;
  notitie: string | null;
  notes: string | null;
  created_at: string;
  dealers?: {
    name: string;
  };
}

const getStatusLabel = (status: string, lang: Language) => {
  const t = translations[lang];
  const labels: Record<string, string> = {
    draft: t.draft,
    open: t.open,
    stock: t.stock,
    bidding: t.biddingActive,
    sold: t.sold,
    archived: t.archived,
  };
  return labels[status] || status;
};

const getConditionLabel = (condition: string, lang: Language) => {
  const t = translations[lang];
  const labels: Record<string, string> = {
    excellent: t.excellent,
    good: t.good,
    fair: t.fair,
    poor: t.poor,
  };
  return labels[condition] || condition;
};

const getEquipmentTypeLabel = (type: string, lang: Language) => {
  const equipmentLabels: Record<string, Record<Language, string>> = {
    container: { nl: 'Container', en: 'Container', de: 'Container', es: 'Contenedor', fr: 'Conteneur' },
    trailer: { nl: 'Trailer', en: 'Trailer', de: 'Anhänger', es: 'Remolque', fr: 'Remorque' },
    chassis: { nl: 'Chassis', en: 'Chassis', de: 'Fahrgestell', es: 'Chasis', fr: 'Châssis' },
    heavy_duty_forklift: { nl: 'Heftrucks zwaar', en: 'Heavy Duty Forklift', de: 'Schwerlaststapler', es: 'Carretilla elevadora pesada', fr: 'Chariot élévateur lourd' },
    empty_container_handler: { nl: 'Leeg container handler', en: 'Empty Container Handler', de: 'Leercontainerstapler', es: 'Manejador de contenedores vacíos', fr: 'Manutentionnaire de conteneurs vides' },
    reachstacker: { nl: 'Reachstacker', en: 'Reachstacker', de: 'Reachstacker', es: 'Reachstacker', fr: 'Reachstacker' },
    terminal_tractor: { nl: 'Terminal tractor', en: 'Terminal Tractor', de: 'Terminalzugmaschine', es: 'Tractor terminal', fr: 'Tracteur de terminal' },
    general_equipment: { nl: 'Algemene uitrusting', en: 'General Equipment', de: 'Allgemeine Ausrüstung', es: 'Equipo general', fr: 'Équipement général' },
    other: { nl: 'Overig', en: 'Other', de: 'Sonstige', es: 'Otro', fr: 'Autre' },
  };
  return equipmentLabels[type]?.[lang] || type;
};

async function compressImage(dataUrl: string, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        if (width > height) {
          width = maxWidth;
          height = maxWidth / aspectRatio;
        } else {
          height = maxHeight;
          width = maxHeight * aspectRatio;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function estimatePdfSize(doc: jsPDF): number {
  const output = doc.output('arraybuffer');
  return output.byteLength;
}

const MAX_PDF_SIZE_MB = 12;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

async function addLogoToPage(doc: jsPDF, logoDataUrl: string) {
  try {
    const img = new Image();
    img.src = logoDataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const logoMaxWidth = 40;
    const logoMaxHeight = 20;
    const aspectRatio = img.width / img.height;

    let logoWidth = logoMaxWidth;
    let logoHeight = logoMaxWidth / aspectRatio;

    if (logoHeight > logoMaxHeight) {
      logoHeight = logoMaxHeight;
      logoWidth = logoMaxHeight * aspectRatio;
    }

    doc.addImage(logoDataUrl, 'JPEG', 150, 10, logoWidth, logoHeight);
  } catch (error) {
    console.error('Error adding logo to page:', error);
  }
}

function addFooter(doc: jsPDF, logoDataUrl?: string) {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    if (logoDataUrl && i > 1) {
      try {
        const img = new Image();
        img.src = logoDataUrl;

        const logoMaxWidth = 30;
        const logoMaxHeight = 15;
        const aspectRatio = img.width / img.height;

        let logoWidth = logoMaxWidth;
        let logoHeight = logoMaxWidth / aspectRatio;

        if (logoHeight > logoMaxHeight) {
          logoHeight = logoMaxHeight;
          logoWidth = logoMaxHeight * aspectRatio;
        }

        doc.addImage(logoDataUrl, 'JPEG', 160, 5, logoWidth, logoHeight);
      } catch (error) {
        console.error('Error adding logo to page:', error);
      }
    }

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);

    const footerY = 285;
    const lineHeight = 3;

    doc.setDrawColor(226, 232, 240);
    doc.line(20, footerY - 3, 190, footerY - 3);

    doc.setFont('helvetica', 'bold');
    doc.text('Heavy Cargo Lifters', 20, footerY);

    doc.setFont('helvetica', 'normal');
    doc.text('info@heavycargolifters.com', 20, footerY + lineHeight);
    doc.text('www.heavycargolifters.com', 20, footerY + lineHeight * 2);

    doc.text('VAT Number: NL003846032B41', 85, footerY);
    doc.text('Chamber of commerce: 89251113', 85, footerY + lineHeight);

    doc.text('Bank Swift/BIC: ABN Amro', 145, footerY);
    doc.text('NL93ABNA0119446626', 145, footerY + lineHeight);
  }
}

export async function generateDossierPDF(dossierId: string, language: Language = 'nl') {
  try {
    console.log('=== START PDF GENERATION ===');
    console.log('Dossier ID:', dossierId);
    console.log('Language:', language);

    const t = translations[language];
    const { data: dossier, error: dossierError } = await supabase
      .from('dossiers')
      .select(`
        *,
        user_profiles:created_by (
          full_name
        )
      `)
      .eq('id', dossierId)
      .maybeSingle();

    if (dossierError) {
      console.error('Error fetching dossier:', dossierError);
      throw dossierError;
    }
    if (!dossier) {
      console.error('Dossier not found');
      throw new Error('Dossier niet gevonden');
    }

    console.log('Dossier loaded:', dossier.dossier_number);

    const { data: forkliftDetails } = await supabase
      .from('forklift_details')
      .select('*')
      .eq('dossier_id', dossierId)
      .maybeSingle();

    const { data: echDetails } = await supabase
      .from('empty_container_handler_details')
      .select('*')
      .eq('dossier_id', dossierId)
      .maybeSingle();

    const { data: reachstackerDetails } = await supabase
      .from('reachstacker_details')
      .select('*')
      .eq('dossier_id', dossierId)
      .maybeSingle();

    const { data: terminalTractorDetails } = await supabase
      .from('terminal_tractor_details')
      .select('*')
      .eq('dossier_id', dossierId)
      .maybeSingle();

    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .eq('dossier_id', dossierId)
      .eq('visible_online', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    console.log(`Photos loaded: ${photos?.length || 0} photos`);

    const { data: bids } = await supabase
      .from('bids')
      .select(`
        *,
        dealers (
          name
        )
      `)
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false });

    console.log(`Bids loaded: ${bids?.length || 0} bids`);
    console.log('Creating PDF document...');

    const doc = new jsPDF();
    let yPosition = 20;
    let compressedLogo: string | null = null;

    try {
      console.log('Loading logo...');
      const logoResponse = await fetch('/hclifters.jpg');
      if (!logoResponse.ok) {
        throw new Error(`Failed to load logo: ${logoResponse.statusText}`);
      }
      console.log('Logo loaded, converting to blob...');
      const logoBlob = await logoResponse.blob();
      const logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(logoBlob);
      });

      console.log('Compressing logo...');
      compressedLogo = await compressImage(logoDataUrl, 600, 600, 0.70);

      const img = new Image();
      img.src = compressedLogo;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const logoMaxWidth = 50;
      const logoMaxHeight = 25;
      const aspectRatio = img.width / img.height;

      let logoWidth = logoMaxWidth;
      let logoHeight = logoMaxWidth / aspectRatio;

      if (logoHeight > logoMaxHeight) {
        logoHeight = logoMaxHeight;
        logoWidth = logoMaxHeight * aspectRatio;
      }

      console.log('Adding logo to PDF...');
      doc.addImage(compressedLogo, 'JPEG', 145, 10, logoWidth, logoHeight);
      console.log('Logo added successfully');
    } catch (error) {
      console.error('Error loading logo:', error);
    }

    doc.setFontSize(24);
    doc.setTextColor(15, 23, 42);
    doc.text(t.internalReport, 20, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const locale = getLocale(language);
    doc.text(`${t.generatedOn}: ${new Date().toLocaleDateString(locale)}`, 20, yPosition);
    yPosition += 15;

    const frontPhoto = photos?.find(p =>
      p.category?.toLowerCase().includes('voorkant') ||
      p.category?.toLowerCase().includes('front')
    ) || photos?.[0];

    if (frontPhoto) {
      try {
        console.log('Loading front photo:', frontPhoto.storage_path);
        const { data } = supabase.storage
          .from('dossier-photos')
          .getPublicUrl(frontPhoto.storage_path);

        console.log('Front photo URL:', data.publicUrl);
        const response = await fetch(data.publicUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch photo: ${response.statusText}`);
        }
        console.log('Front photo fetched, converting to blob...');
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        console.log('Compressing front photo...');
        const compressedPhoto = await compressImage(dataUrl, 1200, 1200, 0.65);

        const imageWidth = 170;
        const imageHeight = 120;
        const imageX = 20;

        console.log('Adding front photo to PDF...');
        doc.addImage(compressedPhoto, 'JPEG', imageX, yPosition, imageWidth, imageHeight);
        yPosition += imageHeight + 10;
        console.log('Front photo added successfully');
      } catch (error) {
        console.error('Error loading front photo:', error);
      }
    }

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(t.generalInfo, 20, yPosition);
    yPosition += 10;

    const generalData = [
      [t.dossierNumber, dossier.dossier_number],
      [t.title, dossier.title],
      [t.equipmentType, getEquipmentTypeLabel(dossier.equipment_type, language)],
      [t.brand, dossier.brand || '-'],
      [t.model, dossier.model || '-'],
      [t.buildYear, dossier.year?.toString() || '-'],
      [t.condition, getConditionLabel(dossier.condition, language)],
      [t.location, dossier.location || '-'],
      [t.estimatedValue, dossier.estimated_value ? `€ ${formatNumber(dossier.estimated_value)}` : '-'],
      [t.status, getStatusLabel(dossier.status, language)],
      [t.createdBy, dossier.user_profiles?.full_name || '-'],
      [t.createdOn, new Date(dossier.created_at).toLocaleDateString(locale)],
      ...(forkliftDetails?.remark ? [[t.internalRemarks, forkliftDetails.remark]] : []),
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: generalData,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 50 },
        1: { textColor: [15, 23, 42] },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    if (dossier.description) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(t.description, 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const splitDescription = doc.splitTextToSize(dossier.description, 170);
      doc.text(splitDescription, 20, yPosition);
      yPosition += splitDescription.length * 5 + 10;
    }

    const internalDetailsToUse = forkliftDetails || echDetails || reachstackerDetails || terminalTractorDetails;

    if (internalDetailsToUse) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(t.technicalSpecsForklift, 20, yPosition);
      yPosition += 10;

      const technicalData: string[][] = [];
      const hoursUnit = fieldTranslations.hours[language];
      const d = internalDetailsToUse;

      if (d.order_no) technicalData.push([t.stockId, d.order_no]);
      if (d.serial_no) technicalData.push([t.serialNumber, d.serial_no]);
      if (d.power) technicalData.push([fieldTranslations.power[language], d.power]);
      if (d.capacity_kg) technicalData.push([t.capacity, `${formatNumber(d.capacity_kg)} kg`]);
      if (d.load_center_mm) technicalData.push([t.loadCenter, `${formatNumber(d.load_center_mm)} mm`]);
      if (d.hours_on_clock) technicalData.push([t.readRunningHours, `${formatNumber(d.hours_on_clock)} ${hoursUnit}`]);
      if (d.mast) technicalData.push([t.mast, d.mast]);
      if (d.mast_type) technicalData.push([fieldTranslations.mastType[language], d.mast_type]);
      if (d.lift_height_mm) {
        const isECH = dossier.equipment_type === 'empty_container_handler';
        const liftHeightValue = isECH
          ? `${d.lift_height_mm} ${t.high}`
          : `${formatNumber(d.lift_height_mm)} mm`;
        technicalData.push([t.liftHeight, liftHeightValue]);
      }
      if (d.cabin_type) technicalData.push([t.cabinType, d.cabin_type]);
      if (d.engine_brand) technicalData.push([t.engineBrand, d.engine_brand]);
      if (d.engine_type) technicalData.push([t.engineType, d.engine_type]);
      if (d.trans_brand) technicalData.push([fieldTranslations.transBrand[language], d.trans_brand]);
      if (d.trans_type) technicalData.push([fieldTranslations.transType[language], d.trans_type]);
      if (d.hydraulic_lines) technicalData.push([fieldTranslations.hydraulicLines[language], d.hydraulic_lines.toString()]);
      if (d.attachment && d.attachment !== 'No attachment') technicalData.push([fieldTranslations.attachment[language], d.attachment]);
      if (d.adblue !== null && d.adblue !== undefined && d.power?.toLowerCase() !== 'elektrisch' && d.power?.toLowerCase() !== 'electric') technicalData.push(['AdBlue', d.adblue ? 'Ja' : 'Nee']);
      if (d.double_box_type) technicalData.push([fieldTranslations.doubleBox[language], d.double_box_type]);

      console.log('Technical data rows:', technicalData.length);
      console.log('Technical data:', technicalData);

      if (technicalData.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [],
          body: technicalData,
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: 2,
          },
          columnStyles: {
            0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 50 },
            1: { textColor: [15, 23, 42] },
          },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }
    }

    if (bids && bids.length > 0) {
      if (yPosition > 230) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(t.bids, 20, yPosition);
      yPosition += 10;

      const bidsData = bids.map((bid: Bid) => {
        const amount = bid.amount || bid.bedrag;
        const statusLabel = bid.status === 'pending' ? t.pending :
                           bid.status === 'submitted' ? t.submitted :
                           bid.status === 'accepted' ? t.accepted : t.rejected;
        return [
          bid.dealers?.name || '-',
          amount ? `€ ${formatNumber(amount)}` : t.noAmount,
          statusLabel,
          new Date(bid.created_at).toLocaleDateString(locale),
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [[t.dealer, t.amount, t.status, t.date]],
        body: bidsData,
        theme: 'striped',
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    if (photos && photos.length > 0) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(t.photos, 20, yPosition);
      yPosition += 10;

      const imagePromises = photos.map(async (photo: Photo) => {
        try {
          const { data } = supabase.storage
            .from('dossier-photos')
            .getPublicUrl(photo.storage_path);

          const response = await fetch(data.publicUrl);
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const compressed = await compressImage(dataUrl, 1024, 1024, 0.60);
          return compressed;
        } catch (error) {
          console.error('Error loading photo:', error);
          return null;
        }
      });

      const imageDataUrls = await Promise.all(imagePromises);
      const validImages = imageDataUrls.filter(url => url !== null) as string[];

      console.log(`Processing ${validImages.length} valid images...`);

      let xPos = 20;
      let yPos = Math.max(yPosition, 25);
      const imageWidth = 80;
      const imageHeight = 60;
      const spacing = 10;
      const footerStartY = 282;
      const maxYForImages = footerStartY - imageHeight - 10;
      let imagesInRow = 0;
      let addedImages = 0;

      for (let i = 0; i < validImages.length; i++) {
        const imageData = validImages[i];

        if (imagesInRow === 2) {
          xPos = 20;
          yPos += imageHeight + spacing;
          imagesInRow = 0;
        }

        if (yPos > maxYForImages) {
          doc.addPage();
          yPos = 25;
          xPos = 20;
          imagesInRow = 0;
        }

        try {
          doc.addImage(imageData, 'JPEG', xPos, yPos, imageWidth, imageHeight);
          addedImages++;

          const currentSize = estimatePdfSize(doc);
          const sizeMB = (currentSize / (1024 * 1024)).toFixed(2);

          if (currentSize > MAX_PDF_SIZE_BYTES * 0.90) {
            console.warn(`PDF size approaching limit (${sizeMB} MB / ${MAX_PDF_SIZE_MB} MB). Stopping photo additions.`);
            const skippedImages = validImages.length - addedImages;
            if (skippedImages > 0) {
              console.warn(`Skipped ${skippedImages} photos to keep PDF under size limit`);
            }
            break;
          }
        } catch (error) {
          console.error('Error adding image to PDF:', error);
        }

        xPos += imageWidth + spacing;
        imagesInRow++;
      }

      console.log(`Added ${addedImages} of ${validImages.length} photos to PDF`);
    }

    console.log('Adding footer...');
    addFooter(doc, compressedLogo || undefined);

    const brand = dossier.brand || 'Unknown';
    const model = dossier.model || 'Unknown';
    const filename = `Intern-Taxatierapport-${dossier.dossier_number}_${brand}_${model}.pdf`.replace(/\s+/g, '_');

    const finalSize = estimatePdfSize(doc);
    const finalSizeMB = (finalSize / (1024 * 1024)).toFixed(2);
    console.log(`Final PDF size: ${finalSizeMB} MB`);

    if (finalSize > MAX_PDF_SIZE_BYTES) {
      console.error(`WARNING: PDF exceeds ${MAX_PDF_SIZE_MB} MB limit (${finalSizeMB} MB)`);
      alert(`Let op: PDF is groter dan ${MAX_PDF_SIZE_MB} MB (${finalSizeMB} MB). Dit kan problemen geven bij het verzenden per email.`);
    }

    console.log('Saving PDF:', filename);
    doc.save(filename);
    console.log('=== PDF GENERATION COMPLETE ===');
  } catch (error) {
    console.error('=== PDF GENERATION FAILED ===');
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export async function generateExternalDossierPDF(dossierId: string, language: Language = 'nl') {
  try {
    const t = translations[language];
    const locale = getLocale(language);
    const { data: dossier, error: dossierError } = await supabase
      .from('dossiers')
      .select(`
        *,
        user_profiles:created_by (
          full_name
        )
      `)
      .eq('id', dossierId)
      .maybeSingle();

    if (dossierError) throw dossierError;
    if (!dossier) throw new Error('Dossier niet gevonden');

    const { data: forkliftDetails } = await supabase
      .from('forklift_details')
      .select('*')
      .eq('dossier_id', dossierId)
      .maybeSingle();

    const { data: echDetails } = await supabase
      .from('empty_container_handler_details')
      .select('*')
      .eq('dossier_id', dossierId)
      .maybeSingle();

    const { data: reachstackerDetails } = await supabase
      .from('reachstacker_details')
      .select('*')
      .eq('dossier_id', dossierId)
      .maybeSingle();

    const { data: terminalTractorDetails } = await supabase
      .from('terminal_tractor_details')
      .select('*')
      .eq('dossier_id', dossierId)
      .maybeSingle();

    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .eq('dossier_id', dossierId)
      .eq('visible_online', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    const doc = new jsPDF();
    let yPosition = 20;
    let compressedLogo: string | null = null;

    try {
      const logoResponse = await fetch('/hclifters.jpg');
      const logoBlob = await logoResponse.blob();
      const logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(logoBlob);
      });

      compressedLogo = await compressImage(logoDataUrl, 600, 600, 0.70);

      const img = new Image();
      img.src = compressedLogo;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const logoMaxWidth = 50;
      const logoMaxHeight = 25;
      const aspectRatio = img.width / img.height;

      let logoWidth = logoMaxWidth;
      let logoHeight = logoMaxWidth / aspectRatio;

      if (logoHeight > logoMaxHeight) {
        logoHeight = logoMaxHeight;
        logoWidth = logoMaxHeight * aspectRatio;
      }

      doc.addImage(compressedLogo, 'JPEG', 145, 10, logoWidth, logoHeight);
    } catch (error) {
      console.error('Error loading logo:', error);
    }

    doc.setFontSize(28);
    doc.setTextColor(15, 23, 42);
    const brandModel = `${dossier.brand || ''} ${dossier.model || ''}`.trim();
    doc.text(brandModel, 20, yPosition);
    yPosition += 15;

    const frontPhoto = photos?.find(p =>
      p.category?.toLowerCase().includes('voorkant') ||
      p.category?.toLowerCase().includes('front')
    ) || photos?.[0];

    if (frontPhoto) {
      try {
        const { data } = supabase.storage
          .from('dossier-photos')
          .getPublicUrl(frontPhoto.storage_path);

        const response = await fetch(data.publicUrl);
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const compressedPhoto = await compressImage(dataUrl, 1200, 1200, 0.65);

        const imageWidth = 170;
        const imageHeight = 120;
        const imageX = 20;

        doc.addImage(compressedPhoto, 'JPEG', imageX, yPosition, imageWidth, imageHeight);
        yPosition += imageHeight + 10;
      } catch (error) {
        console.error('Error loading front photo:', error);
      }
    }

    const detailsToUse = forkliftDetails || echDetails || reachstackerDetails || terminalTractorDetails;

    if (detailsToUse) {
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(t.technicalSpecs, 20, yPosition);
      yPosition += 10;

      const technicalData: string[][] = [];
      const hoursUnit = fieldTranslations.hours[language];
      const yesNo = (value: boolean | undefined) => {
        if (value === undefined || value === null) return '';
        return value ? fieldTranslations.yes[language] : fieldTranslations.no[language];
      };

      // Basic specifications (common for all types)
      if (detailsToUse.order_no) technicalData.push([t.stockId, detailsToUse.order_no]);
      // Serial number is NOT shown in external PDFs (customer-facing documents)
      if (detailsToUse.brand) technicalData.push([t.brand, detailsToUse.brand]);
      if (detailsToUse.type) technicalData.push([t.model, detailsToUse.type]);
      if (detailsToUse.year_of_manufacture) technicalData.push([t.buildYear, detailsToUse.year_of_manufacture.toString()]);
      if (detailsToUse.power) technicalData.push([fieldTranslations.power[language], detailsToUse.power]);

      // Capacity & dimensions
      if (detailsToUse.capacity_kg) technicalData.push([t.capacity, `${formatNumber(detailsToUse.capacity_kg)} kg`]);
      if (detailsToUse.load_center_mm) technicalData.push([t.loadCenter, `${formatNumber(detailsToUse.load_center_mm)} mm`]);
      if (detailsToUse.hours_on_clock) technicalData.push([t.readRunningHours, `${formatNumber(detailsToUse.hours_on_clock)} ${hoursUnit}`]);

      // Mast information
      if (detailsToUse.mast) technicalData.push([t.mast, detailsToUse.mast]);
      if (detailsToUse.mast_type) technicalData.push([fieldTranslations.mastType[language], detailsToUse.mast_type]);
      if (detailsToUse.free_lift) technicalData.push([fieldTranslations.freeLift[language], detailsToUse.free_lift]);
      if (detailsToUse.lift_height_mm) {
        // For Empty Container Handlers, show "X high/hoog/hoch/alto/haut" instead of "X mm"
        const isECH = dossier.equipment_type === 'empty_container_handler';
        const liftHeightValue = isECH
          ? `${detailsToUse.lift_height_mm} ${t.high}`
          : `${formatNumber(detailsToUse.lift_height_mm)} mm`;
        technicalData.push([t.liftHeight, liftHeightValue]);
      }

      // Physical dimensions
      if (detailsToUse.length_total_mm) technicalData.push([fieldTranslations.totalLength[language], `${formatNumber(detailsToUse.length_total_mm)} mm`]);
      if (detailsToUse.width_total_mm) technicalData.push([fieldTranslations.totalWidth[language], `${formatNumber(detailsToUse.width_total_mm)} mm`]);
      if (detailsToUse.drive_through_height_mm) technicalData.push([fieldTranslations.driveThroughHeight[language], `${formatNumber(detailsToUse.drive_through_height_mm)} mm`]);
      if (detailsToUse.serviceweight_kg) technicalData.push([fieldTranslations.serviceWeight[language], `${formatNumber(detailsToUse.serviceweight_kg)} kg`]);

      // Cabin & comfort
      if (detailsToUse.cabin_type) technicalData.push([t.cabinType, detailsToUse.cabin_type]);
      if (detailsToUse.heater !== undefined && detailsToUse.heater !== null) technicalData.push([fieldTranslations.heater[language], yesNo(detailsToUse.heater)]);
      if (detailsToUse.airco !== undefined && detailsToUse.airco !== null) technicalData.push([fieldTranslations.airco[language], yesNo(detailsToUse.airco)]);

      // Seat information
      if (detailsToUse.seat_brand) technicalData.push([fieldTranslations.seatBrand[language], detailsToUse.seat_brand]);
      if (detailsToUse.seat_type_suspension) technicalData.push([fieldTranslations.seatSuspension[language], detailsToUse.seat_type_suspension]);

      // Engine
      if (detailsToUse.engine_brand) technicalData.push([t.engineBrand, detailsToUse.engine_brand]);
      if (detailsToUse.engine_type) technicalData.push([t.engineType, detailsToUse.engine_type]);
      if (detailsToUse.adblue !== undefined && detailsToUse.adblue !== null && detailsToUse.power?.toLowerCase() !== 'elektrisch' && detailsToUse.power?.toLowerCase() !== 'electric') technicalData.push(['AdBlue', yesNo(detailsToUse.adblue)]);

      // Axles & transmission
      if (detailsToUse.front_axle_brand) technicalData.push([fieldTranslations.frontAxleBrand[language], detailsToUse.front_axle_brand]);
      if (detailsToUse.front_axle_type) technicalData.push([fieldTranslations.frontAxleType[language], detailsToUse.front_axle_type]);
      if (detailsToUse.trans_brand) technicalData.push([fieldTranslations.transBrand[language], detailsToUse.trans_brand]);
      if (detailsToUse.trans_type) technicalData.push([fieldTranslations.transType[language], detailsToUse.trans_type]);

      // Forks
      if (!detailsToUse.no_forks) {
        if (detailsToUse.fork_length_mm) technicalData.push([fieldTranslations.forkLength[language], `${formatNumber(detailsToUse.fork_length_mm)} mm`]);
        if (detailsToUse.fork_width_mm) technicalData.push([fieldTranslations.forkWidth[language], `${formatNumber(detailsToUse.fork_width_mm)} mm`]);
        if (detailsToUse.fork_height_mm) technicalData.push([fieldTranslations.forkThickness[language], `${formatNumber(detailsToUse.fork_height_mm)} mm`]);
      }

      // Hydraulics
      if (detailsToUse.hydraulic_lines) technicalData.push([fieldTranslations.hydraulicLines[language], detailsToUse.hydraulic_lines.toString()]);

      // Tires
      if (detailsToUse.tire_size_front) technicalData.push([fieldTranslations.frontTires[language], detailsToUse.tire_size_front]);
      if (detailsToUse.tire_size_back) technicalData.push([fieldTranslations.rearTires[language], detailsToUse.tire_size_back]);
      if (detailsToUse.tire_type) technicalData.push([fieldTranslations.tireType[language], detailsToUse.tire_type]);

      // Fifth wheel height (Terminal Tractor specific)
      if (detailsToUse.fifth_wheel_height_mm) technicalData.push([fieldTranslations.fifthWheelHeight[language], `${formatNumber(detailsToUse.fifth_wheel_height_mm)} mm`]);

      // Wheelbase (Terminal Tractor specific)
      if (detailsToUse.wheelbase_mm) technicalData.push([fieldTranslations.wheelbase[language], `${formatNumber(detailsToUse.wheelbase_mm)} mm`]);

      // Attachment
      if (detailsToUse.attachment && detailsToUse.attachment !== 'No attachment') {
        technicalData.push([fieldTranslations.attachment[language], detailsToUse.attachment]);
        if (detailsToUse.attachment_other) technicalData.push([fieldTranslations.attachmentDetails[language], detailsToUse.attachment_other]);
      }

      if (technicalData.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [],
          body: technicalData,
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: 2,
          },
          columnStyles: {
            0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 60 },
            1: { textColor: [15, 23, 42] },
          },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Add external remarks if present
      if (detailsToUse.external_remarks) {
        if (yPosition > 230) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text(t.externalRemarks, 20, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        const splitRemarks = doc.splitTextToSize(detailsToUse.external_remarks, 170);
        doc.text(splitRemarks, 20, yPosition);
        yPosition += splitRemarks.length * 5 + 15;
      }
    }

    if (photos && photos.length > 0) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(t.photos, 20, yPosition);
      yPosition += 10;

      const imagePromises = photos.map(async (photo: Photo) => {
        try {
          const { data } = supabase.storage
            .from('dossier-photos')
            .getPublicUrl(photo.storage_path);

          const response = await fetch(data.publicUrl);
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const compressed = await compressImage(dataUrl, 1024, 1024, 0.60);
          return compressed;
        } catch (error) {
          console.error('Error loading photo:', error);
          return null;
        }
      });

      const imageDataUrls = await Promise.all(imagePromises);
      const validImages = imageDataUrls.filter(url => url !== null) as string[];

      let xPos = 20;
      let yPos = Math.max(yPosition, 25);
      const imageWidth = 80;
      const imageHeight = 60;
      const spacing = 10;
      const footerStartY = 282;
      const maxYForImages = footerStartY - imageHeight - 10;
      let imagesInRow = 0;
      let addedImages = 0;

      for (let i = 0; i < validImages.length; i++) {
        const imageData = validImages[i];

        if (imagesInRow === 2) {
          xPos = 20;
          yPos += imageHeight + spacing;
          imagesInRow = 0;
        }

        if (yPos > maxYForImages) {
          doc.addPage();
          yPos = 25;
          xPos = 20;
          imagesInRow = 0;
        }

        try {
          doc.addImage(imageData, 'JPEG', xPos, yPos, imageWidth, imageHeight);
          addedImages++;

          const currentSize = estimatePdfSize(doc);
          if (currentSize > MAX_PDF_SIZE_BYTES * 0.85) {
            console.warn(`PDF size approaching limit. Stopping at ${addedImages} photos.`);
            break;
          }
        } catch (error) {
          console.error('Error adding image to PDF:', error);
        }

        xPos += imageWidth + spacing;
        imagesInRow++;
      }
    }

    addFooter(doc, compressedLogo || undefined);

    let pdfBytes: Uint8Array | ArrayBuffer = doc.output('arraybuffer');

    // Append terms and conditions PDF based on language
    console.log('=== STARTING TERMS AND CONDITIONS MERGE ===');
    try {
      const termsFilename = language === 'en' ? 'terms_and_conditions_of_sales_uk.pdf' : `verkoopvoorwaarden_${language}.pdf`;
      console.log(`Loading terms and conditions: ${termsFilename}`);
      console.log(`Full URL: ${window.location.origin}/${termsFilename}`);

      const termsResponse = await fetch(`/${termsFilename}`);
      console.log(`Fetch response status: ${termsResponse.status}`);
      console.log(`Fetch response ok: ${termsResponse.ok}`);

      if (!termsResponse.ok) {
        throw new Error(`Failed to fetch terms PDF: ${termsResponse.status} ${termsResponse.statusText}`);
      }

      console.log('Terms file loaded successfully, starting merge...');
      const termsBlob = await termsResponse.blob();
      console.log(`Terms blob size: ${termsBlob.size} bytes`);

      const termsArrayBuffer = await termsBlob.arrayBuffer();
      console.log(`Terms array buffer size: ${termsArrayBuffer.byteLength} bytes`);

      // Use pdf-lib to merge PDFs
      console.log('Loading main PDF document...');
      const mainPdfDoc = await PDFDocument.load(pdfBytes);
      console.log(`Main PDF has ${mainPdfDoc.getPageCount()} pages`);

      console.log('Loading terms PDF document...');
      const termsPdfDoc = await PDFDocument.load(termsArrayBuffer);
      const termsPagesCount = termsPdfDoc.getPageCount();
      console.log(`Terms PDF has ${termsPagesCount} pages`);

      console.log('Copying pages from terms PDF to main PDF...');
      const copiedPages = await mainPdfDoc.copyPages(termsPdfDoc, termsPdfDoc.getPageIndices());
      console.log(`Copied ${copiedPages.length} pages`);

      copiedPages.forEach((page, index) => {
        console.log(`Adding page ${index + 1} to main document...`);
        mainPdfDoc.addPage(page);
      });

      console.log('Saving merged PDF...');
      pdfBytes = await mainPdfDoc.save();
      console.log(`Terms and conditions added successfully!`);
      console.log(`New total pages: ${mainPdfDoc.getPageCount()}`);
      console.log('=== TERMS AND CONDITIONS MERGE COMPLETE ===');
    } catch (error) {
      console.error('=== ERROR APPENDING TERMS AND CONDITIONS ===');
      console.error('Error:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      console.error('=== END OF ERROR ===');

      // Show alert to user that terms could not be added
      alert(`LET OP: De verkoopvoorwaarden konden niet worden toegevoegd aan de PDF.\n\nFoutmelding: ${error instanceof Error ? error.message : 'Onbekende fout'}\n\nControleer de browser console voor meer details.`);
    }

    const finalSize = pdfBytes.byteLength;
    const finalSizeMB = (finalSize / (1024 * 1024)).toFixed(2);
    console.log(`Final external PDF size: ${finalSizeMB} MB`);

    if (finalSize > MAX_PDF_SIZE_BYTES) {
      console.error(`WARNING: PDF exceeds ${MAX_PDF_SIZE_MB} MB limit (${finalSizeMB} MB)`);
      alert(`Let op: PDF is groter dan ${MAX_PDF_SIZE_MB} MB (${finalSizeMB} MB). Dit kan problemen geven bij het verzenden per email.`);
    }

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const brand = dossier.brand || 'Unknown';
    const model = dossier.model || 'Unknown';
    const filename = `${dossier.dossier_number}_${brand}_${model}_ext.pdf`.replace(/\s+/g, '_');

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating external PDF:', error);
    throw error;
  }
}

export async function generateCleanExternalPDF(dossierId: string, language: Language = 'nl') {
  try {
    const t = translations[language];
    const locale = getLocale(language);
    const { data: dossier, error: dossierError } = await supabase
      .from('dossiers')
      .select(`
        *,
        user_profiles:created_by (
          full_name
        )
      `)
      .eq('id', dossierId)
      .maybeSingle();

    if (dossierError) throw dossierError;
    if (!dossier) throw new Error('Dossier niet gevonden');

    const { data: forkliftDetails } = await supabase
      .from('forklift_details')
      .select('*')
      .eq('dossier_id', dossierId)
      .maybeSingle();

    const { data: echDetails } = await supabase
      .from('empty_container_handler_details')
      .select('*')
      .eq('dossier_id', dossierId)
      .maybeSingle();

    const { data: reachstackerDetails } = await supabase
      .from('reachstacker_details')
      .select('*')
      .eq('dossier_id', dossierId)
      .maybeSingle();

    const { data: terminalTractorDetails } = await supabase
      .from('terminal_tractor_details')
      .select('*')
      .eq('dossier_id', dossierId)
      .maybeSingle();

    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .eq('dossier_id', dossierId)
      .eq('visible_online', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(28);
    doc.setTextColor(15, 23, 42);
    const brandModel = `${dossier.brand || ''} ${dossier.model || ''}`.trim();
    doc.text(brandModel, 20, yPosition);
    yPosition += 15;

    const frontPhoto = photos?.find(p =>
      p.category?.toLowerCase().includes('voorkant') ||
      p.category?.toLowerCase().includes('front')
    ) || photos?.[0];

    if (frontPhoto) {
      try {
        const { data } = supabase.storage
          .from('dossier-photos')
          .getPublicUrl(frontPhoto.storage_path);

        const response = await fetch(data.publicUrl);
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const compressedPhoto = await compressImage(dataUrl, 1200, 1200, 0.65);

        const imageWidth = 170;
        const imageHeight = 120;
        const imageX = 20;

        doc.addImage(compressedPhoto, 'JPEG', imageX, yPosition, imageWidth, imageHeight);
        yPosition += imageHeight + 10;
      } catch (error) {
        console.error('Error loading front photo:', error);
      }
    }

    const detailsToUse = forkliftDetails || echDetails || reachstackerDetails || terminalTractorDetails;

    if (detailsToUse) {
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(t.technicalSpecs, 20, yPosition);
      yPosition += 10;

      const technicalData: string[][] = [];
      const hoursUnit = fieldTranslations.hours[language];
      const yesNo = (value: boolean | undefined) => {
        if (value === undefined || value === null) return '';
        return value ? fieldTranslations.yes[language] : fieldTranslations.no[language];
      };

      if (detailsToUse.order_no) technicalData.push([t.stockId, detailsToUse.order_no]);
      // Serial number is NOT shown in external PDFs (customer-facing documents)
      if (detailsToUse.brand) technicalData.push([t.brand, detailsToUse.brand]);
      if (detailsToUse.type) technicalData.push([t.model, detailsToUse.type]);
      if (detailsToUse.year_of_manufacture) technicalData.push([t.buildYear, detailsToUse.year_of_manufacture.toString()]);
      if (detailsToUse.power) technicalData.push([fieldTranslations.power[language], detailsToUse.power]);

      if (detailsToUse.capacity_kg) technicalData.push([t.capacity, `${formatNumber(detailsToUse.capacity_kg)} kg`]);
      if (detailsToUse.load_center_mm) technicalData.push([t.loadCenter, `${formatNumber(detailsToUse.load_center_mm)} mm`]);
      if (detailsToUse.hours_on_clock) technicalData.push([t.readRunningHours, `${formatNumber(detailsToUse.hours_on_clock)} ${hoursUnit}`]);

      if (detailsToUse.mast) technicalData.push([t.mast, detailsToUse.mast]);
      if (detailsToUse.mast_type) technicalData.push([fieldTranslations.mastType[language], detailsToUse.mast_type]);
      if (detailsToUse.free_lift) technicalData.push([fieldTranslations.freeLift[language], detailsToUse.free_lift]);
      if (detailsToUse.lift_height_mm) {
        const isECH = dossier.equipment_type === 'empty_container_handler';
        const liftHeightValue = isECH
          ? `${detailsToUse.lift_height_mm} ${t.high}`
          : `${formatNumber(detailsToUse.lift_height_mm)} mm`;
        technicalData.push([t.liftHeight, liftHeightValue]);
      }

      if (detailsToUse.length_total_mm) technicalData.push([fieldTranslations.totalLength[language], `${formatNumber(detailsToUse.length_total_mm)} mm`]);
      if (detailsToUse.width_total_mm) technicalData.push([fieldTranslations.totalWidth[language], `${formatNumber(detailsToUse.width_total_mm)} mm`]);
      if (detailsToUse.drive_through_height_mm) technicalData.push([fieldTranslations.driveThroughHeight[language], `${formatNumber(detailsToUse.drive_through_height_mm)} mm`]);
      if (detailsToUse.serviceweight_kg) technicalData.push([fieldTranslations.serviceWeight[language], `${formatNumber(detailsToUse.serviceweight_kg)} kg`]);

      if (detailsToUse.cabin_type) technicalData.push([t.cabinType, detailsToUse.cabin_type]);
      if (detailsToUse.heater !== undefined && detailsToUse.heater !== null) technicalData.push([fieldTranslations.heater[language], yesNo(detailsToUse.heater)]);
      if (detailsToUse.airco !== undefined && detailsToUse.airco !== null) technicalData.push([fieldTranslations.airco[language], yesNo(detailsToUse.airco)]);

      if (detailsToUse.seat_brand) technicalData.push([fieldTranslations.seatBrand[language], detailsToUse.seat_brand]);
      if (detailsToUse.seat_type_suspension) technicalData.push([fieldTranslations.seatSuspension[language], detailsToUse.seat_type_suspension]);

      if (detailsToUse.engine_brand) technicalData.push([t.engineBrand, detailsToUse.engine_brand]);
      if (detailsToUse.engine_type) technicalData.push([t.engineType, detailsToUse.engine_type]);
      if (detailsToUse.adblue !== undefined && detailsToUse.adblue !== null && detailsToUse.power?.toLowerCase() !== 'elektrisch' && detailsToUse.power?.toLowerCase() !== 'electric') technicalData.push(['AdBlue', yesNo(detailsToUse.adblue)]);

      if (detailsToUse.front_axle_brand) technicalData.push([fieldTranslations.frontAxleBrand[language], detailsToUse.front_axle_brand]);
      if (detailsToUse.front_axle_type) technicalData.push([fieldTranslations.frontAxleType[language], detailsToUse.front_axle_type]);
      if (detailsToUse.trans_brand) technicalData.push([fieldTranslations.transBrand[language], detailsToUse.trans_brand]);
      if (detailsToUse.trans_type) technicalData.push([fieldTranslations.transType[language], detailsToUse.trans_type]);

      if (!detailsToUse.no_forks) {
        if (detailsToUse.fork_length_mm) technicalData.push([fieldTranslations.forkLength[language], `${formatNumber(detailsToUse.fork_length_mm)} mm`]);
        if (detailsToUse.fork_width_mm) technicalData.push([fieldTranslations.forkWidth[language], `${formatNumber(detailsToUse.fork_width_mm)} mm`]);
        if (detailsToUse.fork_height_mm) technicalData.push([fieldTranslations.forkThickness[language], `${formatNumber(detailsToUse.fork_height_mm)} mm`]);
      }

      if (detailsToUse.hydraulic_lines) technicalData.push([fieldTranslations.hydraulicLines[language], detailsToUse.hydraulic_lines.toString()]);

      if (detailsToUse.tire_size_front) technicalData.push([fieldTranslations.frontTires[language], detailsToUse.tire_size_front]);
      if (detailsToUse.tire_size_back) technicalData.push([fieldTranslations.rearTires[language], detailsToUse.tire_size_back]);
      if (detailsToUse.tire_type) technicalData.push([fieldTranslations.tireType[language], detailsToUse.tire_type]);

      if (detailsToUse.fifth_wheel_height_mm) technicalData.push([fieldTranslations.fifthWheelHeight[language], `${formatNumber(detailsToUse.fifth_wheel_height_mm)} mm`]);

      if (detailsToUse.wheelbase_mm) technicalData.push([fieldTranslations.wheelbase[language], `${formatNumber(detailsToUse.wheelbase_mm)} mm`]);

      if (detailsToUse.attachment && detailsToUse.attachment !== 'No attachment') {
        technicalData.push([fieldTranslations.attachment[language], detailsToUse.attachment]);
        if (detailsToUse.attachment_other) technicalData.push([fieldTranslations.attachmentDetails[language], detailsToUse.attachment_other]);
      }

      if (technicalData.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [],
          body: technicalData,
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: 2,
          },
          columnStyles: {
            0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 60 },
            1: { textColor: [15, 23, 42] },
          },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }
    }

    if (photos && photos.length > 0) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(t.photos, 20, yPosition);
      yPosition += 10;

      const imagePromises = photos.map(async (photo: Photo) => {
        try {
          const { data } = supabase.storage
            .from('dossier-photos')
            .getPublicUrl(photo.storage_path);

          const response = await fetch(data.publicUrl);
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const compressed = await compressImage(dataUrl, 1024, 1024, 0.60);
          return compressed;
        } catch (error) {
          console.error('Error loading photo:', error);
          return null;
        }
      });

      const imageDataUrls = await Promise.all(imagePromises);
      const validImages = imageDataUrls.filter(url => url !== null) as string[];

      let xPos = 20;
      let yPos = Math.max(yPosition, 25);
      const imageWidth = 80;
      const imageHeight = 60;
      const spacing = 10;
      const maxYForImages = 280;
      let imagesInRow = 0;
      let addedImages = 0;

      for (let i = 0; i < validImages.length; i++) {
        const imageData = validImages[i];

        if (imagesInRow === 2) {
          xPos = 20;
          yPos += imageHeight + spacing;
          imagesInRow = 0;
        }

        if (yPos > maxYForImages) {
          doc.addPage();
          yPos = 25;
          xPos = 20;
          imagesInRow = 0;
        }

        try {
          doc.addImage(imageData, 'JPEG', xPos, yPos, imageWidth, imageHeight);
          addedImages++;

          const currentSize = estimatePdfSize(doc);
          if (currentSize > MAX_PDF_SIZE_BYTES * 0.90) {
            console.warn(`PDF size approaching limit. Stopping at ${addedImages} photos.`);
            break;
          }
        } catch (error) {
          console.error('Error adding image to PDF:', error);
        }

        xPos += imageWidth + spacing;
        imagesInRow++;
      }
    }

    const pdfBytes = doc.output('arraybuffer');
    const finalSize = pdfBytes.byteLength;
    const finalSizeMB = (finalSize / (1024 * 1024)).toFixed(2);
    console.log(`Final clean PDF size: ${finalSizeMB} MB`);

    if (finalSize > MAX_PDF_SIZE_BYTES) {
      console.error(`WARNING: PDF exceeds ${MAX_PDF_SIZE_MB} MB limit (${finalSizeMB} MB)`);
      alert(`Let op: PDF is groter dan ${MAX_PDF_SIZE_MB} MB (${finalSizeMB} MB). Dit kan problemen geven bij het verzenden per email.`);
    }

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const brand = dossier.brand || 'Unknown';
    const model = dossier.model || 'Unknown';
    const filename = `${dossier.dossier_number}_${brand}_${model}_clean.pdf`.replace(/\s+/g, '_');

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating clean external PDF:', error);
    throw error;
  }
}
