// Services are responsible for heavy business logic that should not live
// inside commands directly (e.g., PDF generation, filesystem operations).
//
// Example structure when features are added:
//
//   pub mod pdf_service;
//   pub mod filesystem_service;
