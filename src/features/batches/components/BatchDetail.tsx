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
  Users,
  MapPin,
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

import { Card, CardBody } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/Modal';
import { Field } from '../../../components/Field';

import {
  getBatchById,
  getMembersByBatchId,
  updateMember,
  deleteBatch,
  getHierarchyData,
  generateBatchReport,
  getRecognitionName
} from '../api';
import { Batch, ScoutMember, Region, District, ScoutGroup } from '../types';
import {
  generateBatchCertificatesPdf,
  downloadSingleCertificatePdf,
  getAllRecognitionTypes,
  RecognitionType
} from '../../recognitions';

export const BatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const batchId = Number(id);

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
      getAllRecognitionTypes()
    ])
      .then(([b, m, hierarchy, recTypes]) => {
        setBatch(b);
        setMembers(m);
        setRegions(hierarchy.regions);
        setDistricts(hierarchy.districts);
        setGroups(hierarchy.groups);
        if (b?.recognition_type) {
          const found = recTypes.find(
            r => r.id === b.recognition_type || r.name.toLowerCase() === b.recognition_type?.toLowerCase()
          );
          setRecognition(found || null);
        }
      })
      .catch((err) => {
        console.error("Error loading batch details:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [batchId]);

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
      setToastMessage(`¡Diplomas descargados exitosamente en ${fileName}!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Error al generar los diplomas en PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSingleDiploma = useCallback(async (member: ScoutMember) => {
    setActiveMenuMemberId(null);
    if (!batch) return;
    try {
      const fileName = await downloadSingleCertificatePdf({
        member,
        batch,
        recognition,
        hierarchy: { regions, districts, groups }
      });
      setToastMessage(`¡Diploma descargado: ${fileName}!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Error generating single diploma:", err);
      alert("Error al descargar el diploma.");
    }
  }, [batch, recognition, regions, districts, groups]);

  const handleDownloadMemberListPDF = async () => {
    if (!batch) return;
    setDownloadingReport(true);
    try {
      await generateBatchReport(batch, members, { regions, districts, groups });
      setToastMessage('Lista de miembros (PDF) generada exitosamente.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Error generating member list PDF:", err);
      alert("Error al generar la lista de miembros en PDF.");
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleEditClick = useCallback((member: ScoutMember) => {
    setActiveMenuMemberId(null);
    setEditingMember({ ...member });
    setIsEditModalOpen(true);
  }, []);

  const handleSaveMemberEdit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMember || !batch) return;

    try {
      await updateMember(editingMember);
      const updated = await getMembersByBatchId(batch.id);
      setMembers(updated);
      setIsEditModalOpen(false);
      setEditingMember(null);
      setToastMessage('Datos del miembro actualizados con éxito.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Error saving member edit:", err);
      alert("Error al actualizar la información del miembro.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!batch) return;
    setDeleting(true);
    try {
      await deleteBatch(batch.id);
      navigate('/lotes');
    } catch (err) {
      console.error("Error deleting batch:", err);
      alert("Error al eliminar el lote.");
      setDeleting(false);
    }
  };

  const getRegionName = (regId: number) => regions.find(r => r.id === regId)?.name || `Región ${regId}`;
  const getDistrictName = (distId: number) => districts.find(d => d.id === distId)?.name || `Distrito ${distId}`;
  const getGroupName = (grpId: number) => groups.find(g => g.id === grpId)?.name || `Grupo ${grpId}`;

  // Totals calculations
  const totals = useMemo(() => {
    return {
      total: members.length,
      young: members.filter(m => m.member_type === 'young').length,
      adult: members.filter(m => m.member_type === 'adult').length,
      valid: members.filter(m => m.status === 'active').length,
      pending: members.filter(m => m.status === 'pending').length
    };
  }, [members]);

  // Filter & Search Logic
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const term = searchQuery.toLowerCase().trim();
    return members.filter(m => {
      const fullName = `${m.first_names} ${m.last_names}`.toLowerCase();
      const code = (m.recognition_code || '').toLowerCase();
      return fullName.includes(term) || m.identity.includes(term) || code.includes(term);
    });
  }, [members, searchQuery]);

  // TanStack Table columns
  const columns = useMemo<ColumnDef<ScoutMember>[]>(() => [
    {
      accessorKey: 'identity',
      header: 'CÉDULA',
      cell: (info) => (
        <span className="font-mono text-xs sm:text-sm text-neutral/80">{info.getValue() as string}</span>
      )
    },
    {
      accessorKey: 'name',
      header: 'NOMBRE',
      cell: (info) => {
        const rowData = info.row.original;
        return (
          <span className="font-bold text-neutral">{rowData.first_names} {rowData.last_names}</span>
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
        const val = info.getValue() as 'active' | 'pending';
        return val === 'active' ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f7eb] text-[#1b7a37] border border-[#c3eed0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1b7a37] mr-1.5 inline-block" />
            Registro Válido
          </span>
        ) : (
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
        const code = (info.getValue() as string) || (rowData.status === 'active' ? `REC-${rowData.identity.slice(-4)}` : '-');
        return (
          <span className="font-mono text-xs sm:text-sm text-neutral/70">{code}</span>
        );
      }
    },
    {
      id: 'actions',
      header: 'ACCIONES',
      cell: ({ row, table }) => {
        const rowData = row.original;
        const isMenuOpen = activeMenuMemberId === rowData.identity;
        const totalRows = table.getRowModel().rows.length;
        const isNearBottom = (row.index >= totalRows - 2 && totalRows > 1) || (totalRows <= 3 && row.index > 0);
        const dropdownPosition = isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1';

        return (
          <div className="flex items-center gap-2 relative">
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
                <div className={`absolute right-0 ${dropdownPosition} w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 font-sans`}>
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
                  {rowData.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleDownloadSingleDiploma(rowData)}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-neutral hover:bg-primary/5 flex items-center gap-2"
                    >
                      <Award className="w-3.5 h-3.5 text-primary" />
                      Descargar Diploma (PDF)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }
    }
  ], [activeMenuMemberId, handleEditClick, handleDownloadSingleDiploma]);

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral tracking-tight">
            Detalle de Lote #{batch.id ? `LT-${new Date(batch.created_at).getFullYear()}-${String(batch.id).padStart(3, '0')}` : 'LT-2024-089'}
            {batch.comment ? ` (${batch.comment})` : ''}
          </h1>
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
            disabled={downloading || totals.valid === 0}
            title={totals.valid === 0 ? "No hay miembros válidos en este lote para generar reporte" : undefined}
            icon={<FileText size={16} />}
            className="bg-[#5c371d] hover:bg-[#4b2c17] text-white font-semibold text-xs sm:text-sm"
          >
            {downloading ? 'Generando PDF...' : 'Descargar todos (PDF)'}
          </Button>
        </div>
      </div>

      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Detalles del Lote */}
        <Card className="shadow-sm border-gray-200">
          <CardBody className="p-6 flex flex-col h-full min-h-[140px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#f5ede2] text-[#935f3b] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-neutral text-base">Detalles del Lote</h2>
            </div>

            <div className="space-y-2 text-xs sm:text-sm my-auto">
              <div className="flex justify-between items-center text-neutral/60">
                <span>Región</span>
                <span className="font-semibold text-neutral">{getRegionName(batch.region_id)}</span>
              </div>
              <div className="flex justify-between items-center text-neutral/60">
                <span>Distrito</span>
                <span className="font-semibold text-neutral">{getDistrictName(batch.district_id)}</span>
              </div>
              <div className="flex justify-between items-center text-neutral/60">
                <span>Grupo</span>
                <span className="font-semibold text-neutral">{getGroupName(batch.group_id)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Card 2: Tipo de Reconocimiento */}
        <Card className="shadow-sm border-gray-200">
          <CardBody className="p-6 flex flex-col h-full min-h-[140px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#f5ede2] text-[#935f3b] flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-neutral text-base">Tipo de Reconocimiento</h2>
            </div>

            <div className="text-center my-auto py-2">
              <div className="text-xl sm:text-2xl font-extrabold text-[#743e1d]">
                {recognitionTitle}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Card 3: Resumen de Miembros */}
        <Card className="shadow-sm border-gray-200">
          <CardBody className="p-6 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#e6f0fa] text-[#0284c7] flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-neutral text-base">Resumen de Miembros</h2>
            </div>

            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl sm:text-3xl font-black text-neutral">
                  {totals.total}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-neutral/50">Total</span>
              </div>

              {/* Sub-grid Adultos & Jóvenes */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-[#f5f5f4] rounded-xl p-2 px-3">
                  <div className="text-[10px] font-bold text-neutral/50 uppercase">Adultos</div>
                  <div className="text-sm font-extrabold text-neutral">{totals.adult}</div>
                </div>
                <div className="bg-[#f5f5f4] rounded-xl p-2 px-3">
                  <div className="text-[10px] font-bold text-neutral/50 uppercase">Jóvenes</div>
                  <div className="text-sm font-extrabold text-neutral">{totals.young}</div>
                </div>
              </div>

              {/* Sin registrar alert box */}
              <div className="bg-[#feeae8] border border-[#fccfca] rounded-xl px-3 py-1.5 flex justify-between items-center text-xs font-bold text-[#c92a2a]">
                <span>Sin registrar</span>
                <span className="text-sm font-black">{totals.pending}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Members Table Container ("Miembros del Lote") */}
      <div className="w-full bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Table Header with Search Input */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-base sm:text-lg font-bold text-neutral">
            Miembros del Lote
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral/40 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar miembro..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-[#faf8f5] text-neutral text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-neutral/40"
            />
          </div>
        </div>

        {/* TanStack Table */}
        <div className="overflow-x-auto min-h-[260px] pb-12">
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
              {currentPageRows.length > 0 ? (
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
            Mostrando {currentPageRows.length > 0 ? `${pageIndex * 10 + 1}-${Math.min((pageIndex + 1) * 10, filteredMembers.length)}` : 0} de {filteredMembers.length} miembros
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

            {Array.from({ length: pageCount }, (_, i) => i).slice(0, 5).map(idx => (
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
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-xl">
        <ModalHeader onClose={() => setIsEditModalOpen(false)}>Editar Datos de Miembro</ModalHeader>
        {editingMember && (
          <form onSubmit={handleSaveMemberEdit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <ModalBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Nombres *"
                  value={editingMember.first_names}
                  onChange={e => setEditingMember({ ...editingMember, first_names: e.target.value })}
                  required
                />
                <Field
                  label="Apellidos *"
                  value={editingMember.last_names}
                  onChange={e => setEditingMember({ ...editingMember, last_names: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Fecha de Nacimiento *"
                  type="date"
                  value={editingMember.birth_date}
                  onChange={e => setEditingMember({ ...editingMember, birth_date: e.target.value })}
                  required
                />
                <div>
                  <label htmlFor="member-type-select" className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral">
                    Tipo de Miembro *
                  </label>
                  <select
                    id="member-type-select"
                    value={editingMember.member_type}
                    onChange={e => setEditingMember({ ...editingMember, member_type: e.target.value as 'young' | 'adult' })}
                    className="w-full rounded-field px-4 py-2.5 bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="young">Joven</option>
                    <option value="adult">Adulto</option>
                  </select>
                </div>
              </div>
              <Field
                label="Correo Electrónico"
                type="email"
                value={editingMember.email || ''}
                onChange={e => setEditingMember({ ...editingMember, email: e.target.value })}
              />
              <Field
                label="Teléfono de Contacto"
                value={editingMember.phone || ''}
                onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })}
              />
              <Field
                label="Código de Reconocimiento"
                value={editingMember.recognition_code || ''}
                onChange={e => setEditingMember({ ...editingMember, recognition_code: e.target.value })}
                placeholder="Ej. SP-5Y-001"
              />
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Guardar Cambios
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* Member Quick View Details Modal */}
      <Modal isOpen={viewingMember !== null} onClose={() => setViewingMember(null)} className="max-w-md">
        <ModalHeader onClose={() => setViewingMember(null)}>
          Ficha del Miembro Scout
        </ModalHeader>
        {viewingMember && (
          <ModalBody className="space-y-4 font-sans text-neutral">
            <div className="bg-[#faf8f5] p-4 rounded-xl border border-gray-200 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-neutral/50 font-semibold">Cédula de Identidad</span>
                <span className="font-mono font-bold text-neutral">{viewingMember.identity}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-neutral/50 font-semibold">Nombre Completo</span>
                <span className="font-bold text-neutral">{viewingMember.first_names} {viewingMember.last_names}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-neutral/50 font-semibold">Tipo</span>
                <span className="font-semibold text-neutral">{viewingMember.member_type === 'young' ? 'Joven' : 'Adulto'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-neutral/50 font-semibold">Estatus</span>
                <span className={`font-bold ${viewingMember.status === 'active' ? 'text-green-700' : 'text-red-700'}`}>
                  {viewingMember.status === 'active' ? '● Registro Válido' : '● Registro Inválido'}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-neutral/50 font-semibold">Código de Reconocimiento</span>
                <span className="font-mono font-bold text-neutral">{viewingMember.recognition_code || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-neutral/50 font-semibold">Fecha Nacimiento</span>
                <span className="font-semibold text-neutral">{viewingMember.birth_date || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-neutral/50 font-semibold">Correo Electrónico</span>
                <span className="font-semibold text-neutral">{viewingMember.email || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral/50 font-semibold">Teléfono</span>
                <span className="font-semibold text-neutral">{viewingMember.phone || '-'}</span>
              </div>
            </div>
          </ModalBody>
        )}
        <ModalFooter>
          <Button variant="primary" onClick={() => setViewingMember(null)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal: Confirmar Eliminación de Lote */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => !deleting && setIsDeleteModalOpen(false)} className="max-w-md">
        <ModalHeader onClose={() => !deleting && setIsDeleteModalOpen(false)}>
          Eliminar Lote
        </ModalHeader>
        <ModalBody className="space-y-3">
          <p className="text-sm text-neutral">
            ¿Está seguro de que desea eliminar el lote{' '}
            <span className="font-bold">#{batch.id}</span>
            {batch.comment ? ` (${batch.comment})` : ''} y todos sus miembros asociados?
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

    </div>
  );
};

export default BatchDetail;
