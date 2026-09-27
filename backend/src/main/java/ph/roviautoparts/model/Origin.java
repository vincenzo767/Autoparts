package ph.roviautoparts.model;

public enum Origin {
    JAPAN("Japan surplus"),
    SOUTH_KOREA("South Korea surplus"),
    LOCAL("Local salvage"),
    OTHER("Other");

    private final String label;

    Origin(String label) { this.label = label; }

    public String label() { return label; }
}
