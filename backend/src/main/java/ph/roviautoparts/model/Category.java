package ph.roviautoparts.model;

public enum Category {
    ENGINES("Engines"),
    TRANSMISSIONS("Transmissions"),
    TIRES_WHEELS("Tires & Wheels"),
    BEARINGS("Bearings & Hubs"),
    SUSPENSION("Suspension & Steering"),
    BRAKES("Brakes"),
    ELECTRICAL("Electrical"),
    BODY_PARTS("Body & Lights");

    private final String label;

    Category(String label) { this.label = label; }

    public String label() { return label; }
}
