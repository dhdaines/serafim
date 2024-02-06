# Conversion vers ALEXI

- define ALEXI_URL
- fetch pages and:
  - strip headers
  - rewrite img links
  - can be done by:
    - parse the HTML (get this for free anyway)
    - select the enclosing element (div#body)
    - etc
  - test this before implementing search
- index documents:
  - have ALEXI produce JSON with metadata and plain text for each HTML
  - note that actual index only has (id, title, text)
  - but we use the other metadata in page
    - specifically PDF link and page number
  - also IDs need to be meaningful (to give permanent URLs)
    - ALEXI URLs are somewhat meaningful and mostly permanent
    - graft ALEXI URL onto the end of SERAFIM to view
    - implement this first
