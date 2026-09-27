package ph.roviautoparts.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ph.roviautoparts.model.*;
import ph.roviautoparts.repo.ProductRepository;
import ph.roviautoparts.repo.UserRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

import static ph.roviautoparts.model.Category.*;
import static ph.roviautoparts.model.Origin.*;

/**
 * Creates the owner account (from ADMIN_* settings) and, on an empty database, the starter catalogue.
 * The seeded fitment, prices and stock are sample data for the owner to replace.
 */
@Component
public class DataSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository users;
    private final ProductRepository products;
    private final PasswordEncoder encoder;
    private final ChatService chat;

    @Value("${app.admin.email:}") private String adminEmail;
    @Value("${app.admin.password:}") private String adminPassword;
    @Value("${app.admin.name:Roel Batawang}") private String adminName;
    @Value("${app.seed-demo-data:true}") private boolean seedDemo;
    @Value("${app.demo-customer.email:}") private String demoEmail;
    @Value("${app.demo-customer.password:}") private String demoPassword;

    public DataSeeder(UserRepository users, ProductRepository products, PasswordEncoder encoder, ChatService chat) {
        this.users = users;
        this.products = products;
        this.encoder = encoder;
        this.chat = chat;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seedOwner();
        if (seedDemo && products.count() == 0) {
            seedCatalogue();
            seedDemoCustomer();
        }
    }

    private void seedOwner() {
        if (users.existsByRole(Role.ADMIN)) return;
        if (adminEmail == null || adminEmail.isBlank()) {
            log.warn("No owner account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env and restart");
            return;
        }
        if (adminPassword == null || adminPassword.length() < 8) {
            log.warn("ADMIN_PASSWORD must be at least 8 characters. The owner account was not created.");
            return;
        }
        String email = adminEmail.trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) {
            log.warn("ADMIN_EMAIL {} already belongs to a customer account. The owner account was not created.", email);
            return;
        }
        User admin = new User();
        admin.setFullName(adminName == null || adminName.isBlank() ? "Roel Batawang" : adminName.trim());
        admin.setEmail(email);
        admin.setPasswordHash(encoder.encode(adminPassword));
        admin.setRole(Role.ADMIN);
        admin.setPhone("+63 906 848 5956");
        admin.setAddress("Panganiban Street, Cebu City, Cebu 6000");
        admin.setBio("Founder of Rovi Autoparts Surplus, serving Cebu since 1998.");
        users.save(admin);
        log.info("Created the owner account {}", email);
    }

    private void seedDemoCustomer() {
        if (demoEmail == null || demoEmail.isBlank() || demoPassword == null || demoPassword.isBlank()) return;
        String email = demoEmail.trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) return;
        User c = new User();
        c.setFullName("Demo Customer");
        c.setEmail(email);
        c.setPasswordHash(encoder.encode(demoPassword));
        c.setRole(Role.CUSTOMER);
        c.setPhone("0917 000 0000");
        users.save(c);
        chat.postFromShop(c, null, welcomeMessage(c.getFullName()));
        log.info("Created the demo customer {}", email);
    }

    public static String welcomeMessage(String fullName) {
        String first = fullName.trim().split("\\s+")[0];
        return "Welcome to Rovi Autoparts Surplus, " + first + ". Tell us your vehicle's make, model and year and we'll help "
                + "you find the right part — or reserve one to pick up at our Panganiban Street shop.";
    }

    private static String img(String id) {
        return "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=1000&q=80";
    }

    private void seedCatalogue() {
        List<Product> parts = List.of(
            part("Toyota 2KD-FTV 2.5 Diesel Engine Assembly", ENGINES, "Best Seller", "Toyota",
                "Hilux, Innova, Fortuner (2005–2015)", "2KD-FTV", "Grade A · bench-tested", JAPAN, 145000, 2, true, null, null,
                "Pulled from a low-mileage Japanese half-cut and run on our bench before release. Complete long block with injectors, turbo and wiring harness — ready to drop into your Hilux, Innova or Fortuner.",
                "1486262715619-67b85e0b08d3", "1778757949657-615fe09f063b", "1552656967-7a0991a13906"),
            part("Mitsubishi 4D56 Turbo Diesel Engine", ENGINES, "Japan Surplus", "Mitsubishi",
                "L200 Strada, L300, Pajero (1996–2015)", "4D56", "Grade A · bench-tested", JAPAN, 98000, 3, true, null, null,
                "The workhorse 4D56 turbo diesel, taken from a Japan-surplus half-cut and started on our bench. Strong compression, no smoke, and a straight swap for Strada, L300 and Pajero.",
                "1777900201609-ad2f57813ab8", "1763836393413-3b79e6b4560a", "1505635374747-431af16edaf2"),
            part("Hyundai D4CB 2.5 CRDi Engine", ENGINES, "New", "Hyundai",
                "Starex / Grand Starex, Kia Sorento (2007–2017)", "D4CB", "Grade B · runs smooth", SOUTH_KOREA, 115000, 1, false, null, null,
                "Korean-surplus D4CB common-rail diesel that runs smooth and quiet. Normal wear for its age — a practical replacement for Starex and Sorento owners.",
                "1778183228182-82ec2bb3db26", "1544692414-636611c6ae73", "1673909448809-596113853f6f"),
            part("Toyota Hilux 5-Speed Manual Transmission", TRANSMISSIONS, null, "Toyota",
                "Hilux 2KD / 1KD (2005–2015)", null, "Grade A · shift-tested", JAPAN, 42000, 2, true, null, null,
                "Shift-tested five-speed gearbox from a Japanese Hilux. Clean gear changes through every gear and no bearing whine.",
                "1711199694531-e982a79ea381", "1614447428943-52ec0bdbc7aa", "1528307869100-e1bad0b9a1c0"),
            part("Honda CR-V Automatic Transmission", TRANSMISSIONS, null, "Honda",
                "CR-V 2.0 (2007–2011)", null, "Grade B · tested", JAPAN, 38000, 1, false, null, null,
                "Tested automatic transmission for the 2.0 CR-V. Fluid is clean and shifts are firm — ask us for a video of the test.",
                "1567093322102-6bdd32fba67d", "1606128031531-52ae98c9707a"),
            part("Isuzu Crosswind 5-Speed Manual Transmission", TRANSMISSIONS, null, "Isuzu",
                "Crosswind 4JB1 (2001–2017)", null, "Grade A", LOCAL, 28000, 2, false, null, null,
                "Locally salvaged Crosswind gearbox, cleaned and checked. A dependable swap for the 4JB1 Crosswind.",
                "1604910119803-eafa3ef816ce", "1567093322102-6bdd32fba67d"),
            part("Bridgestone Surplus Tire", TIRES_WHEELS, "Japan Surplus", "Bridgestone",
                "Most sedans and compact MPVs", null, "70–80% tread", JAPAN, 2200, 16, true, "185/65 R15, 195/65 R15, 205/55 R16", "Tire size",
                "Clean Japan-surplus Bridgestones with even wear and no plugs. Sold per piece — choose your size, and ask us about matching sets. Available in 185/65 R15, 195/65 R15 and 205/55 R16.",
                "1578844251758-2f71da64c96f", "1559674697-aea453b06ea9", "1506022991996-a56ff643eade"),
            part("Yokohama All-Terrain Surplus Tire", TIRES_WHEELS, null, "Yokohama",
                "Pickups and SUVs", null, "~70% tread", JAPAN, 3800, 8, false, "245/70 R16, 265/70 R16", "Tire size",
                "All-terrain Yokohamas with plenty of life left for pickups and SUVs. Sold per piece in 245/70 R16 and 265/70 R16.",
                "1571335746824-742511d49bce", "1657307913178-97cb5a4d0cd7", "1645420526410-66448b1ee37c"),
            part("15-inch Alloy Mag Wheels, Set of 4", TIRES_WHEELS, "Set of 4", "Japan OEM",
                "4×100 PCD: Vios, City, Jazz and similar", null, "Grade B · light curb marks", JAPAN, 12500, 2, true, null, null,
                "A matching set of four Japanese OEM 15-inch alloys. Straight and true, with light curb marks you'd only notice up close.",
                "1591117728047-2dc00780492c", "1614212680663-20d8675d8900", "1611633235555-45e252fe48c8"),
            part("Front Wheel Hub Bearing Assembly", BEARINGS, null, "Koyo",
                "Toyota Vios / Yaris (2007–2013)", null, "Grade A · smooth, no play", JAPAN, 1800, 10, false, "Left, Right", "Side",
                "Koyo hub bearing assembly that spins smooth with no play. Choose the side you need.",
                "1656597631672-9a3bc4d3c72f", "1643933871541-090062935680", "1760317890359-4e6bb111e501"),
            part("Rear Wheel Bearing", BEARINGS, null, "NSK",
                "Honda City / Jazz (2009–2014)", null, "Grade A", JAPAN, 1200, 12, false, null, null,
                "Quiet, smooth NSK rear bearing from a Japan-surplus City. Checked by hand for roughness before shelving.",
                "1643933871541-090062935680", "1683308743837-e6ba8cdeb60a"),
            part("Clutch Release Bearing", BEARINGS, null, "Koyo",
                "Toyota Hilux / Innova (2005–2015)", null, "Grade A", JAPAN, 950, 6, false, null, null,
                "Koyo release bearing for Hilux and Innova clutches. Worth replacing while the gearbox is out.",
                "1683308743789-4910c3d16dae", "1643933871541-090062935680"),
            part("Front Shock Absorbers, Pair", SUSPENSION, "Pair", "KYB",
                "Toyota Innova (2005–2015)", null, "Grade A · no leaks", JAPAN, 3500, 4, true, null, null,
                "A matched pair of KYB front shocks with no leaks and good rebound. Sold as a pair for even handling.",
                "1785338215401-51c15e4037b8", "1772308005714-976160554238", "1760836395763-25ea44ae8145"),
            part("Lower Control Arm", SUSPENSION, null, "Mitsubishi OEM",
                "Montero Sport (2009–2015)", null, "Grade B · bushings good", JAPAN, 2800, 3, false, "Left, Right", "Side",
                "Genuine Montero Sport lower arm with good bushings and a tight ball joint. Surface rust only.",
                "1760317890359-4e6bb111e501", "1537462715879-360eeb61a0ad"),
            part("Power Steering Rack", SUSPENSION, null, "Toyota OEM",
                "Corolla Altis (2008–2013)", null, "Grade B · tested", JAPAN, 7500, 1, false, null, null,
                "Tested Altis steering rack with no leaks at the seals. Tie-rod ends included.",
                "1742741592138-d61129e7fd97", "1702146713870-8cdd7ab983fb"),
            part("Front Brake Caliper", BRAKES, null, "Toyota OEM",
                "Hilux / Fortuner (2005–2015)", null, "Grade A · pistons free", JAPAN, 3200, 4, false, "Left, Right", "Side",
                "Genuine Toyota caliper with free-moving pistons and good boots. Choose left or right.",
                "1696494561430-de087dd0bd69", "1760317890322-364a810cd4da", "1763087978864-fe5b2778c9f7"),
            part("Brake Master Cylinder with Booster", BRAKES, null, "Hyundai OEM",
                "Accent (2006–2011)", null, "Grade B", SOUTH_KOREA, 4500, 2, false, null, null,
                "Korean-surplus master cylinder and booster as one unit. Holds vacuum and pedal feel is firm.",
                "1786028924516-b24200948a52", "1685914375421-1dbc66e5941f"),
            part("ABS Pump Module", BRAKES, "Tested", "Honda OEM",
                "Civic FD (2006–2011)", null, "Grade B · tested", JAPAN, 6800, 0, false, null, null,
                "Tested ABS pump and module for the Civic FD. Message us to be told when the next one comes in.",
                "1702146713870-8cdd7ab983fb", "1775285157647-73f29f910216"),
            part("Alternator 12V 80A", ELECTRICAL, "Best Seller", "Denso",
                "Toyota Vios / Corolla (2003–2013)", null, "Grade A · bench-tested", JAPAN, 4500, 5, true, null, null,
                "Output-tested Denso alternator, cleaned and checked for bearing noise. A straight swap for Vios and Corolla models.",
                "1786028924516-b24200948a52", "1749223673543-3c9c9100c172", "1659013591264-240d3cfdc604"),
            part("Starter Motor", ELECTRICAL, null, "Mitsubishi Electric",
                "L200 Strada 4D56", null, "Grade A · bench-tested", JAPAN, 3800, 3, false, null, null,
                "Bench-tested starter with a strong, clean crank. Fits the 4D56 Strada.",
                "1597304317953-b5959920cef7", "1653491887161-aaf72d4514f3"),
            part("Engine Control Unit (ECU)", ELECTRICAL, null, "Denso",
                "Toyota Innova 2KD (2005–2011)", null, "Grade A · tested", JAPAN, 6500, 1, false, null, null,
                "Tested Denso ECU for the 2KD Innova. Bring your old unit so we can match the part number.",
                "1517373116369-9bdb8cdc9f62", "1761507320645-b11a00bfcc34"),
            part("Headlight Assembly", BODY_PARTS, null, "Koito",
                "Toyota Fortuner (2012–2015)", null, "Grade A · clear lens", JAPAN, 4200, 4, true, "Left, Right", "Side",
                "Koito headlight with a clear, unyellowed lens and intact mounting tabs. Choose the side you need.",
                "1549207107-2704df6b92ab", "1515569067071-ec3b51335dd0", "1532268116505-8c59cc37d2e6"),
            part("Power-Folding Side Mirror", BODY_PARTS, null, "Hyundai OEM",
                "Starex (2008–2017)", null, "Grade B", SOUTH_KOREA, 2500, 3, false, "Left, Right", "Side",
                "Power-folding mirror from a Korean-surplus Starex. Folds and adjusts properly; light marks on the cover.",
                "1494211448697-0e4cdf52f2af", "1471412601832-f360947f6d68", "1777765362718-c7136517e66c"),
            part("Front Door Shell (bare)", BODY_PARTS, null, "Isuzu OEM",
                "Crosswind (2001–2017)", null, "Grade B · minor dents", LOCAL, 6500, 2, false, "Left, Right", "Side",
                "Bare front door shell from a local Crosswind. Minor dents, no rust-through — ready for paint.",
                "1782207085087-a0a1dda3daa4", "1771402485816-c65e2ec12c8c", "1758411897996-e9cfacd1467f")
        );
        products.saveAll(parts);
        log.info("Seeded {} starter parts", parts.size());
    }

    private static Product part(String name, Category category, String tag, String brand, String fitment,
                                String partNumber, String condition, Origin origin, int price, int stock,
                                boolean featured, String options, String optionLabel, String description,
                                String... imageIds) {
        Product p = new Product();
        p.setName(name);
        p.setCategory(category);
        p.setTag(tag);
        p.setBrand(brand);
        p.setFitment(fitment);
        p.setPartNumber(partNumber);
        p.setCondition(condition);
        p.setOrigin(origin);
        p.setPrice(BigDecimal.valueOf(price));
        p.setStock(stock);
        p.setFeatured(featured);
        p.setActive(true);
        p.setOptions(options);
        p.setOptionLabel(optionLabel);
        p.setDescription(description);
        p.setImages(new java.util.ArrayList<>(java.util.Arrays.stream(imageIds).map(DataSeeder::img).toList()));
        return p;
    }
}
