
export interface EventCategory {
  id: string;
  label: string;
  color: string;
}

export const EVENT_CATEGORIES: EventCategory[] = [
  { id: "musica", label: "Música", color: "#8e44ad" },
  { id: "deportivo", label: "Deportes", color: "#e53935" },
  { id: "familiar", label: "Familiar", color: "#43a047" },
  { id: "otros", label: "Otros", color: "#757575" },
];

export const EVENT_SUBCATEGORIES: Record<string, string[]> = {
  deportivo: [
    "Fútbol",
    "Baloncesto",
    "Maraton",
    "Atletismo",
    "Tenis de mesa",
  ],
  musica: [
    "Vallenato",
    "Rock",
    "Metal",
    "Bachata",
    "Salsa",
    "Reguetón",
    "Pop",
  ],
  familiar: [
    "Ferias",
    "Actividades recreativas",
    "Actividades infantiles",
  ],
  otros: [
    "Exposiciones",
    "Conferencias",
    "Talleres",
    "Seminarios",
    "Charlas",
    "Discotecas",
  ],
};

const TIPO_TO_CATEGORY: Record<string, string> = {
  "unidad deportiva": "deportivo",
  polideportivo: "deportivo",
  "complejo deportivo": "deportivo",
  "cancha deportiva": "deportivo",
  gimnasio: "deportivo",
  concierto: "musica",
  festival: "musica",
  "evento musical": "musica",
  "evento familiar": "familiar",
  feria: "familiar",
  parque: "familiar",
};

export function getFeatureCategory(
  properties: Record<string, unknown> | null | undefined
): string {
  if (!properties) return "otros";

  const categoria = properties["categoria"];

  if (typeof categoria === "string" && categoria.trim() !== "") {
    const normalized = categoria.toLowerCase().trim();

    if (EVENT_CATEGORIES.some((category) => category.id === normalized)) {
      return normalized;
    }
  }

  const tipo = properties["tipo"];

  if (typeof tipo === "string") {
    const normalized = tipo.toLowerCase().trim();

    if (TIPO_TO_CATEGORY[normalized]) {
      return TIPO_TO_CATEGORY[normalized];
    }
  }

  return "otros";
}

export function getCategoryColor(categoryId: string): string {
  const found = EVENT_CATEGORIES.find(
    (category) => category.id === categoryId
  );

  return found ? found.color : "#757575";
}

export function getCategoryLabel(categoryId: string): string {
  const found = EVENT_CATEGORIES.find(
    (category) => category.id === categoryId
  );

  return found ? found.label : "Otro";
}
