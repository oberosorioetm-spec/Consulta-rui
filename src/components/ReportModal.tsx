import React from 'react';
import { X, Printer, Users, ShieldCheck } from 'lucide-react';
import { RuiQueryResult } from '../types';
import { getRuiBadgeStyle } from '../utils/colombianData';

interface ReportModalProps {
  result: RuiQueryResult | null;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ result, onClose }) => {
  if (!result) return null;

  const badgeInfo = getRuiBadgeStyle(result.grupRui || result.nivelRui || result.metadatos_hogar?.grupo_sisben);
  const fullName = result.nombre || result.nombreCompleto || result.metadatos_hogar?.nombre_titular || 'Ciudadano';
  const depto = result.departamento || result.metadatos_hogar?.departamento || '—';
  const mpio = result.municipio || result.metadatos_hogar?.municipio || '—';
  const group = result.grupRui || result.nivelRui || result.metadatos_hogar?.grupo_sisben || 'Sin Registro';
  const incomes = result.grupoIngresos || result.metadatos_hogar?.grupo_ingresos || '—';
  const familyMembers = result.composicionFamiliar || result.integrantes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Ficha de Consulta
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-950/70 border border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Titular</span>
              <h2 className="text-base font-black text-white uppercase font-sans">{fullName}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {result.tipoDocumento || 'CC'} {result.numeroDocumento || ''}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Grupo RUI</span>
                <span className="text-xl font-bold text-white font-mono">{group}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.bg}`}>
                {badgeInfo.category}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Edad / Sexo</span>
              <span className="text-slate-200 font-semibold">{result.edad ? `${result.edad} años` : '—'} • {result.sexo || '—'}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Ubicación</span>
              <span className="text-slate-200 font-semibold">{mpio}, {depto}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Ingresos</span>
              <span className="text-slate-200 font-semibold">{incomes}</span>
            </div>
          </div>

          {/* Family members */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Grupo Familiar
            </h4>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-[10px]">Nombre</th>
                    <th className="px-3 py-2 text-[10px]">Documento</th>
                    <th className="px-3 py-2 text-[10px]">Parentesco</th>
                    <th className="px-3 py-2 text-right text-[10px]">Grupo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {familyMembers.length > 0 ? (
                    familyMembers.map((m, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-slate-200 uppercase">{m.nombre}</td>
                        <td className="px-3 py-2 text-slate-400 font-mono">{m.tipoDocumento || 'Doc'} {m.numeroDocumento || '—'}</td>
                        <td className="px-3 py-2 text-slate-300">{m.parentesco || 'Miembro'}</td>
                        <td className="px-3 py-2 text-right font-bold text-blue-400">{m.grupRui || m.sisben || group}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-2 font-medium text-slate-200 uppercase">{fullName}</td>
                      <td className="px-3 py-2 text-slate-400 font-mono">{result.tipoDocumento || 'CC'} {result.numeroDocumento || ''}</td>
                      <td className="px-3 py-2 text-slate-300">Titular</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-400">{group}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
