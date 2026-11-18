import { EVENT_CATEGORIES } from "../projections/eventCategories";
import "./EventFilter.css";

interface EventFilterProps {
  activeCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
}

function EventFilter({
  activeCategories,
  onToggleCategory,
}: EventFilterProps) {
  return (
    <section className="event-filter">
      <h3 className="event-filter__title">Filtrar por categoría</h3>

      <ul className="event-filter__list">
        {EVENT_CATEGORIES.map((category) => (
          <li key={category.id} className="event-filter__item">
            <label className="event-filter__label">
              <input
                type="checkbox"
                checked={activeCategories.has(category.id)}
                onChange={() => onToggleCategory(category.id)}
              />

              <span
                className="event-filter__dot"
                style={{ backgroundColor: category.color }}
              />

              {category.label}
            </label>
          </li>
        ))}
      </ul>

      <div className="event-filter__legend">
        <h4 className="event-filter__legend-title">Cómo leer el mapa</h4>

        <ul className="event-filter__legend-list">
          <li>
            <span className="event-filter__symbol">
              <svg
                width="15"
                height="17"
                viewBox="0 0 32 36"
                aria-hidden="true"
              >
                <path
                  d="M16 2.5 30 12.5V30a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V12.5z"
                  fill="currentColor"
                />
              </svg>
            </span>

            <span>
              <strong>Lugar fijo</strong>
              <small>Estructura que siempre está ahí</small>
            </span>
          </li>

          <li>
            <span className="event-filter__symbol">
              <span className="event-filter__ring-upcoming" />
            </span>

            <span>
              <strong>Evento próximo</strong>
              <small>Todavía no empieza</small>
            </span>
          </li>

          <li>
            <span className="event-filter__symbol">
              <span className="event-filter__live">
                <i />
              </span>
            </span>

            <span>
              <strong>En vivo ahora</strong>
              <small>Está sucediendo en este momento</small>
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}

export default EventFilter;