/* =============================================
   TEXT ENGINE — shared helpers for all text tools
   ============================================= */
function textEngine(input, action) {
  if (!input) return '';

  // ---------- simple helpers ----------
  function shuffle(s) { return s.split('').sort(() => Math.random() - 0.5).join(''); }
  function pwGen(len = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}[]:;<>,.?';
    return Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
  function randWords(n = 5) {
    const words = ['apple','banana','cherry','date','elderberry','fig','grape','honeydew','kiwi','lemon','mango','nectarine','orange','peach','quince','raspberry','strawberry','tangerine','ugli','vanilla','watermelon','xigua','yellow','zucchini'];
    return Array.from({length: n}, () => words[Math.floor(Math.random() * words.length)]).join(', ');
  }
  function minify(t) { return t.replace(/\r?\n/g,' ').replace(/\s+/g,' ').trim(); }
  function repeat(t, n = 5) { let r=''; for(let i=0;i<n;i++) r+=t; return r; }
  function build(t) { return t.split(/[\r\n]+/).map(l => l.trim()).filter(l => l).join(' '); }
  function replaceSimple(t) {
    const lines = t.split('\n');
    if (lines.length >= 2) {
      const from = lines[0], to = lines[1], rest = lines.slice(2).join('\n');
      const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'g');
      return rest.replace(re, to);
    }
    return t;
  }
  function htmlEn(t) { return t.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`); }
  function htmlDe(t) { return t.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d))); }
  function hexEn(t) { return t.split('').map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join(' '); }
  function hexDe(t) { try { const s = t.trim().replace(/\s+/g,''); let out=''; for(let i=0;i<s.length;i+=2)      out+=String.fromCharCode(parseInt(s.substr(i,2),16));return out; } catch(e) { return t; } }
  function binEn(t) { return t.split('').map(c => c.charCodeAt(0).toString(2).padStart(8,'0')).join(' '); }
  function binDe(t) { try { return t.replace(/\s+/g,'').replace(/.{1,8}/g, b => String.fromCharCode(parseInt(b,2))); } catch(e) { return t; } }
  function rmPunct(t) { return t.replace(/[!-/:-@[-`{-~]/g, ''); }
  function rmAcc(t) { return t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function rmDupLines(t) { const seen=new Set(); return t.split('\n').filter(l => { if (!seen.has(l)) { seen.add(l); return true; } return false; }).join('\n'); }
  function rmEmptyLines(t) { return t.split('\n').filter(l => l.trim() !== '').join('\n'); }
  function rmBreaks(t) { return t.replace(/[\r\n]+/g, ' '); }
  function rmExtraSp(t) { return t.replace(/[ \t]+/g, ' ').trim(); }
  function rmAllWs(t) { return t.replace(/\s/g, ''); }
  function sortLines(t) { return t.split('\n').sort().join('\n'); }
  function rot13(t) { return t.replace(/[A-Za-z]/g, c => { const base = c <= 'Z' ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base); }); }
  function flipLines(t) { return t.split('\n').reverse().join('\n'); }
  function tokenCount(t) { return `Token count: ${t.split(/\s+/).filter(Boolean).length}`; }
  function txtLen(t) { return `String length: ${t.length} characters`; }

  // ---------- switch ----------
  switch (action) {
    // Basic
    case 'reverse':     return input.split('').reverse().join('');
    case 'scramble':    return shuffle(input);
    case 'ntlm':        return '❌ NTLM hash cannot be computed client-side (requires server processing).';
    case 'password':    return pwGen(12);
    case 'randwords':   return randWords(5);
    case 'minify':      return minify(input);
    case 'repeat':      return repeat(input, 5);
    case 'builder':     return build(input);
    case 'filter':      return input;
    case 'replace':     return replaceSimple(input);
    case 'htmlenc':     return htmlEn(input);
    case 'htmldec':     return htmlDe(input);
    // Base32 / Base58 (placeholder — will be improved later)
    case 'b32enc':      return btoa(input).replace(/[+/=]/g,'');
    case 'b32dec':      return atob(input);
    case 'b58enc':      return '⚠️  Base58 encode not fully implemented (placeholder).';
    case 'b58dec':      return '⚠️  Base58 decode not fully implemented (placeholder).';
    case 'urlenc':      return encodeURIComponent(input);
    case 'urldec':      return decodeURIComponent(input);
    case 'str2hex':     return hexEn(input);
    case 'hex2str':     return hexDe(input);
    case 'str2bin':     return binEn(input);
    case 'bin2str':     return binDe(input);
    // Case conversion
    case 'case': case 'toupper':  return input.toUpperCase();
    case 'tolower':               return input.toLowerCase();
    case 'camelcase':             return input.replace(/[_\-\s]+(.)?/g, (_,c)=>c?c.toUpperCase():'').replace(/^(.)/, c=>c.toUpperCase());
    case 'snakecase':             return input.toLowerCase().replace(/[^\w]+/g,'_').replace(/^_|_$/g,'');
    // Extractors & cleaners
    case 'delimited':   return input.split('\n')[0]?.split(',')[0] || '';
    case 'txt-rmpunct': case 'rmpunct': return rmPunct(input);
    case 'txt-rmaccents': case 'rmaccents': return rmAcc(input);
    case 'rmduplines':  return rmDupLines(input);
    case 'rmemptylines':return rmEmptyLines(input);
    case 'rmlinebreaks':return rmBreaks(input);
    case 'rmextraspace':return rmExtraSp(input);
    case 'rmws':        return rmAllWs(input);
    case 'rmlineswith': return input;
    case 'sortlines':   return sortLines(input);
    // Cipher / meta
    case 'rot13': case 'rot13dec': return rot13(input);
    case 'strlen':      return txtLen(input);
    case 'flipper':     return flipLines(input);
    case 'compress':    return tokenCount(input);
    // any alias not mapped
    default:            return input;
  }
}
