const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// Base de datos SQLite
const db = new Database(path.join(__dirname, "inscriptos.db"));

// Crear tabla si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS inscriptos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    dni TEXT NOT NULL,
    nivel TEXT NOT NULL,
    escuela TEXT NOT NULL,
    fecha TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Middlewares
app.use(cors());
app.use(express.json());

// ── GET /inscriptos — listar todos
app.get("/inscriptos", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM inscriptos ORDER BY created_at DESC").all();
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /inscriptos — agregar nuevo
app.post("/inscriptos", (req, res) => {
  try {
    const { nombre, dni, nivel, escuela } = req.body;
    if (!nombre || !dni || !nivel || !escuela) {
      return res.status(400).json({ ok: false, error: "Faltan campos obligatorios" });
    }

    // Verificar DNI duplicado
    const existe = db.prepare("SELECT id FROM inscriptos WHERE dni = ?").get(dni);
    if (existe) {
      return res.status(409).json({ ok: false, error: "Ya existe un inscripto con ese DNI" });
    }

    const fecha = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
    const result = db.prepare(
      "INSERT INTO inscriptos (nombre, dni, nivel, escuela, fecha) VALUES (?, ?, ?, ?, ?)"
    ).run(nombre, dni, nivel, escuela, fecha);

    res.json({ ok: true, id: result.lastInsertRowid, fecha });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── DELETE /inscriptos — borrar todos
app.delete("/inscriptos", (req, res) => {
  const { clave } = req.body;
  if (clave !== process.env.ADMIN_KEY) {
    return res.status(403).json({ ok: false, error: "Clave incorrecta" });
  }
  try {
    db.prepare("DELETE FROM inscriptos").run();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /stats — estadísticas rápidas
app.get("/stats", (req, res) => {
  try {
    const total    = db.prepare("SELECT COUNT(*) as n FROM inscriptos").get().n;
    const infantil = db.prepare("SELECT COUNT(*) as n FROM inscriptos WHERE nivel = 'Infantil'").get().n;
    const n1       = db.prepare("SELECT COUNT(*) as n FROM inscriptos WHERE nivel = '1° Nivel'").get().n;
    const n2       = db.prepare("SELECT COUNT(*) as n FROM inscriptos WHERE nivel = '2° Nivel'").get().n;
    const n3       = db.prepare("SELECT COUNT(*) as n FROM inscriptos WHERE nivel = '3° Nivel'").get().n;
    res.json({ ok: true, total, infantil, n1, n2, n3 });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`OMA Cube API corriendo en puerto ${PORT}`));
