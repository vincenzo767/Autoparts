import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useOutletContext } from "react-router-dom";
import { Reorder, motion } from "framer-motion";
import { ImagePlus, X } from "lucide-react";
import api, { errorMessage, fieldErrors, uploadImage } from "../../lib/api.js";
import { CATEGORIES, ORIGINS, formatPrice, sized } from "../../lib/format.js";
import { useToast } from "../../context/ToastContext.jsx";
import { EASE, Field, Frame, PageLoader, SelectField, Spinner, StockBadge, Stepper, Toggle } from "../../components/ui.jsx";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const OPTIONS_RULE = /^[0-9A-Za-z.,/ ()-]*$/;
const CONDITIONS = ["Grade A · bench-tested", "Grade A", "Grade B", "Grade B · tested", "70–80% tread", "For rebuild"];

let keySeq = 1;
const newKey = () => `img-${keySeq++}`;

const EMPTY = {
  name: "", category: "ENGINES", tag: "", description: "", brand: "", fitment: "", partNumber: "", condition: "",
  origin: "", optionLabel: "", options: "", price: "", stock: 1, active: true, featured: false,
};

function ImageManager({ images, setImages, error }) {
  const { toast } = useToast();
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");

  const update = (key, change) => setImages((list) => list.map((im) => (im.key === key ? { ...im, ...change } : im)));

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast("A part can have at most 8 images.", "error");
      return;
    }
    if (files.length > room) toast(`Only ${room} more image${room === 1 ? "" : "s"} can be added (max 8).`, "error");
    files.slice(0, room).forEach((file) => {
      if (!TYPES.includes(file.type)) {
        toast(`${file.name}: only JPG, PNG, WEBP or GIF images are allowed.`, "error");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast(`${file.name}: images must be 5 MB or smaller.`, "error");
        return;
      }
      const key = newKey();
      const preview = URL.createObjectURL(file);
      setImages((list) => [...list, { key, url: null, preview, progress: 0 }]);
      uploadImage("/admin/uploads", file, (pct) => update(key, { progress: pct }))
        .then(({ url }) => update(key, { url, progress: 100 }))
        .catch((e) => {
          toast(errorMessage(e), "error");
          setImages((list) => list.filter((im) => im.key !== key));
          URL.revokeObjectURL(preview);
        });
    });
  };

  const addLink = (e) => {
    e?.preventDefault();
    const v = link.trim();
    if (!/^https:\/\/\S+$/.test(v)) {
      setLinkError("Please paste a secure link that starts with https://");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setLinkError("A part can have at most 8 images.");
      return;
    }
    setImages((list) => [...list, { key: newKey(), url: v, preview: null, progress: 100 }]);
    setLink("");
    setLinkError("");
  };

  const remove = (im) => {
    if (im.preview) URL.revokeObjectURL(im.preview);
    setImages((list) => list.filter((x) => x.key !== im.key));
  };

  return (
    <div className="images">
      <div
        className={`dropzone ${dragging ? "is-dragging" : ""} ${error ? "dropzone--error" : ""}`}
        role="button"
        tabIndex={0}
        aria-label="Add photos: drop them here or press Enter to browse"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <motion.span className="dropzone__icon" animate={{ y: dragging ? -8 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <ImagePlus size={28} strokeWidth={1.4} />
        </motion.span>
        <p className="dropzone__title">Drop photos here or click to browse</p>
        <p className="dropzone__hint">
          JPG, PNG, WEBP or GIF · up to 5 MB each · max 8 images. Drag thumbnails to reorder — the first is the cover.
        </p>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }} />
      </div>
      {error && <p className="field__error">{error}</p>}

      {images.length > 0 && (
        <Reorder.Group axis="x" values={images} onReorder={setImages} className="thumbs">
          {images.map((im, i) => (
            <Reorder.Item key={im.key} value={im} className="thumb" whileDrag={{ scale: 1.06, zIndex: 2 }}>
              <Frame src={im.preview || sized(im.url, 300)} alt={`Photo ${i + 1}`} />
              {i === 0 && <span className="thumb__cover">★ Cover</span>}
              {!im.url && (
                <span className="thumb__progress" aria-label={`Uploading, ${im.progress}%`}>
                  <span style={{ transform: `scaleX(${(im.progress || 0) / 100})` }} />
                </span>
              )}
              <button type="button" className="thumb__remove" onClick={() => remove(im)} aria-label={`Remove photo ${i + 1}`}>
                <X size={14} />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      <div className="link-add">
        <label htmlFor="img-link" className="sr-only">…or paste an https:// image link</label>
        <input id="img-link" className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="…or paste an https:// image link" maxLength={400}
          onKeyDown={(e) => e.key === "Enter" && addLink(e)} />
        <button type="button" className="btn btn--sm" onClick={addLink}>Add</button>
      </div>
      {linkError && <p className="field__error">{linkError}</p>}
    </div>
  );
}

export default function ProductEditor() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshCounts } = useOutletContext();
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = `${editing ? "Edit part" : "New part"} — Rovi Admin`;
    if (!editing) return;
    api
      .get(`/products/${id}`)
      .then(({ data }) => {
        setForm({
          name: data.name || "", category: data.category, tag: data.tag || "", description: data.description || "",
          brand: data.brand || "", fitment: data.fitment || "", partNumber: data.partNumber || "", condition: data.condition || "",
          origin: data.origin || "", optionLabel: data.optionLabel === "Option" && !data.options.length ? "" : data.optionLabel,
          options: data.options.join(", "), price: String(data.price), stock: data.stock, active: data.active, featured: data.featured,
        });
        setImages(data.images.map((url) => ({ key: newKey(), url, preview: null, progress: 100 })));
        setLoading(false);
      })
      .catch(() => {
        toast("That part could not be found.", "error");
        navigate("/admin/products", { replace: true });
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const uploading = images.some((im) => !im.url);

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Please give the part a name.";
    const price = Number(form.price);
    if (form.price === "" || !Number.isFinite(price) || price < 0) errs.price = "Please enter a valid price.";
    if (images.length === 0) errs.images = "Add between 1 and 8 images.";
    if (!OPTIONS_RULE.test(form.options)) errs.options = "Options must be a comma-separated list.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast(Object.values(errs)[0], "error");
      return;
    }
    setSaving(true);
    const body = {
      ...form,
      name: form.name.trim(),
      origin: form.origin || null,
      price: Math.round(price * 100) / 100,
      stock: Number(form.stock) || 0,
      images: images.map((im) => im.url),
    };
    try {
      const { data } = editing ? await api.put(`/admin/products/${id}`, body) : await api.post("/admin/products", body);
      toast(editing ? "Changes saved" : `${data.name} added to the catalogue`);
      images.forEach((im) => im.preview && URL.revokeObjectURL(im.preview));
      refreshCounts();
      navigate("/admin/products");
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader inline />;

  const cover = images[0];
  const previewSrc = cover ? cover.preview || sized(cover.url, 600) : null;

  return (
    <form className="editor" onSubmit={save} noValidate>
      <Link to="/admin/products" className="link-line editor__back">← All parts</Link>
      <div className="editor__grid">
        <div className="editor__main">
          <section className="panel">
            <h3 className="editor__step"><span className="num">01</span> Photos</h3>
            <ImageManager images={images} setImages={setImages} error={errors.images} />
          </section>

          <section className="panel">
            <h3 className="editor__step"><span className="num">02</span> The part</h3>
            <div className="form-grid">
              <Field className="span-2" label="Name *" value={form.name} maxLength={120} onChange={set("name")} error={errors.name} />
              <SelectField label="Category" value={form.category} onChange={set("category")} error={errors.category}>
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </SelectField>
              <Field label="Label (e.g. New, Best Seller)" value={form.tag} maxLength={32} onChange={set("tag")} error={errors.tag} />
              <Field className="span-2" as="textarea" rows={4} label="Description" value={form.description} maxLength={2000}
                onChange={set("description")} error={errors.description} hint={`${form.description.length} / 2000`} />
            </div>
          </section>

          <section className="panel">
            <h3 className="editor__step"><span className="num">03</span> Details</h3>
            <div className="form-grid">
              <Field label="Brand / make" value={form.brand} maxLength={80} onChange={set("brand")} error={errors.brand} />
              <Field label="Fits (vehicle models & years)" value={form.fitment} maxLength={160} onChange={set("fitment")} error={errors.fitment} />
              <Field label="Part / engine no." value={form.partNumber} maxLength={60} onChange={set("partNumber")} error={errors.partNumber} />
              <Field label="Condition" value={form.condition} maxLength={60} onChange={set("condition")} error={errors.condition} list="condition-list" />
              <datalist id="condition-list">
                {CONDITIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
              <SelectField label="Origin" value={form.origin} onChange={set("origin")}>
                <option value="">—</option>
                {ORIGINS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </SelectField>
              <Field label="Option label (e.g. Side, Tire size)" value={form.optionLabel} maxLength={40} onChange={set("optionLabel")} error={errors.optionLabel} />
              <Field className="span-2" label="Options customers choose (comma-separated)" value={form.options} maxLength={120}
                onChange={set("options")} error={errors.options}
                hint="Leave empty for single-variant parts. Examples: Left, Right — or 185/65 R15, 195/65 R15." />
            </div>
          </section>
        </div>

        <aside className="editor__side">
          <section className="panel">
            <h3 className="editor__step"><span className="num">04</span> Price & stock</h3>
            <Field label="Price (₱) *" type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={set("price")} error={errors.price} />
            <div className="editor__stock">
              <span className="summary__label">Units available</span>
              <div className="editor__stock-row">
                <Stepper value={Number(form.stock) || 0} min={0} max={100000} onChange={(v) => setForm((f) => ({ ...f, stock: v }))} label="Units available" />
                <label className="sr-only" htmlFor="stock-input">Units available</label>
                <input id="stock-input" className="input input--num" type="number" min="0" max="100000" value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: Math.max(0, Math.min(100000, Number(e.target.value) || 0)) }))} />
              </div>
              <StockBadge stock={Number(form.stock) || 0} />
            </div>
            <Toggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Published" description="Visible to customers in the shop." />
            <Toggle checked={form.featured} onChange={(v) => setForm((f) => ({ ...f, featured: v }))} label="Featured"
              description="Shown on the customer home page and the home page best sellers." />
          </section>

          <section className="panel">
            <p className="eyebrow">Customer preview</p>
            <motion.div layout className={`card card--preview ${Number(form.stock) <= 0 ? "card--out" : ""}`} transition={{ duration: 0.4, ease: EASE }}>
              <div className="card__media">
                <Frame src={previewSrc} alt="" className="card__frame" />
                {form.tag && <span className="card__tag">{form.tag}</span>}
                {!form.active && <span className="card__soldout">Hidden</span>}
              </div>
              <div className="card__info">
                <p className="card__name">{form.name || "Untitled part"}</p>
                <p className="card__meta">{form.fitment || form.brand}</p>
                <div className="card__foot">
                  <span className="card__price">{formatPrice(form.price || 0)}</span>
                  <StockBadge stock={Number(form.stock) || 0} />
                </div>
              </div>
            </motion.div>
          </section>

          <div className="editor__actions">
            <button type="submit" className="btn btn--solid" disabled={saving || uploading}>
              {uploading ? <><Spinner /> Uploading images</> : saving ? <><Spinner /> Saving</> : editing ? "Save changes" : "Publish part"}
            </button>
            <button type="button" className="btn" onClick={() => navigate("/admin/products")}>Cancel</button>
          </div>
        </aside>
      </div>
    </form>
  );
}
