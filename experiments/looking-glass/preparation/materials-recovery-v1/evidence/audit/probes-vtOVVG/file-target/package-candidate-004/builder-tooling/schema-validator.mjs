// Small, explicit JSON Schema subset used by the authored snapshot contract.
// Unsupported keywords fail closed rather than silently weakening validation.
const supported = new Set([
  '$schema', '$id', '$defs', 'title', 'description', 'examples', 'default',
  'type', 'required', 'properties', 'additionalProperties', 'items',
  'minItems', 'maxItems', 'uniqueItems', 'minLength', 'maxLength', 'pattern',
  'minimum', 'maximum', 'enum', 'const', 'anyOf', 'oneOf', 'allOf', '$ref',
]);

export function validateSchemaDefinition(schema) {
  const errors = [];
  function visit(node, path) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      errors.push(`${path}: schema must be an object`);
      return;
    }
    for (const key of Object.keys(node)) {
      if (!supported.has(key)) errors.push(`${path}: unsupported keyword ${key}`);
    }
    for (const [key, child] of Object.entries(node.properties ?? {})) visit(child, `${path}.properties.${key}`);
    for (const [key, child] of Object.entries(node.$defs ?? {})) visit(child, `${path}.$defs.${key}`);
    if (typeof node.items === 'object') visit(node.items, `${path}.items`);
    if (typeof node.additionalProperties === 'object') visit(node.additionalProperties, `${path}.additionalProperties`);
    for (const key of ['allOf', 'anyOf', 'oneOf']) {
      for (const [index, child] of (node[key] ?? []).entries()) visit(child, `${path}.${key}[${index}]`);
    }
  }
  visit(schema, '$');
  return errors;
}

export function validateJson(value, schema) {
  const errors = validateSchemaDefinition(schema);
  if (errors.length) return errors;
  const root = schema;
  function check(data, node, path) {
    if (node.$ref) {
      if (!node.$ref.startsWith('#/$defs/')) { errors.push(`${path}: unsupported $ref ${node.$ref}`); return; }
      const target = root.$defs?.[node.$ref.slice(8)];
      if (!target) { errors.push(`${path}: unresolved $ref ${node.$ref}`); return; }
      check(data, target, path);
      return;
    }
    const actual = Array.isArray(data) ? 'array' : data === null ? 'null' : typeof data;
    if (node.type) {
      const allowed = Array.isArray(node.type) ? node.type : [node.type];
      if (!allowed.some(type => type === actual || (type === 'integer' && actual === 'number' && Number.isInteger(data)))) {
        errors.push(`${path}: expected ${allowed.join('|')}, got ${actual}`);
        return;
      }
    }
    if (node.const !== undefined && JSON.stringify(data) !== JSON.stringify(node.const)) errors.push(`${path}: expected const`);
    if (node.enum && !node.enum.some(item => JSON.stringify(item) === JSON.stringify(data))) errors.push(`${path}: outside enum`);
    if (actual === 'string') {
      if (node.minLength !== undefined && data.length < node.minLength) errors.push(`${path}: string too short`);
      if (node.maxLength !== undefined && data.length > node.maxLength) errors.push(`${path}: string too long`);
      if (node.pattern && !(new RegExp(node.pattern).test(data))) errors.push(`${path}: pattern mismatch`);
    }
    if (actual === 'number') {
      if (node.minimum !== undefined && data < node.minimum) errors.push(`${path}: below minimum`);
      if (node.maximum !== undefined && data > node.maximum) errors.push(`${path}: above maximum`);
    }
    if (actual === 'array') {
      if (node.minItems !== undefined && data.length < node.minItems) errors.push(`${path}: too few items`);
      if (node.maxItems !== undefined && data.length > node.maxItems) errors.push(`${path}: too many items`);
      if (node.uniqueItems && new Set(data.map(item => JSON.stringify(item))).size !== data.length) errors.push(`${path}: duplicate items`);
      if (node.items) data.forEach((item, index) => check(item, node.items, `${path}[${index}]`));
    }
    if (actual === 'object') {
      for (const key of node.required ?? []) if (!Object.hasOwn(data, key)) errors.push(`${path}.${key}: required`);
      for (const [key, item] of Object.entries(data)) {
        if (node.properties?.[key]) check(item, node.properties[key], `${path}.${key}`);
        else if (node.additionalProperties === false) errors.push(`${path}.${key}: extra property`);
        else if (typeof node.additionalProperties === 'object') check(item, node.additionalProperties, `${path}.${key}`);
      }
    }
    for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
      if (!node[keyword]) continue;
      const counts = node[keyword].map(part => {
        const prior = errors.length;
        check(data, part, path);
        const sub = errors.splice(prior);
        return sub.length === 0;
      });
      const n = counts.filter(Boolean).length;
      if ((keyword === 'allOf' && n !== counts.length) || (keyword === 'anyOf' && n < 1) || (keyword === 'oneOf' && n !== 1)) errors.push(`${path}: ${keyword} failed`);
    }
  }
  check(value, schema, '$');
  return errors;
}
