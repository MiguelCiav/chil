// Services are responsible for heavy business logic that should not live
// inside commands directly (e.g., PDF generation, filesystem operations).
//

pub mod scraper_service;
pub mod member_service;

