const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, "db.json");
const ADMIN_KEY = process.env.ADMIN_KEY || "omacube2025";

// Inicializar archivo de base de datos si no existe
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ inscriptos: [] }, null, 2));
}

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return { inscriptos: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => res.json({ ok: true, msg: "OMA Cube API funcionando" }));

// GET /inscriptos
app.get("/inscriptos", (req, res) => {
  try {
    const db = readDB();
    res.json({ ok: true, data: db.inscriptos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /inscriptos
app.post("/inscriptos", (req, res) => {
  try {
    const { nombre, dni, nivel, escuela } = req.body;
    if (!nombre || !dni || !nivel || !escuela) {
      return res.status(400).json({ ok: false, error: "Faltan campos obligatorios" });
    }

    const db = readDB();

    const existe = db.inscriptos.find(i => i.dni === String(dni));
    if (existe) {
      return res.status(409).json({ ok: false, error: "Ya existe un inscripto con ese DNI" });
    }

    const nuevo = {
      id: Date.now(),
      nombre,
      dni: String(dni),
      nivel,
      escuela,
      fecha: new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
    };

    db.inscriptos.push(nuevo);
    writeDB(db);

    res.json({ ok: true, id: nuevo.id, fecha: nuevo.fecha });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /inscriptos
app.delete("/inscriptos", (req, res) => {
  const { clave } = req.body;
  if (clave !== ADMIN_KEY) {
    return res.status(403).json({ ok: false, error: "Clave incorrecta" });
  }
  try {
    writeDB({ inscriptos: [] });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /stats
app.get("/stats", (req, res) => {
  try {
    const arr = readDB().inscriptos;
    res.json({
      ok: true,
      total:    arr.length,
      infantil: arr.filter(i => i.nivel === "Infantil").length,
      n1:       arr.filter(i => i.nivel === "1° Nivel").length,
      n2:       arr.filter(i => i.nivel === "2° Nivel").length,
      n3:       arr.filter(i => i.nivel === "3° Nivel").length,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`OMA Cube API corriendo en puerto ${PORT}`));
