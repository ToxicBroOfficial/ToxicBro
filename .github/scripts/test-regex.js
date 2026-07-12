const fs = require('fs');
const path = 'ToxicBro/pages/about.html';
const content = fs.readFileSync(path, 'utf8');
const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/ig;
const matches = content.match(re) || [];
if (matches.length === 0) {
  console.log('No matches found');
} else {
  console.log('Found', matches.length, 'JSON-LD script block(s)');
}
