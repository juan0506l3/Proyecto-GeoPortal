import { useState, type CSSProperties } from "react";
import {
  EVENT_CATEGORIES,
  EVENT_SUBCATEGORIES,
} from "../projections/eventCategories";
import "./EventFilter.css";

interface EventFilterProps {
  activeCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
  activeSubcategories: Set<string>;
  onToggleSubcategory: (
    categoryId: string,
    subcategory: string
  ) => void;
}

function EventFilter({
  activeCategories,
  onToggleCategory,
  activeSubcategories,
  onToggleSubcategory,
}: EventFilterProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(["deportivo", "musica", "familiar"])
  );

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories((previous) => {
      const next = new Set(previous);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  };

  return (
    <section className="event-filter">
      <h3 className="event-filter__title">Filtrar por categoría</h3>

      <ul className="event-filter__list">
        {EVENT_CATEGORIES.map((category) => {
          const subcategories = EVENT_SUBCATEGORIES[category.id] ?? [];
          const hasSubcategories = subcategories.length > 0;
          const expanded = expandedCategories.has(category.id);
          const categoryActive = activeCategories.has(category.id);
          const activeCount = subcategories.filter((subcategory) =>
            activeSubcategories.has(`${category.id}:${subcategory}`)
          ).length;
          const partial =
            categoryActive &&
            hasSubcategories &&
            activeCount > 0 &&
            activeCount < subcategories.length;

          return (
            <li
              key={category.id}
              className="event-filter__item"
              style={{ "--cat-color": category.color } as CSSProperties}
            >
              <div className="event-filter__category">
                <label className="event-filter__label">
                  <input
                    type="checkbox"
                    className="event-filter__check"
                    checked={categoryActive}
                    ref={(element) => {
                      if (element) element.indeterminate = partial;
                    }}
                    onChange={() => onToggleCategory(category.id)}
                  />

                  <span className="event-filter__name">{category.label}</span>
                </label>

                {hasSubcategories && categoryActive && (
                  <span className="event-filter__count">
                    {activeCount}/{subcategories.length}
                  </span>
                )}

                {hasSubcategories && (
                  <button
                    type="button"
                    className="event-filter__expand"
                    onClick={() => toggleExpanded(category.id)}
                    aria-expanded={expanded}
                    aria-label={
                      expanded
                        ? `Ocultar subcategorías de ${category.label}`
                        : `Mostrar subcategorías de ${category.label}`
                    }
                  >
                    <svg
                      className={
                        expanded
                          ? "event-filter__chevron event-filter__chevron--open"
                          : "event-filter__chevron"
                      }
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 6 8 10.5 12.5 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {hasSubcategories && expanded && (
                <ul className="event-filter__subcategories">
                  {subcategories.map((subcategory) => {
                    const key = `${category.id}:${subcategory}`;

                    return (
                      <li
                        key={key}
                        className="event-filter__subcategory-item"
                      >
                        <label className="event-filter__subcategory-label">
                          <input
                            type="checkbox"
                            className="event-filter__check"
                            checked={activeSubcategories.has(key)}
                            disabled={!categoryActive}
                            onChange={() =>
                              onToggleSubcategory(category.id, subcategory)
                            }
                          />

                          <span>{subcategory}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
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