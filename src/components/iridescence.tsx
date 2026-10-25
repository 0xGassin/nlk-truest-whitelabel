"use client";

import { Color, Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef } from "react";

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

const DEFAULT_COLOR: [number, number, number] = [1, 1, 1];

interface IridescenceProps {
  amplitude?: number;
  className?: string;
  color?: [number, number, number];
  mouseReact?: boolean;
  speed?: number;
}

interface IridescenceUniforms {
  uAmplitude: { value: number };
  uColor: { value: Color };
  uMouse: { value: Float32Array };
  uResolution: { value: Color };
  uSpeed: { value: number };
  uTime: { value: number };
}

export default function Iridescence({
  amplitude = 0.1,
  color = DEFAULT_COLOR,
  mouseReact = true,
  speed = 1,
  ...rest
}: IridescenceProps) {
  const ctnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctnRef.current) return;
    const ctn = ctnRef.current;
    let renderer: Renderer;
    try {
      renderer = new Renderer();
    } catch {
      return;
    }
    const gl = renderer.gl;
    gl.clearColor(1, 1, 1, 1);

    const uniforms: IridescenceUniforms = {
      uAmplitude: { value: amplitude },
      uColor: { value: new Color(...color) },
      uMouse: { value: new Float32Array([0.5, 0.5]) },
      uResolution: { value: new Color(0, 0, 0) },
      uSpeed: { value: speed },
      uTime: { value: 0 },
    };

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      fragment: fragmentShader,
      uniforms,
      vertex: vertexShader,
    });

    function resize() {
      renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
      uniforms.uResolution.value = new Color(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / gl.canvas.height,
      );
    }
    window.addEventListener("resize", resize, false);
    resize();

    const mesh = new Mesh(gl, { geometry, program });
    let animateId: number;

    function update(t: number) {
      animateId = requestAnimationFrame(update);
      uniforms.uTime.value = t * 0.001;
      renderer.render({ scene: mesh });
    }
    animateId = requestAnimationFrame(update);
    ctn.append(gl.canvas);

    function handleMouseMove(event: MouseEvent) {
      const rect = ctn.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      uniforms.uMouse.value[0] = x;
      uniforms.uMouse.value[1] = y;
    }
    if (mouseReact) {
      ctn.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      cancelAnimationFrame(animateId);
      window.removeEventListener("resize", resize);
      if (mouseReact) {
        ctn.removeEventListener("mousemove", handleMouseMove);
      }
      gl.canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [amplitude, color, mouseReact, speed]);

  return <div className="size-full" ref={ctnRef} {...rest} />;
}
