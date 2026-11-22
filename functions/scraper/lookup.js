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
  const dmyMatch = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(trimmed);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Match ISO YYYY-MM-DD
  const isoMatch = /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/.exec(trimmed);
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

function pickTableValue(tableData, keys, fallback = "") {
  for (const key of keys) {
    if (tableData[key]) {
      return tableData[key];
    }
  }
  return fallback;
}

function extractMemberUuid(cardPdfLink, medicalPdfLink) {
  const matchUuid = /member_id=([a-f0-9-]+)/i.exec(cardPdfLink);
  if (matchUuid) {
    return matchUuid[1];
  }
  const matchMed = /members\/([a-f0-9-]+)\//i.exec(medicalPdfLink);
  return matchMed ? matchMed[1] : "";
}

function extractSolvencyAndStatus($, heroCard) {
  let solvente_hasta_raw = "";
  let solvente_hasta = "";
  let status = "Inactivo";

  heroCard.find(".badge").each((_, el) => {
    const badgeText = cleanText($(el).text());
    if (badgeText.toLowerCase().includes("activo")) {
      status = "Activo";
    }
    if (badgeText.includes("Solvente hasta")) {
      const match = /Solvente hasta\s+([\d/]+)/i.exec(badgeText);
      if (match) {
        solvente_hasta_raw = match[1];
        solvente_hasta = parseDateToISO(match[1]);
      }
    }
  });

  return { solvente_hasta_raw, solvente_hasta, status };
}

function extractPanelTableData($) {
  const tableData = {};
  $("#content [data-sortable-id^='member-status-p'] table tr").each((_, el) => {
    const key = cleanText($(el).find("td").first().text());
    const val = cleanText($(el).find("td").last().text());
    if (key && val && key !== val) {
      tableData[key] = val;
    }
  });
  return tableData;
}

function resolveMemberAge(heroText, birthDateISO) {
  const edadMatch = /Edad:\s*(\d+)\s*años/i.exec(heroText);
  if (edadMatch) {
    return Number.parseInt(edadMatch[1], 10);
  }
  if (birthDateISO) {
    const bYear = Number.parseInt(birthDateISO.substring(0, 4), 10);
    if (!Number.isNaN(bYear)) {
      return new Date().getFullYear() - bYear;
    }
  }
  return null;
}

function extractHeroTerritoryFallback($, heroCard) {
  let heroRegion = "";
  let heroDistrito = "";
  let heroGrupo = "";

  heroCard.find("div").each((_, div) => {
    const text = cleanText($(div).text());
    if (text.includes("Región:") || text.includes("Region:")) {
      heroRegion = cleanText($(div).find(".badge").text());
    }
    if (text.includes("Distrito:")) {
      heroDistrito = cleanText($(div).find(".badge").text());
    }
    if (text.includes("Grupo:")) {
      heroGrupo = cleanText($(div).find(".badge").text());
    }
  });

  return { heroRegion, heroDistrito, heroGrupo };
}

function parseModernHeroCardMember($, heroCard, cedula) {
  const nameEl = heroCard
    .find("h3.fw-bold.text-dark, h3.text-dark, h3.fw-bold, h3")
    .first();
  const nombre_completo = cleanText(nameEl.text());
  if (!nombre_completo) {
    return null;
  }

  const avatarImg = heroCard
    .find("img[alt='Foto de perfil'], img.rounded-circle")
    .first();
  const avatar_url = avatarImg.length > 0 ? avatarImg.attr("src") || "" : "";

  const carnet_pdf_url =
    heroCard.find("a[href*='download_card.pdf']").attr("href") || "";
  const medical_pdf_url =
    heroCard.find("a[href*='medical_file_pdf']").attr("href") || "";
  const member_uuid = extractMemberUuid(carnet_pdf_url, medical_pdf_url);

  const { solvente_hasta_raw, solvente_hasta, status } =
    extractSolvencyAndStatus($, heroCard);
  const tableData = extractPanelTableData($);

  const heroText = heroCard.text();
  const matchedCedula = /[VE]-?[\d.]+/.exec(heroText)?.[0];
  const rawCedula = pickTableValue(
    tableData,
    ["Cédula de Identidad"],
    matchedCedula || String(cedula)
  );
  const cleanCedula =
    rawCedula.replace(/\D/g, "") || String(cedula).replace(/\D/g, "");

  const birthDateRaw = pickTableValue(tableData, [
    "Fecha Nacimiento",
    "Fecha de Nacimiento",
  ]);
  const birthDateISO = parseDateToISO(birthDateRaw);
  const edad = resolveMemberAge(heroText, birthDateISO);
  const { heroRegion, heroDistrito, heroGrupo } = extractHeroTerritoryFallback(
    $,
    heroCard
  );

  return {
    nombre_completo,
    status,
    telefono: pickTableValue(tableData, ["Teléfono", "Telefono"]),
    correo_electronico: pickTableValue(tableData, [
      "Correo de Usuario",
      "Correo Electronico",
      "Correo Electrónico",
    ]),
    fecha_nacimiento: birthDateISO,
    cedula: cleanCedula,
    cedula_raw: rawCedula,
    member_uuid,
    avatar_url,
    genero: pickTableValue(tableData, ["Género", "Genero"]),
    fecha_nacimiento_raw: birthDateRaw,
    edad,
    region: pickTableValue(tableData, ["Región", "Region"], heroRegion),
    distrito: pickTableValue(tableData, ["Distrito"], heroDistrito),
    grupo: pickTableValue(tableData, ["Grupo Scout", "Grupo"], heroGrupo),
    unidad: pickTableValue(tableData, ["Unidad"]),
    cargo_grupo: pickTableValue(tableData, ["Cargo en Grupo"]),
    cargo_institucional: pickTableValue(tableData, ["Cargo Institucional"]),
    tipo_miembro: pickTableValue(tableData, ["Tipo de Miembro"]),
    solvente_hasta,
    solvente_hasta_raw,
    progresion_actual: pickTableValue(tableData, [
      "Progresión Actual",
      "Progresion Actual",
    ]),
    fecha_ingreso: parseDateToISO(
      pickTableValue(tableData, ["Fecha de Ingreso", "Fecha Ingreso"])
    ),
    fecha_promesa: parseDateToISO(
      pickTableValue(tableData, ["Fecha de Promesa", "Fecha Promesa"])
    ),
    rol_sistema: pickTableValue(tableData, ["Rol en Sistema"]),
    correo_secundario: pickTableValue(tableData, ["Correo Secundario"]),
    ubicacion_estado: pickTableValue(tableData, [
      "Ubicación / Estado",
      "Ubicación",
      "Estado",
    ]),
    direccion: pickTableValue(tableData, ["Dirección", "Direccion"]),
    religion: pickTableValue(tableData, ["Religión", "Religion"]),
    nivel_educativo: pickTableValue(tableData, ["Nivel Educativo"]),
    ocupacion: pickTableValue(tableData, ["Ocupación", "Ocupacion"]),
    carnet_pdf_url,
    medical_pdf_url,
  };
}

function parseLegacyParagraphMember($, cedula) {
  const legacyMember = {
    nombre_completo: "",
    status: "",
    telefono: "",
    correo_electronico: "",
    fecha_nacimiento: "",
    cedula: String(cedula).replace(/\D/g, ""),
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
    medical_pdf_url: "",
  };

  const fieldAssigners = {
    "Nombre Completo": (val) => {
      legacyMember.nombre_completo = val;
    },
    Status: (val) => {
      legacyMember.status = val;
    },
    Telefono: (val) => {
      legacyMember.telefono = val;
    },
    "Correo Electronico": (val) => {
      legacyMember.correo_electronico = val;
    },
    "Fecha de Nacimiento": (val) => {
      legacyMember.fecha_nacimiento_raw = val;
      legacyMember.fecha_nacimiento = parseDateToISO(val);
    },
  };

  $("p.mb-1").each((_, elem) => {
    const text = $(elem).text();
    const parts = text.split(":");
    if (parts.length >= 2) {
      const key = cleanText(parts[0]);
      const val = cleanText(parts.slice(1).join(":"));
      const assigner = fieldAssigners[key];
      if (assigner) {
        assigner(val);
      }
    }
  });

  return legacyMember.nombre_completo ? legacyMember : null;
}

/**
 * Scrapes member status from Impeesa using authenticated session cookies
 * @param {Object} cookies - Key-value cookie jar
 * @param {string} cedula - Member national ID (with or without V/E prefix)
 * @returns {Promise<Object>} Enriched member details dictionary
 */
async function fetchMemberStatusWithCookies(cookies, cedula) {
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const searchResp = await axios.get(
    "https://registro.scouts.org.ve/members/status_member_submit",
    {
      params: {
        cedula: cedula,
        commit: "Buscar",
      },
      headers: {
        Cookie: serializeCookies(cookies),
        "User-Agent": userAgent,
      },
      timeout: 15000,
      validateStatus: (status) => status >= 200 && status < 400,
    }
  );

  const redirectUrl = searchResp.headers["location"] || "";
  if (
    redirectUrl.includes("/users/sign_in") ||
    (searchResp.status === 200 && searchResp.data.includes("user[email]"))
  ) {
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
  const heroCard = $("#content .card").first();
  if (heroCard.length > 0) {
    const modernMember = parseModernHeroCardMember($, heroCard, cedula);
    if (modernMember) {
      return modernMember;
    }
  }

  // 3. Fallback: Legacy p.mb-1 Parser
  const legacyMember = parseLegacyParagraphMember($, cedula);
  if (legacyMember) {
    return legacyMember;
  }

  throw new Error("No registrado");
}

module.exports = {
  fetchMemberStatusWithCookies,
  parseDateToISO,
  cleanText
};
