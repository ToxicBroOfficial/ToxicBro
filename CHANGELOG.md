# Changelog

## [1.0.0] - 2026-08-08

### Added
- Initial site launch with full structured data (JSON-LD)
- Secondary pages: About, Achievements, Biography, Contact, Disclaimer, Privacy Policy, 404
- Service worker for offline caching
- PWA manifest and meta tags
- Security headers (_headers)
- robots.txt, sitemap.xml

### Changed
- Extracted inline CSS from index.html to css/index.css
- Created css/shared.css for common styles across secondary pages
- Updated stale JSON-LD and meta dates to 2026-08-08

### Fixed
- Fixed axios version in package.json (^1.7.9)
- Added missing meta tags to secondary pages
- Added image dimensions to prevent CLS
