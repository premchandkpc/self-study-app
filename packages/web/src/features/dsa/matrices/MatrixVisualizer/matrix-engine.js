import { AlgorithmCompiler } from '../../../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

const spiralAlgorithm = (input, tracer) => {
  const { matrix } = input;
  const result = [];
  let top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1;
  
  tracer.step('Initialize', `Spiral traversal of ${matrix.length}x${matrix[0].length} matrix`, input);
  
  while (top <= bottom && left <= right) {
    for (let i = left; i <= right; i++) {
      result.push(matrix[top][i]);
    }
    top++;
    
    for (let i = top; i <= bottom; i++) {
      result.push(matrix[i][right]);
    }
    right--;
    
    if (top <= bottom) {
      for (let i = right; i >= left; i--) {
        result.push(matrix[bottom][i]);
      }
      bottom--;
    }
    
    if (left <= right) {
      for (let i = bottom; i >= top; i--) {
        result.push(matrix[i][left]);
      }
      left++;
    }
    
    tracer.step('Spiral', `Collected ${result.length} elements`,
      { matrix, result });
  }
  
  tracer.found(result, { state: { matrix, result } });
  return result;
};

export const SCENARIOS = [
  {
    id: 'spiral',
    label: 'Spiral Traversal',
    icon: '🌀',
    code: `const algorithm = (input, tracer) => {
  const { matrix } = input;
  const result = [];
  let t=0,b=matrix.length-1,l=0,r=matrix[0].length-1;
  while (t<=b && l<=r) {
    for (let i=l;i<=r;i++) result.push(matrix[t][i]); t++;
    for (let i=t;i<=b;i++) result.push(matrix[i][r]); r--;
    if (t<=b) for (let i=r;i>=l;i--) result.push(matrix[b][i]); b--;
    if (l<=r) for (let i=b;i>=t;i--) result.push(matrix[i][l]); l++;
  }
  return result;
};`,
    language: 'javascript',
    inputs: [
      { key: 'matrix', label: 'Matrix', type: 'text', default: '[[1,2,3],[4,5,6],[7,8,9]]' },
    ],
    build(params = {}) {
      let matrix = [[1,2,3],[4,5,6],[7,8,9]];
      if (typeof params.matrix === 'string') {
        try { matrix = JSON.parse(params.matrix); } catch { }
      }
      return compiler.compile(spiralAlgorithm, { matrix });
    },
  },
];
