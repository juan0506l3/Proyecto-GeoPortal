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
      <h3 className="event-filter__title">Filtrar eventos</h3>

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
    </section>
  );
}

export default EventFilter;