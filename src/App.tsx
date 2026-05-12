import { MainLayout } from './layouts/MainLayout';

function App() {
  return (
    <MainLayout>
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-primary mb-4">Bienvenido a Chil</h1>
        <p className="text-neutral">
          Esta es la página de inicio. Aquí irá el contenido de la aplicación.
        </p>
      </div>
    </MainLayout>
  );
}

export default App;
