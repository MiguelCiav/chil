import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender
} from '@tanstack/react-table';
import {
  Download,
  Search,
  Award,
  AlertCircle,
  Edit2,
  CheckCircle2,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  FileText,
  Trash2
} from 'lucide-react';

import { Button } from '../../../components/Button';
import {
  useWalkthrough,
  WalkthroughOverlay,
  WalkthroughHelpButton,
  WalkthroughStep
} from '../../../components/walkthrough';
import {
  getBatchById,
  getMembersByBatchId,
  updateMember,
  deleteBatch,
  getHierarchyData,
  generateBatchReport,
  getRecognitionName
} from '../api';
import {
  Batch,
  ScoutMember,
  Region,
  District,
  ScoutGroup,
  MemberStatus,
  ScoutUnit,
  getUnitBadge
} from '../types';
import {
  generateBatchCertificatesPdf,
  downloadSingleCertificatePdf,
  getAllRecognitionTypes,
  RecognitionType
} from '../../recognitions';
import { useAuth } from '../../auth';

import { BatchSummaryCards } from './detail/BatchSummaryCards';
import { EditMemberModal } from './detail/EditMemberModal';
import { MemberQuickViewModal } from './detail/MemberQuickViewModal';
import { DeleteBatchModal } from './detail/DeleteBatchModal';

const BATCH_DETAIL_TOUR_STEPS: WalkthroughStep[] = [
  {
    id: 'batch-detail-header',
    targetSelector: '[data-walkthrough="batch-detail-header"]',
    title: 'Detalle y Acciones del Lote',
    content:
      'Consulta la información completa del lote. Desde la cabecera puedes descargar todos los reconocimientos oficiales en PDF, generar el reporte de lista o eliminar el lote si es necesario.',
    placement: 'bottom'
  },
  {
    id: 'batch-detail-summary-cards',
    targetSelector: '[data-walkthrough="batch-detail-summary-cards"]',
    title: 'Resumen y Observaciones',
    content:
      'Revisa la estructura geográfica, el tipo de reconocimiento otorgado, el desglose demográfico de miembros (Jóvenes y Adultos) y los comentarios u observaciones registradas.',
    placement: 'bottom'
  },
  {
    id: 'batch-detail-members-table',
    targetSelector: '[data-walkthrough="batch-detail-members-table"]',
    title: 'Listado de Homenajeados',
    content:
      'Visualiza todos los miembros del lote con su cédula, nombres, unidad scout (Manada, Tropa, No Scout, etc.), estatus y código oficial de reconocimiento.',
    placement: 'top'
  },
  {
    id: 'batch-detail-table-actions',
    targetSelector: '[data-walkthrough="batch-detail-table-actions"]',
    title: 'Gestión Individual de Miembros',
    content:
      'Desde el menú de 3 puntos en cada fila puedes descargar el reconocimiento individual en PDF, consultar la vista rápida o editar los datos (incluyendo la autorización con justificación para casos excepcionales).',
    placement: 'left'
  }
];

export const BatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const batchId = Number(id);

  const {
    isOpen: isTourOpen,
    currentStep,
    currentStepIndex,
    totalSteps,
    targetRect,
    startTour,
    nextStep,
    prevStep,
    skipTour
  } = useWalkthrough({
    tourId: 'batch-detail-tour',
    steps: BATCH_DETAIL_TOUR_STEPS,
    userId: user?.uid
  });

  const [batch, setBatch] = useState<Batch | null>(null);
  const [members, setMembers] = useState<ScoutMember[]>([]);
  const [loading, setLoading] = useState(!Number.isNaN(Number(id)));
  const [searchQuery, setSearchQuery] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Dropdown action menu per member row
  const [activeMenuMemberId, setActiveMenuMemberId] = useState<string | null>(null);

  // Quick View Member Modal
  const [viewingMember, setViewingMember] = useState<ScoutMember | null>(null);

  // Editing Member Modal
  const [editingMember, setEditingMember] = useState<ScoutMember | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Recognition template cache
  const [recognition, setRecognition] = useState<RecognitionType | null>(null);

  // Hierarchy cache
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);

  useEffect(() => {
    if (Number.isNaN(batchId)) {
      return;
    }

    Promise.all([
      getBatchById(batchId),
      getMembersByBatchId(batchId),
      getHierarchyData(),
      getAllRecognitionTypes(user?.uid)
    ])
      .then(([b, m, hierarchy, recTypes]) => {
        setBatch(b);
        setMembers(m);
        setRegions(hierarchy.regions);
        setDistricts(hierarchy.districts);
        setGroups(hierarchy.groups);
        if (b?.recognition_type) {
          const found = recTypes.find(
            (r) =>
              r.id === b.recognition_type ||
              r.name.toLowerCase() === b.recognition_type?.toLowerCase()
          );
          setRecognition(found || null);
        }
      })
      .catch((err) => {
        console.error('Error loading batch details:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [batchId, user?.uid]);

  const handleDownloadPDF = async () => {
    if (!batch) return;
    setDownloading(true);
    try {
      const fileName = await generateBatchCertificatesPdf({
        batch,
        members,
        recognition,
        hierarchy: { regions, districts, groups }
      });
      setToastMessage(`¡Reconocimientos descargados exitosamente en ${fileName}!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error al generar los reconocimientos en PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSingleRecognition = useCallback(
    async (member: ScoutMember) => {
      setActiveMenuMemberId(null);
      if (!batch) return;
      try {
        const fileName = await downloadSingleCertificatePdf({
          member,
          batch,
          recognition,
          hierarchy: { regions, districts, groups }
        });
        setToastMessage(`¡Reconocimiento descargado: ${fileName}!`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (err) {
        console.error('Error generating single recognition:', err);
        alert('Error al descargar el reconocimiento.');
      }
    },
    [batch, recognition, regions, districts, groups]
  );

  const handleDownloadMemberListPDF = async () => {
    if (!batch) return;
    setDownloadingReport(true);
    try {
      await generateBatchReport(batch, members, { regions, districts, groups });
      setToastMessage('Lista de miembros (PDF) generada exitosamente.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Error generating member list PDF:', err);
      alert('Error al generar la lista de miembros en PDF.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleEditClick = useCallback((member: ScoutMember) => {
    setActiveMenuMemberId(null);
    setEditingMember({ ...member });
    setIsEditModalOpen(true);
  }, []);

  const handleSaveMemberEdit = async (updatedMember: ScoutMember) => {
    if (!batch) return;

    try {
      await updateMember(updatedMember);
      const updated = await getMembersByBatchId(batch.id);
      setMembers(updated);
      setIsEditModalOpen(false);
      setEditingMember(null);
      setToastMessage('Datos del miembro actualizados con éxito.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Error saving member edit:', err);
      alert('Error al actualizar la información del miembro.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!batch) return;
    setDeleting(true);
    try {
      await deleteBatch(batch.id);
      navigate('/lotes');
    } catch (err) {
      console.error('Error deleting batch:', err);
      alert('Error al eliminar el lote.');
      setDeleting(false);
    }
  };

  // Totals calculations
  const totals = useMemo(() => {
    return {
      total: members.length,
      young: members.filter((m) => m.member_type === 'young').length,
      adult: members.filter((m) => m.member_type === 'adult').length,
      valid: members.filter((m) => m.status === 'active').length,
      exceptional: members.filter((m) => m.status === 'exceptional').length,
      eligible: members.filter((m) => m.status === 'active' || m.status === 'exceptional').length,
      pending: members.filter((m) => m.status === 'pending').length
    };
  }, [members]);

  // Filter & Search Logic
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const term = searchQuery.toLowerCase().trim();
    return members.filter((m) => {
      const fullName = `${m.first_names} ${m.last_names}`.toLowerCase();
      const code = (m.recognition_code || '').toLowerCase();
      return fullName.includes(term) || m.identity.includes(term) || code.includes(term);
    });
  }, [members, searchQuery]);

  // TanStack Table columns
  const columns = useMemo<ColumnDef<ScoutMember>[]>(
    () => [
      {
        accessorKey: 'identity',
        header: 'CÉDULA',
        cell: (info) => (
          <span className="font-mono text-xs sm:text-sm text-neutral/80">
            {info.getValue() as string}
          </span>
        )
      },
      {
        accessorKey: 'name',
        header: 'NOMBRE',
        cell: (info) => {
          const rowData = info.row.original;
          return (
            <span className="font-bold text-neutral">
              {rowData.first_names} {rowData.last_names}
            </span>
          );
        }
      },
      {
        accessorKey: 'unit',
        header: 'UNIDAD',
        cell: (info) => {
          const unit = info.getValue() as ScoutUnit | undefined;
          const badge = getUnitBadge(unit);
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.badgeClass}`}
            >
              {badge.label}
            </span>
          );
        }
      },
      {
        accessorKey: 'member_type',
        header: 'TIPO',
        cell: (info) => {
          const val = info.getValue() as 'young' | 'adult';
          return (
            <span className="text-neutral/70 font-medium text-sm">
              {val === 'young' ? 'Joven' : 'Adulto'}
            </span>
          );
        }
      },
      {
        accessorKey: 'status',
        header: 'ESTATUS',
        cell: (info) => {
          const val = info.getValue() as MemberStatus;
          if (val === 'active') {
            return (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f7eb] text-[#1b7a37] border border-[#c3eed0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1b7a37] mr-1.5 inline-block" />
                Registro Válido
              </span>
            );
          }
          if (val === 'exceptional') {
            return (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#f3e8ff] text-[#7e22ce] border border-[#e9d5ff]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7e22ce] mr-1.5 inline-block" />
                Emisión Excepcional
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#feeae8] text-[#c92a2a] border border-[#fccfca]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c92a2a] mr-1.5 inline-block" />
              Registro Inválido
            </span>
          );
        }
      },
      {
        accessorKey: 'recognition_code',
        header: 'CÓDIGO REC.',
        cell: (info) => {
          const rowData = info.row.original;
          const code =
            (info.getValue() as string) ||
            (rowData.status === 'active' || rowData.status === 'exceptional'
              ? `REC-${rowData.identity.slice(-4)}`
              : '-');
          return <span className="font-mono text-xs sm:text-sm text-neutral/70">{code}</span>;
        }
      },
      {
        id: 'actions',
        header: 'ACCIONES',
        cell: ({ row, table }) => {
          const rowData = row.original;
          const isMenuOpen = activeMenuMemberId === rowData.identity;
          const totalRows = table.getRowModel().rows.length;
          const isNearBottom =
            (row.index >= totalRows - 2 && totalRows > 1) || (totalRows <= 3 && row.index > 0);
          const dropdownPosition = isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1';

          return (
            <div
              data-walkthrough="batch-detail-table-actions"
              className="flex items-center gap-2 relative"
            >
              {/* Quick View Eye Icon Button */}
              <button
                type="button"
                onClick={() => setViewingMember(rowData)}
                className="p-1.5 text-neutral/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title="Ver detalle del miembro"
                aria-label={`Ver detalle de ${rowData.first_names} ${rowData.last_names}`}
              >
                <Eye className="w-4 h-4" />
              </button>

              {/* Actions 3-Dots Menu */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setActiveMenuMemberId(isMenuOpen ? null : rowData.identity)}
                  className="p-1.5 text-neutral/60 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus:outline-none"
                  aria-label={`Opciones de ${rowData.first_names} ${rowData.last_names}`}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isMenuOpen && (
                  <div
                    className={`absolute right-0 ${dropdownPosition} w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 font-sans`}
                  >
                    <button
                      type="button"
                      onClick={() => handleEditClick(rowData)}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-primary" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuMemberId(null);
                        setViewingMember(rowData);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 flex items-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      Ver Ficha
                    </button>
                    {(rowData.status === 'active' || rowData.status === 'exceptional') && (
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleRecognition(rowData)}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 flex items-center gap-2"
                      >
                        <Award className="w-3.5 h-3.5 text-primary" />
                        Descargar Reconocimiento (PDF)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }
      }
    ],
    [activeMenuMemberId, handleEditClick, handleDownloadSingleRecognition]
  );

  const table = useReactTable({
    data: filteredMembers,
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
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] font-sans text-neutral/50">
        Cargando detalles de lote...
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-12 font-sans">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-neutral">Lote no encontrado</h2>
        <Button variant="primary" onClick={() => navigate('/lotes')}>
          Volver al listado
        </Button>
      </div>
    );
  }

  const recognitionTitle = batch.recognition_type
    ? getRecognitionName(batch.recognition_type)
    : 'Servicio Prolongado';

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans py-2 relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-neutral text-white px-5 py-3 rounded-2xl shadow-xl border border-primary/20 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header with Title and Action Buttons */}
      <div
        data-walkthrough="batch-detail-header"
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral tracking-tight">
              Lote #{batch.id}
            </h1>
            <WalkthroughHelpButton onClick={() => startTour()} />
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
              {`LT-${new Date(batch.created_at).getFullYear()}-${String(batch.id).padStart(3, '0')}`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral/60 font-medium mt-1">
            Revisión y gestión de reconocimientos del lote actual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsDeleteModalOpen(true)}
            icon={<Trash2 size={16} />}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold text-xs sm:text-sm"
          >
            Eliminar Lote
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadMemberListPDF}
            disabled={downloadingReport}
            icon={<Download size={16} />}
            className="border-gray-200 hover:bg-gray-50 text-neutral font-semibold text-xs sm:text-sm"
          >
            {downloadingReport ? 'Generando PDF...' : 'Descargar lista'}
          </Button>

          <Button
            variant="primary"
            onClick={handleDownloadPDF}
            disabled={downloading || totals.eligible === 0}
            title={
              totals.eligible === 0
                ? 'No hay miembros habilitados (activos o con emisión excepcional) en este lote para generar reconocimientos'
                : undefined
            }
            icon={<FileText size={16} />}
            className="bg-[#5c371d] hover:bg-[#4b2c17] text-white font-semibold text-xs sm:text-sm"
          >
            {downloading ? 'Generando PDF...' : 'Descargar Reconocimientos (PDF)'}
          </Button>
        </div>
      </div>

      {/* Top 4 Information Cards */}
      <BatchSummaryCards
        batch={batch}
        totals={totals}
        recognitionTitle={recognitionTitle}
        regions={regions}
        districts={districts}
        groups={groups}
      />

      {/* Members Table Container ("Miembros del Lote") */}
      <div
        data-walkthrough="batch-detail-members-table"
        className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
      >
        {/* Table Header with Search Input */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-base sm:text-lg font-bold text-neutral">Miembros del Lote</h2>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral/40 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar miembro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-[#faf8f5] text-neutral text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-neutral/40"
            />
          </div>
        </div>

        {/* TanStack Table */}
        <div className="overflow-x-auto min-h-[260px] pb-12">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-gray-200 bg-[#faf8f5]">
                {table.getHeaderGroups().map((headerGroup) =>
                  headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-xs font-extrabold text-neutral/70 uppercase tracking-wider"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {currentPageRows.length > 0 ? (
                currentPageRows.map((row, index) => {
                  const isLast = index === currentPageRows.length - 1;
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-[#faf8f5] transition-colors ${
                        !isLast ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-6 py-4 text-sm whitespace-nowrap text-neutral"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-neutral/50">
                    No se encontraron miembros para el criterio de búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Numbered Pagination Controls */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-neutral/60">
          <div>
            Mostrando{' '}
            {currentPageRows.length > 0
              ? `${pageIndex * 10 + 1}-${Math.min(
                  (pageIndex + 1) * 10,
                  filteredMembers.length
                )}`
              : 0}{' '}
            de {filteredMembers.length} miembros
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

            {Array.from({ length: pageCount }, (_, i) => i)
              .slice(0, 5)
              .map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => table.setPageIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                    pageIndex === idx
                      ? 'bg-[#743e1d] text-white'
                      : 'text-neutral/70 hover:bg-gray-100'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}

            {pageCount > 5 && <span className="px-1 text-neutral/40">...</span>}

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

      {/* Manual Member Edit Modal */}
      <EditMemberModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        member={editingMember}
        onSave={handleSaveMemberEdit}
      />

      {/* Member Quick View Details Modal */}
      <MemberQuickViewModal
        member={viewingMember}
        onClose={() => setViewingMember(null)}
      />

      {/* Modal: Confirmar Eliminación de Lote */}
      <DeleteBatchModal
        isOpen={isDeleteModalOpen}
        batchId={batch.id}
        batchComment={batch.comment}
        deleting={deleting}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* Walkthrough Interactive Guide Overlay */}
      <WalkthroughOverlay
        isOpen={isTourOpen}
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        targetRect={targetRect}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
        onClose={skipTour}
      />
    </div>
  );
};

export default BatchDetail;
