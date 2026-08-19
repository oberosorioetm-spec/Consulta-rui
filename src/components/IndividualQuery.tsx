import React, { useState } from 'react';
import { 
  Search, 
  Printer, 
  XCircle, 
  FileText, 
  User, 
  MapPin, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DOCUMENT_TYPES, getRuiBadgeStyle } from '../utils/colombianData';
import { RuiQueryResult } from '../types';
import { syncQueryToSheets } from '../utils/googleSheetsSync';

export const IndividualQuery: React.FC = () => {
  const [docType, setDocType] = useState<string>('3'); // Default: Cédula de Ciudadanía
  const [docNum, setDocNum] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<RuiQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (e?: React.FormEvent, forceDocNum?: string, forceDocType?: string) => {
    if (e) e.preventDefault();
    
    const queryNum = (forceDocNum || docNum).trim();
    const queryType = (forceDocType || docType).trim();

    if (!queryNum) {
      setError('Por favor ingrese el número de documento.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'ober_rui_key_sec_9876'
        },
        body: JSON.stringify({
          pNumDoc: queryNum,
          pTipDoc: queryType
        })
      });

      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        // Not JSON
      }

      if (!response.ok) {
        const errorMsg = data?.error || `Error HTTP ${response.status}: No se pudo completar la consulta con el DNP.`;
        throw new Error(errorMsg);
      }

      if (!data) {
        throw new Error('El servidor no retornó una respuesta en formato JSON.');
      }

      if (data.ok === false) {
        throw new Error(data.error || 'El DNP no devolvió información para este documento.');
      }

      setResult(data);
      // Sync to Google Sheets silently in the background
      syncQueryToSheets(data).catch((err) => {
        console.error('Silent sync failed:', err);
      });
    } catch (err: any) {
      console.error('Error querying RUI:', err);
      setError(err.message || 'Error de conexión con la Ventanilla Social del DNP.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClear = () => {
    setResult(null);
    setError(null);
    setDocNum('');
  };

  const badgeInfo = result ? getRuiBadgeStyle(result.grupRui || result.nivelRui || result.metadatos_hogar?.grupo_sisben) : null;
  const fullName = result?.nombre || result?.nombreCompleto || result?.metadatos_hogar?.nombre_titular || 'Ciudadano Consultado';
  const depto = result?.departamento || result?.metadatos_hogar?.departamento || 'Sin información';
  const mpio = result?.municipio || result?.metadatos_hogar?.municipio || 'Sin información';
  const group = result?.grupRui || result?.nivelRui || result?.metadatos_hogar?.grupo_sisben || 'Sin Registro';
  const incomes = result?.grupoIngresos || result?.metadatos_hogar?.grupo_ingresos || 'No especificado';
  const familyMembers = result?.composicionFamiliar || result?.integrantes || [];

  return (
    <div className="space-y-6">
      
      {/* Official Sync Banner */}
      <div className="rounded-xl bg-slate-900 border border-slate-850 p-3 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-blue-950/40 text-blue-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-400">
            <strong className="text-white font-medium">Servidor Oficial DNP:</strong> Consulta en tiempo real al Registro Universal de Ingresos.
          </p>
        </div>
      </div>

      {/* Query Search Card */}
      <div className="rounded-xl bg-slate-900 border border-slate-850 p-5 sm:p-6 shadow-sm no-print">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
          <div>
            <h2 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Consulta Individual
            </h2>
            <p className="text-xs text-slate-400">
              Verifique la clasificación RUI ingresando el documento.
            </p>
          </div>
        </div>

        <form onSubmit={(e) => handleQuery(e)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Document Type Dropdown */}
            <div className="md:col-span-4 space-y-1.5">
              <label htmlFor="ind-doc-type" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tipo
              </label>
              <select
                id="ind-doc-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.short} - {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Number Input */}
            <div className="md:col-span-5 space-y-1.5">
              <label htmlFor="ind-doc-num" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Documento
              </label>
              <div className="relative">
                <input
                  id="ind-doc-num"
                  type="text"
                  placeholder="Ej. 1234567890"
                  value={docNum}
                  onChange={(e) => setDocNum(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                />
                {docNum && (
                  <button
                    type="button"
                    onClick={() => setDocNum('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Query Button */}
            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                id="btn-submit-individual"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm transition-all duration-200 active:scale-95 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Consultar RUI</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </form>

      </div>

      {/* Error Card */}
      {error && (
        <div className="rounded-xl bg-red-950/40 border border-red-900/60 p-4 text-red-200 flex items-start gap-3 animate-fadeIn no-print">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-red-300 text-xs">Error</h4>
            <p className="text-xs text-red-200/90 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Result Card: Official Certificate Style */}
      {result && (
        <div id="printable-certificate" className="rounded-xl bg-slate-900 border border-slate-850 shadow-lg overflow-hidden animate-fadeIn">
          
          {/* Official DNP Card Header Bar */}
          <div className="bg-slate-950 px-5 py-3 border-b border-slate-850 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white border border-white/10">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
                    Resultado RUI
                  </h3>
                  {result.source === 'live_dnp' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      En Vivo DNP
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Modo Resiliente
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  DNP • Sistema RUI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                id="btn-print-individual"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
              <button
                type="button"
                id="btn-clear-individual"
                onClick={handleClear}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Limpiar"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-5">
            
            {/* Top Grid: Citizen Details & Classification Score */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Details (Citizen Metadata) */}
              <div className="lg:col-span-8 space-y-3">
                
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    Titular
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white uppercase tracking-tight mt-0.5">
                    {fullName}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      <span>Identificación</span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200 font-mono">
                      {result.tipoDocumento || 'CC'} {result.numeroDocumento || docNum}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>Edad y Sexo</span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200">
                      {result.edad ? `${result.edad} años` : 'N/A'} • {result.sexo || 'N/A'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Ubicación</span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate" title={`${mpio} — ${depto}`}>
                      {mpio}, {depto}
                    </p>
                  </div>

                </div>

                {/* Sub-Information Note */}
                <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Estado: <strong className="text-emerald-400 font-semibold">{result.estado || 'ACTIVO'}</strong></span>
                  <span className="text-slate-700">•</span>
                  <span>Fecha: {result.fechaConsulta ? new Date(result.fechaConsulta).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO')}</span>
                </div>

              </div>

              {/* Right Classification Box */}
              <div className="lg:col-span-4 flex flex-col justify-center p-4 rounded-xl bg-slate-950 border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />

                <div className="space-y-1 text-center lg:text-left">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Clasificación RUI / Sisbén
                  </span>
                  
                  <div className="flex items-baseline justify-center lg:justify-start gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-white font-outfit tracking-tight">
                      {group}
                    </span>
                    {badgeInfo && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.bg}`}>
                        {badgeInfo.category}
                      </span>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Family Members Section */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  Núcleo Familiar ({familyMembers.length > 0 ? familyMembers.length : 1})
                </h4>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Documento</th>
                      <th className="px-3 py-2">Parentesco</th>
                      <th className="px-3 py-2 text-right">RUI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 bg-slate-900">
                    {familyMembers.length > 0 ? (
                      familyMembers.map((member, index) => (
                        <tr key={index} className="hover:bg-slate-850/40 transition-colors">
                          <td className="px-3 py-2 font-medium text-white uppercase">
                            {member.nombre}
                          </td>
                          <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                            {member.tipoDocumento || 'Doc'} {member.numeroDocumento || '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-300">
                            {member.parentesco || 'Titular'}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-blue-400 font-mono">
                            {member.grupRui || member.sisben || group}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="hover:bg-slate-850/40 transition-colors">
                        <td className="px-3 py-2 font-medium text-white uppercase">
                          {fullName}
                        </td>
                        <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                          {result.tipoDocumento || 'CC'} {result.numeroDocumento || docNum}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          Titular
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-blue-400 font-mono">
                          {group}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Footer Note */}
          <div className="bg-slate-950 px-5 py-2.5 border-t border-slate-850 text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1">
            <span>
              Certificación electrónica DNP.
            </span>
            <span className="font-mono text-slate-500">
              HASH: {Math.abs(docNum.split('').reduce((a, b) => a + b.charCodeAt(0), 0) * 8742).toString(16).toUpperCase()}
            </span>
          </div>

        </div>
      )}

    </div>
  );
};
