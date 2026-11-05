/**
 * functions/scraper/lookup.js
 * High-performance, anti-contaminating Cheerio scraper for Impeesa (registro.scouts.org.ve)
 */
const axios = require("axios");
const cheerio = require("cheerio");
const { serializeCookies } = require("./cookieHelper");

/**
 * Normalizes dates (DD/MM/YYYY or YYYY-MM-DD) into standard ISO YYYY-MM-DD
 * Resilient against surrounding text, icons, and whitespace
 */
function parseDateToISO(rawDate) {
  if (!rawDate) return "";
  const trimmed = rawDate.trim();
  
  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Match ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, "0");
    const day = isoMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
}

/**
 * Collapses whitespace, removes internal newlines and trims text
 */
function cleanText(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Scrapes member status from Impeesa using authenticated session cookies
 * @param {Object} cookies - Key-value cookie jar
 * @param {string} cedula - Member national ID (with or without V/E prefix)
 * @returns {Promise<Object>} Enriched member details dictionary
 */
async function fetchMemberStatusWithCookies(cookies, cedula) {
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const searchResp = await axios.get("https://registro.scouts.org.ve/members/status_member_submit", {
    params: {
      cedula: cedula,
      commit: "Buscar"
    },
    headers: {
      'Cookie': serializeCookies(cookies),
      'User-Agent': userAgent
    },
    timeout: 15000,
    validateStatus: status => status >= 200 && status < 400
  });

  const redirectUrl = searchResp.headers['location'] || '';
  if (redirectUrl.includes('/users/sign_in') || (searchResp.status === 200 && searchResp.data.includes("user[email]"))) {
    throw new Error("Sesión de scraper no autenticada o expirada");
  }

  const $ = cheerio.load(searchResp.data);

  // 1. Check explicit not-found alert messages
  const bodyText = $("body").text();
  if (
    bodyText.includes("Miembro no localizado") ||
    bodyText.includes("No se encontró ningún miembro") ||
    bodyText.includes("No se encontró")
  ) {
    throw new Error("No registrado");
  }

  // 2. Modern Impeesa Layout Parser
  // STRICT SCOPING: Scope exclusively to #content .card and panels to prevent session banner contamination
  const heroCard = $("#content .card").first();
  if (heroCard.length > 0) {
    const nameEl = heroCard.find("h3.fw-bold.text-dark, h3.text-dark, h3.fw-bold, h3").first();
    const nombre_completo = cleanText(nameEl.text());

    if (nombre_completo) {
      // Photo / Avatar URL
      const avatarImg = heroCard.find("img[alt='Foto de perfil'], img.rounded-circle").first();
      const avatar_url = avatarImg.length > 0 ? (avatarImg.attr("src") || "") : "";

      // Member UUID from PDF download links (strictly scoped to heroCard)
      let member_uuid = "";
      const cardPdfLink = heroCard.find("a[href*='download_card.pdf']").attr("href") || "";
      const matchUuid = cardPdfLink.match(/member_id=([a-f0-9\-]+)/i);
      if (matchUuid) {
        member_uuid = matchUuid[1];
      } else {
        const medicalPdfLink = heroCard.find("a[href*='medical_file_pdf']").attr("href") || "";
        const matchMed = medicalPdfLink.match(/members\/([a-f0-9\-]+)\//i);
        if (matchMed) member_uuid = matchMed[1];
      }

      // Solvency & Status Badges
      let solvente_hasta_raw = "";
      let solvente_hasta = "";
      let status = "Inactivo";

      heroCard.find(".badge").each((i, el) => {
        const badgeText = cleanText($(el).text());
        if (badgeText.toLowerCase().includes("activo")) {
          status = "Activo";
        }
        if (badgeText.includes("Solvente hasta")) {
          const match = badgeText.match(/Solvente hasta\s+([\d\/]+)/i);
          if (match) {
            solvente_hasta_raw = match[1];
            solvente_hasta = parseDateToISO(match[1]);
          }
        }
      });

      // Extract all key-value rows from the 3 structured panels
      const tableData = {};
      $("#content [data-sortable-id^='member-status-p'] table tr").each((i, el) => {
        const key = cleanText($(el).find("td").first().text());
        const val = cleanText($(el).find("td").last().text());
        if (key && val && key !== val) {
          tableData[key] = val;
        }
      });

      const rawCedula = tableData["Cédula de Identidad"] || heroCard.text().match(/[VE]-?[\d\.]+/)?.[0] || String(cedula);
      const cleanCedula = rawCedula.replace(/[^\d]/g, "") || String(cedula).replace(/[^\d]/g, "");

      const birthDateRaw = tableData["Fecha Nacimiento"] || tableData["Fecha de Nacimiento"] || "";
      const birthDateISO = parseDateToISO(birthDateRaw);

      let edad = null;
      const edadMatch = heroCard.text().match(/Edad:\s*(\d+)\s*años/i);
      if (edadMatch) {
        edad = parseInt(edadMatch[1], 10);
      } else if (birthDateISO) {
        const bYear = parseInt(birthDateISO.substring(0, 4), 10);
        if (!isNaN(bYear)) {
          edad = new Date().getFullYear() - bYear;
        }
      }

      const carnet_pdf_url = heroCard.find("a[href*='download_card.pdf']").attr("href") || "";
      const medical_pdf_url = heroCard.find("a[href*='medical_file_pdf']").attr("href") || "";

      return {
        // Core Legacy Fields (100% Backwards Compatible)
        nombre_completo,
        status,
        telefono: tableData["Teléfono"] || tableData["Telefono"] || "",
        correo_electronico: tableData["Correo de Usuario"] || tableData["Correo Electronico"] || tableData["Correo Electrónico"] || "",
        fecha_nacimiento: birthDateISO,

        // Enhanced Identity
        cedula: cleanCedula,
        cedula_raw: rawCedula,
        member_uuid,
        avatar_url,
        genero: tableData["Género"] || tableData["Genero"] || "",
        fecha_nacimiento_raw: birthDateRaw,
        edad,

        // Territorial Hierarchy (Auto-Assignment)
        region: tableData["Región"] || tableData["Region"] || "",
        distrito: tableData["Distrito"] || "",
        grupo: tableData["Grupo Scout"] || tableData["Grupo"] || "",

        // Scout Unit & Positions
        unidad: tableData["Unidad"] || "",
        cargo_grupo: tableData["Cargo en Grupo"] || "",
        cargo_institucional: tableData["Cargo Institucional"] || "",
        tipo_miembro: tableData["Tipo de Miembro"] || "",

        // Status & Progression
        solvente_hasta,
        solvente_hasta_raw,
        progresion_actual: tableData["Progresión Actual"] || tableData["Progresion Actual"] || "",
        fecha_ingreso: parseDateToISO(tableData["Fecha de Ingreso"] || tableData["Fecha Ingreso"] || ""),
        fecha_promesa: parseDateToISO(tableData["Fecha de Promesa"] || tableData["Fecha Promesa"] || ""),
        rol_sistema: tableData["Rol en Sistema"] || "",

        // Contact & Demographics
        correo_secundario: tableData["Correo Secundario"] || "",
        ubicacion_estado: tableData["Ubicación / Estado"] || tableData["Ubicación"] || tableData["Estado"] || "",
        direccion: tableData["Dirección"] || tableData["Direccion"] || "",
        religion: tableData["Religión"] || tableData["Religion"] || "",
        nivel_educativo: tableData["Nivel Educativo"] || "",
        ocupacion: tableData["Ocupación"] || tableData["Ocupacion"] || "",
        carnet_pdf_url,
        medical_pdf_url
      };
    }
  }

  // 3. Fallback: Legacy p.mb-1 Parser (For legacy portal responses)
  const legacyMember = {
    nombre_completo: "",
    status: "",
    telefono: "",
    correo_electronico: "",
    fecha_nacimiento: "",
    cedula: String(cedula).replace(/[^\d]/g, ""),
    cedula_raw: String(cedula),
    member_uuid: "",
    avatar_url: "",
    genero: "",
    fecha_nacimiento_raw: "",
    edad: null,
    region: "",
    distrito: "",
    grupo: "",
    unidad: "",
    cargo_grupo: "",
    cargo_institucional: "",
    tipo_miembro: "",
    solvente_hasta: "",
    solvente_hasta_raw: "",
    progresion_actual: "",
    fecha_ingreso: "",
    fecha_promesa: "",
    rol_sistema: "",
    correo_secundario: "",
    ubicacion_estado: "",
    direccion: "",
    religion: "",
    nivel_educativo: "",
    ocupacion: "",
    carnet_pdf_url: "",
    medical_pdf_url: ""
  };

  $("p.mb-1").each((i, elem) => {
    const text = $(elem).text();
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = cleanText(parts[0]);
      const val = cleanText(parts.slice(1).join(':'));
      if (key === "Nombre Completo") legacyMember.nombre_completo = val;
      if (key === "Status") legacyMember.status = val;
      if (key === "Telefono") legacyMember.telefono = val;
      if (key === "Correo Electronico") legacyMember.correo_electronico = val;
      if (key === "Fecha de Nacimiento") {
        legacyMember.fecha_nacimiento_raw = val;
        legacyMember.fecha_nacimiento = parseDateToISO(val);
      }
    }
  });

  if (legacyMember.nombre_completo) {
    return legacyMember;
  }

  throw new Error("No registrado");
}

module.exports = {
  fetchMemberStatusWithCookies,
  parseDateToISO,
  cleanText
};
