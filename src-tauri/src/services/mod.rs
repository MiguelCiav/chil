// Services are responsible for heavy business logic that should not live
// inside commands directly (e.g., PDF generation, filesystem operations).

pub mod batch_service;
pub mod member_service;
pub mod pdf_service;
pub mod scraper_service;
pub mod system;
