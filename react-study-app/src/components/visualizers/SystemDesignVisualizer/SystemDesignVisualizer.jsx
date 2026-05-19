import { CanvasTemplate } from '../../templates';
import { SCENARIOS } from './sd-engine';

const PAN_BY_SCENARIO = {
  uber: { x: -20, y: 22 },
};
const SCALE_BY_SCENARIO = {
  uber: 0.88,
};

export default function SystemDesignVisualizer() {
  return (
    <CanvasTemplate
      scenarios={SCENARIOS}
      panByScenario={PAN_BY_SCENARIO}
      scaleByScenario={SCALE_BY_SCENARIO}
    />
  );
}
