import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import {
  Activity,
  Archive,
  BarChart3,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  Download,
  Eye,
  FileJson,
  FileText,
  Gauge,
  Image as ImageIcon,
  Layers3,
  ListOrdered,
  Moon,
  ScanLine,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Wand2,
  X,
  ZoomIn
} from "lucide-react";
import { assetUrl, deleteHistoryItem, downloadUrl, fetchHistory, uploadDocument } from "./services/api";

const features = [
  {
    icon: BrainCircuit,
    title: "AI Handwriting Recognition",
    text: "Extract handwritten text from aged manuscripts with multi-line text detection and TrOCR."
  },
  {
    icon: Wand2,
    title: "Image Enhancement",
    text: "Remove noise, improve contrast, deskew pages, and sharpen faint ink using OpenCV."
  },
  {
    icon: Gauge,
    title: "Confidence Intelligence",
    text: "Review prediction confidence, processing time, line count, and word highlights."
  },
  {
    icon: Download,
    title: "Research Exports",
    text: "Download OCR output as TXT, PDF, or structured JSON for archives and teams."
  }
];

const pipeline = [
  "Upload Document",
  "Image Preprocessing",
  "Adaptive Thresholding",
  "Detect Text Lines",
  "Crop & Order Lines",
  "TrOCR Recognition",
  "Combine Lines",
  "Complete Text"
];

const demoTrend = [74, 79, 83, 86, 88, 91, 94];
const demoUploads = [9, 15, 12, 24, 18, 31, 27];
const pages = ["home", "about", "workspace", "pipeline", "dashboard", "history", "model"];

export default function App() {
  const [dark, setDark] = useState(true);
  const [page, setPage] = useState(() => pageFromHash());
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [toast, setToast] = useState("Ready for manuscript analysis");
  const { scrollYProgress } = useScroll();
  const beamX = useTransform(scrollYProgress, [0, 1], ["-20%", "120%"]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const syncPage = () => setPage(pageFromHash());
    window.addEventListener("hashchange", syncPage);
    return () => window.removeEventListener("hashchange", syncPage);
  }, []);

  useEffect(() => {
    fetchHistory()
      .then(setDocuments)
      .catch(() => setToast("Backend offline: upload still shows graceful errors"));
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
        event.preventDefault();
        document.getElementById("upload-input")?.click();
      }
      if (event.key === "Escape") setActiveDocument(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const metrics = useMemo(() => {
    const count = documents.length;
    const average = count ? documents.reduce((sum, item) => sum + item.confidence, 0) / count : 0.92;
    const speed = count ? documents.reduce((sum, item) => sum + item.processing_time, 0) / count : 1.28;
    const characters = count ? documents.reduce((sum, item) => sum + item.characters, 0) : 18420;
    return { count: count || 128, average, speed, characters };
  }, [documents]);

  async function handleDelete(id) {
    await deleteHistoryItem(id);
    setDocuments((items) => items.filter((item) => item.id !== id));
    setToast("Document removed from archive history");
  }

  function navigate(nextPage) {
    const safePage = pages.includes(nextPage) ? nextPage : "home";
    window.location.hash = safePage;
    setPage(safePage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderPage() {
    switch (page) {
      case "about":
        return <About navigate={navigate} />;
      case "workspace":
        return <Workspace setDocuments={setDocuments} setToast={setToast} setActiveDocument={setActiveDocument} />;
      case "pipeline":
        return <Pipeline navigate={navigate} />;
      case "dashboard":
        return <Dashboard metrics={metrics} navigate={navigate} />;
      case "history":
        return <HistorySection documents={documents} onOpen={setActiveDocument} onDelete={handleDelete} navigate={navigate} />;
      case "model":
        return <ModelDetails navigate={navigate} />;
      default:
        return <HomePage navigate={navigate} />;
    }
  }

  return (
    <main className="app-shell min-h-screen overflow-x-hidden bg-paper text-slate-950 transition-colors duration-500 dark:bg-midnight dark:text-paper">
      <ManuscriptBackdrop beamX={beamX} />
      <Nav dark={dark} setDark={setDark} page={page} navigate={navigate} />
      <AnimatePresence mode="wait">
        <motion.div key={page} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.28 }}>
          {renderPage()}
        </motion.div>
      </AnimatePresence>
      <Footer />
      <Toast message={toast} />
      <AnimatePresence>
        {activeDocument && <AdvancedViewer document={activeDocument} onClose={() => setActiveDocument(null)} />}
      </AnimatePresence>
    </main>
  );
}

function pageFromHash() {
  const hash = window.location.hash.replace("#", "").toLowerCase();
  return pages.includes(hash) ? hash : "home";
}

function ManuscriptBackdrop({ beamX }) {
  return (
    <div className="app-backdrop pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0 bg-[url('/assets/manuscript-texture.svg')] bg-cover bg-center opacity-[0.09] mix-blend-luminosity" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(212,175,55,.18),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(139,94,60,.2),transparent_30%)]" />
      <motion.div style={{ x: beamX }} className="absolute top-0 h-full w-28 rotate-6 bg-gradient-to-r from-transparent via-gold/25 to-transparent blur-sm" />
      {Array.from({ length: 20 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute h-1.5 w-1.5 rounded-full bg-gold/35"
          style={{ left: `${(index * 37) % 100}%`, top: `${(index * 19) % 100}%` }}
          animate={{ y: [0, -22, 0], opacity: [0.15, 0.55, 0.15] }}
          transition={{ duration: 5 + (index % 5), repeat: Infinity, delay: index * 0.18 }}
        />
      ))}
    </div>
  );
}

function Nav({ dark, setDark, page, navigate }) {
  const links = [
    ["about", "About"],
    ["workspace", "Workspace"],
    ["pipeline", "Pipeline"],
    ["dashboard", "Dashboard"],
    ["history", "History"],
    ["model", "Model"]
  ];
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-midnight/55 backdrop-blur-2xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <button type="button" onClick={() => navigate("home")} className="flex items-center gap-3 font-cinzel text-lg font-bold text-paper">
          <span className="grid h-10 w-10 place-items-center rounded-md border border-gold/40 bg-gold/10 text-gold">
            <Archive size={19} />
          </span>
          HDA
        </button>
        <div className="hidden items-center gap-6 text-sm text-paper/72 md:flex">
          {links.map(([id, label]) => (
            <button key={id} type="button" onClick={() => navigate(id)} className={`transition hover:text-gold ${page === id ? "text-gold" : ""}`}>
              {label}
            </button>
          ))}
        </div>
        <button className="icon-button" aria-label="Toggle color mode" onClick={() => setDark(!dark)}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>
    </header>
  );
}

function HomePage({ navigate }) {
  return (
    <>
      <Hero navigate={navigate} />
      <FeatureGrid navigate={navigate} />
      <About navigate={navigate} compact />
    </>
  );
}

function Hero({ navigate }) {
  return (
    <section className="relative z-10 flex min-h-screen items-center px-5 pb-20 pt-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/5 px-4 py-2 text-sm text-gold backdrop-blur-xl">
            <Sparkles size={16} /> Multi-Line AI OCR for manuscript preservation
          </p>
          <h1 className="font-cinzel text-5xl font-bold leading-tight text-slate-950 dark:text-paper md:text-7xl">
            Historical Document Analyzer
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-700 dark:text-paper/82">
            Transform multi-line historical documents and manuscripts into complete, structured digital text with automated text-line detection and TrOCR.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <button className="primary-button" onClick={() => navigate("workspace")}><Upload size={18} /> Analyze Document</button>
            <button className="secondary-button" onClick={() => navigate("workspace")}><ScanLine size={18} /> Live Demo</button>
            <button className="ghost-button" onClick={() => navigate("about")}>Learn More <ChevronDown size={18} /></button>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }} className="hero-stage">
          <div className="scan-beam" />
          <div className="manuscript-page">
            <span>Anno Domini 1784</span>
            <p>Received and entered into the archive, a letter bearing witness to estate matters and public record.</p>
            <p>The hand is irregular, the ink is faded, yet the account remains recoverable by careful machine reading.</p>
            <div className="ink-lines" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function About({ navigate, compact = false }) {
  return (
    <Section id="about" eyebrow="About" title="Multi-line OCR built for fragile records">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["Multi-Line Pipeline", "Detects every individual handwritten line, orders them top-to-bottom, and recognizes full paragraphs."],
          ["Why it matters", "Historical preservation protects names, records, ledgers, letters, and civic memory from decay."],
          ["TrOCR Intelligence", "Vision transformers learn ink strokes and word shapes across individual segmented lines."],
          ["Line Detection", "OpenCV adaptive thresholding and horizontal morphological profiling locate lines with high precision."]
        ].map(([title, text], index) => (
          <Reveal key={title} delay={index * 0.08}>
            <div className="glass-panel h-full p-6">
              <BookOpen className="mb-5 text-gold" size={25} />
              <h3 className="font-cinzel text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-paper/68">{text}</p>
            </div>
          </Reveal>
        ))}
      </div>
      {!compact && (
        <div className="mt-8 flex flex-wrap gap-3">
          <button className="primary-button" onClick={() => navigate("workspace")}><Upload size={18} /> Start OCR</button>
          <button className="secondary-button" onClick={() => navigate("model")}><BrainCircuit size={18} /> Model Details</button>
        </div>
      )}
    </Section>
  );
}

function FeatureGrid({ navigate }) {
  const destinations = ["workspace", "workspace", "model", "history"];
  return (
    <Section id="features" eyebrow="Features" title="A complete OCR preservation suite">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature, index) => (
          <Reveal key={feature.title} delay={index * 0.08}>
            <motion.button type="button" whileHover={{ y: -8 }} onClick={() => navigate(destinations[index])} className="glass-panel h-full p-6 text-left">
              <feature.icon className="text-gold" size={28} />
              <h3 className="mt-6 font-cinzel text-xl font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-paper/68">{feature.text}</p>
            </motion.button>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function Workspace({ setDocuments, setToast, setActiveDocument }) {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(null);

  async function processFile(file) {
    setProcessing(true);
    setProgress(8);
    setCurrent({
      filename: file.name,
      original_url: URL.createObjectURL(file),
      text: "",
      confidence: 0,
      num_lines: 0,
      lines: []
    });
    try {
      const document = await uploadDocument(file, setProgress);
      setCurrent(document);
      setDocuments((items) => [document, ...items]);
      setToast(`OCR complete: ${document.num_lines || 1} line(s) detected and recognized`);
    } catch (error) {
      setToast(error.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Section id="workspace" eyebrow="OCR Workspace" title="Upload, segment lines, recognize, export">
      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div
          className={`upload-zone ${dragging ? "is-dragging" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => document.getElementById("upload-input")?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              document.getElementById("upload-input")?.click();
            }
          }}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) processFile(file);
          }}
        >
          <input id="upload-input" className="sr-only" type="file" accept=".png,.jpg,.jpeg,.tiff,.tif" onChange={(event) => event.target.files?.[0] && processFile(event.target.files[0])} />
          <div className="flex h-full cursor-pointer flex-col items-center justify-center p-8 text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold shadow-glow">
              <Upload size={34} />
            </span>
            <strong className="mt-6 font-cinzel text-2xl">Drag and drop a manuscript</strong>
            <span className="mt-3 max-w-md text-sm leading-6 text-slate-700 dark:text-paper/65">
              Upload single-line or multi-line documents (PNG, JPG, JPEG, TIFF). Use Ctrl+U for quick upload.
            </span>
          </div>
        </div>
        <div className="glass-panel min-h-[440px] p-5">
          {processing && <LoadingState progress={progress} />}
          {!processing && !current && <EmptyState />}
          {current && !processing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <Comparison document={current} />
              <ResultPanel document={current} onOpen={() => setActiveDocument(current)} />
            </motion.div>
          )}
        </div>
      </div>
    </Section>
  );
}

function Comparison({ document }) {
  const [activeTab, setActiveTab] = useState("annotated");

  const tabs = [
    { id: "annotated", label: "Detected Lines", src: document.annotated_url || document.enhanced_url },
    { id: "enhanced", label: "Enhanced Image", src: document.enhanced_url },
    { id: "original", label: "Original Image", src: document.original_url }
  ];

  const currentView = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 rounded-lg border border-white/10 bg-black/30 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded px-3 py-1 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "bg-gold text-midnight shadow"
                  : "text-paper/70 hover:text-paper"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {document.num_lines ? (
          <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
            {document.num_lines} {document.num_lines === 1 ? "Line Detected" : "Lines Detected"}
          </span>
        ) : null}
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[.22em] text-gold">
          <span className="flex items-center gap-2"><ImageIcon size={14} /> {currentView.label}</span>
          {activeTab === "annotated" && document.num_lines ? (
            <span className="text-[11px] text-paper/60 lowercase tracking-normal">showing bounding boxes</span>
          ) : null}
        </div>
        {currentView.src ? (
          <img
            className="h-60 w-full rounded-md object-contain paper-checker"
            src={assetUrl(currentView.src)}
            alt={currentView.label}
          />
        ) : (
          <div className="h-60 rounded-md bg-white/5" />
        )}
      </div>
    </div>
  );
}

function ResultPanel({ document, onOpen }) {
  const [showLines, setShowLines] = useState(true);
  const lines = document.lines || [];

  return (
    <div className="rounded-lg border border-gold/15 bg-white/[.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[.22em] text-gold">OCR Analysis Results</p>
            {document.num_lines ? (
              <span className="rounded bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold">
                {document.num_lines} {document.num_lines === 1 ? "Line" : "Lines"}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 text-xl font-semibold">{document.filename}</h3>
        </div>
        <ConfidenceMeter value={document.confidence} />
      </div>

      {/* Individual Line Results */}
      {lines.length > 0 && (
        <div className="mt-4 rounded-md border border-white/10 bg-black/25 p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs uppercase tracking-[.20em] text-gold">
              <ListOrdered size={14} /> Line-by-Line Recognition ({lines.length})
            </span>
            <button
              type="button"
              onClick={() => setShowLines(!showLines)}
              className="text-xs text-paper/60 hover:text-gold"
            >
              {showLines ? "Collapse" : "Expand"}
            </button>
          </div>
          {showLines && (
            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 rounded border border-white/5 bg-white/[.03] px-3 py-2 text-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 rounded bg-gold/20 px-1.5 py-0.5 text-[11px] font-bold text-gold shrink-0">
                      Line {line.line_id || idx + 1}
                    </span>
                    <span className="font-serif text-paper/95">{line.text || "—"}</span>
                  </div>
                  {line.confidence ? (
                    <span className="text-xs text-gold/80 shrink-0 font-mono">
                      {Math.round(line.confidence * 100)}%
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Complete Reconstructed Text */}
      <div className="mt-4">
        <p className="text-xs uppercase tracking-[.22em] text-gold">Complete Reconstructed Text</p>
        <p className="mt-2 whitespace-pre-wrap rounded-md bg-paper p-4 font-serif text-lg leading-8 text-slate-900 shadow-inner">
          {document.text || document.full_text}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <a className="small-button" href={downloadUrl(document.id, "txt")}><FileText size={16} /> TXT</a>
        <a className="small-button" href={downloadUrl(document.id, "pdf")}><Download size={16} /> PDF</a>
        <a className="small-button" href={downloadUrl(document.id, "json")}><FileJson size={16} /> JSON</a>
        <button className="small-button" onClick={onOpen}><ZoomIn size={16} /> Viewer</button>
      </div>
    </div>
  );
}

function Pipeline({ navigate }) {
  return (
    <Section id="pipeline" eyebrow="AI Processing Pipeline" title="From parchment image to confident text">
      <div className="pipeline-grid">
        {pipeline.map((step, index) => (
          <Reveal key={step} delay={index * 0.04}>
            <div className="pipeline-node">
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <div className="mt-8">
        <button className="primary-button" onClick={() => navigate("workspace")}><Upload size={18} /> Try This Pipeline</button>
      </div>
    </Section>
  );
}

function Dashboard({ metrics, navigate }) {
  return (
    <Section id="dashboard" eyebrow="Dashboard" title="Archive intelligence at a glance">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Archive} label="Documents Processed" value={metrics.count} />
        <Metric icon={Activity} label="Average Accuracy" value={`${Math.round(metrics.average * 100)}%`} />
        <Metric icon={ScanLine} label="Recognition Speed" value={`${metrics.speed.toFixed(2)}s`} />
        <Metric icon={FileText} label="Characters Detected" value={metrics.characters.toLocaleString()} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Chart title="Accuracy Trend" values={demoTrend} suffix="%" />
        <Chart title="Uploads Per Day" values={demoUploads} />
      </div>
      <div className="mt-8">
        <button className="secondary-button" onClick={() => navigate("history")}><Archive size={18} /> View History</button>
      </div>
    </Section>
  );
}

function HistorySection({ documents, onOpen, onDelete, navigate }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = documents.filter((document) => {
    const matchesQuery = `${document.filename} ${document.text}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || (filter === "high" ? document.confidence >= 0.85 : document.confidence < 0.85);
    return matchesQuery && matchesFilter;
  });

  return (
    <Section id="history" eyebrow="History" title="Every manuscript stays searchable">
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <label className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search extracted text or filename" />
        </label>
        <select className="filter-select" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All confidence</option>
          <option value="high">High confidence</option>
          <option value="review">Needs review</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <button className="w-full text-left" onClick={() => navigate("workspace")}>
          <EmptyState label="No archived documents yet. Click here to analyze your first manuscript." />
        </button>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((document) => (
            <motion.article layout key={document.id} className="glass-panel p-4">
              <img className="h-44 w-full rounded-md object-contain paper-checker" src={assetUrl(document.annotated_url || document.enhanced_url || document.original_url)} alt={document.filename} />
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="line-clamp-1 font-semibold">{document.filename}</h3>
                    {document.num_lines ? (
                      <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold shrink-0">
                        {document.num_lines}L
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-paper/50">{new Date(document.created_at).toLocaleString()}</p>
                </div>
                <ConfidenceMeter value={document.confidence} compact />
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700 dark:text-paper/65 whitespace-pre-line">{document.text}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="icon-text" onClick={() => onOpen(document)}><Eye size={15} /> Open</button>
                <a className="icon-text" href={downloadUrl(document.id, "txt")}><Download size={15} /> Download</a>
                <button className="icon-text danger" onClick={() => onDelete(document.id)}><Trash2 size={15} /> Delete</button>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </Section>
  );
}

function AdvancedViewer({ document, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [viewMode, setViewMode] = useState("annotated");

  const getImageSrc = () => {
    if (viewMode === "annotated") return assetUrl(document.annotated_url || document.enhanced_url);
    if (viewMode === "enhanced") return assetUrl(document.enhanced_url);
    return assetUrl(document.original_url);
  };

  return (
    <motion.div className="fixed inset-0 z-50 bg-midnight/88 p-4 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-lg border border-white/10 bg-slatepanel/95" initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}>
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <p className="text-xs uppercase tracking-[.22em] text-gold">Advanced Viewer</p>
            <h2 className="font-cinzel text-2xl text-paper">{document.filename}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close viewer"><X size={20} /></button>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[1fr_330px]">
          <div className="viewer-canvas">
            <img
              src={getImageSrc()}
              alt={document.filename}
              style={{ transform: `scale(${zoom})`, filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
            />
            <div className="heatmap">
              {document.words?.slice(0, 8).map((word, index) => (
                <span key={`${word.word}-${index}`} style={{ left: `${8 + index * 10}%`, top: `${25 + (index % 3) * 15}%`, opacity: 1 - Math.max(0, word.confidence - .6) }}>
                  {word.word}
                </span>
              ))}
            </div>
          </div>
          <aside className="space-y-4 overflow-auto">
            <div className="rounded-lg border border-white/10 bg-white/[.04] p-3">
              <p className="mb-2 text-xs uppercase tracking-[.22em] text-gold">Image View</p>
              <div className="grid grid-cols-3 gap-1">
                {["annotated", "enhanced", "original"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`rounded py-1.5 text-xs font-semibold capitalize transition ${
                      viewMode === mode ? "bg-gold text-midnight" : "text-paper/70 hover:text-paper"
                    }`}
                  >
                    {mode === "annotated" ? "Lines" : mode}
                  </button>
                ))}
              </div>
            </div>

            <Slider label="Zoom" value={zoom} min={0.7} max={2.2} step={0.1} onChange={setZoom} />
            <Slider label="Brightness" value={brightness} min={60} max={150} step={5} onChange={setBrightness} />
            <Slider label="Contrast" value={contrast} min={60} max={170} step={5} onChange={setContrast} />

            {document.lines && document.lines.length > 0 && (
              <div className="rounded-lg border border-white/10 bg-white/[.04] p-4">
                <p className="mb-3 text-xs uppercase tracking-[.22em] text-gold">
                  Detected Lines ({document.lines.length})
                </p>
                <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {document.lines.map((l, i) => (
                    <div key={i} className="rounded bg-black/30 p-2 text-xs">
                      <span className="font-bold text-gold">L{l.line_id || i + 1}: </span>
                      <span className="text-paper/90">{l.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-white/10 bg-white/[.04] p-4">
              <p className="mb-3 text-xs uppercase tracking-[.22em] text-gold">Detected Words</p>
              <div className="flex flex-wrap gap-2">
                {document.words?.map((word, index) => <span key={index} className={word.confidence < .78 ? "word uncertain" : "word"}>{word.word}</span>)}
              </div>
            </div>
          </aside>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ModelDetails({ navigate }) {
  return (
    <Section id="model" eyebrow="AI Model Details" title="Multi-Line TrOCR handwriting intelligence">
      <div className="grid gap-5 lg:grid-cols-3">
        {[
          ["Line Detection", "OpenCV morphological kernels and adaptive thresholding segment multi-line manuscripts into individual text lines."],
          ["Preprocessing", "Grayscale conversion, noise filtering, contrast enhancement, and bounding-box padding for ascenders and descenders."],
          ["TrOCR Recognition", "Vision Transformer encoder with Transformer decoder recognizes each line and combines them into complete text."]
        ].map(([title, text]) => (
          <div key={title} className="glass-panel p-6">
            <Layers3 className="mb-5 text-gold" />
            <h3 className="font-cinzel text-xl">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-paper/65">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <button className="primary-button" onClick={() => navigate("workspace")}><ScanLine size={18} /> Run OCR</button>
        <button className="secondary-button" onClick={() => navigate("pipeline")}><Layers3 size={18} /> See Pipeline</button>
      </div>
    </Section>
  );
}

function Section({ id, eyebrow, title, children }) {
  return (
    <section id={id} className="relative z-10 px-5 py-20">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[.28em] text-gold">{eyebrow}</p>
          <h2 className="mb-10 max-w-3xl font-cinzel text-4xl font-bold md:text-5xl">{title}</h2>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

function Reveal({ children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-90px" }} transition={{ duration: 0.55, delay }}>
      {children}
    </motion.div>
  );
}

function LoadingState({ progress }) {
  return (
    <div className="flex h-full min-h-[390px] flex-col justify-center">
      <div className="scanner-card">
        <ScanLine className="text-gold" size={34} />
        <h3 className="mt-4 font-cinzel text-2xl">AI OCR in progress</h3>
        <p className="mt-2 text-sm text-paper/60">Detecting text lines, ordering geometry, and decoding handwriting with TrOCR.</p>
        <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full bg-gold" animate={{ width: `${progress}%` }} />
        </div>
        <div className="mt-5 grid gap-3">
          {[1, 2, 3].map((item) => <div key={item} className="skeleton" />)}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label = "Upload a manuscript to begin OCR analysis" }) {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-lg border border-dashed border-gold/25 bg-white/[.03] text-center">
      <div>
        <Archive className="mx-auto text-gold" size={34} />
        <p className="mt-4 font-cinzel text-xl">{label}</p>
      </div>
    </div>
  );
}

function ConfidenceMeter({ value, compact = false }) {
  const percent = Math.round(value * 100);
  return (
    <div className={compact ? "confidence compact" : "confidence"} style={{ "--value": `${percent}%` }}>
      <span>{percent}%</span>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="glass-panel p-5">
      <Icon className="text-gold" />
      <p className="mt-5 text-sm text-slate-600 dark:text-paper/55">{label}</p>
      <strong className="mt-1 block text-3xl font-bold">{value}</strong>
    </div>
  );
}

function Chart({ title, values, suffix = "" }) {
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${100 - value}`).join(" ");
  return (
    <div className="glass-panel p-5">
      <div className="mb-4 flex items-center gap-2"><BarChart3 className="text-gold" size={18} /><h3 className="font-semibold">{title}</h3></div>
      <svg viewBox="0 0 100 100" className="h-48 w-full overflow-visible">
        <polyline points={points} fill="none" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((value, index) => <circle key={index} cx={(index / (values.length - 1)) * 100} cy={100 - value} r="2.5" fill="#F8F5EC" />)}
      </svg>
      <p className="text-sm text-slate-600 dark:text-paper/55">Latest: {values.at(-1)}{suffix}</p>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="control-row">
      <span>{label}</span>
      <button className={`toggle ${value ? "on" : ""}`} onClick={() => onChange(!value)} type="button"><span /></button>
    </label>
  );
}

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <label className="control-block">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Toast({ message }) {
  return (
    <motion.div className="fixed bottom-5 right-5 z-50 rounded-lg border border-gold/20 bg-midnight/85 px-4 py-3 text-sm text-paper shadow-glow backdrop-blur-xl" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      {message}
    </motion.div>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 px-5 py-10 text-center text-sm text-slate-600 dark:text-paper/50">
      Historical Document Analyzer - AI OCR platform for archives, researchers, and preservation teams.
    </footer>
  );
}
