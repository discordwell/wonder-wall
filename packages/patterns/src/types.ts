export interface PatternParameter {
  key: string;
  label: string;
  type: 'color' | 'number' | 'select' | 'boolean';
  default: string | number | boolean;
  options?: { label: string; value: string | number }[];
  min?: number;
  max?: number;
  step?: number;
}

export interface TestPattern {
  id: string;
  name: string;
  category: 'essential' | 'professional' | 'advanced';
  description: string;
  parameters: PatternParameter[];
  render(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    params: Record<string, unknown>,
  ): void;
  animate?(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    params: Record<string, unknown>,
    time: number,
  ): void;
}
