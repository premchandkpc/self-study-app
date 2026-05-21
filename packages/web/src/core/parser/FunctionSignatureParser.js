// Parse function signature with type annotations
export class FunctionSignatureParser {
  // Extract parameters from function code, handling type annotations
  static parseParams(code) {
    // Match: function name(p1, p2) or const name = (p1, p2) =>
    const fnMatch = code.match(/(?:function\s*\w*\s*|const\s+\w+\s*=\s*)\(([^)]*)\)/);
    if (!fnMatch) return [];

    const paramStr = fnMatch[1];
    if (!paramStr.trim()) return [];

    return paramStr
      .split(',')
      .map(p => p.trim())
      .filter(p => p && !p.startsWith('//'))
      .map(p => {
        // Parse: "name: type = default" or "name: type" or "name = default" or "name"
        const [paramPart, defaultStr] = p.split('=').map(x => x.trim());
        const [name, typeStr] = paramPart.split(':').map(x => x.trim());

        return {
          name,
          typeStr: typeStr || null,
          default: defaultStr,
        };
      });
  }

  // Map type annotation to input type
  static mapTypeToInputType(typeStr) {
    if (!typeStr) return null;

    const lower = typeStr.toLowerCase();

    // Direct type mappings
    if (lower.includes('array') || lower.includes('[]')) return 'array-num';
    if (lower.includes('string') || lower.includes('str')) return 'text';
    if (lower.includes('number') || lower.includes('int') || lower.includes('float')) return 'number';
    if (lower.includes('boolean') || lower.includes('bool')) return 'boolean';
    if (lower.includes('object') || lower.includes('map') || lower.includes('dict')) return 'object';
    if (lower.includes('matrix') || lower.includes('grid') || lower.includes('2d')) return 'matrix';
    if (lower.includes('graph') || lower.includes('adjacency')) return 'object';

    return null;
  }

  // Infer input type from name, type annotation, or default value
  static inferType(paramName, typeStr, defaultValue) {
    // 1. Try explicit type annotation first
    if (typeStr) {
      const mapped = this.mapTypeToInputType(typeStr);
      if (mapped) return mapped;
    }

    // 2. Try parameter name heuristics
    const lower = paramName.toLowerCase();
    if (lower.includes('array') || lower.includes('arr')) return 'array-num';
    if (lower.includes('list') || lower.includes('node')) return 'array-num';
    if (lower.includes('text') || lower.includes('str') || lower.includes('pattern')) return 'text';
    if (lower.includes('count') || lower.includes('k') || lower.includes('size') || lower.includes('target') || lower.includes('sum')) return 'number';
    if (lower.includes('flag') || lower.includes('bool')) return 'boolean';
    if (lower.includes('map') || lower.includes('dict') || lower.includes('obj')) return 'object';
    if (lower.includes('matrix') || lower.includes('grid')) return 'matrix';
    if (lower.includes('graph') || lower.includes('adjacency')) return 'object';

    // 3. Try default value
    if (defaultValue) {
      if (defaultValue.startsWith('[')) return 'array-num';
      if (defaultValue.startsWith('{')) return 'object';
      if (defaultValue.startsWith('"') || defaultValue.startsWith("'")) return 'text';
      if (!isNaN(defaultValue)) return 'number';
      if (defaultValue === 'true' || defaultValue === 'false') return 'boolean';
    }

    return 'text'; // fallback
  }

  // Generate input schema from params
  static generateSchema(params) {
    return params.map(({ name, typeStr, default: defaultValue }) => {
      const type = this.inferType(name, typeStr, defaultValue);
      const schema = {
        key: name,
        label: this._humanizeLabel(name),
        type,
      };

      // Parse default value
      if (defaultValue) {
        try {
          if (defaultValue.startsWith('[')) {
            schema.default = JSON.parse(defaultValue);
          } else if (defaultValue.startsWith('{')) {
            schema.default = JSON.parse(defaultValue);
          } else if (defaultValue.startsWith('"') || defaultValue.startsWith("'")) {
            schema.default = defaultValue.slice(1, -1);
          } else if (defaultValue === 'true' || defaultValue === 'false') {
            schema.default = defaultValue === 'true';
          } else {
            schema.default = Number(defaultValue);
          }
        } catch {
          schema.default = defaultValue;
        }
      } else {
        // Set sensible defaults per type
        switch (type) {
          case 'array-num':
            schema.default = [1, 2, 3, 4, 5];
            break;
          case 'text':
            schema.default = '';
            break;
          case 'number':
            schema.default = 0;
            break;
          case 'boolean':
            schema.default = false;
            break;
          case 'object':
            schema.default = {};
            break;
          case 'matrix':
            schema.default = [[0]];
            break;
          default:
            schema.default = null;
        }
      }

      return schema;
    });
  }

  static _humanizeLabel(name) {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, c => c.toUpperCase())
      .trim() || name;
  }
}
