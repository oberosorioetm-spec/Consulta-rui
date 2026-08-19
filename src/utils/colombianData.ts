import { DocumentTypeOption, BatchItem } from '../types';

export const DOCUMENT_TYPES: DocumentTypeOption[] = [
  { code: '3', name: 'Cédula de Ciudadanía', short: 'CC' },
  { code: '2', name: 'Tarjeta de Identidad', short: 'TI' },
  { code: '1', name: 'Registro Civil', short: 'RC' },
  { code: '4', name: 'Cédula de Extranjería', short: 'CE' },
  { code: '5', name: 'Pasaporte', short: 'PA' },
  { code: '9', name: 'Permiso por Protección Temporal', short: 'PPT' },
  { code: '8', name: 'Permiso Especial de Permanencia', short: 'PEP' }
];

export function getDocTypeName(code: string): string {
  const found = DOCUMENT_TYPES.find(d => d.code === code || d.short.toLowerCase() === code.toLowerCase());
  return found ? found.name : `Doc (${code})`;
}

export function getDocTypeCode(input: string): string {
  if (!input) return '3';
  const clean = input.trim().toUpperCase();
  if (['3', 'CC', 'CEDULA', 'CÉDULA', 'CEDULA DE CIUDADANIA', 'CÉDULA DE CIUDADANÍA'].includes(clean)) return '3';
  if (['2', 'TI', 'TARJETA', 'TARJETA DE IDENTIDAD'].includes(clean)) return '2';
  if (['1', 'RC', 'REGISTRO', 'REGISTRO CIVIL'].includes(clean)) return '1';
  if (['4', 'CE', 'EXTRANJERIA', 'CÉDULA DE EXTRANJERÍA', 'CEDULA DE EXTRANJERIA'].includes(clean)) return '4';
  if (['5', 'PA', 'PASAPORTE'].includes(clean)) return '5';
  if (['9', 'PPT', 'PERMISO POR PROTECCION TEMPORAL'].includes(clean)) return '9';
  if (['8', 'PEP', 'PERMISO ESPECIAL DE PERMANENCIA'].includes(clean)) return '8';
  return '3';
}

export function getRuiBadgeStyle(group?: string) {
  if (!group || group === 'Sin Registro' || group === 'N/A') {
    return {
      bg: 'bg-slate-800/80 text-slate-300 border-slate-700',
      label: 'Sin Clasificación',
      category: 'No Registrado'
    };
  }
  const prefix = group.trim().charAt(0).toUpperCase();
  switch (prefix) {
    case 'A':
      return {
        bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        label: `Grupo ${group}`,
        category: 'Pobreza Extrema',
        accentColor: '#f43f5e'
      };
    case 'B':
      return {
        bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        label: `Grupo ${group}`,
        category: 'Pobreza Moderada',
        accentColor: '#f59e0b'
      };
    case 'C':
      return {
        bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        label: `Grupo ${group}`,
        category: 'Vulnerable',
        accentColor: '#10b981'
      };
    case 'D':
      return {
        bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        label: `Grupo ${group}`,
        category: 'No Pobre / No Vulnerable',
        accentColor: '#3b82f6'
      };
    default:
      return {
        bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        label: `Nivel ${group}`,
        category: 'Ingresos RUI',
        accentColor: '#6366f1'
      };
  }
}

export const SAMPLE_BATCH_DATA = [
  { tipo: 'CC', documento: '1007299001', nombres: 'Carlos Andrés', departamento: 'Antioquia' },
  { tipo: 'CC', documento: '1018456789', nombres: 'María Fernanda', departamento: 'Bogotá D.C.' },
  { tipo: 'CC', documento: '1032489123', nombres: 'Jorge Enrique', departamento: 'Valle del Cauca' },
  { tipo: 'TI', documento: '1098765432', nombres: 'Ana Sofía', departamento: 'Atlántico' },
  { tipo: 'CC', documento: '1054321987', nombres: 'Luis Alberto', departamento: 'Santander' },
  { tipo: 'CC', documento: '1087654321', nombres: 'Diana Patricia', departamento: 'Córdoba' },
  { tipo: 'PPT', documento: '9876543210', nombres: 'Alejandro José', departamento: 'Bolívar' },
  { tipo: 'CC', documento: '1023456781', nombres: 'Sandra Milena', departamento: 'Cundinamarca' }
];

export function exportBatchToCsv(items: BatchItem[], filename = 'Resultados_Consulta_RUI.csv') {
  const headers = [
    '#',
    'Tipo Documento',
    'Número Documento',
    'Nombre Completo',
    'Edad',
    'Sexo',
    'Departamento',
    'Municipio',
    'Grupo RUI / Sisbén',
    'Clasificación Ingresos',
    'Estado',
    'Fecha Consulta'
  ];

  const rows = items.map((item, idx) => {
    const res = item.result;
    return [
      idx + 1,
      item.docTypeName || res?.tipoDocumento || '',
      item.docNum || '',
      `"${(res?.nombre || res?.nombreCompleto || res?.metadatos_hogar?.nombre_titular || '').replace(/"/g, '""')}"`,
      res?.edad || res?.metadatos_hogar?.edad_titular || '',
      res?.sexo || res?.metadatos_hogar?.sexo_titular || '',
      res?.departamento || res?.metadatos_hogar?.departamento || '',
      res?.municipio || res?.metadatos_hogar?.municipio || '',
      res?.grupRui || res?.nivelRui || res?.metadatos_hogar?.grupo_sisben || '',
      `"${(res?.grupoIngresos || res?.metadatos_hogar?.grupo_ingresos || '').replace(/"/g, '""')}"`,
      item.status === 'success' ? 'EXITOSO' : (item.status === 'error' ? 'ERROR' : 'PENDIENTE'),
      res?.fechaConsulta ? new Date(res.fechaConsulta).toLocaleString('es-CO') : ''
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportBatchToExcel(items: BatchItem[], filename = 'Resultados_Consulta_RUI.xlsx') {
  // If SheetJS is available in window
  if ((window as any).XLSX) {
    const XLSX = (window as any).XLSX;
    const data = items.map((item, idx) => {
      const res = item.result;
      return {
        '#': idx + 1,
        'Tipo Documento': item.docTypeName || res?.tipoDocumento || '',
        'Número Documento': item.docNum || '',
        'Nombre Completo': res?.nombre || res?.nombreCompleto || res?.metadatos_hogar?.nombre_titular || '',
        'Edad': res?.edad || res?.metadatos_hogar?.edad_titular || '',
        'Sexo': res?.sexo || res?.metadatos_hogar?.sexo_titular || '',
        'Departamento': res?.departamento || res?.metadatos_hogar?.departamento || '',
        'Municipio': res?.municipio || res?.metadatos_hogar?.municipio || '',
        'Grupo RUI / Sisbén': res?.grupRui || res?.nivelRui || res?.metadatos_hogar?.grupo_sisben || '',
        'Clasificación Ingresos': res?.grupoIngresos || res?.metadatos_hogar?.grupo_ingresos || '',
        'Estado Consulta': item.status === 'success' ? 'EXITOSO' : (item.status === 'error' ? 'ERROR' : 'PENDIENTE'),
        'Fecha y Hora': res?.fechaConsulta ? new Date(res.fechaConsulta).toLocaleString('es-CO') : ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Consulta RUI');
    XLSX.writeFile(workbook, filename);
  } else {
    // Fallback to CSV
    exportBatchToCsv(items, filename.replace('.xlsx', '.csv'));
  }
}
