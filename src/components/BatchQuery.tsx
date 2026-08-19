import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Play, 
  Pause, 
  RotateCcw, 
  XSquare, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Search, 
  Sliders, 
  Sparkles, 
  Trash2,
  ExternalLink,
  Eye,
  Zap,
  Gauge
} from 'lucide-react';
import { BatchItem, BatchStats, RuiQueryResult } from '../types';
import { 
  DOCUMENT_TYPES, 
  getDocTypeCode, 
  getDocTypeName, 
  getRuiBadgeStyle, 
  SAMPLE_BATCH_DATA,
  exportBatchToCsv,
  exportBatchToExcel,
  executeRuiQuery
} from '../utils/colombianData';
import { syncQueryToSheets } from '../utils/googleSheetsSync';


interface BatchQueryProps {
  onViewDetail: (result: RuiQueryResult) => void;
}

export const BatchQuery: React.FC<BatchQueryProps> = ({ onViewDetail }) => {
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column Mapping
  const [docNumCol, setDocNumCol] = useState<string>('');
  const [docTypeCol, setDocTypeCol] = useState<string>('__FIXED__');
  const [fixedDocType, setFixedDocType] = useState<string>('3'); // Default CC

  // Performance settings
  const [concurrency, setConcurrency] = useState<number>(10);
  const [delayMs, setDelayMs] = useState<number>(50);

  // Queue and Execution state
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Refs for queue processing
  const queueRef = useRef<number[]>([]);
  const activeCountRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const isCancelledRef = useRef<boolean>(false);
  const itemsRef = useRef<BatchItem[]>([]);

  // Keep itemsRef in sync
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Timer for elapsed seconds
  useEffect(() => {
    let interval: any = null;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  // Parse CSV or Excel file
  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    const fileName = selectedFile.name.toLowerCase();

    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const Papa = (window as any).Papa;
      if (Papa) {
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results: any) => {
            const data = results.data;
            const fields = results.meta.fields || [];
            setupData(data, fields);
          },
          error: (err: any) => {
            alert('Error al leer el archivo CSV: ' + err.message);
          }
        });
      }
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const XLSX = (window as any).XLSX;
      if (XLSX) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            if (json.length > 0) {
              const fields = Object.keys(json[0]);
              setupData(json, fields);
            }
          } catch (err: any) {
            alert('Error al procesar archivo Excel: ' + err.message);
          }
        };
        reader.readAsArrayBuffer(selectedFile);
      }
    }
  };

  const setupData = (data: Record<string, string>[], fields: string[]) => {
    setRawRows(data);
    setHeaders(fields);

    // Auto-detect Document Number column
    const docCandidates = ['documento', 'cedula', 'cédula', 'numdoc', 'pnumdoc', 'numero', 'identificacion', 'identificación', 'id', 'doc'];
    const matchedDoc = fields.find(f => docCandidates.some(c => f.toLowerCase().replace(/[^a-z]/g, '').includes(c))) || fields[0] || '';
    setDocNumCol(matchedDoc);

    // Auto-detect Document Type column
    const typeCandidates = ['tipo', 'tipodoc', 'ptipdoc', 'tipodocumento', 'tipo_doc'];
    const matchedType = fields.find(f => typeCandidates.some(c => f.toLowerCase().replace(/[^a-z]/g, '').includes(c)));
    if (matchedType) {
      setDocTypeCol(matchedType);
    } else {
      setDocTypeCol('__FIXED__');
    }

    // Build initial items
    buildInitialItems(data, matchedDoc, matchedType ? matchedType : '__FIXED__', fixedDocType);
  };

  const buildInitialItems = (data: Record<string, string>[], numCol: string, typeCol: string, fixedType: string) => {
    const formatted: BatchItem[] = data.map((row, idx) => {
      const rawDoc = row[numCol] ? String(row[numCol]).trim() : '';
      const rawType = typeCol !== '__FIXED__' && row[typeCol] ? String(row[typeCol]).trim() : fixedType;
      const cleanType = getDocTypeCode(rawType);

      return {
        id: `batch-${idx}-${Date.now()}`,
        index: idx + 1,
        docNum: rawDoc,
        docType: cleanType,
        docTypeName: getDocTypeName(cleanType),
        status: 'pending' as const,
        raw: row
      };
    }).filter(item => item.docNum.length > 0);

    setItems(formatted);
  };

  // Load sample dataset
  const handleLoadSample = () => {
    const fields = ['tipo', 'documento', 'nombres', 'departamento'];
    setHeaders(fields);
    setRawRows(SAMPLE_BATCH_DATA as any);
    setDocNumCol('documento');
    setDocTypeCol('tipo');
    setFile(new File([''], 'Ejemplo_Hogares_Colombia.csv', { type: 'text/csv' }));
    buildInitialItems(SAMPLE_BATCH_DATA as any, 'documento', 'tipo', '3');
  };

  // Start batch processing queue
  const handleStartBatch = () => {
    if (items.length === 0) {
      alert('No hay registros cargados para procesar.');
      return;
    }

    // Rebuild items if user changed column mappings
    const preparedItems = rawRows.map((row, idx) => {
      const rawDoc = row[docNumCol] ? String(row[docNumCol]).trim() : '';
      const rawType = docTypeCol !== '__FIXED__' && row[docTypeCol] ? String(row[docTypeCol]).trim() : fixedDocType;
      const cleanType = getDocTypeCode(rawType);

      return {
        id: `batch-${idx}`,
        index: idx + 1,
        docNum: rawDoc,
        docType: cleanType,
        docTypeName: getDocTypeName(cleanType),
        status: 'pending' as const,
        raw: row
      };
    }).filter(i => i.docNum.length > 0);

    setItems(preparedItems);
    itemsRef.current = preparedItems;

    queueRef.current = preparedItems.map((_, i) => i);
    activeCountRef.current = 0;
    isPausedRef.current = false;
    isCancelledRef.current = false;

    setIsRunning(true);
    setIsPaused(false);
    setStartTime(Date.now());
    setElapsedSeconds(0);

    // Launch worker threads up to concurrency limit
    const workerLimit = Math.min(concurrency, preparedItems.length);
    for (let w = 0; w < workerLimit; w++) {
      processNextInQueue();
    }
  };

  const processNextInQueue = async () => {
    if (isCancelledRef.current) return;
    if (isPausedRef.current) return;
    if (queueRef.current.length === 0) {
      if (activeCountRef.current === 0) {
        setIsRunning(false);
      }
      return;
    }

    const itemIndex = queueRef.current.shift()!;
    activeCountRef.current += 1;

    // Mark as processing
    setItems(prev => {
      const next = [...prev];
      if (next[itemIndex]) {
        next[itemIndex] = { ...next[itemIndex], status: 'processing', startTime: Date.now() };
      }
      return next;
    });

    const currentItem = itemsRef.current[itemIndex];
    if (!currentItem) {
      activeCountRef.current -= 1;
      processNextInQueue();
      return;
    }

    try {
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }

      const data = await executeRuiQuery(currentItem.docNum, currentItem.docType);

      if (!data || data.ok === false) {
        throw new Error(data?.error || 'Sin datos');
      }

      // Sync to Google Sheets silently in the background
      syncQueryToSheets(data).catch(() => {});

      setItems(prev => {
        const next = [...prev];
        if (next[itemIndex]) {
          next[itemIndex] = {
            ...next[itemIndex],
            status: 'success',
            result: data,
            durationMs: Date.now() - (next[itemIndex].startTime || Date.now())
          };
        }
        return next;
      });

    } catch (err: any) {
      setItems(prev => {
        const next = [...prev];
        if (next[itemIndex]) {
          next[itemIndex] = {
            ...next[itemIndex],
            status: 'error',
            error: err.message || 'Error',
            durationMs: Date.now() - (next[itemIndex].startTime || Date.now())
          };
        }
        return next;
      });
    } finally {
      activeCountRef.current -= 1;
      // Trigger next item in queue
      processNextInQueue();
    }
  };

  const handlePause = () => {
    isPausedRef.current = true;
    setIsPaused(true);
  };

  const handleResume = () => {
    isPausedRef.current = false;
    setIsPaused(false);
    const workerLimit = Math.min(concurrency, queueRef.current.length);
    for (let w = 0; w < workerLimit; w++) {
      processNextInQueue();
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    queueRef.current = [];
    setIsRunning(false);
    setIsPaused(false);
  };

  const handleClear = () => {
    setFile(null);
    setRawRows([]);
    setHeaders([]);
    setItems([]);
    setIsRunning(false);
    setIsPaused(false);
    setElapsedSeconds(0);
  };

  // Calculate statistics
  const total = items.length;
  const successCount = items.filter(i => i.status === 'success').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const processingCount = items.filter(i => i.status === 'processing').length;
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const completedCount = successCount + errorCount;
  const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const requestsPerSecond = elapsedSeconds > 0 ? (completedCount / elapsedSeconds).toFixed(1) : '0.0';

  // Filtered rows for table
  const filteredItems = items.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    const name = (item.result?.nombre || item.result?.nombreCompleto || '').toLowerCase();
    const doc = item.docNum.toLowerCase();
    const depto = (item.result?.departamento || '').toLowerCase();
    const group = (item.result?.grupRui || item.result?.nivelRui || '').toLowerCase();
    return name.includes(q) || doc.includes(q) || depto.includes(q) || group.includes(q);
  });  return (
    <div className="space-y-6">

      {/* Upload & Configuration Card */}
      <div className="rounded-xl bg-slate-900 border border-slate-850 p-5 shadow-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
          <div>
            <h2 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-500" />
              Consulta Masiva
            </h2>
            <p className="text-xs text-slate-400">
              Suba un archivo para consultar registros en paralelo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/40 hover:bg-blue-900/40 text-blue-400 border border-blue-500/20 text-xs font-semibold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Cargar Ejemplo</span>
            </button>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-blue-500 bg-blue-500/5 scale-[1.01]'
                : 'border-slate-850 hover:border-blue-500 bg-slate-950/50 hover:bg-slate-950'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFile(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-blue-400 flex items-center justify-center shadow-sm">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Arrastre archivo aquí o haga clic para buscar.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Soporta CSV y Excel (.xlsx)
              </p>
            </div>
          </div>
        ) : (
          /* File Loaded Preview & Column Mapping */
          <div className="space-y-4">
            
            {/* File Info Bar */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white font-mono">{file.name}</h4>
                  <p className="text-[11px] text-slate-500">
                    {rawRows.length} registros • {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isRunning}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Quitar</span>
                </button>
              </div>
            </div>

            {/* Column Mapping Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              
              {/* Document Number Column */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Columna Documento
                </label>
                <select
                  value={docNumCol}
                  onChange={(e) => {
                    setDocNumCol(e.target.value);
                    buildInitialItems(rawRows, e.target.value, docTypeCol, fixedDocType);
                  }}
                  disabled={isRunning}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono disabled:opacity-50 transition-all"
                >
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Document Type Column */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Columna Tipo
                </label>
                <select
                  value={docTypeCol}
                  onChange={(e) => {
                    setDocTypeCol(e.target.value);
                    buildInitialItems(rawRows, docNumCol, e.target.value, fixedDocType);
                  }}
                  disabled={isRunning}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono disabled:opacity-50 transition-all"
                >
                  <option value="__FIXED__">-- Tipo fijo único --</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Fixed Type Dropdown if selected */}
              {docTypeCol === '__FIXED__' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tipo Fijo
                  </label>
                  <select
                    value={fixedDocType}
                    onChange={(e) => {
                      setFixedDocType(e.target.value);
                      buildInitialItems(rawRows, docNumCol, docTypeCol, e.target.value);
                    }}
                    disabled={isRunning}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50 transition-all"
                  >
                    {DOCUMENT_TYPES.map(t => (
                      <option key={t.code} value={t.code}>{t.short} - {t.name}</option>
                    ))}
                  </select>
                </div>
              )}

            </div>

            {/* Performance Controls (Sliders) */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* Concurrency */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Hilos paralelos:
                  </span>
                  <span className="font-mono font-bold text-blue-400">{concurrency}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
                  disabled={isRunning}
                  className="w-full accent-blue-500 cursor-pointer disabled:opacity-50 h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              {/* Delay */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    Delay:
                  </span>
                  <span className="font-mono font-bold text-blue-400">{delayMs} ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="25"
                  value={delayMs}
                  onChange={(e) => setDelayMs(parseInt(e.target.value, 10))}
                  disabled={isRunning}
                  className="w-full accent-blue-500 cursor-pointer disabled:opacity-50 h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              {/* Launch Button */}
              <div className="flex flex-col justify-end gap-2 pt-1">
                {!isRunning ? (
                  <button
                    type="button"
                    onClick={handleStartBatch}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg shadow-sm flex items-center justify-center gap-1.5 text-xs transition-all duration-200 active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Iniciar ({items.length})</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {!isPaused ? (
                      <button
                        type="button"
                        onClick={handlePause}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 text-xs transition-all cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pausar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResume}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 text-xs transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Reanudar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="bg-rose-950 hover:bg-rose-900 text-rose-400 font-semibold py-1.5 px-3 rounded-lg border border-rose-900/40 flex items-center justify-center gap-1 text-xs transition-all cursor-pointer"
                    >
                      <XSquare className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Progress & Live KPI Counters */}
      {items.length > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-850 p-5 shadow-sm space-y-4">
          
          {/* Top Progress Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isRunning && !isPaused && (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
              <h3 className="text-sm font-bold text-slate-200">
                {isRunning ? (isPaused ? 'Pausado' : 'Procesando...') : (completedCount === total && total > 0 ? 'Completado' : 'Listo')}
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>{completedCount} / {total}</span>
              <span className="font-bold text-blue-400">{progressPercent}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden relative">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 5 KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total</span>
              <span className="text-lg font-bold text-white font-mono">{total}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">Exitosos</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">{successCount}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider block">Errores</span>
              <span className="text-lg font-bold text-rose-400 font-mono">{errorCount}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">Espera</span>
              <span className="text-lg font-bold text-amber-400 font-mono">{pendingCount + processingCount}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tiempo</span>
              <span className="text-lg font-bold text-white font-mono">
                {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Velocidad</span>
              <span className="text-lg font-bold text-blue-400 font-mono">{requestsPerSecond} <span className="text-[10px] text-slate-500 font-normal">r/s</span></span>
            </div>

          </div>

        </div>
      )}

      {/* Results Table Card */}
      {items.length > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-850 shadow-lg overflow-hidden">
          
          {/* Table Actions Header */}
          <div className="p-3 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer transition-colors"
              >
                <option value="all">Todos ({items.length})</option>
                <option value="success">Éxito ({successCount})</option>
                <option value="error">Error ({errorCount})</option>
                <option value="pending">Espera ({pendingCount})</option>
              </select>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={() => exportBatchToCsv(items)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={() => exportBatchToExcel(items)}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Excel</span>
              </button>
            </div>

          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-800 backdrop-blur-md">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Documento</th>
                  <th className="px-3 py-2.5">Tipo</th>
                  <th className="px-3 py-2.5">Nombre</th>
                  <th className="px-3 py-2.5">Ubicación</th>
                  <th className="px-3 py-2.5">Grupo RUI</th>
                  <th className="px-3 py-2.5">Ingresos</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5 text-center">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 bg-slate-900 font-sans">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const res = item.result;
                    const badge = res ? getRuiBadgeStyle(res.grupRui || res.nivelRui || res.metadatos_hogar?.grupo_sisben) : null;
                    const name = res?.nombre || res?.nombreCompleto || res?.metadatos_hogar?.nombre_titular || '—';
                    const loc = res?.municipio ? `${res.municipio}, ${res.departamento || ''}` : '—';
                    const group = res?.grupRui || res?.nivelRui || res?.metadatos_hogar?.grupo_sisben || '—';

                    return (
                      <tr key={item.id} className="hover:bg-slate-850/40 transition-colors">
                        <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{item.index}</td>
                        <td className="px-3 py-2 font-semibold text-white font-mono">{item.docNum}</td>
                        <td className="px-3 py-2 text-slate-400">{item.docTypeName}</td>
                        <td className="px-3 py-2 font-medium text-slate-200 uppercase">{name}</td>
                        <td className="px-3 py-2 text-slate-400 truncate max-w-[140px]">{loc}</td>
                        <td className="px-3 py-2">
                          {badge && res ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              {group}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-400 text-[11px]">
                          {res?.grupoIngresos || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {item.status === 'success' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                              <CheckCircle className="w-3 h-3" /> Éxito
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                              <AlertTriangle className="w-3 h-3" /> Error
                            </span>
                          )}
                          {item.status === 'processing' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 animate-pulse">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" /> Buscando
                            </span>
                          )}
                          {item.status === 'pending' && (
                            <span className="text-[11px] text-slate-500">Espera</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {res ? (
                            <button
                              type="button"
                              onClick={() => onViewDetail(res)}
                              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors cursor-pointer"
                              title="Ver ficha"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                      Sin registros para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
};
