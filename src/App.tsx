import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MainLayout } from './layouts/MainLayout';
import { Button } from './components/Button';
import { Field } from './components/Field';
import { Card, CardHeader, CardBody } from './components/Card';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './components/Modal';
import { Table } from './components/Table';
import { Plus, Download, Settings, ArrowRight } from 'lucide-react';

// --- Dummy Data for Table Showcase ---
type Member = {
  cedula: string;
  name: string;
  status: string;
  type: string;
};

const dummyData: Member[] = [
  { cedula: "1.234.567", name: "Juan Pérez Rodríguez", status: "Registro válido", type: "Adulto" },
  { cedula: "7.890.123", name: "María García López", status: "Registro válido", type: "Adulto" },
  { cedula: "4.567.890", name: "Carlos Ruiz Tena", status: "No registrado", type: "Adulto" },
];

const columns: ColumnDef<Member>[] = [
  {
    accessorKey: "cedula",
    header: "Cédula",
    cell: (info) => <span className="text-primary font-medium">{info.getValue() as string}</span>,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: (info) => <span className="font-semibold text-neutral">{info.getValue() as string}</span>,
  },
  {
    accessorKey: "status",
    header: "Estatus",
  },
  {
    accessorKey: "type",
    header: "Tipo de Miembro",
  },
];

function App() {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const cedulasPlaceholder = `Ingrese las cédulas de los jóvenes, una por línea, sin puntos ni letras:
1234567
7890123
4567890
...`;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* 1. Buttons Section */}
        <Card>
          <CardHeader>1. Botones</CardHeader>
          <CardBody>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-neutral mb-3 uppercase">Variantes</h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primario</Button>
                  <Button variant="secondary">Secundario</Button>
                  <Button variant="outline">Delineado</Button>
                  <Button variant="ghost">Fantasma</Button>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral mb-3 uppercase">Con Iconos</h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" icon={<Plus size={18} />}>Nuevo lote</Button>
                  <Button variant="secondary" icon={<Download size={18} />}>Descargar</Button>
                  <Button variant="outline" icon={<Settings size={18} />}>Ajustes</Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 2. Fields Section */}
        <Card>
          <CardHeader>2. Campos de Entrada</CardHeader>
          <CardBody>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Field label="Nombre del lote" placeholder="Ej. Lote Mayo 2026" />
                <Field label="Campo con Error" variant="error" placeholder="Texto inválido..." errorText="Este campo es obligatorio o tiene un formato incorrecto." />
              </div>
              <div>
                <Field label="Cédulas de Jóvenes" multiline rows={6} placeholder={cedulasPlaceholder} />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 3. Modal Example Section */}
        <Card>
          <CardHeader>3. Modal de Ejemplo</CardHeader>
          <CardBody>
            <p className="text-neutral mb-4">
              Haz clic en el botón a continuación para abrir un componente Modal real (Pop-up) que bloquea el fondo.
            </p>
            <Button variant="primary" onClick={() => setIsConfigModalOpen(true)}>
              Abrir Modal de Configuración
            </Button>
          </CardBody>
        </Card>

        {/* 4. Table Example Section */}
        <Card>
          <CardHeader>4. Tabla de Datos (TanStack)</CardHeader>
          <CardBody className="bg-primary/5 p-6 sm:p-8">
            <Table columns={columns} data={dummyData} />
          </CardBody>
        </Card>

      </div>

      {/* The Actual Modal overlay */}
      <Modal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} className="max-w-3xl w-full">
        <ModalHeader onClose={() => setIsConfigModalOpen(false)}>Central Configuration Card</ModalHeader>
        <ModalBody className="min-h-[200px] flex items-center justify-center">
          <p className="text-neutral/50 text-lg">Contenido de la configuración aquí...</p>
        </ModalBody>
        <ModalFooter>
          <span className="text-sm text-neutral/70 font-medium">Paso 1 de 3: Configuración inicial</span>
          <Button variant="primary" icon={<ArrowRight size={18} />} iconPosition="right" onClick={() => setIsConfigModalOpen(false)}>
            Siguiente paso
          </Button>
        </ModalFooter>
      </Modal>

    </MainLayout>
  );
}

export default App;
