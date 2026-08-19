export interface DocumentTypeOption {
  code: string;
  name: string;
  short: string;
}

export interface FamilyMember {
  nombre: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  parentesco?: string;
  grupRui?: string;
  sexo?: string;
  edad?: string;
  sisben?: string;
}

export interface RuiQueryResult {
  ok: boolean;
  nombre?: string;
  nombreCompleto?: string;
  edad?: string;
  sexo?: string;
  departamento?: string;
  municipio?: string;
  grupRui?: string;
  nivelRui?: string;
  grupoIngresos?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  estado?: string;
  fechaConsulta?: string;
  mensaje?: string;
  isFallbackResponse?: boolean;
  composicionFamiliar?: FamilyMember[];
  integrantes?: FamilyMember[];
  metadatos_hogar?: {
    nombre_titular?: string;
    edad_titular?: string;
    sexo_titular?: string;
    municipio?: string;
    departamento?: string;
    grupo_sisben?: string;
    grupo_ingresos?: string;
  };
  error?: string;
  rawHtml?: string;
}

export interface BatchItem {
  id: string;
  index: number;
  docNum: string;
  docType: string;
  docTypeName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  result?: RuiQueryResult;
  error?: string;
  raw?: Record<string, string>;
  startTime?: number;
  durationMs?: number;
}

export interface BatchStats {
  total: number;
  success: number;
  error: number;
  pending: number;
  processing: number;
  elapsedSeconds: number;
  requestsPerSecond: number;
}
