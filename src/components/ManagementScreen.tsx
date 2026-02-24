import CategoryManager from "./CategoryManager";
import LocationManager from "./LocationManager";

export default function ManagementScreen() {
  function jumpTo(sectionId: string) {
    const node = document.getElementById(sectionId);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="page screenWrap managementPage">
      <div className="screenHeader managementHeader">
        <div>
          <h2>Management</h2>
          <div className="muted">Manage locations and categories in one place.</div>
        </div>
        <div className="managementJumps">
          <button className="btn" type="button" onClick={() => jumpTo("locations-section")}>View Locations Section</button>
          <button className="btn" type="button" onClick={() => jumpTo("categories-section")}>View Categories Section</button>
        </div>
      </div>

      <div className="managementGrid">
        <section id="locations-section" className="managementSection">
          <div className="managementSectionCard">
            <div className="managementSectionTitle">Locations</div>
            <div className="managementSectionSub muted">Add location names for stocked-item location tracking.</div>
            <LocationManager embedded />
          </div>
        </section>

        <section id="categories-section" className="managementSection">
          <div className="managementSectionCard">
            <div className="managementSectionTitle">Categories</div>
            <div className="managementSectionSub muted">Create labels used to organize inventory items.</div>
            <CategoryManager embedded />
          </div>
        </section>
      </div>
    </div>
  );
}
