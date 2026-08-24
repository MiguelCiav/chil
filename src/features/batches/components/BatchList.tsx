import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender
} from '@tanstack/react-table';
import {
  Award,
  Star,
  X,
  Plus,
  FileText,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

import { Card, CardBody } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/Modal';

import {
  getAllBatches,
  getBatchById,
  getAllMembers,
  getMembersByBatchId,
  getHierarchyData,
  deleteBatch,
  getRecognitionBadgeStyle,
  getRecognitionName,
  RECOGNITION_TYPES
} from '../api';
import {
  generateBatchCertificatesPdf,
  getRecognitionTypeById,
  RecognitionType
} from '../../recognitions';
import {
  Batch,
  ScoutMember,
  Region,
  District,
  ScoutGroup,
  ActiveFilterChip
} from '../types';

interface BatchRowData {
  id: number;
  batch: Batch;
  created_at: string;
  formattedDate: string;
  regionName: string;
  districtName: string;
  groupName: string;
  recognitionName: string;
  recognitionType: string;
  memberCount: number;
}

export const BatchList: React.FC = () => {
  const navigate = useNavigate();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Deletion modal state
  const [batchToDelete, setBatchToDelete] = useState<BatchRowData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Toast notification
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Filter state
  const [activeFilters, setActiveFilters] = useState<ActiveFilterChip[]>([
    { id: 'date-this-year', type: 'date', label: 'Fecha', value: 'Este Año' }
  ]);
  const [isAddFilterModalOpen, setIsAddFilterModalOpen] = useState(false);
  const [newFilterType, setNewFilterType] = useState<'date' | 'region' | 'district' | 'group' | 'recognition'>('region');
  const [newFilterValue, setNewFilterValue] = useState<string>('');

  // Dropdown action menu state per row
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      getAllBatches(),
      getAllMembers(),
      getHierarchyData()
    ])
      .then(([bList, mList, hierarchy]) => {
        setBatches(bList);
        setMembers(mList);
        setRegions(hierarchy.regions);
        setDistricts(hierarchy.districts);
        setGroups(hierarchy.groups);
      })
      .catch(err => {
        console.error("Error loading batches list data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleDownloadPDF = useCallback(async (batchId: number) => {
    setDownloadingId(batchId);
    try {
      const targetBatch = batches.find(b => b.id === batchId) || (await getBatchById(batchId));
      if (!targetBatch) throw new Error('Lote no encontrado');

      let batchMembers = members.filter(m => m.batch_id === batchId);
      if (batchMembers.length === 0) {
        batchMembers = await getMembersByBatchId(batchId);
      }

      let recType: RecognitionType | null = null;
      if (targetBatch.recognition_type) {
        recType = await getRecognitionTypeById(targetBatch.recognition_type);
      }

      const fileName = await generateBatchCertificatesPdf({
        batch: targetBatch,
        members: batchMembers,
        recognition: recType,
        hierarchy: { regions, districts, groups }
      });
      setToastMessage(`Diplomas descargados: ${fileName}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Error al generar los diplomas en PDF.");
    } finally {
      setDownloadingId(null);
    }
  }, [batches, members, regions, districts, groups]);

  const handleDeleteClick = useCallback((rowData: BatchRowData) => {
    setOpenActionMenuId(null);
    setBatchToDelete(rowData);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!batchToDelete) return;
    setDeleting(true);
    try {
      await deleteBatch(batchToDelete.id);
      setBatches(prev => prev.filter(b => b.id !== batchToDelete.id));
      setMembers(prev => prev.filter(m => m.batch_id !== batchToDelete.id));
      setIsDeleteModalOpen(false);
      setBatchToDelete(null);
      setToastMessage('Lote eliminado exitosamente');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Error deleting batch:", err);
      alert("Error al eliminar el lote.");
    } finally {
      setDeleting(false);
    }
  };

  const removeFilter = (filterId: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const handleAddFilter = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newFilterValue) return;

    let label = '';
    let displayValue = '';

    switch (newFilterType) {
      case 'date':
        label = 'Fecha';
        displayValue = newFilterValue;
        break;
      case 'region':
        label = 'Región';
        displayValue = regions.find(r => String(r.id) === newFilterValue)?.name || newFilterValue;
        break;
      case 'district':
        label = 'Distrito';
        displayValue = districts.find(d => String(d.id) === newFilterValue)?.name || newFilterValue;
        break;
      case 'group':
        label = 'Grupo';
        displayValue = groups.find(g => String(g.id) === newFilterValue)?.name || newFilterValue;
        break;
      case 'recognition':
        label = 'Reconocimiento';
        displayValue = getRecognitionName(newFilterValue);
        break;
    }

    const newChip: ActiveFilterChip = {
      id: `${newFilterType}-${Date.now()}`,
      type: newFilterType,
      label,
      value: displayValue
    };

    setActiveFilters(prev => [...prev.filter(f => f.type !== newFilterType), newChip]);
    setIsAddFilterModalOpen(false);
    setNewFilterValue('');
  };

  // Compute top KPI metrics
  const totalCertificates = useMemo(() => {
    return members.filter(m => m.status === 'active').length || members.length;
  }, [members]);

  const mostCommonRecognition = useMemo(() => {
    if (batches.length === 0) return 'Go Solar';
    const counts: Record<string, number> = {};
    for (const b of batches) {
      const rec = b.recognition_type ? getRecognitionName(b.recognition_type) : '';
      if (rec) {
        counts[rec] = (counts[rec] || 0) + 1;
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'Go Solar';
  }, [batches]);

  // Format table rows
  const tableData = useMemo<BatchRowData[]>(() => {
    return batches.map(batch => {
      const batchMembers = members.filter(m => m.batch_id === batch.id);
      const memberCount = batchMembers.length;

      const dateObj = new Date(batch.created_at);
      const formattedDate = isNaN(dateObj.getTime())
        ? 'Fecha no disponible'
        : dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

      const regionObj = regions.find(r => r.id === batch.region_id);
      const districtObj = districts.find(d => d.id === batch.district_id);
      const groupObj = groups.find(g => g.id === batch.group_id);

      return {
        id: batch.id,
        batch,
        created_at: batch.created_at,
        formattedDate,
        regionName: regionObj ? regionObj.name : '-',
        districtName: districtObj ? districtObj.name : '-',
        groupName: groupObj ? groupObj.name : (batch.comment || '-'),
        recognitionName: getRecognitionName(batch.recognition_type),
        recognitionType: batch.recognition_type || '',
        memberCount
      };
    });
  }, [batches, members, regions, districts, groups]);

  // Filter table rows by active filters
  const filteredData = useMemo(() => {
    return tableData.filter(row => {
      for (const filter of activeFilters) {
        if (filter.type === 'date') {
          if (filter.value === 'Este Año') {
            const currentYear = new Date().getFullYear();
            const rowYear = new Date(row.created_at).getFullYear();
            if (rowYear !== currentYear) return false;
          }
        } else if (filter.type === 'region') {
          if (row.regionName !== filter.value && filter.value !== '-') return false;
        } else if (filter.type === 'district') {
          if (row.districtName !== filter.value && filter.value !== '-') return false;
        } else if (filter.type === 'group') {
          if (!row.groupName.toLowerCase().includes(filter.value.toLowerCase())) return false;
        } else if (filter.type === 'recognition') {
          if (row.recognitionName !== filter.value) return false;
        }
      }
      return true;
    });
  }, [tableData, activeFilters]);

  // TanStack Table columns definition
  const columns = useMemo<ColumnDef<BatchRowData>[]>(() => [
    {
      accessorKey: 'formattedDate',
      header: 'FECHA DE EMISIÓN',
      cell: info => <span className="font-medium text-neutral">{info.getValue() as string}</span>
    },
    {
      accessorKey: 'regionName',
      header: 'REGIÓN',
      cell: info => <span className="font-normal text-neutral/80">{info.getValue() as string}</span>
    },
    {
      accessorKey: 'districtName',
      header: 'DISTRITO',
      cell: info => <span className="font-normal text-neutral/80">{info.getValue() as string}</span>
    },
    {
      accessorKey: 'groupName',
      header: 'GRUPO',
      cell: info => (
        <span className="font-semibold text-neutral">{info.getValue() as string}</span>
      )
    },
    {
      accessorKey: 'recognitionName',
      header: 'RECONOCIMIENTO',
      cell: info => {
        const name = info.getValue() as string;
        const style = getRecognitionBadgeStyle(name);
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${style.pillClass}`}>
            {name}
          </span>
        );
      }
    },
    {
      accessorKey: 'memberCount',
      header: 'CANTIDAD',
      cell: info => (
        <span className="font-medium text-neutral">{info.getValue() as number} Miembros</span>
      )
    },
    {
      id: 'actions',
      header: 'ACCIONES',
      cell: ({ row }) => {
        const rowData = row.original;
        const isMenuOpen = openActionMenuId === rowData.id;

        return (
          <div className="flex items-center gap-1.5 relative">
            {/* Acciones Dropdown Button */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setOpenActionMenuId(isMenuOpen ? null : rowData.id)}
                className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border border-gray-300 bg-white text-neutral hover:bg-gray-50 focus:outline-none transition-colors"
              >
                Acciones
              </button>

              {isMenuOpen && (
                <div className="absolute left-0 mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionMenuId(null);
                      navigate(`/lotes/${rowData.id}`);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Ver Detalle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionMenuId(null);
                      handleDownloadPDF(rowData.id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    Descargar PDF
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(rowData)}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    Eliminar Lote
                  </button>
                </div>
              )}
            </div>

            {/* Quick Detail View Icon Button */}
            <button
              type="button"
              onClick={() => navigate(`/lotes/${rowData.id}`)}
              className="p-1.5 text-neutral/70 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              title="Ver detalle del lote"
              aria-label={`Ver detalle del lote ${rowData.id}`}
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Download PDF Icon Button */}
            <button
              type="button"
              onClick={() => handleDownloadPDF(rowData.id)}
              disabled={downloadingId === rowData.id}
              className="p-1.5 text-neutral/70 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
              title="Descargar reporte PDF"
              aria-label={`Descargar PDF del lote ${rowData.id}`}
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Quick Delete Icon Button */}
            <button
              type="button"
              onClick={() => handleDeleteClick(rowData)}
              className="p-1.5 text-neutral/70 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar lote"
              aria-label={`Eliminar lote ${rowData.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ], [openActionMenuId, downloadingId, navigate, handleDownloadPDF, handleDeleteClick]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  const currentPageRows = table.getRowModel().rows;
  const totalCount = filteredData.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans py-2">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-neutral text-white px-5 py-3 rounded-2xl shadow-xl border border-primary/20 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top 2 KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Total Generado */}
        <Card className="shadow-sm border-gray-200">
          <CardBody className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#f5ede2] text-[#935f3b] flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral/60 mb-0.5">Total Generado</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-neutral tracking-tight">
                  {totalCertificates.toLocaleString('es-ES')}
                </span>
                <span className="text-base font-normal text-neutral/70">Certificados</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Card 2: Reconocimiento más común */}
        <Card className="shadow-sm border-gray-200">
          <CardBody className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#fdeee7] text-[#c2410c] flex items-center justify-center flex-shrink-0">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral/60 mb-0.5">Reconocimiento más común</div>
              <div className="text-2xl font-extrabold text-neutral tracking-tight">
                {mostCommonRecognition}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filtros Activos Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-neutral mr-2">Filtros activos</span>
          {activeFilters.map(chip => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#f0eee9] text-neutral/80 border border-gray-200"
            >
              <span>{chip.label}: {chip.value}</span>
              <button
                type="button"
                onClick={() => removeFilter(chip.id)}
                className="hover:text-red-600 transition-colors focus:outline-none"
                aria-label={`Eliminar filtro ${chip.label}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}

          {activeFilters.length === 0 && (
            <span className="text-xs text-neutral/40 italic">Ningún filtro aplicado</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsAddFilterModalOpen(true)}
          className="inline-flex items-center gap-1 text-primary font-bold text-sm hover:text-primary/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir Filtro
        </button>
      </div>

      {/* Batches Data Table */}
      <div className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-gray-200 bg-[#faf8f5]">
                {table.getHeaderGroups().map(headerGroup => (
                  headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-xs font-extrabold text-neutral/70 uppercase tracking-wider"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-neutral/50 font-medium">
                    Cargando listado de lotes...
                  </td>
                </tr>
              ) : currentPageRows.length > 0 ? (
                currentPageRows.map((row, index) => {
                  const isLast = index === currentPageRows.length - 1;
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-[#faf8f5] transition-colors ${!isLast ? 'border-b border-gray-100' : ''}`}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 text-sm whitespace-nowrap text-neutral">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-neutral/60">
                    <div className="space-y-2">
                      <AlertCircle className="w-8 h-8 text-neutral/30 mx-auto" />
                      <p className="font-semibold text-neutral">No se encontraron lotes registrados.</p>
                      <p className="text-xs text-neutral/50">Cree un nuevo lote o modifique los filtros activos.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination Controls */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between text-xs font-semibold text-neutral/60">
          <div>
            Mostrando {currentPageRows.length} de {totalCount} lotes
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Confirmar Eliminación de Lote */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !deleting && setIsDeleteModalOpen(false)} className="max-w-md">
        <ModalHeader onClose={() => !deleting && setIsDeleteModalOpen(false)}>
          Eliminar Lote
        </ModalHeader>
        <ModalBody className="space-y-3">
          <p className="text-sm text-neutral">
            ¿Está seguro de que desea eliminar el lote <span className="font-bold">#{batchToDelete?.id}</span> {batchToDelete?.groupName && batchToDelete.groupName !== '-' ? `(${batchToDelete.groupName})` : ''} y todos sus miembros asociados?
          </p>
          <p className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-200">
            Esta acción no se puede deshacer y eliminará permanentemente los datos del lote y sus registros de miembros asociados.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
          >
            {deleting ? 'Eliminando...' : 'Eliminar Lote'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal: Añadir Filtro */}
      <Modal isOpen={isAddFilterModalOpen} onClose={() => setIsAddFilterModalOpen(false)} className="max-w-md">
        <form onSubmit={handleAddFilter}>
          <ModalHeader onClose={() => setIsAddFilterModalOpen(false)}>
            Añadir Filtro al Listado
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div>
              <label htmlFor="filter-type-select" className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral">
                Tipo de Filtro
              </label>
              <select
                id="filter-type-select"
                value={newFilterType}
                onChange={e => {
                  setNewFilterType(e.target.value as 'date' | 'region' | 'district' | 'group' | 'recognition');
                  setNewFilterValue('');
                }}
                className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="region">Región Scout</option>
                <option value="district">Distrito Scout</option>
                <option value="group">Grupo Scout</option>
                <option value="recognition">Tipo de Reconocimiento</option>
                <option value="date">Fecha / Período</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-value-select" className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral">
                Valor del Filtro
              </label>
              {newFilterType === 'region' && (
                <select
                  id="filter-value-select"
                  value={newFilterValue}
                  onChange={e => setNewFilterValue(e.target.value)}
                  className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                >
                  <option value="">Seleccione una región</option>
                  {regions.map(r => (
                    <option key={r.id} value={String(r.id)}>{r.name}</option>
                  ))}
                </select>
              )}

              {newFilterType === 'district' && (
                <select
                  id="filter-value-select"
                  value={newFilterValue}
                  onChange={e => setNewFilterValue(e.target.value)}
                  className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                >
                  <option value="">Seleccione un distrito</option>
                  {districts.map(d => (
                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                  ))}
                </select>
              )}

              {newFilterType === 'group' && (
                <select
                  id="filter-value-select"
                  value={newFilterValue}
                  onChange={e => setNewFilterValue(e.target.value)}
                  className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                >
                  <option value="">Seleccione un grupo scout</option>
                  {groups.map(g => (
                    <option key={g.id} value={String(g.id)}>{g.name}</option>
                  ))}
                </select>
              )}

              {newFilterType === 'recognition' && (
                <select
                  id="filter-value-select"
                  value={newFilterValue}
                  onChange={e => setNewFilterValue(e.target.value)}
                  className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                >
                  <option value="">Seleccione un reconocimiento</option>
                  {RECOGNITION_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}

              {newFilterType === 'date' && (
                <select
                  id="filter-value-select"
                  value={newFilterValue}
                  onChange={e => setNewFilterValue(e.target.value)}
                  className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                >
                  <option value="">Seleccione un período</option>
                  <option value="Este Año">Este Año</option>
                  <option value="Todo el histórico">Todo el histórico</option>
                </select>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddFilterModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={!newFilterValue}>
              Aplicar Filtro
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
};

export default BatchList;
