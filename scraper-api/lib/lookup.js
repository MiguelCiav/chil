const axios = require("axios");
const cheerio = require("cheerio");
const { serializeCookies } = require("./cookieHelper");

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

  // Check explicit not-found alert messages
  const bodyText = $("body").text();
  if (bodyText.includes("Miembro no localizado") || bodyText.includes("No se encontró ningún miembro")) {
    throw new Error("No registrado");
  }

  const member = {
    nombre_completo: "",
    status: "",
    telefono: "",
    correo_electronico: "",
    fecha_nacimiento: ""
  };

  // 1. Check legacy format (p.mb-1)
  $("p.mb-1").each((i, elem) => {
    const text = $(elem).text();
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim();
      switch (key) {
        case "Nombre Completo":
          member.nombre_completo = val;
          break;
        case "Status":
          member.status = val;
          break;
        case "Telefono":
          member.telefono = val;
          break;
        case "Correo Electronico":
          member.correo_electronico = val;
          break;
        case "Fecha de Nacimiento":
          member.fecha_nacimiento = val;
          break;
      }
    }
  });

  // 2. If not found via legacy format, parse modern Impeesa layout
  if (!member.nombre_completo) {
    const nameEl = $("h3.fw-bold.text-dark, h3.text-dark, h3.fw-bold, .card-body h3").first();
    if (nameEl.length > 0) {
      member.nombre_completo = nameEl.text().trim();
    }

    // Status badge (e.g. "Usuario Activo", "Solvente hasta ...")
    const badgeEl = $(".badge").filter((i, el) => {
      const t = $(el).text();
      return t.includes("Activo") || t.includes("Inactivo") || t.includes("Solvente");
    }).first();
    if (badgeEl.length > 0) {
      const t = badgeEl.text().trim();
      member.status = t.toLowerCase().includes("activo") || t.toLowerCase().includes("solvente") ? "Activo" : t;
    }

    // Panel tables (Datos Personales y Contacto, Estructura Territorial, etc.)
    $("table tr").each((i, el) => {
      const key = $(el).find("td").first().text().trim();
      const rawVal = $(el).find("td").last().text().replace(/\s+/g, " ").trim();
      if (!key || !rawVal) return;

      if (key.includes("Fecha Nacimiento") || key.includes("Fecha de Nacimiento")) {
        const parts = rawVal.split(/[\/\-]/);
        if (parts.length === 3 && parts[2].length === 4) {
          // DD/MM/YYYY -> YYYY-MM-DD
          member.fecha_nacimiento = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        } else {
          member.fecha_nacimiento = rawVal;
        }
      } else if (key.includes("Teléfono") || key.includes("Telefono")) {
        member.telefono = rawVal;
      } else if (key.includes("Correo de Usuario") || key.includes("Correo Electronico") || key.includes("Correo Electrónico")) {
        if (!member.correo_electronico) {
          member.correo_electronico = rawVal;
        }
      }
    });
  }

  if (!member.nombre_completo) {
    throw new Error("No registrado");
  }

  return member;
}

module.exports = {
  fetchMemberStatusWithCookies
};
