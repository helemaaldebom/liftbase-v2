import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

interface DossierExportData {
  dossiernummer: string;
  apparatuurtype: string;
  merk: string;
  model: string;
  bouwjaar: string;
  urenstand: string;
  locatie: string;
  status: string;
  inkoopprijs: number | null;
  handelsprijs: number | null;
  eindklantprijs: number | null;
  verkocht_voor: number | null;
  verkocht_via: string;
  forklift_international: string;
  mascus: string;
  trucksnl: string;
  machineseeker: string;
  truckscout24: string;
}

const getEquipmentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    heavy_duty_forklift: 'Heavy Duty Forklift',
    empty_container_handler: 'Empty Container Handler',
    reachstacker: 'Reachstacker',
    terminal_tractor: 'Terminal Tractor',
    container: 'Container',
    trailer: 'Trailer',
    chassis: 'Chassis',
    other: 'Overig',
  };
  return labels[type] || type;
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: 'Open',
    open: 'Open',
    stock: 'Stock',
    bidding: 'Bieden actief',
    sold: 'Verkocht',
    archived: 'Gearchiveerd',
  };
  return labels[status] || status;
};

const getPlatformLabel = (platform: string | null): string => {
  if (!platform) return '';
  const labels: Record<string, string> = {
    eigen_netwerk: 'Eigen netwerk',
    forklift_international: 'Forklift International',
    mascus: 'Mascus',
    trucksnl: 'TrucksNL',
    machineseeker: 'Machineseeker',
    truckscout24: 'TruckScout24',
    machineryline: 'MachineryLine',
  };
  return labels[platform] || platform;
};

export const exportDossiersToExcel = async (dossierIds: string[]) => {
  try {
    const { data: dossiers, error } = await supabase
      .from('dossiers')
      .select('*')
      .in('id', dossierIds);

    if (error) throw error;
    if (!dossiers || dossiers.length === 0) {
      throw new Error('Geen dossiers gevonden om te exporteren');
    }

    const [forkliftRes, echRes, reachstackerRes, terminalTractorRes] = await Promise.all([
      supabase.from('forklift_details').select('*').in('dossier_id', dossierIds),
      supabase.from('empty_container_handler_details').select('*').in('dossier_id', dossierIds),
      supabase.from('reachstacker_details').select('*').in('dossier_id', dossierIds),
      supabase.from('terminal_tractor_details').select('*').in('dossier_id', dossierIds)
    ]);

    const forkliftMap = new Map(forkliftRes.data?.map(d => [d.dossier_id, d]) || []);
    const echMap = new Map(echRes.data?.map(d => [d.dossier_id, d]) || []);
    const reachstackerMap = new Map(reachstackerRes.data?.map(d => [d.dossier_id, d]) || []);
    const terminalTractorMap = new Map(terminalTractorRes.data?.map(d => [d.dossier_id, d]) || []);

    const exportData: DossierExportData[] = dossiers.map((dossier) => {
      let merk = '';
      let model = '';
      let bouwjaar = '';
      let urenstand = '';

      let details = null;
      switch (dossier.equipment_type) {
        case 'heavy_duty_forklift':
          details = forkliftMap.get(dossier.id);
          break;
        case 'empty_container_handler':
          details = echMap.get(dossier.id);
          break;
        case 'reachstacker':
          details = reachstackerMap.get(dossier.id);
          break;
        case 'terminal_tractor':
          details = terminalTractorMap.get(dossier.id);
          break;
      }

      if (details) {
        merk = details.brand || '';
        model = details.type || '';
        bouwjaar = details.year_of_manufacture?.toString() || '';
        urenstand = details.hours_on_clock?.toString() || '';
      }

      return {
        dossiernummer: dossier.dossier_number || '',
        apparatuurtype: getEquipmentTypeLabel(dossier.equipment_type),
        merk,
        model,
        bouwjaar,
        urenstand,
        locatie: dossier.location || '',
        status: getStatusLabel(dossier.status),
        inkoopprijs: dossier.purchase_price || null,
        handelsprijs: dossier.handelsprijs || null,
        eindklantprijs: dossier.eindklantprijs || null,
        verkocht_voor: dossier.sale_price || null,
        verkocht_via: getPlatformLabel(dossier.sold_via_platform),
        forklift_international: dossier.publish_to_forklift_international ? 'Ja' : 'Nee',
        mascus: dossier.publish_to_mascus ? 'Ja' : 'Nee',
        trucksnl: dossier.publish_to_trucksnl ? 'Ja' : 'Nee',
        machineseeker: dossier.publish_to_machineseeker ? 'Ja' : 'Nee',
        truckscout24: dossier.publish_to_truckscout24 ? 'Ja' : 'Nee',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData, {
      header: [
        'dossiernummer',
        'apparatuurtype',
        'merk',
        'model',
        'bouwjaar',
        'urenstand',
        'locatie',
        'status',
        'inkoopprijs',
        'handelsprijs',
        'eindklantprijs',
        'verkocht_voor',
        'verkocht_via',
        'forklift_international',
        'mascus',
        'trucksnl',
        'machineseeker',
        'truckscout24',
      ],
    });

    const headerMap: Record<string, string> = {
      dossiernummer: 'Dossiernummer',
      apparatuurtype: 'Apparatuurtype',
      merk: 'Merk',
      model: 'Model',
      bouwjaar: 'Bouwjaar',
      urenstand: 'Urenstand',
      locatie: 'Locatie',
      status: 'Status',
      inkoopprijs: 'Inkoopprijs',
      handelsprijs: 'Handelsprijs',
      eindklantprijs: 'Eindklantprijs',
      verkocht_voor: 'Verkocht voor',
      verkocht_via: 'Verkocht via',
      forklift_international: 'Forklift International',
      mascus: 'Mascus',
      trucksnl: 'TrucksNL',
      machineseeker: 'Machineseeker',
      truckscout24: 'TruckScout24',
    };

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        cell.v = headerMap[cell.v as string] || cell.v;
      }
    }

    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 22 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
    ];

    // Format price columns as currency
    const priceColumns = [8, 9, 10, 11]; // inkoopprijs, handelsprijs, eindklantprijs, verkocht_voor
    for (let row = 1; row <= range.e.r; row++) {
      for (const col of priceColumns) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell && typeof cell.v === 'number') {
          cell.z = '€#,##0.00';
          cell.t = 'n';
        }
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dossiers');

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `dossiers_export_${timestamp}.xlsx`;

    XLSX.writeFile(workbook, filename);

    return { success: true, filename };
  } catch (error) {
    console.error('Error exporting dossiers to Excel:', error);
    throw error;
  }
};
