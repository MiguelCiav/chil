use crate::services::batch_service::get_batch_details;
use printpdf::path::{PaintMode, WindingOrder};
use printpdf::*;
use sea_orm::DatabaseConnection;
use std::fs::File;
use std::io::BufWriter;

/// Generates a structured PDF report for the given batch, listing all active members
pub async fn generate_batch_report(
    db: &DatabaseConnection,
    batch_id: i32,
    output_path: &str,
) -> Result<String, String> {
    // 1. Get batch details
    let details = get_batch_details(db, batch_id)
        .await
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or_else(|| format!("Batch with ID {} not found", batch_id))?;

    // 2. Setup A4 document (210mm x 297mm)
    let (doc, page1, layer1) = PdfDocument::new("Reporte de Lote", Mm(210.0), Mm(297.0), "Layer 1");

    // Load builtin Helvetica fonts
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).unwrap();
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).unwrap();

    let mut current_page = page1;
    let mut current_layer = doc.get_page(current_page).get_layer(layer1);

    // Title and subheadings
    let title = "ASOCIACION DE SCOUTS DE VENEZUELA";
    let subtitle = format!("REPORTE DE LOTE: {}", sanitize_spanish(&details.batch.name));

    // Y-coordinate tracking starting near the top of the A4 page (297.0 mm)
    let mut y = 270.0;

    // Draw header
    current_layer.use_text(title, 14.0, Mm(15.0), Mm(y), &font_bold);
    y -= 10.0;
    current_layer.use_text(subtitle, 12.0, Mm(15.0), Mm(y), &font_bold);
    y -= 15.0;

    // Geographic details
    current_layer.use_text(
        "DETALLES ORGANIZACIONALES",
        10.0,
        Mm(15.0),
        Mm(y),
        &font_bold,
    );
    y -= 6.0;

    // Draw horizontal separator line
    draw_horizontal_line(&current_layer, y);
    y -= 6.0;

    let region_label = format!("Region: {}", sanitize_spanish(&details.region.name));
    let district_label = format!("Distrito: {}", sanitize_spanish(&details.district.name));
    let group_label = format!("Grupo: {}", sanitize_spanish(&details.group.name));
    let date_label = format!("Fecha de Creacion: {}", details.batch.created_at);

    current_layer.use_text(region_label, 9.0, Mm(15.0), Mm(y), &font);
    current_layer.use_text(district_label, 9.0, Mm(110.0), Mm(y), &font);
    y -= 6.0;
    current_layer.use_text(group_label, 9.0, Mm(15.0), Mm(y), &font);
    current_layer.use_text(date_label, 9.0, Mm(110.0), Mm(y), &font);
    y -= 12.0;

    // Members Title
    current_layer.use_text(
        "MIEMBROS ACTIVOS EN ESTE LOTE",
        10.0,
        Mm(15.0),
        Mm(y),
        &font_bold,
    );
    y -= 6.0;
    draw_horizontal_line(&current_layer, y);
    y -= 8.0;

    // Table Header
    current_layer.use_text("Cedula", 9.0, Mm(15.0), Mm(y), &font_bold);
    current_layer.use_text("Nombre", 9.0, Mm(45.0), Mm(y), &font_bold);
    current_layer.use_text("Apellido", 9.0, Mm(85.0), Mm(y), &font_bold);
    current_layer.use_text("Nacimiento", 9.0, Mm(125.0), Mm(y), &font_bold);
    current_layer.use_text("Tipo", 9.0, Mm(165.0), Mm(y), &font_bold);
    y -= 4.0;
    draw_horizontal_line(&current_layer, y);
    y -= 6.0;

    // Filter active members
    let active_members: Vec<_> = details
        .members
        .into_iter()
        .filter(|m| m.status == "active")
        .collect();

    if active_members.is_empty() {
        current_layer.use_text(
            "No hay miembros activos registrados en este lote.",
            9.0,
            Mm(15.0),
            Mm(y),
            &font,
        );
    } else {
        for m in active_members {
            // Check page overflow
            if y < 20.0 {
                // Add a new page
                let (new_p, new_l) = doc.add_page(Mm(210.0), Mm(297.0), "Layer 1");
                current_page = new_p;
                current_layer = doc.get_page(current_page).get_layer(new_l);
                y = 270.0;

                // Redraw table header on new page
                current_layer.use_text("Cedula", 9.0, Mm(15.0), Mm(y), &font_bold);
                current_layer.use_text("Nombre", 9.0, Mm(45.0), Mm(y), &font_bold);
                current_layer.use_text("Apellido", 9.0, Mm(85.0), Mm(y), &font_bold);
                current_layer.use_text("Nacimiento", 9.0, Mm(125.0), Mm(y), &font_bold);
                current_layer.use_text("Tipo", 9.0, Mm(165.0), Mm(y), &font_bold);
                y -= 4.0;
                draw_horizontal_line(&current_layer, y);
                y -= 6.0;
            }

            let member_type_label = match m.member_type.as_str() {
                "young" => "Juvenil",
                "adult" => "Adulto",
                other => other,
            };

            current_layer.use_text(&m.identity, 9.0, Mm(15.0), Mm(y), &font);
            current_layer.use_text(sanitize_spanish(&m.first_name), 9.0, Mm(45.0), Mm(y), &font);
            current_layer.use_text(sanitize_spanish(&m.last_name), 9.0, Mm(85.0), Mm(y), &font);
            current_layer.use_text(&m.birth_date, 9.0, Mm(125.0), Mm(y), &font);
            current_layer.use_text(
                sanitize_spanish(member_type_label),
                9.0,
                Mm(165.0),
                Mm(y),
                &font,
            );

            y -= 7.0;
        }
    }

    // Save document
    let file =
        File::create(output_path).map_err(|e| format!("Failed to create output file: {}", e))?;
    let mut writer = BufWriter::new(file);
    doc.save(&mut writer)
        .map_err(|e| format!("Failed to save PDF document: {}", e))?;

    Ok(output_path.to_string())
}

/// Helper to draw a horizontal line in the PDF page layer
fn draw_horizontal_line(layer: &PdfLayerReference, y: f32) {
    let points = vec![
        (Point::new(Mm(15.0), Mm(y)), false),
        (Point::new(Mm(195.0), Mm(y)), false),
    ];
    let polygon = Polygon {
        rings: vec![points],
        mode: PaintMode::Stroke,
        winding_order: WindingOrder::NonZero,
    };
    layer.add_polygon(polygon);
}

/// Standard sanitization to map Spanish accented characters and other non-standard Unicode glyphs
/// safely to standard ASCII representations accepted by standard Helvetica builtin fonts.
pub fn sanitize_spanish(text: &str) -> String {
    text.chars()
        .map(|c| match c {
            'á' | 'ä' | 'â' => 'a',
            'é' | 'ë' | 'ê' => 'e',
            'í' | 'ï' | 'î' => 'i',
            'ó' | 'ö' | 'ô' => 'o',
            'ú' | 'ü' | 'û' => 'u',
            'ñ' => 'n',
            'Á' | 'Ä' | 'Â' => 'A',
            'É' | 'Ë' | 'Ê' => 'E',
            'Í' | 'Ï' | 'Î' => 'I',
            'Ó' | 'Ö' | 'Ô' => 'O',
            'Ú' | 'Ü' | 'Û' => 'U',
            'Ñ' => 'N',
            _ => c,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::entities::{batch, district, region, scout_group, scout_member};
    use sea_orm::MockDatabase;
    use std::fs;

    #[tokio::test]
    async fn test_generate_batch_report() {
        let db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
            .append_query_results([vec![batch::Model {
                id: 10,
                name: "Lote de Prueba".to_string(),
                region_id: 1,
                district_id: 1,
                group_id: 1,
                created_at: "2026-05-31 15:30:00".to_string(),
            }]])
            .append_query_results([vec![region::Model {
                id: 1,
                name: "Región Metropolitana".to_string(),
            }]])
            .append_query_results([vec![district::Model {
                id: 1,
                name: "Distrito Sucre".to_string(),
                region_id: 1,
            }]])
            .append_query_results([vec![scout_group::Model {
                id: 1,
                name: "Grupo Scouts 45".to_string(),
                district_id: 1,
            }]])
            .append_query_results([vec![scout_member::Model {
                identity: "V-20123456".to_string(),
                first_name: "María".to_string(),
                last_name: "Gómez".to_string(),
                birth_date: "2011-04-12".to_string(),
                email: Some("maria@gmail.com".to_string()),
                phone: None,
                group_id: Some(1),
                unit_id: Some(1),
                member_type: "young".to_string(),
                status: "active".to_string(),
                batch_id: Some(10),
            }]])
            .into_connection();

        let test_output_path = "test_report.pdf";
        let result = generate_batch_report(&db, 10, test_output_path).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), test_output_path);

        // Verify the file exists and is not empty
        let metadata = fs::metadata(test_output_path);
        assert!(metadata.is_ok());
        assert!(metadata.unwrap().len() > 0);

        // Clean up
        let _ = fs::remove_file(test_output_path);
    }
}
