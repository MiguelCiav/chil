import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  FileText, 
  Settings, 
  Users, 
  Calendar,
  Database,
  ArrowRight,
  FolderOpen
} from 'lucide-react';

import { Card, CardHeader, CardBody } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Table } from '../../../components/Table';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/Modal';
import { Field } from '../../../components/Field';
import { ColumnDef } from '@tanstack/react-table';

import { getAllBatches, getMembersByBatchId, getHierarchyData } from '../api';
import { Batch, Region, District, ScoutGroup } from '../types';

export const BatchList: React.FC = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local Path Configuration
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [dbPath, setDbPath] = useState('sqlite://sqlite.db');

  // Hierarchy cache for display
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);

  useEffect(() => {
    Promise.all([
      getAllBatches(),
      getHierarchyData()
    ])
      .then(async ([batchesList, hierarchy]) => {
        setBatches(batchesList);
        setRegions(hierarchy.regions);
        setDistricts(hierarchy.districts);
        setGroups(hierarchy.groups);

        // Fetch member counts for all batches
        const counts: Record<number, number> = {};
        for (const b of batchesList) {
          const members = await getMembersByBatchId(b.id);
          counts[b.id] = members.length;
        }
        setMemberCounts(counts);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSavePath = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    localStorage.setItem('chil_sqlite_db_path', dbPath);
    setIsConfigOpen(false);
    alert(`Ruta de base de datos actualizada exitosamente.`);
  };

  const getRegionName = (regionId: number) => regions.find(r => r.id === regionId)?.name || `Región ${regionId}`;
  const getDistrictName = (districtId: number) => districts.find(d => d.id === districtId)?.name || `Distrito ${districtId}`;
  const getGroupName = (groupId: number) => groups.find(g => g.id === groupId)?.name || `Grupo ${groupId}`;

  const filteredBatches = batches.filter(b => {
    const term = searchQuery.toLowerCase();
    const name = b.name.toLowerCase();
    const region = getRegionName(b.region_id).toLowerCase();
    const district = getDistrictName(b.district_id).toLowerCase();
    const group = getGroupName(b.group_id).toLowerCase();
    
    return name.includes(term) || region.includes(term) || district.includes(term) || group.includes(term);
  });

  const columns: ColumnDef<Batch>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre del Lote',
      cell: (info) => (
        <span className="font-semibold text-neutral">{info.getValue() as string}</span>
      )
    },
    {
      accessorKey: 'region_id',
      header: 'Organización Scout',
      cell: (info) => {
        const rowData = info.row.original;
        return (
          <div className="flex flex-col text-xs font-medium text-neutral/70">
            <span className="font-bold text-primary">{getRegionName(rowData.region_id)}</span>
            <span>{getDistrictName(rowData.district_id)} • {getGroupName(rowData.group_id)}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'created_at',
      header: 'Creado el',
      cell: (info) => {
        const val = info.getValue() as string;
        const date = new Date(val);
        return (
          <span className="text-xs text-neutral/50 font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-neutral/40" />
            {date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      }
    },
    {
      id: 'members',
      header: 'Miembros',
      cell: (info) => {
        const rowData = info.row.original;
        const count = memberCounts[rowData.id] || 0;
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
            <Users className="w-3.5 h-3.5 mr-1" />
            {count} Miembros
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: (info) => {
        const rowData = info.row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/lotes/${rowData.id}`)}
            icon={<ArrowRight size={14} />}
            iconPosition="right"
          >
            Ver Detalle
          </Button>
        );
      }
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral tracking-tight flex items-center gap-2">
            Módulo de Lotes
          </h1>
          <p className="text-sm text-neutral/50 font-medium mt-1">Cargue, verifique y gestione las cédulas de afiliación de sus miembros.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsConfigOpen(true)}
            icon={<Settings size={18} />}
          >
            Configurar BD
          </Button>
          <Link to="/lotes/nuevo" className="flex-1 md:flex-initial">
            <Button
              variant="primary"
              fullWidth
              icon={<Plus size={18} />}
            >
              Nuevo Lote
            </Button>
          </Link>
        </div>
      </div>

      {/* Database Connection Summary Badge */}
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2.5 rounded-2xl text-xs font-semibold text-green-700 shadow-sm">
        <Database className="w-4 h-4 text-green-600 animate-pulse" />
        <span>Conectado a la Base de Datos SQLite:</span>
        <span className="font-mono text-neutral/70 bg-white px-2 py-0.5 rounded border border-gray-100">{dbPath}</span>
      </div>

      {/* Main List Layout */}
      <Card className="shadow-lg border-primary/10">
        <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span className="font-bold text-neutral">Listado de Lotes Registrados</span>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral/40 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar lote..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-primary/20 bg-primary/5 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-8 text-center text-neutral/40">Cargando lotes...</div>
          ) : (
            <Table columns={columns} data={filteredBatches} className="border-0 rounded-none shadow-none" />
          )}
        </CardBody>
      </Card>

      {/* Database Connection Path Modal */}
      <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} className="max-w-md">
        <ModalHeader onClose={() => setIsConfigOpen(false)}>Configuración de Base de Datos</ModalHeader>
        <form onSubmit={handleSavePath}>
          <ModalBody className="space-y-4">
            <p className="text-sm text-neutral/60 font-medium">
              Especifique la ruta local o URL de conexión de SQLite para almacenar las verificaciones y lotes.
            </p>
            <Field
              label="Ruta de Base de Datos SQLite *"
              value={dbPath}
              onChange={e => setDbPath(e.target.value)}
              required
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsConfigOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" icon={<FolderOpen size={16} />}>
              Guardar Ruta
            </Button>
          </ModalFooter>
        </form>
      </Modal>

    </div>
  );
};
export default BatchList;
