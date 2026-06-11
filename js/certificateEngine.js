/* =============================================
   CERTIFICATE ENGINE — X.509 certificate tools
   for sysadmins: decode, convert, merge,
   validate, fingerprint
   ============================================= */

(function () {
'use strict';

/* ---------------------------------------------------------------
   PEM UTILITIES
   --------------------------------------------------------------- */
function parsePem(text) {
  const blocks = [];
  const re = /-----BEGIN\s+([A-Z\s-]+)-----\s*([\s\S]*?)-----END\s+\1-----/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const b64 = m[2].replace(/\s/g, '');
    try {
      const der = base64ToBytes(b64);
      const label = m[1].trim();
      blocks.push({ label, b64, der });
    } catch (_) { /* skip invalid blocks */ }
  }
  return blocks;
}

function toPem(label, der) {
  const b64 = bytesToBase64(der);
  const lines = b64.replace(/(.{64})/g, '$1\n');
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function bytesToBase64(u8) {
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

function hex(u8) {
  return Array.from(u8).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
}

function hexRaw(u8) {
  return Array.from(u8).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
}

/* ---------------------------------------------------------------
   ASN.1 / DER PARSER
   --------------------------------------------------------------- */
function parseDer(data, offset) {
  offset = offset || 0;
  const tag = data[offset++];
  let len = data[offset++];
  if (len & 0x80) {
    const count = len & 0x7f;
    len = 0;
    for (let i = 0; i < count; i++) len = (len << 8) | data[offset++];
  }
  const value = data.slice(offset, offset + len);
  offset += len;
  const node = { tag, length: len, value, children: [], _nextOffset: offset };
  if (tag & 0x20) {
    let childOff = 0;
    while (childOff < len) {
      const child = parseDer(value, childOff);
      childOff = child._nextOffset;
      node.children.push(child);
    }
  }
  return node;
}

/* ---------------------------------------------------------------
   OID MAP
   --------------------------------------------------------------- */
const OIDS = {
  // Directory attributes
  '2.5.4.3': 'CN',
  '2.5.4.4': 'SN',
  '2.5.4.5': 'serialNumber',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.9': 'STREET',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.12': 'title',
  '2.5.4.13': 'description',
  '2.5.4.17': 'postalCode',
  '2.5.4.41': 'name',
  '2.5.4.42': 'givenName',
  '2.5.4.43': 'initials',
  '2.5.4.44': 'generationQualifier',
  '2.5.4.45': 'uniqueIdentifier',
  '2.5.4.46': 'dnQualifier',
  '2.5.4.65': 'pseudonym',
  '2.5.4.97': 'organizationIdentifier',
  '1.2.840.113549.1.9.1': 'emailAddress',
  '0.9.2342.19200300.100.1.1': 'UID',
  '0.9.2342.19200300.100.1.25': 'DC',
  '1.3.6.1.4.1.311.60.2.1.3': 'jurisdictionC',
  '1.3.6.1.4.1.311.60.2.1.2': 'jurisdictionST',
  // Signature / PKI algorithms
  '1.2.840.113549.1.1.1': 'RSA Encryption',
  '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.113549.1.1.10': 'RSASSA-PSS',
  '1.2.840.113549.1.1.8': 'PKCS#1 MGF1',
  '1.2.840.10040.4.1': 'DSA',
  '1.2.840.10040.4.3': 'sha1WithDSA',
  '1.2.840.10045.2.1': 'EC Public Key',
  '1.2.840.10045.4.1': 'ecdsaWithSHA1',
  '1.2.840.10045.4.3.2': 'ecdsaWithSHA256',
  '1.2.840.10045.4.3.3': 'ecdsaWithSHA384',
  '1.2.840.10045.4.3.4': 'ecdsaWithSHA512',
  '1.2.840.10045.3.1.7': 'P-256 (secp256r1)',
  '1.3.132.0.34': 'P-384 (secp384r1)',
  '1.3.132.0.35': 'P-521 (secp521r1)',
  '1.3.14.3.2.26': 'sha1',
  '2.16.840.1.101.3.4.2.1': 'sha256',
  '2.16.840.1.101.3.4.2.2': 'sha384',
  '2.16.840.1.101.3.4.2.3': 'sha512',
  '1.3.6.1.5.5.7.1.1': 'Authority Information Access',
  '1.3.6.1.5.5.7.48.1': 'OCSP',
  '1.3.6.1.5.5.7.48.2': 'CA Issuers',
  // Key Usage / Extended Key Usage
  '2.5.29.14': 'Subject Key Identifier',
  '2.5.29.15': 'Key Usage',
  '2.5.29.16': 'Private Key Usage Period',
  '2.5.29.17': 'Subject Alternative Name',
  '2.5.29.18': 'Issuer Alternative Name',
  '2.5.29.19': 'Basic Constraints',
  '2.5.29.30': 'Name Constraints',
  '2.5.29.31': 'CRL Distribution Points',
  '2.5.29.32': 'Certificate Policies',
  '2.5.29.35': 'Authority Key Identifier',
  '2.5.29.36': 'Policy Constraints',
  '2.5.29.37': 'Extended Key Usage',
  '2.5.29.46': 'Freshest CRL',
  '1.3.6.1.5.5.7.1.3': 'QA Statement',
  // Extended Key Usage purposes
  '1.3.6.1.5.5.7.3.1': 'TLS Web Server Authentication',
  '1.3.6.1.5.5.7.3.2': 'TLS Web Client Authentication',
  '1.3.6.1.5.5.7.3.3': 'Code Signing',
  '1.3.6.1.5.5.7.3.4': 'Email Protection (SMIME)',
  '1.3.6.1.5.5.7.3.5': 'IPsec End System',
  '1.3.6.1.5.5.7.3.6': 'IPsec Tunnel',
  '1.3.6.1.5.5.7.3.7': 'IPsec User',
  '1.3.6.1.5.5.7.3.8': 'Time Stamping',
  '1.3.6.1.5.5.7.3.9': 'OCSP Signing',
  '1.3.6.1.4.1.311.10.3.4': 'EFS Recovery',
  '1.3.6.1.4.1.311.10.3.1': 'Microsoft Trust List Signing',
  '1.3.6.1.4.1.311.10.3.12': 'Microsoft Document Signing',
  '1.3.6.1.4.1.311.20.2.2': 'Microsoft Smartcard Logon',
  // Known curves
  '1.2.840.10045.3.1.1': 'X9.62 P-192',
  '1.3.132.0.33': 'P-224',
  '1.3.132.0.1': 'sect163k1',
  '1.3.132.0.15': 'sect163r2',
  // CKA / NIST
  '2.16.840.1.101.3.4.1.2': 'AES-128 CBC',
  '2.16.840.1.101.3.4.1.22': 'AES-192 CBC',
  '2.16.840.1.101.3.4.1.42': 'AES-256 CBC',
};

function oidStr(val) {
  if (!val || val.length < 2) return '?';
  let oid = '' + Math.floor(val[0] / 40) + '.' + (val[0] % 40);
  let n = 0;
  for (let i = 1; i < val.length; i++) {
    n = (n << 7) | (val[i] & 0x7f);
    if (!(val[i] & 0x80)) { oid += '.' + n; n = 0; }
  }
  return oid;
}

function oidName(val) {
  return OIDS[oidStr(val)] || oidStr(val);
}

/* ---------------------------------------------------------------
   ASN.1 STRING / DATE HELPERS
   --------------------------------------------------------------- */
function decodeAsn1String(node) {
  const dec = new TextDecoder('utf-8');
  try {
    switch (node.tag) {
      case 0x0C: case 0x16: case 0x13: case 0x14: case 0x1E:
        return dec.decode(node.value).replace(/\0/g, '');
      default:
        return dec.decode(node.value).replace(/\0/g, '');
    }
  } catch (_) {
    return '0x' + hexRaw(node.value);
  }
}

function parseAsn1Time(node) {
  const s = new TextDecoder('utf-8').decode(node.value);
  let yr, mo, dy, hr, mi, sc = 0;
  if (node.tag === 0x17) {
    yr = parseInt(s.substring(0, 2));
    yr += yr >= 50 ? 1900 : 2000;
    mo = parseInt(s.substring(2, 4)) - 1;
    dy = parseInt(s.substring(4, 6));
    hr = parseInt(s.substring(6, 8));
    mi = parseInt(s.substring(8, 10));
    if (s.length >= 12) sc = parseInt(s.substring(10, 12));
  } else {
    yr = parseInt(s.substring(0, 4));
    mo = parseInt(s.substring(4, 6)) - 1;
    dy = parseInt(s.substring(6, 8));
    hr = parseInt(s.substring(8, 10));
    mi = parseInt(s.substring(10, 12));
    if (s.length >= 14) sc = parseInt(s.substring(12, 14));
  }
  return new Date(Date.UTC(yr, mo, dy, hr, mi, sc));
}

function formatDate(d) {
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toUTCString().replace('GMT', 'UTC');
}

function daysBetween(a, b) {
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

/* ---------------------------------------------------------------
   NAME (DN) PARSER
   --------------------------------------------------------------- */
function parseRdnSequence(node) {
  const parts = [];
  for (const set of node.children) {
    for (const seq of set.children) {
      const oidN = seq.children && seq.children[0];
      const valN = seq.children && seq.children[1];
      if (!oidN) continue;
      const o = oidStr(oidN.value);
      const label = OIDS[o] || o;
      const v = valN ? decodeAsn1String(valN) : '?';
      parts.push({ label, value: v });
    }
  }
  return parts;
}

function dnToString(parts) {
  return parts.map(p => `${p.label}=${escHtml(p.value)}`).join(', ');
}

/* ---------------------------------------------------------------
   PUBLIC KEY INFO PARSER
   --------------------------------------------------------------- */
function parsePublicKeyInfo(node) {
  const algoNode = node.children && node.children[0];
  const keyNode = node.children && node.children[1];
  if (!algoNode || !keyNode) return { algorithm: 'Unknown', bits: 0 };
  const oidN = algoNode.children && algoNode.children[0];
  if (!oidN) return { algorithm: 'Unknown', bits: 0 };
  const algoOid = oidStr(oidN.value);
  const name = oidName(oidN.value);

  // Determine key size
  let bits = 0;
  if (algoOid === '1.2.840.113549.1.1.1') {
    // RSA — parse the BIT STRING which contains RSAPublicKey SEQUENCE
    const keyBits = keyNode.value;
    // Skip first byte of BIT STRING (unused bits count), then parse SEQUENCE
    const rsaSeq = parseDer(keyBits, 1);
    if (rsaSeq.children && rsaSeq.children[0]) {
      bits = rsaSeq.children[0].length * 8;
    }
  } else if (algoOid === '1.2.840.10045.2.1') {
    // EC — look at curve OID in params
    const paramsNode = algoNode.children && algoNode.children[1];
    if (paramsNode && paramsNode.children && paramsNode.children[0]) {
      const curveOid = oidStr(paramsNode.children[0].value);
      switch (curveOid) {
        case '1.2.840.10045.3.1.7': bits = 256; break;
        case '1.3.132.0.34': bits = 384; break;
        case '1.3.132.0.35': bits = 521; break;
      }
    }
    // Also measure the key bit length from the BIT STRING value
    if (!bits && keyNode.value.length > 1) {
      bits = (keyNode.value.length - 1) * 8;
    }
  }
  return { algorithm: name, bits };
}

/* ---------------------------------------------------------------
   EXTENSION PARSER
   --------------------------------------------------------------- */
function parseExtensions(seq) {
  const exts = [];
  for (const extNode of seq.children) {
    const oidN = extNode.children && extNode.children[0];
    const criticalN = extNode.children && extNode.children[1];
    const valN = extNode.children && extNode.children[extNode.children.length - 1];
    if (!oidN || !valN) continue;
    const extOid = oidStr(oidN.value);
    const name = oidName(oidN.value);
    const critical = criticalN && criticalN.tag === 0x01 && criticalN.value[0] !== 0;
    const extVal = valN.value; // OCTET STRING value
    exts.push({ oid: extOid, name, critical, value: extVal });
  }
  return exts;
}

function formatExtension(ext) {
  try {
    const der = parseDer(ext.value);
    switch (ext.oid) {
      case '2.5.29.14': { // Subject Key Identifier
        if (der.children && der.children[0]) return hex(der.children[0].value);
        return hex(der.value);
      }
      case '2.5.29.35': { // Authority Key Identifier
        const inner = der.children && der.children[0];
        if (!inner) return hex(der.value);
        let result = '';
        for (const ch of inner.children) {
          if (ch.tag === 0x80) result += 'KeyID: ' + hex(ch.value) + ' ';
          if (ch.tag === 0x81) result += 'Issuer: (dir) ';
          if (ch.tag === 0x82) result += 'Serial: ' + hex(ch.value) + ' ';
        }
        return result.trim();
      }
      case '2.5.29.15': { // Key Usage
        const bits = der.value;
        const usages = [];
        if (bits.length > 0) {
          const b = bits[0];
          if (b & 0x80) usages.push('Digital Signature');
          if (b & 0x40) usages.push('Non Repudiation');
          if (b & 0x20) usages.push('Key Encipherment');
          if (b & 0x10) usages.push('Data Encipherment');
          if (b & 0x08) usages.push('Key Agreement');
          if (b & 0x04) usages.push('Key Cert Sign');
          if (b & 0x02) usages.push('CRL Sign');
          if (b & 0x01) usages.push('Encipher Only');
          if (bits.length > 1 && (bits[1] & 0x80)) usages.push('Decipher Only');
        }
        return usages.join(', ') || '(none)';
      }
      case '2.5.29.37': { // Extended Key Usage
        const purposes = [];
        for (const ch of der.children) {
          if (ch.tag === 0x06) purposes.push(oidName(ch.value));
        }
        return purposes.join(', ') || '(none)';
      }
      case '2.5.29.17': { // Subject Alternative Name
        const sans = [];
        for (const ch of der.children) {
          switch (ch.tag) {
            case 0x81: sans.push('DNS: ' + decodeAsn1String(ch)); break;
            case 0x82: sans.push('DNS: ' + decodeAsn1String(ch)); break;
            case 0x86: sans.push('URI: ' + decodeAsn1String(ch)); break;
            case 0x87: sans.push('IP: ' + Array.from(ch.value).join('.')); break;
            case 0x80: sans.push('otherName'); break;
            default: sans.push(`[tag 0x${ch.tag.toString(16)}]`); break;
          }
        }
        return sans.join(', ') || '(none)';
      }
      case '2.5.29.19': { // Basic Constraints
        let ca = false;
        let pathLen = 'unlimited';
        for (const ch of der.children) {
          if (ch.tag === 0x01 && ch.value[0] !== 0) ca = true;
          if (ch.tag === 0x02) pathLen = '' + ch.value[0];
        }
        return `CA=${ca ? 'TRUE' : 'FALSE'}, pathLen=${pathLen}`;
      }
      case '1.3.6.1.5.5.7.1.1': { // Authority Information Access
        const aia = [];
        for (const ch of der.children) {
          const method = ch.children && ch.children[0];
          const loc = ch.children && ch.children[1];
          if (method && loc) {
            const methodName = oidName(method.value);
            const locStr = decodeAsn1String(loc);
            aia.push(`${methodName}: ${locStr}`);
          }
        }
        return aia.join(' | ');
      }
      case '2.5.29.31': { // CRL Distribution Points
        const crls = [];
        for (const dp of der.children) {
          const fullName = findChild(dp, 0xA0);
          if (fullName) {
            const gn = findChild(fullName, 0xA0);
            if (gn) {
              for (const g of gn.children) {
                if (g.tag === 0x86) crls.push(decodeAsn1String(g));
              }
            }
          }
        }
        return crls.join(' | ') || '(none)';
      }
      default:
        return '0x' + hexRaw(der.value);
    }
  } catch (_) {
    return '0x' + hexRaw(ext.value);
  }
}

function findChild(node, tag) {
  if (!node.children) return null;
  for (const c of node.children) if (c.tag === tag) return c;
  return null;
}

/* ---------------------------------------------------------------
   SHA-256 (PURE JS, SYNCHRONOUS)
   --------------------------------------------------------------- */
function sha256(data) {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);
  const w = new Uint32Array(64);
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const ml = data.length * 8;
  const off = data.length;
  const tmp = new Uint8Array(((data.length + 9 + 63) & ~63) + 64);
  tmp.set(data);
  tmp[off] = 0x80;
  new DataView(tmp.buffer).setUint32(tmp.length - 4, ml, false);
  const words = new Uint32Array(tmp.buffer);

  for (let b = 0; b < tmp.length; b += 64) {
    for (let i = 0; i < 16; i++) w[i] = words[(b >> 2) + i];
    for (let i = 16; i < 64; i++) {
      const s0 = rrot(w[i-15], 7) ^ rrot(w[i-15], 18) ^ (w[i-15] >>> 3);
      const s1 = rrot(w[i-2], 17) ^ rrot(w[i-2], 19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let a = h0, b2 = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rrot(e, 6) ^ rrot(e, 11) ^ rrot(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rrot(a, 2) ^ rrot(a, 13) ^ rrot(a, 22);
      const maj = (a & b2) ^ (a & c) ^ (b2 & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b2; b2 = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b2) >>> 0;
    h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return new Uint32Array([h0, h1, h2, h3, h4, h5, h6, h7]);
}

function rrot(x, n) { return (x >>> n) | (x << (32 - n)); }

function sha256Fingerprint(der) {
  const hash = sha256(der);
  return Array.from(new Uint8Array(hash.buffer))
    .map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
}

/* ---------------------------------------------------------------
   X.509 CERTIFICATE DECODER
   --------------------------------------------------------------- */
function decodeCertificate(der) {
  const root = parseDer(der);
  if (root.tag !== 0x30 || root.children.length < 3) {
    throw new Error('Not a valid DER-encoded X.509 certificate');
  }
  const tbs = root.children[0];
  if (tbs.tag !== 0x30) throw new Error('Invalid TBS certificate');

  // Navigate TBS certificate structure
  let idx = 0;
  // Check for explicit version tag [0]
  const versionNode = (tbs.children[0] && tbs.children[0].tag === 0xA0) ? tbs.children[0] : null;
  if (versionNode) idx = 1;

  const serialNode = tbs.children[idx];
  const sigAlgoNode = tbs.children[idx + 1];
  const issuerNode = tbs.children[idx + 2];
  const validityNode = tbs.children[idx + 3];
  const subjectNode = tbs.children[idx + 4];
  const spkiNode = tbs.children[idx + 5];

  // Extensions are at the end inside [3] context tag
  let extensionsNode = null;
  for (const ch of tbs.children) {
    if (ch.tag === 0xA3) extensionsNode = ch;
  }

  // Version
  let version = 1;
  if (versionNode && versionNode.children[0]) {
    version = versionNode.children[0].value[0] + 1;
  }

  // Serial
  const serial = serialNode ? hex(serialNode.value) : 'N/A';

  // Signature algorithm
  const sigOidNode = sigAlgoNode && sigAlgoNode.children && sigAlgoNode.children[0];
  const sigAlgo = sigOidNode ? oidName(sigOidNode.value) : 'N/A';

  // Issuer
  const issuer = issuerNode ? parseRdnSequence(issuerNode) : [];

  // Validity
  let notBefore = null, notAfter = null;
  if (validityNode && validityNode.children.length >= 2) {
    notBefore = parseAsn1Time(validityNode.children[0]);
    notAfter = parseAsn1Time(validityNode.children[1]);
  }

  // Subject
  const subject = subjectNode ? parseRdnSequence(subjectNode) : [];

  // Public key info
  const pubKey = spkiNode ? parsePublicKeyInfo(spkiNode) : { algorithm: 'N/A', bits: 0 };

  // Extensions
  const extensions = [];
  if (extensionsNode) {
    const extSeq = extensionsNode.children && extensionsNode.children[0];
    if (extSeq) extensions.push(...parseExtensions(extSeq));
  }

  // Fingerprint
  const fp = sha256Fingerprint(der);

  return {
    version, serial, sigAlgo,
    issuer, subject,
    notBefore, notAfter,
    pubKey,
    extensions,
    fingerprint: fp,
  };
}

/* ---------------------------------------------------------------
   CSR DECODER
   --------------------------------------------------------------- */
function decodeCsr(der) {
  const root = parseDer(der);
  if (root.tag !== 0x30 || root.children.length < 3) {
    throw new Error('Not a valid DER-encoded PKCS#10 CSR');
  }
  const csrInfo = root.children[0];
  const sigAlgoNode = root.children[1];
  // csrInfo: SEQUENCE { INTEGER, SEQUENCE { SET ... }, SEQUENCE { ... }, [attributes] }
  const versionNode = csrInfo.children && csrInfo.children[0];
  const subjectNode = csrInfo.children && csrInfo.children[1];
  const spkiNode = csrInfo.children && csrInfo.children[2];

  const sigOidN = sigAlgoNode && sigAlgoNode.children && sigAlgoNode.children[0];
  const sigAlgo = sigOidN ? oidName(sigOidN.value) : 'N/A';
  const version = versionNode ? versionNode.value[0] + 1 : 1;
  const subject = subjectNode ? parseRdnSequence(subjectNode) : [];
  const pubKey = spkiNode ? parsePublicKeyInfo(spkiNode) : { algorithm: 'N/A', bits: 0 };
  const fp = sha256Fingerprint(der);

  return { version, subject, pubKey, sigAlgo, fingerprint: fp };
}

/* ---------------------------------------------------------------
   RENDER HELPERS
   --------------------------------------------------------------- */
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderDn(parts, label) {
  return `<tr><td class="cert-label">${label}</td><td class="cert-value">${
    parts.map(p => `<span class="cert-dn-item"><span class="cert-dn-key">${escHtml(p.label)}</span>=<span class="cert-dn-val">${escHtml(p.value)}</span></span>`).join(', ')
  }</td></tr>`;
}

function renderRow(label, value, cls) {
  return `<tr><td class="cert-label">${label}</td><td class="cert-value ${cls || ''}">${value}</td></tr>`;
}

function renderCertHtml(cert) {
  const now = new Date();
  let statusHtml = '';
  if (cert.notBefore && cert.notAfter) {
    const valid = now >= cert.notBefore && now <= cert.notAfter;
    if (valid) {
      const daysLeft = daysBetween(now, cert.notAfter);
      statusHtml = `<span class="cert-ok">&#x2705; Valid (${daysLeft} days remaining)</span>`;
    } else if (now < cert.notBefore) {
      const daysUntil = daysBetween(now, cert.notBefore);
      statusHtml = `<span class="cert-warn">&#x26A0; Not yet valid (starts in ${daysUntil} days)</span>`;
    } else {
      const daysOverdue = daysBetween(cert.notAfter, now);
      statusHtml = `<span class="cert-err">&#x274C; EXPIRED (${daysOverdue} days ago)</span>`;
    }
  }

  return `
<div class="cert-card">
  <h3 class="cert-card-title">&#x1F512; Certificate Information</h3>
  <table class="cert-table">
    ${cert.subject.length ? renderDn(cert.subject, 'Subject') : renderRow('Subject', 'N/A')}
    ${cert.issuer.length ? renderDn(cert.issuer, 'Issuer') : renderRow('Issuer', 'N/A')}
    ${renderRow('Serial Number', `<code class="cert-mono">${escHtml(cert.serial)}</code>`)}
    ${renderRow('Version', `v${cert.version} (${cert.version - 1})`)}
    ${renderRow('Signature Algorithm', cert.sigAlgo)}
    ${renderRow('Not Before', cert.notBefore ? formatDate(cert.notBefore) : 'N/A')}
    ${renderRow('Not After', cert.notAfter ? formatDate(cert.notAfter) : 'N/A')}
    ${renderRow('Validity Status', statusHtml)}
    ${renderRow('Public Key', `${cert.pubKey.algorithm}${cert.pubKey.bits ? ' (' + cert.pubKey.bits + ' bits)' : ''}`)}
    ${renderRow('SHA-256 Fingerprint', `<code class="cert-mono">${escHtml(cert.fingerprint)}</code>`)}
  </table>
</div>`;
}

function renderCertFullHtml(cert) {
  let html = renderCertHtml(cert);

  // Extensions section
  if (cert.extensions && cert.extensions.length > 0) {
    html += `
<div class="cert-card">
  <h3 class="cert-card-title">&#x1F4CB; Extensions (${cert.extensions.length})</h3>
  <table class="cert-table">
    ${cert.extensions.map(ext => {
      const formatted = formatExtension(ext);
      return renderRow(
        ext.name,
        `<div class="cert-ext">
           <span class="cert-ext-critical">${ext.critical ? '&#x26A0; Critical' : ''}</span>
           <span class="cert-ext-val">${escHtml(formatted)}</span>
         </div>`,
        'cert-ext-row'
      );
    }).join('')}
  </table>
</div>`;
  }

  return html;
}

/* ---------------------------------------------------------------
   TOOL FUNCTIONS
   --------------------------------------------------------------- */

// --- Certificate Decode ---
function certDecode(input) {
  const blocks = parsePem(input);
  if (blocks.length === 0) {
    throw new Error('No PEM blocks found. Paste a PEM-encoded certificate (-----BEGIN CERTIFICATE-----)');
  }
  return blocks.map((block, i) => {
    try {
      const cert = decodeCertificate(block.der);
      let html = block.label !== 'CERTIFICATE'
        ? `<div class="msg-box info" style="display:flex;margin-bottom:.5rem">Label: ${escHtml(block.label)}</div>`
        : '';
      html += renderCertFullHtml(cert);
      return i > 0 ? `<div class="cert-separator"><hr></div>` + html : html;
    } catch (e) {
      return `<div class="msg-box error" style="display:flex">Block #${i+1} error: ${escHtml(e.message)}</div>`;
    }
  }).join('');
}

// --- Certificate Validator ---
function certValidate(input) {
  const blocks = parsePem(input);
  if (blocks.length === 0) {
    throw new Error('No PEM blocks found. Paste at least one certificate.');
  }
  const now = new Date();
  return blocks.map((block, i) => {
    try {
      const cert = decodeCertificate(block.der);
      const subj = cert.subject.map(p => p.value).join(', ');
      const issuer = cert.issuer.map(p => p.value).join(', ');
      let status, statusClass, days;
      if (!cert.notBefore || !cert.notAfter) {
        status = 'Unknown';
        statusClass = 'cert-warn';
      } else if (now < cert.notBefore) {
        days = daysBetween(now, cert.notBefore);
        status = `Not yet valid (starts in ${days} days)`;
        statusClass = 'cert-warn';
      } else if (now > cert.notAfter) {
        days = daysBetween(cert.notAfter, now);
        status = `EXPIRED (${days} days overdue)`;
        statusClass = 'cert-err';
      } else {
        days = daysBetween(now, cert.notAfter);
        status = `Valid (${days} days remaining)`;
        statusClass = 'cert-ok';
      }
      return `
<div class="cert-card" style="margin-top:${i > 0 ? '1rem' : '0'}">
  <table class="cert-table">
    ${renderRow('#', '' + (i + 1))}
    ${renderRow('Subject', escHtml(subj || '(empty)'))}
    ${renderRow('Issuer', escHtml(issuer || '(empty)'))}
    ${renderRow('Valid From', cert.notBefore ? formatDate(cert.notBefore) : 'N/A')}
    ${renderRow('Valid Until', cert.notAfter ? formatDate(cert.notAfter) : 'N/A')}
    ${renderRow('Status', `<span class="${statusClass}">${status}</span>`)}
    ${renderRow('SHA-256', `<code class="cert-mono">${escHtml(cert.fingerprint)}</code>`)}
  </table>
</div>`;
    } catch (e) {
      return `<div class="msg-box error" style="display:flex;margin-top:${i > 0 ? '.5rem' : '0'}">Block #${i+1} error: ${escHtml(e.message)}</div>`;
    }
  }).join('');
}

// --- PEM → DER ---
function certPemToDer(input) {
  const blocks = parsePem(input);
  if (blocks.length === 0) throw new Error('No PEM blocks found.');
  return blocks.map((b, i) => {
    const hexStr = hexRaw(b.der);
    const b64Str = bytesToBase64(b.der);
    return `
<div class="cert-card">
  <h4>Block #${i + 1}: ${escHtml(b.label)}</h4>
  <table class="cert-table">
    <tr><td class="cert-label">Size</td><td>${b.der.length} bytes</td></tr>
    <tr><td class="cert-label">SHA-256</td><td><code class="cert-mono">${sha256Fingerprint(b.der)}</code></td></tr>
  </table>
  <div style="margin-top:.5rem">
    <label class="btn btn-sm" style="cursor:pointer">
      📋 Copy DER (Base64)
      <button class="btn btn-sm" onclick="navigator.clipboard.writeText('${escHtml(b64Str)}')">Copy</button>
    </label>
    <label class="btn btn-sm" style="cursor:pointer">
      ⬇ Download .der
      <button class="btn btn-sm" onclick="(function(){var a=document.createElement('a');a.href='data:application/octet-stream;base64,${b64Str}';a.download='certificate_${i+1}.der';a.click()})()">Download</button>
    </label>
  </div>
  <details style="margin-top:.5rem">
    <summary style="cursor:pointer;font-size:.82rem;color:var(--text-muted)">Show raw DER (hex)</summary>
    <pre style="max-height:200px;overflow:auto;font-size:.75rem;background:#0f172a;color:#e2e8f0;padding:.5rem;border-radius:4px;margin-top:.25rem">${escHtml(hexStr)}</pre>
  </details>
</div>`;
  }).join('');
}

// --- DER → PEM ---
function certDerToPem(input) {
  let der;
  // Try base64 first, then hex, then raw
  try {
    der = base64ToBytes(input.replace(/\s/g, ''));
  } catch (_) {
    try {
      const hexStr = input.replace(/[\s:]/g, '');
      der = new Uint8Array(hexStr.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    } catch (_2) {
      throw new Error('Input must be base64 or hex-encoded DER data');
    }
  }
  if (der.length < 10) throw new Error('DER data too short');
  const pem = toPem('CERTIFICATE', der);
  const fp = sha256Fingerprint(der);
  return `
<div class="cert-card">
  <h4>DER → PEM Conversion</h4>
  <table class="cert-table">
    <tr><td class="cert-label">Size</td><td>${der.length} bytes</td></tr>
    <tr><td class="cert-label">SHA-256</td><td><code class="cert-mono">${fp}</code></td></tr>
  </table>
</div>
<div class="cert-card" style="margin-top:.5rem">
  <div class="panel-header">
    <span>PEM Output</span>
    <button class="btn btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('pemOutput').textContent)">📋 Copy</button>
  </div>
  <pre id="pemOutput" style="background:#0f172a;color:#e2e8f0;padding:1rem;font-family:var(--font-mono);font-size:.82rem;overflow:auto;max-height:400px;border-radius:0 0 var(--radius) var(--radius)">${escHtml(pem)}</pre>
</div>`;
}

// --- Certificate Chain Ordering ---
function dnToNorm(parts) {
  return '/' + parts.map(p => p.label + '=' + p.value).join('/');
}

function orderCertChain(blocks) {
  const certs = [];
  for (const b of blocks) {
    try {
      const c = decodeCertificate(b.der);
      certs.push({
        block: b,
        subject: dnToNorm(c.subject),
        issuer: dnToNorm(c.issuer),
        isSelfSigned: dnToNorm(c.subject) === dnToNorm(c.issuer),
        subjectParts: c.subject,
        serial: c.serial,
      });
    } catch (_) {
      certs.push({ block: b, subject: '', issuer: '', isSelfSigned: false, subjectParts: [], serial: '?' });
    }
  }

  // Build adjacency: for each cert, find which cert is its issuer
  const issuerMap = {};
  for (const c of certs) issuerMap[c.subject] = c;

  // Find leaf (cert whose issuer is another cert in the chain, but no other cert has its subject as issuer)
  // and root (self-signed, or issuer not in chain)
  const isParentOf = {}; // subject → true if this subject appears as someone's issuer
  for (const c of certs) {
    if (c.issuer && c.issuer !== c.subject && issuerMap[c.issuer]) {
      isParentOf[c.issuer] = true;
    }
  }

  const children = {}; // subject → [child certs]
  for (const c of certs) {
    const issuer = c.issuer;
    if (!issuer || !issuerMap[issuer] || c.isSelfSigned) continue;
    if (!children[issuer]) children[issuer] = [];
    children[issuer].push(c);
  }

  // Start building chain from leaf(s)
  const leafs = certs.filter(c => !c.isSelfSigned && (!children[c.subject] || children[c.subject].length === 0));
  const roots = certs.filter(c => c.isSelfSigned || !issuerMap[c.issuer]);

  const ordered = [];
  const visited = new Set();

  function walk(cert) {
    if (visited.has(cert.subject)) return;
    visited.add(cert.subject);
    // Children come first (leaf-side), then this cert
    const kids = children[cert.subject] || [];
    kids.forEach(k => walk(k));
    ordered.push(cert);
  }

  // Start from roots, walk the chain
  for (const root of roots) walk(root);
  // Add any remaining certs not reached
  for (const c of certs) {
    if (!visited.has(c.subject)) ordered.push(c);
  }

  // ordered is already leaf → root (Apache/NGINX chain style)
  // If ordering produced a different sequence, show a note
  const origOrder = certs.map(c => c.block);
  const isSameOrder = ordered.every((c, i) => c.block === origOrder[i]);

  return { ordered, original: certs, autoOrdered: !isSameOrder };
}

// --- Certificate Merger ---
function certMerge(input) {
  const blocks = parsePem(input);
  if (blocks.length < 2) {
    throw new Error('Need at least 2 PEM certificates to merge. Paste a chain.');
  }

  // Try to auto-order the chain
  let chainResult;
  try {
    chainResult = orderCertChain(blocks);
  } catch (_) {
    chainResult = null;
  }

  const useOrdered = chainResult && chainResult.autoOrdered;
  const orderedBlocks = useOrdered ? chainResult.ordered.map(c => c.block) : blocks;
  const maxBlockIx = useOrdered ? Math.max(chainResult.ordered.length, blocks.length) : blocks.length;

  const merged = orderedBlocks.map(b => {
    if (b.label === 'CERTIFICATE' || b.label === 'X509 CERTIFICATE' || b.label === 'TRUSTED CERTIFICATE') {
      return toPem(b.label, b.der);
    }
    return toPem('CERTIFICATE', b.der);
  }).join('');

  // Build chain diagram
  let chainDiagram = '';
  if (useOrdered && chainResult) {
    const names = chainResult.ordered.map(c => {
      const cn = c.subjectParts.find(p => p.label === 'CN');
      return cn ? cn.value : (c.subjectParts.length ? c.subjectParts[0].value : '(unknown)');
    });
    const arrow = '  ──Issued By──▶  ';
    chainDiagram = `
<div class="cert-card" style="margin-top:.5rem">
  <h4>🔗 Chain Order (auto-detected)</h4>
  <div class="cert-chain-diagram">
    ${names.map((n, i) => {
      const isLast = i === names.length - 1;
      return `<div class="cert-chain-step">
        <span class="cert-chain-role">${i === 0 ? '📄 Leaf' : isLast ? '🏛️ Root' : '🔗 Intermediate'}</span>
        <code class="cert-mono">${escHtml(n)}</code>
      </div>${isLast ? '' : `<div class="cert-chain-arrow">${arrow}</div>`}`;
    }).join('')}
  </div>
</div>`;
  }

  // Show original vs ordered comparison (only when reordered)
  let compareHtml = '';
  if (useOrdered && chainResult) {
    compareHtml = `
<div class="cert-card" style="margin-top:.5rem">
  <h4>📋 Order Comparison</h4>
  <table class="cert-table">
    <tr><td class="cert-label">Original Order</td><td>${chainResult.original.map((c, i) => {
      const cn = c.subjectParts.find(p => p.label === 'CN');
      const name = cn ? cn.value : (c.subjectParts.length ? c.subjectParts[0].value : '#');
      return `<span class="cert-chain-idx">${i+1}.</span> ${escHtml(name)}`;
    }).join(' &nbsp;→&nbsp; ')}</td></tr>
    <tr><td class="cert-label" style="color:var(--success)">✓ Corrected Order</td><td>${chainResult.ordered.map((c, i) => {
      const cn = c.subjectParts.find(p => p.label === 'CN');
      const name = cn ? cn.value : (c.subjectParts.length ? c.subjectParts[0].value : '#');
      return `<span class="cert-chain-idx">${i+1}.</span> ${escHtml(name)}`;
    }).join(' &nbsp;→&nbsp; ')}</td></tr>
  </table>
</div>`;
  }

  return `
<div class="cert-card">
  <h4>Certificate Chain Merger</h4>
  <table class="cert-table">
    <tr><td class="cert-label">Certificates</td><td>${blocks.length} PEM blocks</td></tr>
    <tr><td class="cert-label">Total Size</td><td>${new Blob([merged]).size} bytes</td></tr>
    <tr><td class="cert-label">Order</td><td>${
      useOrdered
        ? '<span class="cert-ok">✓ Auto-ordered (Leaf → Root)</span>'
        : chainResult
          ? '<span class="cert-ok">✓ Already in correct order</span>'
          : '<span class="cert-warn">As provided (could not auto-order chain)</span>'
    }</td></tr>
  </table>
</div>
${chainDiagram}
${compareHtml}
<div class="cert-card" style="margin-top:.5rem">
  <div class="panel-header">
    <span>Merged PEM Output</span>
    <button class="btn btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('mergeOutput').textContent)">📋 Copy</button>
    <button class="btn btn-sm" onclick="(function(){var a=document.createElement('a');a.href='data:application/x-pem-file;charset=utf-8,'+encodeURIComponent(document.getElementById('mergeOutput').textContent);a.download='merged_chain.pem';a.click()})()">⬇ Download</button>
  </div>
  <pre id="mergeOutput" style="background:#0f172a;color:#e2e8f0;padding:1rem;font-family:var(--font-mono);font-size:.82rem;overflow:auto;max-height:500px;border-radius:0 0 var(--radius) var(--radius)">${escHtml(merged)}</pre>
</div>`;
}

// --- Fingerprint ---
function certFingerprint(input) {
  const blocks = parsePem(input);
  if (blocks.length === 0) throw new Error('No PEM blocks found.');
  const now = new Date();
  return blocks.map((block, i) => {
    const fp = sha256Fingerprint(block.der);
    let certInfo = '';
    try {
      const cert = decodeCertificate(block.der);
      const subj = cert.subject.map(p => p.value).join(', ');
      const brief = subj.length > 50 ? subj.substring(0, 50) + '...' : subj;
      certInfo = `<tr><td class="cert-label">Subject</td><td>${escHtml(brief || '(empty)')}</td></tr>
      <tr><td class="cert-label">Valid</td><td>${cert.notAfter ? ((now <= cert.notAfter ? '&#x2705;' : '&#x274C;') + ' until ' + formatDate(cert.notAfter)) : 'N/A'}</td></tr>`;
    } catch (_) {
      certInfo = `<tr><td class="cert-label">Info</td><td class="cert-warn">Could not parse</td></tr>`;
    }
    return `
<div class="cert-card" style="margin-top:${i > 0 ? '.5rem' : '0'}">
  <table class="cert-table">
    <tr><td class="cert-label">#${i + 1}</td><td>${escHtml(block.label)}</td></tr>
    ${certInfo}
    <tr><td class="cert-label">SHA-256</td><td><code class="cert-mono" style="font-size:.8rem">${escHtml(fp)}</code></td></tr>
  </table>
</div>`;
  }).join('');
}

// --- CSR Decode ---
function csrDecode(input) {
  const blocks = parsePem(input);
  if (blocks.length === 0) throw new Error('No CSR found. Paste a PEM-encoded CSR (-----BEGIN CERTIFICATE REQUEST-----)');
  return blocks.map((block, i) => {
    if (block.label !== 'CERTIFICATE REQUEST' && block.label !== 'NEW CERTIFICATE REQUEST') {
      return `<div class="msg-box error" style="display:flex">Block #${i+1}: expected CERTIFICATE REQUEST, got ${escHtml(block.label)}</div>`;
    }
    try {
      const csr = decodeCsr(block.der);
      return `
<div class="cert-card">
  <h3 class="cert-card-title">&#x1F4DD; CSR Information</h3>
  <table class="cert-table">
    ${renderRow('Version', `v${csr.version}`)}
    ${csr.subject.length ? renderDn(csr.subject, 'Subject') : renderRow('Subject', '(empty)')}
    ${renderRow('Public Key', `${csr.pubKey.algorithm}${csr.pubKey.bits ? ' (' + csr.pubKey.bits + ' bits)' : ''}`)}
    ${renderRow('Signature Algorithm', csr.sigAlgo)}
    ${renderRow('SHA-256', `<code class="cert-mono">${escHtml(csr.fingerprint)}</code>`)}
  </table>
</div>`;
    } catch (e) {
      return `<div class="msg-box error" style="display:flex">Block #${i+1} error: ${escHtml(e.message)}</div>`;
    }
  }).join('');
}

/* ---------------------------------------------------------------
   MAIN ENGINE ENTRY
   --------------------------------------------------------------- */
function certificateEngine(input, action) {
  if (!input || !input.trim()) return '';

  switch (action) {
    case 'decode':       return certDecode(input);
    case 'validate':     return certValidate(input);
    case 'pem2der':      return certPemToDer(input);
    case 'der2pem':      return certDerToPem(input);
    case 'merge':        return certMerge(input);
    case 'fingerprint':  return certFingerprint(input);
    case 'csr-decode':   return csrDecode(input);
    default:             return input;
  }
}

/* ---------------------------------------------------------------
   EXPOSE
   --------------------------------------------------------------- */
window.certificateEngine = certificateEngine;

})();
