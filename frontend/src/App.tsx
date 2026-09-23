import { useCallback, useEffect, useState } from "react";
import MapComponent from "./components/Map";
import Sidebar from "./components/Sidebar";
import AdminLogin from "./components/AdminLogin";
import type { LayerProjectionInfo } from "./projections/detectLayerProjection";
import type { CapturedPoint } from "./projections/types";
import type { GeoJSONLayer } from "./projections/layers";
import { detectLayerProjection } from "./projections/detectLayerProjection";
import { EVENT_CATEGORIES } from "./projections/eventCategories";
import { supabase } from "./lib/supabaseClient";
import "./App.css";

function App() {
  // SRE del visor
  const [projection, setProjection] =
    useState("EPSG:3857");

  // SRE que el usuario selecciona como destino
  const [targetProjection, setTargetProjection] =
    useState("EPSG:3857");

  // Información del SRE original de la capa
  const [layerProjection, setLayerProjection] =
    useState<LayerProjectionInfo | null>(null);

  // Coordenada capturada
  const [capturedPoint, setCapturedPoint] =
    useState<CapturedPoint | null>(null);

  // Coordenada del clic en el mapa, siempre en EPSG:4326, para el
  // formulario de creación de eventos.
  const [selectedPoint, setSelectedPoint] =
    useState<{ lng: number; lat: number } | null>(null);

  // SRE al que fue reproyectada la capa
  const [layerTargetProjection, setLayerTargetProjection] =
    useState<string | null>(null);

  // Resultado GeoJSON de la reproyección
  const [reprojectedLayer, setReprojectedLayer] =
    useState<unknown | null>(null);

  // Capas GeoJSON cargadas por el usuario
  const [layers, setLayers] =
    useState<GeoJSONLayer[]>([]);

  // Categorías de evento activas en el panel "Filtrar eventos"
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    () => new Set(EVENT_CATEGORIES.map((category) => category.id))
  );

  // Estado de autenticación del administrador
  const [esAdmin, setEsAdmin] = useState(false);

  // Controla la ventana de inicio de sesión
  const [mostrarLogin, setMostrarLogin] = useState(false);

  const comprobarAdministrador = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setEsAdmin(false);
      return;
    }

    const { data, error } = await supabase.rpc("es_admin");

    if (error || !data) {
      setEsAdmin(false);
      return;
    }

    setEsAdmin(true);
  }, []);

  useEffect(() => {
    comprobarAdministrador();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      comprobarAdministrador();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [comprobarAdministrador]);

  const handleLogin = () => {
    setEsAdmin(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setEsAdmin(false);
  };

  const handleToggleCategory = (categoryId: string) => {
    setActiveCategories((previous) => {
      const next = new Set(previous);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  };

  const handlePointSelected = useCallback((lonLat: [number, number]) => {
    setSelectedPoint({ lng: lonLat[0], lat: lonLat[1] });
  }, []);

  const handleReproject = async () => {
    if (!layerProjection) {
      console.log(
        "No hay información del SRE de la capa"
      );
      return;
    }

    try {
      // Los eventos ya no se obtienen desde deportivos.geojson.
      // Su fuente actual es Supabase y Map.tsx se encarga de
      // reproyectarlos manteniendo su información completa,
      // incluido flyer_path.
      setReprojectedLayer(null);
      setLayerTargetProjection(targetProjection);
    } catch (error) {
      console.error(
        "Error al reproyectar la capa:",
        error
      );
    }
  };

  const handleGeoJSONLoaded = (
    data: unknown,
    fileName: string
  ) => {
    const projectionInfo =
      detectLayerProjection(data);

    const newLayer: GeoJSONLayer = {
      id: crypto.randomUUID(),
      name: fileName,
      data,
      visible: true,
      projection: projectionInfo,
    };

    setLayers((previousLayers) => [
      ...previousLayers,
      newLayer,
    ]);
  };

  const handleLayerVisibilityChange = (
    id: string,
    visible: boolean
  ) => {
    setLayers((previousLayers) =>
      previousLayers.map((layer) =>
        layer.id === id
          ? { ...layer, visible }
          : layer
      )
    );
  };

  const handleLayerDelete = (id: string) => {
    setLayers((previousLayers) =>
      previousLayers.filter((layer) => layer.id !== id)
    );
  };

  const handleLayerDownload = (id: string) => {
    const layer = layers.find((item) => item.id === id);

    if (!layer) return;

    const blob = new Blob(
      [JSON.stringify(layer.data, null, 2)],
      { type: "application/geo+json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = layer.name.toLowerCase().endsWith(".geojson")
      ? layer.name
      : `${layer.name}.geojson`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-layout">
      <header className="app-layout__header">
        <h1>GeoPortal</h1>

        <div className="app-layout__auth">
          {esAdmin ? (
            <button
              type="button"
              className="app-layout__auth-button"
              onClick={handleLogout}
            >
              Cerrar sesión
            </button>
          ) : (
            <button
              type="button"
              className="app-layout__auth-button"
              onClick={() => setMostrarLogin(true)}
            >
              🔐 Iniciar sesión
            </button>
          )}
        </div>
      </header>

      <div className="app-layout__body">
        <MapComponent
          projection={projection}
          layers={layers}
          layerTargetProjection={
            layerTargetProjection
          }
          reprojectedLayer={
            reprojectedLayer
          }
          activeCategories={activeCategories}
          onLayerProjectionChange={
            setLayerProjection
          }
          onCoordinateCapture={
            setCapturedPoint
          }
          onPointSelected={
            handlePointSelected
          }
        />

        <Sidebar
          capturedPoint={capturedPoint}
          selectedPoint={selectedPoint}
          isAdmin={esAdmin}
          onFileLoaded={handleGeoJSONLoaded}
          activeCategories={activeCategories}
          onToggleCategory={handleToggleCategory}
          layers={layers}
          onLayerVisibilityChange={handleLayerVisibilityChange}
          onLayerDelete={handleLayerDelete}
          onLayerDownload={handleLayerDownload}
          projection={projection}
          onProjectionChange={setProjection}
          layerProjection={layerProjection}
          targetProjection={targetProjection}
          onTargetProjectionChange={setTargetProjection}
          onReproject={handleReproject}
        />
      </div>

      {mostrarLogin && (
        <AdminLogin
          onLogin={handleLogin}
          onClose={() => setMostrarLogin(false)}
        />
      )}
    </div>
  );
}

export default App;
