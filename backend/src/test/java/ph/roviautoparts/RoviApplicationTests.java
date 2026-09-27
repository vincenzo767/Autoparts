package ph.roviautoparts;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import ph.roviautoparts.model.Order;
import ph.roviautoparts.repo.OrderRepository;
import ph.roviautoparts.repo.ProductRepository;
import ph.roviautoparts.service.OrderService;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:rovitest;DB_CLOSE_DELAY=-1",
        "app.admin.email=owner@test.local",
        "app.admin.password=Owner#Pass1",
        "app.seed-demo-data=true",
        "app.upload-dir=target/test-uploads",
        "app.security.ip-registrations-per-hour=1000",
        "app.security.ip-login-attempts-per-15min=1000",
        "app.jwt.secret=test-secret-test-secret-test-secret-0123456789"
})
@AutoConfigureMockMvc
class RoviApplicationTests {
    private static final String PASSWORD = "Garage#2026";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired ProductRepository products;
    @Autowired OrderRepository orders;
    @Autowired OrderService orderService;

    private String xsrfToken;

    /** Double-submit exactly like the SPA: echo the XSRF-TOKEN cookie in the X-XSRF-TOKEN header. */
    private RequestPostProcessor xsrf() {
        return req -> {
            try {
                if (xsrfToken == null) {
                    Cookie c = mvc.perform(get("/api/auth/session")).andReturn().getResponse().getCookie("XSRF-TOKEN");
                    xsrfToken = c.getValue();
                }
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
            Cookie[] existing = req.getCookies() == null ? new Cookie[0] : req.getCookies();
            Cookie[] all = java.util.Arrays.copyOf(existing, existing.length + 1);
            all[existing.length] = new Cookie("XSRF-TOKEN", xsrfToken);
            req.setCookies(all);
            req.addHeader("X-XSRF-TOKEN", xsrfToken);
            return req;
        };
    }

    private Cookie login(String email, String password) throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/login").with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new java.util.HashMap<>(java.util.Map.of("email", email, "password", password)))))
                .andExpect(status().isOk()).andReturn();
        return r.getResponse().getCookie("RA_SESSION");
    }

    private Cookie register(String name) throws Exception {
        String email = name.toLowerCase().replace(" ", ".") + "." + UUID.randomUUID().toString().substring(0, 6) + "@test.local";
        MvcResult r = mvc.perform(post("/api/auth/register").with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"" + name + "\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andReturn();
        return r.getResponse().getCookie("RA_SESSION");
    }

    private JsonNode call(MockHttpServletRequestBuilder req, Cookie session, int status) throws Exception {
        MvcResult r = mvc.perform(req.with(xsrf()).cookie(session)).andExpect(status().is(status)).andReturn();
        String body = r.getResponse().getContentAsString();
        return body.isEmpty() ? null : json.readTree(body);
    }

    private long productId(String name) {
        return products.findAll().stream().filter(p -> p.getName().equals(name)).findFirst().orElseThrow().getId();
    }

    @Test
    void publicFeaturedAndSecurityHeaders() throws Exception {
        mvc.perform(get("/api/public/featured"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("max-age=60")))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(jsonPath("$.length()").value(8));
    }

    @Test
    void unauthenticatedAndRoleRules() throws Exception {
        mvc.perform(get("/api/products")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Please sign in to continue."));
        Cookie customer = register("Ana Cruz");
        call(get("/api/admin/stats"), customer, 403);
        Cookie admin = login("owner@test.local", "Owner#Pass1");
        call(get("/api/cart"), admin, 403);
        JsonNode stats = call(get("/api/admin/stats"), admin, 200);
        assertThat(stats.get("byCategory").size()).isEqualTo(8);
    }

    @Test
    void registrationRulesAndWelcomeMessage() throws Exception {
        mvc.perform(post("/api/auth/register").with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Bot\",\"email\":\"bot@test.local\",\"password\":\"" + PASSWORD + "\",\"website\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("We couldn't create your account."));
        mvc.perform(post("/api/auth/register").with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Weak Pass\",\"email\":\"weak@test.local\",\"password\":\"password\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.password").exists());
        Cookie c = register("Ben Reyes");
        JsonNode thread = call(get("/api/chat/messages"), c, 200);
        assertThat(thread.get(0).get("content").asText()).startsWith("Welcome to Rovi Autoparts Surplus, Ben.");
    }

    @Test
    void csrfIsRequired() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("CSRF"));
    }

    @Test
    void lockoutAfterFiveFailures() throws Exception {
        Cookie c = register("Carla Lim");
        JsonNode me = call(get("/api/profile"), c, 200);
        String email = me.get("email").asText();
        for (int i = 1; i <= 4; i++) {
            mvc.perform(post("/api/auth/login").with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"Wrong#Pass1\"}"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Wrong#Pass1\"}"))
                .andExpect(status().isTooManyRequests());
        mvc.perform(post("/api/auth/login").with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.startsWith("This account is temporarily locked")));
        mvc.perform(post("/api/auth/login").with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@test.local\",\"password\":\"Wrong#Pass1\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void logoutRevokesSession() throws Exception {
        Cookie c = register("Dino Tan");
        call(get("/api/profile"), c, 200);
        call(post("/api/auth/logout"), c, 200);
        call(get("/api/profile"), c, 401);
    }

    @Test
    void bagOptionsStockAndCheckoutFlow() throws Exception {
        Cookie c = register("Elena Go");
        long tire = productId("Bridgestone Surplus Tire");
        long engine = productId("Toyota 2KD-FTV 2.5 Diesel Engine Assembly");
        long abs = productId("ABS Pump Module");

        JsonNode err = call(post("/api/cart").contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":" + tire + ",\"quantity\":1}"), c, 400);
        assertThat(err.get("message").asText()).isEqualTo("Please choose a tire size.");
        call(post("/api/cart").contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":" + abs + ",\"quantity\":1}"), c, 409);
        call(post("/api/cart").contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":" + engine + ",\"quantity\":5}"), c, 409);

        JsonNode bag = call(post("/api/cart").contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":" + tire + ",\"quantity\":2,\"option\":\"195/65 r15\"}"), c, 200);
        assertThat(bag.get("items").get(0).get("option").asText()).isEqualTo("195/65 R15");
        bag = call(post("/api/cart").contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":" + tire + ",\"quantity\":1,\"option\":\"195/65 R15\"}"), c, 200);
        assertThat(bag.get("items").size()).isEqualTo(1);
        assertThat(bag.get("count").asInt()).isEqualTo(3);

        int before = products.findById(tire).orElseThrow().getStock();
        JsonNode order = call(post("/api/orders/checkout").contentType(MediaType.APPLICATION_JSON)
                .content("{\"note\":\"Vios 2010\"}"), c, 201);
        assertThat(order.get("reference").asText()).matches("RA-\\d{6}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}");
        assertThat(order.get("holdUntil").isNull()).isFalse();
        assertThat(products.findById(tire).orElseThrow().getStock()).isEqualTo(before - 3);
        assertThat(call(get("/api/cart"), c, 200).get("count").asInt()).isZero();

        call(post("/api/orders/" + order.get("id").asLong() + "/cancel"), c, 200);
        assertThat(products.findById(tire).orElseThrow().getStock()).isEqualTo(before);
    }

    @Test
    void pickupDateValidation() throws Exception {
        Cookie c = register("Fe Santos");
        long bearing = productId("Rear Wheel Bearing");
        call(post("/api/cart").contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":" + bearing + ",\"quantity\":1}"), c, 200);
        JsonNode err = call(post("/api/orders/checkout").contentType(MediaType.APPLICATION_JSON)
                .content("{\"pickupDate\":\"2001-01-01\"}"), c, 400);
        assertThat(err.get("message").asText()).isEqualTo("Please choose a pickup date from tomorrow onwards.");
        err = call(post("/api/orders/checkout").contentType(MediaType.APPLICATION_JSON)
                .content("{\"pickupDate\":\"tomorrow\"}"), c, 400);
        assertThat(err.get("message").asText()).isEqualTo("Please choose a valid pickup date.");
    }

    @Test
    void adminWorkflowPostsChatAndRequiresPayment() throws Exception {
        Cookie c = register("Gino Uy");
        long bearing = productId("Clutch Release Bearing");
        call(post("/api/cart").contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":" + bearing + ",\"quantity\":1}"), c, 200);
        long id = call(post("/api/orders/checkout"), c, 201).get("id").asLong();

        Cookie admin = login("owner@test.local", "Owner#Pass1");
        call(patch("/api/admin/orders/" + id + "/status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CONFIRMED\"}"), admin, 200);
        call(patch("/api/admin/orders/" + id + "/status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"READY_FOR_PICKUP\"}"), admin, 200);
        call(post("/api/orders/" + id + "/cancel"), c, 400);
        JsonNode err = call(patch("/api/admin/orders/" + id + "/status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"COMPLETED\"}"), admin, 400);
        assertThat(err.get("message").asText()).isEqualTo("Choose how the customer paid.");
        JsonNode done = call(patch("/api/admin/orders/" + id + "/status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"COMPLETED\",\"paymentMethod\":\"GCASH\",\"paymentReference\":\" 1234 \"}"), admin, 200);
        assertThat(done.get("paymentReference").asText()).isEqualTo("1234");
        call(patch("/api/admin/orders/" + id + "/status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CANCELLED\"}"), admin, 400);

        JsonNode thread = call(get("/api/chat/messages"), c, 200);
        String last = thread.get(thread.size() - 1).get("content").asText();
        assertThat(last).contains("is complete — paid by GCash.");
    }

    @Test
    void overdueHoldIsReleased() throws Exception {
        Cookie c = register("Hana Ong");
        long starter = productId("Starter Motor");
        int before = products.findById(starter).orElseThrow().getStock();
        call(post("/api/cart").contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":" + starter + ",\"quantity\":1}"), c, 200);
        long id = call(post("/api/orders/checkout"), c, 201).get("id").asLong();
        Order o = orders.findById(id).orElseThrow();
        o.setHoldUntil(Instant.now().minusSeconds(60));
        orders.save(o);

        orderService.releaseExpired();
        assertThat(orders.findById(id).orElseThrow().getStatus().name()).isEqualTo("CANCELLED");
        assertThat(products.findById(starter).orElseThrow().getStock()).isEqualTo(before);
        JsonNode thread = call(get("/api/chat/messages"), c, 200);
        assertThat(thread.get(thread.size() - 1).get("content").asText()).contains("was not collected in time");
    }

    @Test
    void uploadsAreCheckedByMagicBytes() throws Exception {
        Cookie admin = login("owner@test.local", "Owner#Pass1");
        MockMultipartFile svg = new MockMultipartFile("file", "x.svg", "image/svg+xml",
                "<svg xmlns=\"http://www.w3.org/2000/svg\"/>".getBytes());
        mvc.perform(multipart("/api/admin/uploads").file(svg).with(xsrf()).cookie(admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only JPG, PNG, WEBP or GIF images are allowed."));
        MockMultipartFile exe = new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[]{'M', 'Z', 0, 0, 1, 2});
        mvc.perform(multipart("/api/admin/uploads").file(exe).with(xsrf()).cookie(admin))
                .andExpect(status().isBadRequest());
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        MockMultipartFile ok = new MockMultipartFile("file", "a.png", "image/png", png);
        MvcResult r = mvc.perform(multipart("/api/admin/uploads").file(ok).with(xsrf()).cookie(admin))
                .andExpect(status().isOk()).andReturn();
        String url = json.readTree(r.getResponse().getContentAsString()).get("url").asText();
        assertThat(url).matches("/api/files/[a-f0-9-]{36}\\.png");
        mvc.perform(get(url)).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("immutable")));
        mvc.perform(get("/api/files/..%2F..%2Fpom.xml")).andExpect(status().is4xxClientError());
    }

    @Test
    void searchMatchesFitmentAndPartNumber() throws Exception {
        Cookie c = register("Ivy Chua");
        JsonNode res = call(get("/api/products").param("q", "fortuner"), c, 200);
        assertThat(res.size()).isGreaterThanOrEqualTo(2);
        res = call(get("/api/products").param("q", "4D56"), c, 200);
        assertThat(res.size()).isGreaterThanOrEqualTo(2);
        res = call(get("/api/products").param("q", "185/65 R15"), c, 200);
        assertThat(res.get(0).get("name").asText()).isEqualTo("Bridgestone Surplus Tire");
        res = call(get("/api/products").param("category", "ENGINES").param("sort", "price-asc"), c, 200);
        assertThat(res.get(0).get("price").asDouble()).isLessThanOrEqualTo(res.get(1).get("price").asDouble());
    }
}
